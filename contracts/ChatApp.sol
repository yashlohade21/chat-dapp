// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract ChatApp {
    // User struct to store user information
    struct User {
        string name;
        Friend[] friendList;
        bool exists;
    }

    // Friend struct to store friend information
    struct Friend {
        address pubkey;
        string name;
    }

    // Message struct to store message information
    struct Message {
        address sender;
        uint256 timestamp;
        string msg;
    }

    // Patient data struct with version tracking
    struct PatientData {
        string encryptedDataCID;
        uint256 lastUpdated;
        uint256 version;
        bool exists;
    }

    struct Profile {
        string name;
        string email;
        string phone;
    }

    mapping(address => Profile) public profiles;
    
    // Mapping of user addresses to User structs
    mapping(address => User) private users;
    
    // Mapping for messages between two users
    mapping(bytes32 => Message[]) private messages;

    // Mapping to store patient data
    mapping(address => PatientData) private patientData;

    // Events
    event UserCreated(address indexed user, string name);
    event FriendAdded(address indexed user, address indexed friend);
    event MessageSent(bytes32 indexed messageId, address indexed sender, address indexed receiver);
    event PatientDataUpdated(address indexed patient, string dataCID, uint256 timestamp);

    // Modifiers
    modifier userExists(address user) {
        require(users[user].exists, "User is not registered");
        _;
    }

    // Modifier to check if users are not already friends
    modifier notFriends(address friend) {
        require(!checkAlreadyFriends(msg.sender, friend), "You are already friends");
        _;
    }

    // Helper function to check if users are already friends
    function checkAlreadyFriends(address pubkey1, address pubkey2) internal view returns(bool) {
        if(!users[pubkey1].exists || !users[pubkey2].exists) {
            return false;
        }

        Friend[] memory friends = users[pubkey1].friendList;
        for(uint256 i = 0; i < friends.length; i++) {
            if(friends[i].pubkey == pubkey2) return true;
        }
        return false;
    }

    // Create a new user account
    function createAccount(string calldata name) external {
        require(!users[msg.sender].exists, "User already exists");
        require(bytes(name).length > 0, "Username cannot be empty");

        User storage newUser = users[msg.sender];
        newUser.name = name;
        newUser.exists = true;

        emit UserCreated(msg.sender, name);
    }

    // Add a friend
    function addFriend(address friend, string calldata name) 
        external 
        userExists(msg.sender) 
        userExists(friend) 
        notFriends(friend) 
    {
        require(friend != msg.sender, "Cannot add self as friend");
        
        users[msg.sender].friendList.push(Friend(friend, name));
        users[friend].friendList.push(Friend(msg.sender, users[msg.sender].name));

        emit FriendAdded(msg.sender, friend);
    }

    // Get user's friend list
    function getMyFriendList() external view userExists(msg.sender) returns(Friend[] memory) {
        return users[msg.sender].friendList;
    }

    // Get chat code (unique identifier for a conversation)
    function _getChatCode(address pubkey1, address pubkey2) internal pure returns(bytes32) {
        if(pubkey1 < pubkey2) {
            return keccak256(abi.encodePacked(pubkey1, pubkey2));
        } else {
            return keccak256(abi.encodePacked(pubkey2, pubkey1));
        }
    }

    // Send message to a friend
    function sendMessage(address friend, string calldata _msg) external userExists(msg.sender) userExists(friend) {
        require(checkAlreadyFriends(msg.sender, friend), "Not friends");
        
        bytes32 chatCode = _getChatCode(msg.sender, friend);
        messages[chatCode].push(Message(msg.sender, block.timestamp, _msg));
        
        emit MessageSent(chatCode, msg.sender, friend);
    }

    // Read messages with a friend
    function readMessage(address friend) external view userExists(msg.sender) userExists(friend) returns(Message[] memory) {
        bytes32 chatCode = _getChatCode(msg.sender, friend);
        return messages[chatCode];
    }

    // Get a user's name
    function getUsername(address pubkey) external view userExists(pubkey) returns(string memory) {
        return users[pubkey].name;
    }

    function saveProfile(string memory _name, string memory _email, string memory _phone) public {
        profiles[msg.sender] = Profile(_name, _email, _phone);
    }

    function getProfile() public view returns (string memory, string memory, string memory) {
        Profile memory profile = profiles[msg.sender];
        return (profile.name, profile.email, profile.phone);
    }

    // Get all registered users
    function getAllAppUser() external view returns(User[] memory) {
        uint256 userCount = 0;
        for(uint256 i = 0; i < msg.sender.balance; i++) {
            if(users[address(uint160(i))].exists) userCount++;
        }

        User[] memory allUsers = new User[](userCount);
        uint256 index = 0;
        for(uint256 i = 0; i < msg.sender.balance; i++) {
            if(users[address(uint160(i))].exists) {
                allUsers[index] = users[address(uint160(i))];
                index++;
            }
        }
        return allUsers;
    }

    // Check if a user exists
    function checkUserExists(address pubkey) external view returns(bool) {
        return users[pubkey].exists;
    }

    // Update patient data with version tracking
    function updatePatientData(string memory encryptedDataCID) external userExists(msg.sender) {
        PatientData storage data = patientData[msg.sender];
        data.encryptedDataCID = encryptedDataCID;
        data.lastUpdated = block.timestamp;
        data.version = data.exists ? data.version + 1 : 1;
        data.exists = true;

        emit PatientDataUpdated(msg.sender, encryptedDataCID, block.timestamp);
    }

    // Get patient data including version
    function getPatientData(address patient) external view returns (string memory, uint256, uint256, bool) {
        PatientData memory data = patientData[patient];
        return (data.encryptedDataCID, data.lastUpdated, data.version, data.exists);
    }
}