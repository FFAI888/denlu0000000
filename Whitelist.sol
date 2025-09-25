// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Whitelist 合约
 * @dev 提供白名单管理功能，支持添加/删除白名单，查询用户是否在白名单，支持所有权转移。
 */
contract Whitelist {
    address private _owner;
    mapping(address => bool) private _whitelist;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event AddedToWhitelist(address indexed account);
    event RemovedFromWhitelist(address indexed account);

    constructor() {
        _owner = msg.sender;
        emit OwnershipTransferred(address(0), _owner);
    }

    modifier onlyOwner() {
        require(owner() == msg.sender, "Not owner");
        _;
    }

    function owner() public view returns (address) {
        return _owner;
    }

    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "New owner is zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }

    function addWhitelist(address account) public onlyOwner {
        require(!_whitelist[account], "Already whitelisted");
        _whitelist[account] = true;
        emit AddedToWhitelist(account);
    }

    function removeWhitelist(address account) public onlyOwner {
        require(_whitelist[account], "Not in whitelist");
        _whitelist[account] = false;
        emit RemovedFromWhitelist(account);
    }

    function isWhitelisted(address account) public view returns (bool) {
        return _whitelist[account];
    }
}
