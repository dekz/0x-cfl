pragma solidity ^0.5.9;
pragma experimental ABIEncoderV2;

// libraries
import "@0x/contracts-exchange-libs/contracts/src/LibFillResults.sol";
import "@0x/contracts-erc20/contracts/src/LibERC20Token.sol";
import "@0x/contracts-utils/contracts/src/LibSafeMath.sol";

// interfaces
import "@0x/contracts-erc20/contracts/src/interfaces/IERC20Token.sol";
import "@0x/contracts-exchange/contracts/src/interfaces/IExchange.sol";
import "@0x/contracts-asset-proxy/contracts/src/interfaces/IAssetData.sol";
import "@0x/contracts-erc20/contracts/src/interfaces/IEtherToken.sol";
import "./interfaces/ICERC20.sol";
import "./interfaces/ICETH.sol";
import "./interfaces/IComptroller.sol";

contract SimpleMarginTrading
{
    using LibSafeMath for uint256;

    // constants
    uint256 constant internal MAX_UINT = uint256(-1);

    // contract references
    address payable internal OWNER;
    IExchange internal EXCHANGE;
    IComptroller internal COMPTROLLER;
    ICERC20 internal CDAI;
    ICETH internal CETH;
    IEtherToken internal WETH; // possible to get underlying address of C token from contract?
    IERC20Token internal DAI;

    // margin position related variables
    uint256 internal positionBalance = 0; // total position size (ETH locked in CETH + WETH + contract balance)

    struct ZeroExQuote {
        address buyToken;
        address sellToken;
        uint256 buyAmount;
        uint256 sellAmount;
        uint256 protocolFee;
        bytes calldataHex;
    }

    constructor (
        address _exchange,
        address _comptroller,
        address _cdai,
        address _dai,
        address payable _ceth,
        address _weth
        )
        public
    {
        EXCHANGE = IExchange(_exchange);
        COMPTROLLER = IComptroller(_comptroller);
        CDAI = ICERC20(_cdai);
        CETH = ICETH(_ceth);
        WETH = IEtherToken(_weth);
        DAI = IERC20Token(_dai);

        OWNER = msg.sender;

        // Enter markets
        _enterMarkets();
    }

    // receive ETH
    function () external payable {
    }

    // modifiers
    modifier onlyOwner() {
        require(msg.sender == OWNER, "permission denied");
        _;
    }

    modifier onlyWhenClosed() {
        require(positionBalance == 0, "position not closed");
        _;
    }

    modifier onlyWhenOpen() {
        require(positionBalance != 0, "position not open");
        _;
    }

    function _enterMarkets()
        internal
    {
        address[] memory markets = new address[](2);
        markets[0] = address(CETH);
        markets[1] = address(CDAI);
        uint[] memory errors = COMPTROLLER.enterMarkets(markets);
        require(errors[0] == 0, "CETH cant enter market");
        require(errors[1] == 0, "CDAI cant enter market");
    }

    function _getZeroExApprovalAddress()
        internal
        view
        returns (address)
    {
        bytes4 erc20ProxyId = IAssetData(address(0)).ERC20Token.selector;
        return EXCHANGE.getAssetProxy(erc20ProxyId);
    }

    function _approve(address token, address delegated)
        internal
    {
        LibERC20Token.approve(token, delegated, MAX_UINT);
    }

    function open(ZeroExQuote memory quote)
        public
        payable
        onlyOwner
        onlyWhenClosed
        returns (uint256 positionBalance, uint256 wethBalance, uint256 borrowBalance, uint256 debug)
    {
        // increase position by msg.value - protocolFee
        positionBalance = msg.value.safeSub(quote.protocolFee);
        // mint collateral in compound
        CETH.mint.value(positionBalance)();
        CETH.borrow(100);
        require(debug == 0, "borrow didn't work");
        // borrow token
        // swap token for collateral
        _approve(address(DAI), _getZeroExApprovalAddress());
        // execute swap
        // (bool success, bytes memory data) = address(EXCHANGE).call.value(quote.protocolFee)(quote.calldataHex);
        // require(success, "Swap not filled.");
        // // decode fill results
        // LibFillResults.FillResults memory fillResults = abi.decode(data, (LibFillResults.FillResults));
        // // position size increase by bought amount of WETH
        // positionBalance += fillResults.makerAssetFilledAmount;
        wethBalance = WETH.balanceOf(address(this));
        borrowBalance = CDAI.borrowBalanceCurrent(address(this));
        // at this point you have CETH, and swapped for WETH
    }

    function close(
       ZeroExQuote memory quote
    )
        public
        onlyOwner
        onlyWhenOpen
        returns (bool)
    {
        // approve for swap
        _approve(address(WETH), _getZeroExApprovalAddress());
        // verify swap
        uint256 wethBalance = WETH.balanceOf(address(this));
        uint256 daiBorrowBalance = CDAI.borrowBalanceCurrent(address(this)); // TODO

        require(wethBalance < quote.sellAmount, "not enough to swap");
        require(quote.buyToken == address(DAI), "not buying DAI");
        require(daiBorrowBalance < quote.buyAmount, "not enough DAI to repay");
        // execute swap
        (bool success, bytes memory data) = address(EXCHANGE).call.value(quote.protocolFee)(quote.calldataHex);
        require(success, "Swap not filled.");
        // decode results
        LibFillResults.FillResults memory fillResults = abi.decode(data, (LibFillResults.FillResults));
        // return back DAI
        _approve(address(DAI), address(CDAI));
        // verify sufficient DAI to repay
        require(CDAI.repayBorrow(fillResults.makerAssetFilledAmount) == 0);
        // get back ETH
        require(CETH.redeem(CETH.borrowBalanceCurrent(address(this))) == 0); // TODO correct?
        // withdraw all WETH Balance;
        WETH.withdraw(wethBalance);
        // transfer all ETH back to owner;
        OWNER.transfer(address(this).balance);
        // reset balance
        wethBalance = 0;
        positionBalance = 0;
        return false;
    }
}
