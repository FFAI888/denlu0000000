// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Whitelist {
    address public owner;
    mapping(address => bool) private whitelist;

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
