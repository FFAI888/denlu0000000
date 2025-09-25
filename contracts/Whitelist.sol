// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Whitelist 合约
 * @dev 提供白名单管理功能：添加/删除白名单、查询白名单、管理员转移。
 * 部署者（msg.sender）在构造函数中成为初始管理员（owner）。
 */
contract Whitelist {
    address private _owner;
    mapping(address => bool) private _whitelist;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event AddedToWhitelist(address indexed account);
    event RemovedFromWhitelist(address indexed account);

    constructor() {
        _owner = msg.sender;                // 部署者即管理员
        emit OwnershipTransferred(address(0), _owner);
    }

    modifier onlyOwner() {
        require(owner() == msg.sender, "Not owner");
        _;
    }

    /// @notice 当前管理员地址
    function owner() public view returns (address) {
        return _owner;
    }

    /// @notice 转移管理员权限
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "New owner is zero address");
        require(newOwner != _owner, "New owner is the same as current owner");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }

    /// @notice 查询是否在白名单（登录页使用）
    function isWhitelisted(address account) public view returns (bool) {
        return _whitelist[account];
    }

    /// @notice 添加白名单（管理员）
    function addWhitelist(address account) public onlyOwner {
        require(!_whitelist[account], "Already whitelisted");
        _whitelist[account] = true;
        emit AddedToWhitelist(account);
    }

    /// @notice 移除白名单（管理员）
    function removeWhitelist(address account) public onlyOwner {
        require(_whitelist[account], "Not in whitelist");
        _whitelist[account] = false;
        emit RemovedFromWhitelist(account);
    }
}
