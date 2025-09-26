// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Whitelist {
    address public owner;
    mapping(address => bool) public whitelisted;
    address[] private whitelistArr;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event WhitelistUpdated(address indexed user, bool status);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Invalid address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setWhitelisted(address user, bool status) public onlyOwner {
        whitelisted[user] = status;
        emit WhitelistUpdated(user, status);
        bool exists = false;
        for(uint i=0;i<whitelistArr.length;i++){
            if(whitelistArr[i]==user){ exists=true; break; }
        }
        if(status && !exists){
            whitelistArr.push(user);
        }else if(!status && exists){
            for(uint i=0;i<whitelistArr.length;i++){
                if(whitelistArr[i]==user){
                    whitelistArr[i] = whitelistArr[whitelistArr.length-1];
                    whitelistArr.pop();
                    break;
                }
            }
        }
    }

    function isWhitelisted(address user) public view returns(bool){
        return whitelisted[user];
    }

    function getWhitelist() public view returns(address[] memory){
        return whitelistArr;
    }
}
