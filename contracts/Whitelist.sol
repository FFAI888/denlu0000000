// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Whitelist v1.53
 * @dev 简单白名单：Owner 管理 + 转移 Owner + 添加/移除白名单 + 查询
 */
contract Whitelist {
    address public owner;
    mapping(address => bool) private whitelist;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event WhitelistAdded(address indexed account);
    event WhitelistRemoved(address indexed account);

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function addWhitelist(address account) external onlyOwner {
        whitelist[account] = true;
        emit WhitelistAdded(account);
    }

    function removeWhitelist(address account) external onlyOwner {
        whitelist[account] = false;
        emit WhitelistRemoved(account);
    }

    function isWhitelisted(address account) external view returns (bool) {
        return whitelist[account];
    }
}
