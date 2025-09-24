// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Whitelist {
    address public owner;
    mapping(address => bool) private whitelist;

    event Added(address indexed user);
    event Removed(address indexed user);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);

    // ✅ 固定管理员地址（你指定的钱包）
    constructor() {
        owner = 0x5bab614240fe64c42d476fe9daff414e8d5a735e;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    // 仍可转移所有权（可选使用）
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function addWhitelist(address user) external onlyOwner {
        whitelist[user] = true;
        emit Added(user);
    }

    function removeWhitelist(address user) external onlyOwner {
        whitelist[user] = false;
        emit Removed(user);
    }

    function isWhitelisted(address user) external view returns (bool) {
        return whitelist[user];
    }
}
