pragma solidity ^0.5.5;
pragma experimental ABIEncoderV2;

import "@0x/contracts-exchange-libs/contracts/src/LibOrder.sol";
import "@0x/contracts-exchange/contracts/src/interfaces/IExchange.sol";
import "@0x/contracts-exchange-libs/contracts/src/LibFillResults.sol";
import "@0x/contracts-erc20/contracts/src/interfaces/IERC20Token.sol";

contract LiquidityRequiringContract
{
    IExchange internal EXCHANGE;
    address internal ERC20PROXY;
    constructor (address _exchange, address _erc20Proxy)
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

    function liquidityRequiringFunction(LibOrder.Order[] memory orders, bytes[] memory signatures)
        public
        returns (LibFillResults.FillResults memory fillResults)
    {
        // calculate the fill amount given msg.senders collateral and current price
        uint256 makerAssetFillAmount = 500;
        fillResults = EXCHANGE.marketBuyOrders(orders, makerAssetFillAmount, signatures);
        require(fillResults.makerAssetFilledAmount == makerAssetFillAmount, "COMPLETE_FILL_FAILED");
        return fillResults;
    }

    function liquidityRequiringFunctionBytes(bytes memory callDataHex)
        public
        returns (LibFillResults.FillResults memory fillResults)
    {
        // callData contains the entire function call
        (bool success, bytes memory data) = address(EXCHANGE).call(callDataHex);
        fillResults = abi.decode(data, (LibFillResults.FillResults));
        require(success == true, "COMPLETE_FILL_FAILED");
        return fillResults;
    }
}
