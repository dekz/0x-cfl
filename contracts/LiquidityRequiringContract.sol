pragma solidity ^0.5.5;
pragma experimental ABIEncoderV2;

import "@0x/contracts-exchange-libs/contracts/src/LibFillResults.sol";
import "@0x/contracts-exchange-forwarder/contracts/src/interfaces/IForwarder.sol";

contract LiquidityRequiringContract
{
    IForwarder internal FORWARDER;
    constructor (address _forwarder)
        public
    {
        EXCHANGE = IExchange(_exchange);
        ERC20PROXY = _erc20Proxy;
    }

    function setProxyAllowance(address token, uint256 amount)
        public
    {
        IERC20Token(token).approve(ERC20PROXY, amount);
    }

    function liquidityRequiringFunction(bytes memory callDataHex)
        public
        returns (bool success)
    {
        // callData contains the entire function call
        (bool success) = address(EXCHANGE).call(callDataHex);
        require(success == true, "COMPLETE_FILL_FAILED");
        return success;
    }
}
