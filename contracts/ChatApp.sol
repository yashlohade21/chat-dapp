// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ChatApp {
    // User struct to store user information
    struct User {
        string name;
        string accountType; // "0" for Patient, "1" for Doctor
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

    // Patient settings struct
    struct PatientSettings {
        string patientDataCID;
        string[] documentCIDs;
        uint256 lastUpdated;
        mapping(address => bool) authorizedProviders;
    }

    // Mapping of user addresses to User structs
    mapping(address => User) private users;
    
    // Mapping for messages between two users
    mapping(bytes32 => Message[]) private messages;

    // Mapping for patient settings
    mapping(address => PatientSettings) private patientSettings;

    // Events
    event UserCreated(address indexed user, string name, string accountType);
    event FriendAdded(address indexed user, address indexed friend);
    event MessageSent(bytes32 indexed messageId, address indexed sender, address indexed receiver);
    event DocumentUploaded(address indexed patient, string cid, uint256 timestamp);
    event ConsentGranted(address indexed patient, address indexed provider);
    event ConsentRevoked(address indexed patient, address indexed provider);

    // Modifiers
    modifier userExists(address user) {
        require(users[user].exists, "User does not exist");
        _;
    }

    modifier notFriends(address friend) {
        require(!checkAlreadyFriends(msg.sender, friend), "Already friends");
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
    function createAccount(string calldata name, string calldata accountType) external {
        require(!users[msg.sender].exists, "User already exists");
        require(bytes(name).length > 0, "Username cannot be empty");

        User storage newUser = users[msg.sender];
        newUser.name = name;
        newUser.accountType = accountType;
        newUser.exists = true;

        emit UserCreated(msg.sender, name, accountType);
    }

    // Add a friend
    function addFriend(address friend, string calldata name) external userExists(msg.sender) userExists(friend) notFriends(friend) {
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

    // Add a document CID to a patient's settings
    function addDocumentCID(string calldata cid) external userExists(msg.sender) {
        require(bytes(cid).length > 0, "Invalid CID");
        patientSettings[msg.sender].documentCIDs.push(cid);
        emit DocumentUploaded(msg.sender, cid, block.timestamp);
    }

    // Update patient settings
    function updatePatientSettings(string calldata dataCID, string[] calldata documentCIDs) external userExists(msg.sender) {
        PatientSettings storage settings = patientSettings[msg.sender];
        settings.patientDataCID = dataCID;
        settings.documentCIDs = documentCIDs;
        settings.lastUpdated = block.timestamp;
    }

    // Get patient settings
    function getPatientSettings(address patient) external view userExists(patient) returns(string memory, string[] memory, uint256) {
        PatientSettings storage settings = patientSettings[patient];
        return (settings.patientDataCID, settings.documentCIDs, settings.lastUpdated);
    }

    // Check if patient has settings
    function hasPatientSettings(address patient) external view returns(bool) {
        return bytes(patientSettings[patient].patientDataCID).length > 0;
    }

    // Grant consent to healthcare provider
    function grantConsent(address provider) external userExists(msg.sender) userExists(provider) {
        require(provider != msg.sender, "Cannot grant consent to self");
        patientSettings[msg.sender].authorizedProviders[provider] = true;
        emit ConsentGranted(msg.sender, provider);
    }

    // Revoke consent from healthcare provider
    function revokeConsent(address provider) external userExists(msg.sender) {
        patientSettings[msg.sender].authorizedProviders[provider] = false;
        emit ConsentRevoked(msg.sender, provider);
    }

    // Check if provider has consent
    function hasConsent(address patient, address provider) external view returns(bool) {
        return patientSettings[patient].authorizedProviders[provider];
    }
}