// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;
// This contract is used as an interface to an ERC20 token and staking pool contract
contract Distributor {
    event Deposited(uint256 amount, uint256 duration, address indexed receiver, address indexed from);
    mapping(address => Deposit[]) public depositsOf;
    struct Deposit {
        uint256 amount;
        uint256 shareAmount;
        uint64 start;
        uint64 end;
    }
    function totalSupply() public view returns(uint) { return 0; }
    function getDepositsOf(address _account) public view returns (Deposit[] memory) { return depositsOf[_account]; }
    function kick(uint256 _depositId, address _user) external {}
    function distributeRewards(uint256 _amount) external {}
    function allowance(address owner, address spender) external view returns (uint256) { return 0; }
    function approve(address spender, uint256 amount) external returns (bool) { return true; }
}
