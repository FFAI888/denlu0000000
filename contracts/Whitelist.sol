// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Whitelist {
    address public owner;
    mapping(address => bool) private whitelist;
    address[] private whitelistArray; // ✅ 新增：记录所有被操作过的地址

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Whitelisted(address indexed user, bool status);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero addr");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setWhitelisted(address user, bool status) external onlyOwner {
        whitelist[user] = status;

        // ✅ 如果是第一次操作该地址，加入数组
        bool exists = false;
        for (uint i = 0; i < whitelistArray.length; i++) {
            if (whitelistArray[i] == user) {
                exists = true;
                break;
            }
        }
        if (!exists) {
            whitelistArray.push(user);
        }

        emit Whitelisted(user, status);
    }

    function isWhitelisted(address user) external view returns (bool) {
        return whitelist[user];
    }

    // ✅ 新增：获取完整白名单
    function getWhitelist() external view returns (address[] memory) {
        uint count = 0;
        for (uint i = 0; i < whitelistArray.length; i++) {
            if (whitelist[whitelistArray[i]]) {
                count++;
            }
        }

        address[] memory result = new address[](count);
        uint j = 0;
        for (uint i = 0; i < whitelistArray.length; i++) {
            if (whitelist[whitelistArray[i]]) {
                result[j] = whitelistArray[i];
                j++;
            }
        }
        return result;
    }
}
