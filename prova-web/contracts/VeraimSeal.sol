// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title VeraimSeal
/// @notice Public, append-only record of agent calls. A call's hash is sealed
///         before its outcome is known; once the grading deadline passes the
///         result is written next to it. Nothing can be edited or deleted.
contract VeraimSeal {
    struct Seal {
        uint64 sealedAt;  // block time the hash was sealed (0 = never sealed)
        uint64 gradesAt;  // when the call may be graded
        uint64 gradedAt;  // when the result was recorded
        uint8 result;     // 0 open, 1 hit, 2 miss, 3 void
        uint256 agentId;
    }

    address public owner;
    mapping(address => bool) public sealers;
    mapping(bytes32 => Seal) public seals;

    event Sealed(bytes32 indexed hash, uint256 indexed agentId, uint64 gradesAt, uint64 sealedAt);
    event Graded(bytes32 indexed hash, uint8 result, uint64 gradedAt);
    event SealerSet(address indexed sealer, bool allowed);
    event OwnershipTransferred(address indexed from, address indexed to);

    error NotOwner();
    error NotSealer();
    error AlreadySealed(bytes32 hash);
    error NotSealed(bytes32 hash);
    error AlreadyGraded(bytes32 hash);
    error TooEarly(bytes32 hash);
    error BadResult();
    error LengthMismatch();

    constructor() {
        owner = msg.sender;
        sealers[msg.sender] = true;
        emit OwnershipTransferred(address(0), msg.sender);
        emit SealerSet(msg.sender, true);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlySealer() {
        if (!sealers[msg.sender]) revert NotSealer();
        _;
    }

    function seal(bytes32 hash, uint256 agentId, uint64 gradesAt) external onlySealer {
        _seal(hash, agentId, gradesAt);
    }

    function sealBatch(bytes32[] calldata hashes, uint256[] calldata agentIds, uint64[] calldata gradesAts) external onlySealer {
        if (hashes.length != agentIds.length || hashes.length != gradesAts.length) revert LengthMismatch();
        for (uint256 i = 0; i < hashes.length; i++) _seal(hashes[i], agentIds[i], gradesAts[i]);
    }

    function recordGrades(bytes32[] calldata hashes, uint8[] calldata results) external onlySealer {
        if (hashes.length != results.length) revert LengthMismatch();
        for (uint256 i = 0; i < hashes.length; i++) {
            Seal storage s = seals[hashes[i]];
            if (s.sealedAt == 0) revert NotSealed(hashes[i]);
            if (s.result != 0) revert AlreadyGraded(hashes[i]);
            if (block.timestamp < s.gradesAt) revert TooEarly(hashes[i]);
            if (results[i] == 0 || results[i] > 3) revert BadResult();
            s.result = results[i];
            s.gradedAt = uint64(block.timestamp);
            emit Graded(hashes[i], results[i], uint64(block.timestamp));
        }
    }

    function setSealer(address sealer, bool allowed) external onlyOwner {
        sealers[sealer] = allowed;
        emit SealerSet(sealer, allowed);
    }

    function transferOwnership(address to) external onlyOwner {
        emit OwnershipTransferred(owner, to);
        owner = to;
    }

    function _seal(bytes32 hash, uint256 agentId, uint64 gradesAt) internal {
        if (seals[hash].sealedAt != 0) revert AlreadySealed(hash);
        seals[hash] = Seal(uint64(block.timestamp), gradesAt, 0, 0, agentId);
        emit Sealed(hash, agentId, gradesAt, uint64(block.timestamp));
    }
}
