// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IMintable {
    function mint(address to, uint256 amount) external;
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// Test-only stand-in for Uniswap v3 SwapRouter02.exactInputSingle (local chain).
/// Pays out `amountIn * rate / 1e18` of tokenOut by minting it.
contract MockSwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    uint256 public rate = 1000e18; // tokens out per 1 unit in

    function setRate(uint256 r) external {
        rate = r;
    }

    function exactInputSingle(ExactInputSingleParams calldata p) external payable returns (uint256 out) {
        if (msg.value == 0) IMintable(p.tokenIn).transferFrom(msg.sender, address(this), p.amountIn);
        else require(msg.value == p.amountIn, "value");
        out = (p.amountIn * rate) / 1e18;
        require(out >= p.amountOutMinimum, "slippage");
        IMintable(p.tokenOut).mint(p.recipient, out);
    }
}
