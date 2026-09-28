// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @title ProvaRuns
/// @notice Pays for agent runs in ETH or USDG and splits every payment on the spot:
///         creator share (withdrawn by the creator), buyback share (spent only on buying
///         the agent's token and burning it), and the rest to the Prova treasury.
contract ProvaRuns {
    address public constant ETH = address(0);
    address public constant BURN = 0x000000000000000000000000000000000000dEaD;

    struct Agent {
        address creator; // receives the creator share; set once
        address token;   // agent token bought back and burned; set once
    }

    address public owner;
    address public treasury;
    IERC20 public immutable usdg;
    uint16 public creatorBps = 6000; // 60%
    uint16 public buybackBps = 3000; // 30% (treasury gets the rest, 10%)

    mapping(address => bool) public operators; // Prova's server wallet
    mapping(address => bool) public routers;   // DEX routers allowed for buybacks
    mapping(uint256 => Agent) public agents;
    mapping(bytes32 => bool) public usedRef;
    mapping(address => mapping(address => uint256)) public creatorBalance; // asset => creator => amount
    mapping(address => mapping(uint256 => uint256)) public buybackBalance; // asset => agentId => amount
    mapping(address => uint256) public treasuryBalance;                    // asset => amount

    uint256 private locked = 1;

    event RunsPaid(bytes32 indexed ref, uint256 indexed agentId, address indexed payer, address asset, uint256 amount, uint32 quantity);
    event CreatorWithdrawn(address indexed creator, address asset, uint256 amount);
    event TreasuryWithdrawn(address asset, uint256 amount);
    event BuybackBurned(uint256 indexed agentId, address asset, uint256 amountIn, uint256 tokensBurned);
    event AgentSet(uint256 indexed agentId, address creator, address token);
    event SplitSet(uint16 creatorBps, uint16 buybackBps);
    event RouterSet(address router, bool allowed);
    event OperatorSet(address operator, bool allowed);
    event OwnershipTransferred(address indexed from, address indexed to);

    error NotOwner();
    error NotOperator();
    error UnknownAgent();
    error RefUsed();
    error BadAmount();
    error AlreadySet();
    error NoToken();
    error RouterNotAllowed();
    error SwapFailed();
    error NotEnoughBurned();
    error TransferFailed();
    error Reentrancy();
    error BadSplit();

    constructor(address _treasury, address _usdg) {
        owner = msg.sender;
        treasury = _treasury;
        usdg = IERC20(_usdg);
        operators[msg.sender] = true;
        emit OwnershipTransferred(address(0), msg.sender);
        emit OperatorSet(msg.sender, true);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyOperator() {
        if (!operators[msg.sender]) revert NotOperator();
        _;
    }

    modifier nonReentrant() {
        if (locked != 1) revert Reentrancy();
        locked = 2;
        _;
        locked = 1;
    }

    // ---------- paying for runs ----------

    function payRuns(uint256 agentId, uint32 quantity, bytes32 ref) external payable {
        _pay(ETH, agentId, quantity, ref, msg.value);
    }

    function payRunsUsdg(uint256 agentId, uint32 quantity, bytes32 ref, uint256 amount) external {
        if (!usdg.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
        _pay(address(usdg), agentId, quantity, ref, amount);
    }

    function _pay(address asset, uint256 agentId, uint32 quantity, bytes32 ref, uint256 amount) internal {
        address creator = agents[agentId].creator;
        if (creator == address(0)) revert UnknownAgent();
        if (usedRef[ref]) revert RefUsed();
        if (amount == 0 || quantity == 0) revert BadAmount();
        usedRef[ref] = true;
        uint256 toCreator = (amount * creatorBps) / 10_000;
        uint256 toBuyback = (amount * buybackBps) / 10_000;
        creatorBalance[asset][creator] += toCreator;
        buybackBalance[asset][agentId] += toBuyback;
        treasuryBalance[asset] += amount - toCreator - toBuyback;
        emit RunsPaid(ref, agentId, msg.sender, asset, amount, quantity);
    }

    // ---------- payouts ----------

    /// Creators withdraw their own share. Nobody else can move it.
    function withdraw(address asset) external nonReentrant {
        uint256 amount = creatorBalance[asset][msg.sender];
        if (amount == 0) revert BadAmount();
        creatorBalance[asset][msg.sender] = 0;
        _send(asset, msg.sender, amount);
        emit CreatorWithdrawn(msg.sender, asset, amount);
    }

    /// Anyone can push the treasury share to the treasury address.
    function withdrawTreasury(address asset) external nonReentrant {
        uint256 amount = treasuryBalance[asset];
        if (amount == 0) revert BadAmount();
        treasuryBalance[asset] = 0;
        _send(asset, treasury, amount);
        emit TreasuryWithdrawn(asset, amount);
    }

    /// Spends an agent's buyback share on its token through an allowed DEX router.
    /// The swap must deliver at least `minOut` tokens to the burn address.
    function executeBuyback(uint256 agentId, address asset, uint256 amountIn, address router, bytes calldata data, uint256 minOut)
        external
        onlyOperator
        nonReentrant
    {
        address token = agents[agentId].token;
        if (token == address(0)) revert NoToken();
        if (!routers[router]) revert RouterNotAllowed();
        if (amountIn == 0 || amountIn > buybackBalance[asset][agentId]) revert BadAmount();
        buybackBalance[asset][agentId] -= amountIn;

        uint256 before = IERC20(token).balanceOf(BURN);
        bool ok;
        if (asset == ETH) {
            (ok, ) = router.call{value: amountIn}(data);
        } else {
            IERC20(asset).approve(router, amountIn);
            (ok, ) = router.call(data);
            IERC20(asset).approve(router, 0);
        }
        if (!ok) revert SwapFailed();
        uint256 burned = IERC20(token).balanceOf(BURN) - before;
        if (burned == 0 || burned < minOut) revert NotEnoughBurned();
        emit BuybackBurned(agentId, asset, amountIn, burned);
    }

    // ---------- setup ----------

    /// Registers an agent's creator (once) and, later, its token (once).
    function setAgent(uint256 agentId, address creator, address token) public onlyOperator {
        Agent storage a = agents[agentId];
        if (creator != address(0)) {
            if (a.creator != address(0)) revert AlreadySet();
            a.creator = creator;
        }
        if (token != address(0)) {
            if (a.token != address(0)) revert AlreadySet();
            a.token = token;
        }
        emit AgentSet(agentId, a.creator, a.token);
    }

    function setAgents(uint256[] calldata ids, address[] calldata creators) external onlyOperator {
        if (ids.length != creators.length) revert BadAmount();
        for (uint256 i = 0; i < ids.length; i++) setAgent(ids[i], creators[i], address(0));
    }

    function setSplit(uint16 _creatorBps, uint16 _buybackBps) external onlyOwner {
        if (uint256(_creatorBps) + _buybackBps > 10_000 || _creatorBps < 3000) revert BadSplit();
        creatorBps = _creatorBps;
        buybackBps = _buybackBps;
        emit SplitSet(_creatorBps, _buybackBps);
    }

    function setRouter(address router, bool allowed) external onlyOwner {
        routers[router] = allowed;
        emit RouterSet(router, allowed);
    }

    function setOperator(address operator, bool allowed) external onlyOwner {
        operators[operator] = allowed;
        emit OperatorSet(operator, allowed);
    }

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }

    function transferOwnership(address to) external onlyOwner {
        emit OwnershipTransferred(owner, to);
        owner = to;
    }

    function _send(address asset, address to, uint256 amount) internal {
        if (asset == ETH) {
            (bool ok, ) = to.call{value: amount}("");
            if (!ok) revert TransferFailed();
        } else if (!IERC20(asset).transfer(to, amount)) revert TransferFailed();
    }
}
