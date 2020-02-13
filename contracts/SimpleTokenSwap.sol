pragma solidity ^0.5.9;
pragma experimental ABIEncoderV2;

// libraries
import "@0x/contracts-utils/contracts/src/LibBytes.sol";
import "@0x/contracts-erc20/contracts/src/LibERC20Token.sol";

// interfaces
import "@0x/contracts-exchange-forwarder/contracts/src/interfaces/IForwarder.sol";
import "@0x/contracts-erc20/contracts/src/interfaces/IERC20Token.sol";
import "@0x/contracts-asset-proxy/contracts/src/interfaces/IAssetData.sol";

contract SimpleTokenSwap
{
    using LibBytes for bytes;

    address internal OWNER;
    IForwarder internal FORWARDER;

    constructor (address _forwarder)
        public
    {
        FORWARDER = IForwarder(_forwarder);
        OWNER = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == OWNER, "permission denied");
        _;
    }

    modifier onlyERC20AssetData(bytes memory assetData) {
        bytes4 proxyId = assetData.readBytes4(0);
        require(proxyId == IAssetData(address(0)).ERC20Token.selector, "only ERC20 asset withdraw");
        _;
    }

    function withdrawAllERC20AssetBalance(bytes memory assetData) public onlyOwner onlyERC20AssetData(assetData) {
        address tokenAddress = assetData.readAddress(16);
        IERC20Token tokenContract = IERC20Token(tokenAddress);
        uint256 balance = tokenContract.balanceOf(address(this));
        LibERC20Token.transfer(tokenAddress, msg.sender, balance);
    }

    function liquidityRequiringFunction(bytes memory callDataHex)
        public
        payable
        returns (bool)
    {
        (bool success, bytes memory _data) = address(FORWARDER).call.value(msg.value)(callDataHex);
        require(success == true, "swap reverted");
        return success;
    }
}
