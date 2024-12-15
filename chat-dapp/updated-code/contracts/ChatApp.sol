// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;
pragma experimental ABIEncoderV2;

contract ChatApp {

    // User structure
    struct User {
        string name;
        Friend[] friendList;
    }

    // Friend structure
    struct Friend {
        address pubkey;
        string name;
    }

    // Message structure
    struct Message {
        address sender;
        uint256 timestamp;
        string msg;
    }

    // Structure for storing all user information
    struct AllUserStruct {
        string name;
        address accountAddress;
    }

    AllUserStruct[] private allUsers; // List of all registered users

    mapping(address => User) private userList; // Maps user addresses to user data
    mapping(bytes32 => Message[]) private allMessages; // Maps chat codes to messages

    // Check if a user exists
    function checkUserExists(address pubkey) public view returns (bool) {
        return bytes(userList[pubkey].name).length > 0;
    }

    // Create an account
    function createAccount(string calldata name) external {
        require(!checkUserExists(msg.sender), "User already exists");
        require(bytes(name).length > 0, "Username cannot be empty");

        userList[msg.sender].name = name;
        allUsers.push(AllUserStruct(name, msg.sender));
    }

    // Get a user's name
    function getUsername(address pubkey) external view returns (string memory) {
        require(checkUserExists(pubkey), "User is not registered");
        return userList[pubkey].name;
    }

    // Add a friend
    function addFriend(address friendKey, string calldata name) external {
        require(checkUserExists(msg.sender), "Create an account first");
        require(checkUserExists(friendKey), "User is not registered");
        require(msg.sender != friendKey, "Cannot add yourself as a friend");
        require(!checkAlreadyFriends(msg.sender, friendKey), "Already friends");

        _addFriend(msg.sender, friendKey, name);
        _addFriend(friendKey, msg.sender, userList[msg.sender].name);
    }

    // Check if two users are already friends
    function checkAlreadyFriends(address pubkey1, address pubkey2) internal view returns (bool) {
        for (uint256 i = 0; i < userList[pubkey1].friendList.length; i++) {
            if (userList[pubkey1].friendList[i].pubkey == pubkey2) {
                return true;
            }
        }
        return false;
    }

    // Internal function to add a friend
    function _addFriend(address me, address friendKey, string memory name) internal {
        Friend memory newFriend = Friend(friendKey, name);
        userList[me].friendList.push(newFriend);
    }

    // Get the friend list of the caller
    function getMyFriendList() external view returns (Friend[] memory) {
        return userList[msg.sender].friendList;
    }

    // Generate a chat code for two users
    function _getChatCode(address pubkey1, address pubkey2) internal pure returns (bytes32) {
        require(pubkey1 != address(0) && pubkey2 != address(0), "Invalid addresses");
        return pubkey1 < pubkey2 
            ? keccak256(abi.encodePacked(pubkey1, pubkey2)) 
            : keccak256(abi.encodePacked(pubkey2, pubkey1));
    }

    // Send a message
    function sendMessage(address friendKey, string calldata _msg) external {
        require(checkUserExists(msg.sender), "Create an account first");
        require(checkUserExists(friendKey), "User is not registered");
        require(friendKey != msg.sender, "Cannot send message to yourself");
        require(checkAlreadyFriends(msg.sender, friendKey), "You are not friends");
        require(bytes(_msg).length > 0, "Message cannot be empty");

        bytes32 chatCode = _getChatCode(msg.sender, friendKey);
        Message memory newMsg = Message(msg.sender, block.timestamp, _msg);
        allMessages[chatCode].push(newMsg);
    }

    // Read messages between the caller and a friend
    function readMessage(address friendKey) external view returns (Message[] memory) {
        require(checkUserExists(msg.sender), "Create an account first");
        require(checkUserExists(friendKey), "User is not registered");
        require(checkAlreadyFriends(msg.sender, friendKey), "You are not friends");

        bytes32 chatCode = _getChatCode(msg.sender, friendKey);
        return allMessages[chatCode];
    }

    // Get all registered users
    function getAllAppUsers() external view returns (AllUserStruct[] memory) {
        return allUsers;
    }
}