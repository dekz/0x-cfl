pragma solidity ^0.5.9;
pragma experimental ABIEncoderV2;

import "@0x/contracts-exchange-forwarder/contracts/src/interfaces/IForwarder.sol";

contract SimpleMarginTradeContract
{
    IForwarder internal FORWARDER;
    constructor (address _forwarder)
        public
    {
        FORWARDER = IForwarder(_forwarder);
    }

    function leverage(bytes memory callDataHex)
        public
        payable
        returns (bool)
    {
        // callData contains the entire function call
        (bool success, bytes memory _data) = address(FORWARDER).call.value(msg.value)(callDataHex);
        return success;
    }
}
