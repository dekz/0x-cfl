pragma solidity ^0.5.9;
pragma experimental ABIEncoderV2;

import "@0x/contracts-exchange-forwarder/contracts/src/interfaces/IForwarder.sol";
import "@0x/contracts-erc20/contracts/src/interfaces/IERC20Token.sol";

contract SimpleTokenSwapContract
{
    IForwarder internal FORWARDER;
    constructor (address _forwarder)
        public
    {
        FORWARDER = IForwarder(_forwarder);
    }

    function liquidityRequiringFunction(bytes memory callDataHex)
        public
        payable
        returns (bool)
    {
        // callData contains the entire function call
        (bool success, bytes memory _data) = address(FORWARDER).call.value(msg.value)(callDataHex);
        return success;
    }
}
