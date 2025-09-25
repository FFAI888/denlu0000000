// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Whitelist {
    address public owner;
    mapping(address => bool) private whitelist;
    address[] private whitelistArray; // ✅ 保存所有曾经加入过的地址

    event Added(address indexed user);
    event Removed(address indexed user);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);

    constructor() {
        owner = msg.sender; // 部署者初始为 owner
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function addWhitelist(address user) external onlyOwner {
        require(!whitelist[user], "Already whitelisted");
        whitelist[user] = true;
        whitelistArray.push(user); // ✅ 保存进数组
        emit Added(user);
    }

    function removeWhitelist(address user) external onlyOwner {
        require(whitelist[user], "Not whitelisted");
        whitelist[user] = false;
        emit Removed(user);
    }

    function isWhitelisted(address user) external view returns (bool) {
        return whitelist[user];
    }

    // ✅ 新增：返回所有曾经添加过的地址 + 当前状态
    function getAllWhitelist() external view returns (address[] memory, bool[] memory) {
        uint256 len = whitelistArray.length;
        bool[] memory statuses = new bool[](len);
        for (uint256 i = 0; i < len; i++) {
            statuses[i] = whitelist[whitelistArray[i]];
        }
        return (whitelistArray, statuses);
    }
}
