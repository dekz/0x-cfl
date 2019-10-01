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
        FORWARDER = IForwarder(_forwarder);
    }

    function liquidityRequiringFunctionBytes(bytes memory callDataHex)
        public
        payable
        returns (LibFillResults.FillResults memory fillResults)
    {
        // callData contains the entire function call
        (bool success, bytes memory data) = address(FORWARDER).call.value(msg.value)(callDataHex);
        fillResults = abi.decode(data, (LibFillResults.FillResults));
        require(success == true, "COMPLETE_FILL_FAILED");
        // do things with the 1 ZRX you acquired! 
        // also, maybe refund the msg.value unused.
        return fillResults;
    }
}
