# Smart Contract Update Plan: Store Complete User Profile Data On-Chain

## Current Problem
The current implementation stores only the user's name on the blockchain (in the `ChatApp` contract), while other user data like email, physical address, and account type are stored in localStorage. This creates a disconnect and doesn't leverage the blockchain's data persistence capabilities.

## Contract Modifications

### 1. Update the User struct in ChatApp.sol

```solidity
// User struct to store user information
struct User {
    string name;
    string email;           // New field
    string physicalAddress; // New field
    string accountType;     // Already existing: "0" for Patient, "1" for Doctor
    Friend[] friendList;
    bool exists;
}
```

### 2. Modify the createAccount function to accept all parameters

```solidity
// Create a new user account
function createAccount(
    string calldata name,
    string calldata email,
    string calldata physicalAddress,
    string calldata accountType
) external {
    require(!users[msg.sender].exists, "User already exists");
    require(bytes(name).length > 0, "Username cannot be empty");

    User storage newUser = users[msg.sender];
    newUser.name = name;
    newUser.email = email;
    newUser.physicalAddress = physicalAddress;
    newUser.accountType = accountType;
    newUser.exists = true;

    emit UserCreated(msg.sender, name, accountType);
}
```

### 3. Add a new event to track complete user creation

```solidity
// Add this with the other events
event UserProfileCreated(
    address indexed user,
    string name,
    string email,
    string physicalAddress,
    string accountType
);
```

Then update the function to emit this event:

```solidity
// Inside createAccount function
emit UserProfileCreated(msg.sender, name, email, physicalAddress, accountType);
```

### 4. Add a function to retrieve complete user profile

```solidity
// Get a user's complete profile
function getUserProfile(address pubkey) external view userExists(pubkey) returns(
    string memory name,
    string memory email,
    string memory physicalAddress,
    string memory accountType
) {
    User storage user = users[pubkey];
    return (
        user.name,
        user.email,
        user.physicalAddress,
        user.accountType
    );
}
```

## Client-Side Modifications

### 1. Update createAccount function in ChatAppContext.js

```javascript
const createAccount = async ({ name, email, userAddress, category }) => {
    try {
        if (!name || !email || !userAddress || !category || !account) {
            return setError("All fields are required");
        }

        setLoading(true);
        
        // Check if user is already registered
        const isAlreadyRegistered = await checkUserRegistration(account);
        if (isAlreadyRegistered) {
            setLoading(false);
            setError("This wallet address is already registered");
            return;
        }

        const contract = await connectingWithContract();
        
        // Call the contract with all user data
        try {
            // Get provider to access current gas price
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const gasPrice = await provider.getGasPrice();
            
            // Call the updated contract function with all parameters
            const getCreatedUser = await contract.createAccount(
                name,
                email,
                userAddress, // physical address
                category,    // accountType
                {
                    gasLimit: 6000000, // Increased gas limit for more data
                    gasPrice: gasPrice.mul(110).div(100) // Add 10% to current gas price
                }
            );
            
            // Wait for transaction confirmation
            const receipt = await getCreatedUser.wait();
            
            if (receipt.status === 1) {
                console.log("Account created successfully");
                
                // No need to store in localStorage anymore since all data is on-chain
                // But we can keep a reference for quick access
                localStorage.setItem('userCategory', category);
                
                // Update registration status
                setIsRegistered(true);
                
                // Refresh data
                await fetchData();
                
                window.location.reload();
            } else {
                throw new Error("Transaction failed");
            }
        } catch (error) {
            console.error("Contract error:", error);
            
            // Handle specific error cases
            if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
                setError("Failed to estimate gas. The contract might be reverting. Please check your inputs.");
            } else if (error.message.includes("User already exists")) {
                setError("This wallet address is already registered");
            } else {
                setError("Error creating account: " + (error.reason || error.message || "Unknown error"));
            }
            
            throw error;
        }
    } catch (error) {
        console.error("Error creating account:", error);
        setError("Error while creating your account. Please try again.");
    } finally {
        setLoading(false);
    }
};
```

### 2. Update fetchData function to get complete user profile

```javascript
// In fetchData function, update this section:
if (registered) {
    try {
        // Get complete user profile instead of just username
        const userProfile = await contract.getUserProfile(connectAccount);
        setUserName(userProfile.name);
        
        // Store other user data in state if needed
        // setUserEmail(userProfile.email);
        // setUserAddress(userProfile.physicalAddress);
        // setUserCategory(userProfile.accountType);
        
        // Get my friend list
        const friendLists = await contract.getMyFriendList();
        setFriendLists(friendLists);

        // Rest of the code...
    } catch (error) {
        console.log("Error fetching user data:", error.message);
    }
}
```

### 3. Update getUserData function to primarily use on-chain data

```javascript
// Get user data including additional fields
const getUserData = async (address) => {
    try {
        const contract = await connectingWithContract();
        
        // Check if user exists
        const exists = await contract.checkUserExists(address);
        if (!exists) return null;
        
        // Get data from contract
        const userProfile = await contract.getUserProfile(address);
        
        return {
            name: userProfile.name,
            email: userProfile.email,
            userAddress: userProfile.physicalAddress,
            category: userProfile.accountType,
            // Other fields can be added as needed
        };
    } catch (error) {
        console.error("Error getting user data:", error);
        
        // Fallback to localStorage (for backward compatibility)
        try {
            const userData = localStorage.getItem(`userData_${address}`);
            return userData ? JSON.parse(userData) : null;
        } catch (storageError) {
            console.error("Error getting user data from localStorage:", storageError);
            return null;
        }
    }
};
```

## Deployment Process

1. Compile the updated contract
```bash
npx hardhat compile
```

2. Deploy to the desired network (e.g., Polygon Amoy)
```bash
npx hardhat run scripts/deploy.js --network polygon_amoy
```

3. Update the contract address in `Context/constants.js` file with the new deployed contract address

4. Update the ABI in `Context/ChatApp.json` with the new compiled contract ABI

## Gas Considerations

The updated contract will require more gas for user registration since we're storing more data on-chain. Consider these optimizations:

1. Use string length limits if possible
2. Consider whether email and physical address need to be stored on-chain or if they could be stored off-chain (e.g., IPFS) with only a hash stored on-chain
3. Increase the gas limit for the createAccount function to account for additional storage

## Security Considerations

1. User data like email and physical address will now be publicly visible on the blockchain
2. Consider adding access control for sensitive user data
3. For maximum privacy, consider storing encrypted versions of email and address on-chain
