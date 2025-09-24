// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Whitelist {
    address public owner;
    mapping(address => bool) private whitelist;

    event Added(address indexed user);
    event Removed(address indexed user);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
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
