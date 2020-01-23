pragma solidity ^0.5.9;
pragma experimental ABIEncoderV2;

import "@0x/contracts-erc20/contracts/src/interfaces/IERC20Token.sol";
import "@0x/contracts-erc20/contracts/src/LibERC20Token.sol";
import "@0x/contracts-exchange/contracts/src/interfaces/IExchange.sol";
import "@0x/contracts-utils/contracts/src/LibSafeMath.sol";
import "@0x/contracts-asset-proxy/contracts/src/interfaces/IAssetData.sol";
import "@0x/contracts-exchange-libs/contracts/src/LibFillResults.sol";
import "@0x/contracts-erc20/contracts/src/interfaces/IEtherToken.sol";

// Compound v2 protocol interfaces written by InstaDapp
interface CTokenInterface {
    function redeem(uint redeemTokens) external returns (uint);
    function redeemUnderlying(uint redeemAmount) external returns (uint);
    function borrow(uint borrowAmount) external returns (uint);
    function liquidateBorrow(address borrower, uint repayAmount, address cTokenCollateral) external returns (uint);
    function liquidateBorrow(address borrower, address cTokenCollateral) external payable;
    function exchangeRateCurrent() external returns (uint);
    function getCash() external view returns (uint);
    function totalBorrowsCurrent() external returns (uint);
    function borrowRatePerBlock() external view returns (uint);
    function supplyRatePerBlock() external view returns (uint);
    function totalReserves() external view returns (uint);
    function reserveFactorMantissa() external view returns (uint);

    function totalSupply() external view returns (uint256);
    function balanceOf(address owner) external view returns (uint256 balance);
    function allowance(address, address) external view returns (uint);
    function approve(address, uint) external;
    function transfer(address, uint) external returns (bool);
    function transferFrom(address, address, uint) external returns (bool);
}

interface CERC20Interface {
    function mint(uint mintAmount) external returns (uint); // For ERC20
    function repayBorrow(uint repayAmount) external returns (uint); // For ERC20
    function repayBorrowBehalf(address borrower, uint repayAmount) external returns (uint); // For ERC20
    function borrowBalanceCurrent(address account) external returns (uint);
}

interface CETHInterface {
    function mint() external payable; // For ETH
    function repayBorrow() external payable; // For ETH
    function repayBorrowBehalf(address borrower) external payable; // For ETH
    function borrowBalanceCurrent(address account) external returns (uint);
}

interface ComptrollerInterface {
    function enterMarkets(address[] calldata cTokens) external returns (uint[] memory);
    function exitMarket(address cTokenAddress) external returns (uint);
    function getAssetsIn(address account) external view returns (address[] memory);
    function getAccountLiquidity(address account) external view returns (uint, uint, uint);
}

contract SimpleTokenSwapContract
{
    using LibSafeMath for uint256;

    uint256 constant internal MAX_UINT = uint256(-1);

    address internal OWNER;
    IExchange internal EXCHANGE;
    ComptrollerInterface internal COMPTROLLER;
    CERC20Interface internal CDAI;
    CETHInterface internal CETH;
    IEtherToken internal WETH;
    IERC20Token internal DAI;

    uint256 internal positionBalance = 0;
    uint256 internal wethBalance = 0;

    constructor (address _exchange, address _comptroller, address _cdai, address _ceth, address _weth, address _dai)
        public
    {
        EXCHANGE = IExchange(_exchange);
        COMPTROLLER = ComptrollerInterface(_comptroller);
        CDAI = CERC20Interface(_ceth);
        CETH = CETHInterface(_cdai);
        WETH = IEtherToken(_weth);
        DAI = IERC20Token(_dai);
        OWNER = msg.sender;
        // Enter markets
        _enterMarkets();
    }

    modifier onlyOwner() {
        require(msg.sender == OWNER, "permission denied");
        _;
    }

    modifier onlyWhenClosed() {
        require(positionBalance == 0 && wethBalance == 0, "position not closed");
    }

    modifier onlyWhenOpen() {
        require(positionBalance != 0 && wethBalance == 0, "position not closed");
    }

    function _enterMarkets()
        internal
    {
        COMPTROLLER.enterMarkets([address(CETH), address(CDAI)]);
    }

    function _approve0x(address token)
        internal
    {
        bytes4 erc20ProxyId = IAssetData(address(0)).ERC20Token.selector;
        address proxyAddress = EXCHANGE.getAssetProxy(erc20ProxyId);
        LibERC20Token.approve(token, proxyAddress, MAX_UINT);
    }

    function _approve(address token, address ctoken)
        internal
    {
        LibERC20Token.approve(token, ctoken, MAX_UINT);
    }

    function leverage(uint256 leverageDaiAmt, uint256 protocolFeeAmount, bytes memory swapTokenCallDataHex)
        public
        payable
        onlyOwner
        onlyWhenClosed
        returns (bool)
    {
        // increase position by msg.value - protocolFeeAmount
        positionBalance = msg.value.safeSub(protocolFeeAmount);
        // mint collateral in compound
        CETH.mint.value(positionBalance)();
        // borrow token
        assert(CDAI.borrow(amt) == 0);
        // swap token for collateral
        _approve0x(address(DAI));
        // TODO check swap amounts are correct?
        (bool success, bytes memory data) = address(EXCHANGE).call.value(protocolFeeAmount)(swapTokenCallDataHex);
        require(success, "Swap not filled.");
        LibFillResults.FillResults memory fillResults = abi.decode(data, (LibFillResults.FillResults));
        // position size increase by bought amount of WETH
        wethBalance = fillResults.makerAssetFilledAmount;
        positionBalance += wethBalance;
        return success;
    }

    function close(
       uint256 protocolFeeAmount,
       bytes memory swapTokenCallDataHex
    )
        public
        onlyOwner
        onlyWhenOpen
        returns (bool)
    {
        // swap WETH for DAI
        _approve0x(address(WETH));
        // TODO check swap amounts are correct?
        (bool success, bytes memory data) = address(EXCHANGE).call.value(protocolFeeAmount)(swapTokenCallDataHex);
        require(success, "Swap not filled.");
        LibFillResults.FillResults memory fillResults = abi.decode(data, (LibFillResults.FillResults));
        // update WETH balance
        wethBalance -= fillResults.takerAssetFilledAmount;
        // return back DAI
        _approve(address(DAI), address(CDAI));
        require(CDAI.repayBorrow(fillResults.makerAssetFilledAmount) == 0);
        // get back ETH
        require(CETH.redeem(CETH.borrowBalanceCurrent(address(this))) == 0);
        // withdraw all WETH Balance;
        ETHER_TOKEN.withdraw(wethBalance);
        // transfer all ETH back to owner;
        owner.transfer(this.balance);
        // reset balance
        wethBalance = 0;
        positionBalance = 0;
        return false;
    }
}
