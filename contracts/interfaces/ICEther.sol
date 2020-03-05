pragma solidity ^0.5.9;
pragma experimental ABIEncoderV2;

// interfaces
import "./ICToken.sol";

contract ICEther is ICToken {
    function mint() external payable; // For ETH
    function repayBorrow() external payable; // For ETH
    function repayBorrowBehalf(address borrower) external payable; // For ETH
    function borrowBalanceCurrent(address account) external returns (uint);
}
