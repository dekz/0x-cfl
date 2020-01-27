pragma solidity ^0.5.9;
pragma experimental ABIEncoderV2;

// interfaces
import "./ICToken.sol";

contract ICERC20 is ICToken {
    function mint(uint mintAmount) external returns (uint); // For ERC20
    function repayBorrow(uint repayAmount) external returns (uint); // For ERC20
    function repayBorrowBehalf(address borrower, uint repayAmount) external returns (uint); // For ERC20
    function borrowBalanceCurrent(address account) external returns (uint);
}