De-Chat: A Decentralized Chat Application

## Context Management
- Always provide default values when destructuring from context
- Handle cases where context might be undefined during SSR
- Use optional chaining when accessing context values
- Include proper error boundaries for context-related errors
- Use `|| {}` when destructuring from useContext to handle SSR
- Allow unauthenticated access to index and 404 pages
- Prevent unnecessary redirects during initial page load
- When destructuring values that could be undefined, provide defaults: `const { account = '' } = useContext(ChatAppContect) || {}`

## Component Best Practices
- Always provide key props for mapped elements
- Include all dependencies in useEffect dependency arrays
- Use controlled inputs with value prop and onChange handler
- Remove or properly implement all referenced services before using them
- Handle loading states explicitly
- Clean up useEffect subscriptions when component unmounts
- Validate file uploads with size and type checks
- Always provide default values when destructuring from context
- Handle cases where context might be undefined during SSR
- Use optional chaining when accessing context values
- Include proper error boundaries for context-related errors
- Use `|| {}` when destructuring from useContext to handle SSR
- Allow unauthenticated access to index and 404 pages
- Prevent unnecessary redirects during initial page load
- When destructuring values that could be undefined, provide defaults: `const { account = '' } = useContext(ChatAppContect) || {}`

## Dependencies
Required packages for HIPAA compliance and security:
- crypto-js: For encryption of sensitive patient data
- tweetnacl: For asymmetric encryption
- tweetnacl-util: For encoding/decoding encrypted data
- axios: For making HTTP requests to IPFS/Pinata API

## Encryption Key Management
- Store encryption keys in localStorage to persist across sessions
- Generate new key only if none exists in localStorage
- Use Web Crypto API's subtle.generateKey when available
- Fall back to getRandomValues if subtle crypto fails
- Final fallback to CryptoJS.random
- Never store encryption keys on chain
- Use same key for related encrypt/decrypt operations
- Handle key generation failures gracefully with CryptoJS fallback

## Form Validation & Security
- Validate all patient data on client side before encryption
- Show HIPAA compliance warnings before submission
- Use loading states during encryption and upload
- Provide clear feedback about validation errors
- Sanitize all inputs before encryption
- Handle loading states during encryption and upload
- Show clear progress indicators for multi-step processes
- Validate all patient data on client side before encryption
- Show HIPAA compliance warnings before submission
- Use loading states during encryption and upload
- Provide clear feedback about validation errors
- Sanitize all inputs before encryption
- Handle loading states during encryption and upload
- Show clear progress indicators for multi-step processes

## File Storage
IPFS is used for decentralized file storage:
- Handle partial upload success - continue processing remaining files if one fails
- Validate both file type and size before upload attempt
- Show granular progress updates during encryption and upload
- Store encryption keys securely, but don't block upload if storage fails
- Implement retries with exponential backoff for IPFS fetches
- Always validate CIDs before storage/retrieval
- Store file metadata (name, size, type) with the upload
- Handle timeouts and connection issues gracefully
- When IPFS upload fails, preserve form data and allow retrying just the failed upload
- Show specific error messages from Pinata API when available
- Handle partial upload success - continue processing remaining files if one fails
- Validate both file type and size before upload attempt
- Show granular progress updates during encryption and upload
- Store encryption keys securely, but don't block upload if storage fails
- Implement retries with exponential backoff for IPFS fetches
- Always validate CIDs before storage/retrieval
- Store file metadata (name, size, type) with the upload
- Handle timeouts and connection issues gracefully
- When IPFS upload fails, preserve form data and allow retrying just the failed upload
- Show specific error messages from Pinata API when available
- Medical documents are uploaded to IPFS via Pinata
- Required environment variables: PINATA_API_KEY, PINATA_SECRET_KEY
- Files are referenced by their CID (Content Identifier)
- Patient data is encrypted before IPFS storage
- Only store CIDs on chain, never raw or encrypted data
- Always verify IPFS upload success before blockchain storage
- Gateway URL: https://gateway.pinata.cloud/ipfs/
- File size limit: 10MB per file
- Implement retries with exponential backoff for IPFS fetches
- Always validate CIDs before storage/retrieval
- Store file metadata (name, size, type) with the upload
- Handle timeouts and connection issues gracefully
- When IPFS upload fails, preserve form data and allow retrying just the failed upload
- Show specific error messages from Pinata API when available


In the modern digital landscape, privacy, security, and control over personal data have become more critical than ever. Traditional messaging platforms rely on centralized servers that store user data, creating potential vulnerabilities and concerns related to data ownership, privacy breaches, and censorship. With the growing concerns surrounding data security and privacy, especially in sensitive sectors like healthcare, there is an urgent need for a more secure and private alternative to conventional messaging systems. De-Chat is a decentralized chat application designed to address these challenges by utilizing blockchain technology to create a secure, transparent, and user-controlled communication platform. Specifically tailored for smart healthcare systems, De-Chat offers a platform for confidential communication that ensures the privacy and integrity of messages.

# Implementation Status

## Implementation Status

## Wallet Connection
- Check for window.ethereum before any wallet operations
- Handle network switching before requesting accounts
- Listen for accountsChanged and chainChanged events
- Provide specific error messages for common failure modes
- Clean up event listeners in useEffect cleanup function
- Check current chain before attempting network switch
- Handle both wallet_switchEthereumChain and wallet_addEthereumChain
- Let UI handle error display rather than using alerts in utility functions

## Component Structure
- Validate all user inputs before blockchain transactions
- Add events for important state changes
- Use enums to represent fixed sets of options
- Include proper error messages for each validation step
- Check contract function existence before attempting calls
- Separate core feature errors from optional feature unavailability
- Validate all user inputs before blockchain transactions
- Add events for important state changes
- Use enums to represent fixed sets of options
- Include proper error messages for each validation step
- Handle loading and error states consistently
- Provide clear feedback for wallet connection requirements
- Add proper ARIA labels and keyboard navigation
- Include focus states for better accessibility
- Use semantic HTML with proper roles
- Use {/* */} for comments inside JSX
- Keep comments outside of prop value braces
- Place multi-line comments between props rather than inline
- Use nullish coalescing (??) for default values when properties might be null
- Always handle null/undefined props explicitly in component interfaces
- Prefer null over undefined for missing data in React props
- Avoid dynamic imports unless absolutely necessary for SSR
- Export components as default when they're the main export
- Keep component state and logic close to where it's used
- Ensure all required props are documented and validated
- Handle loading, error, and empty states consistently
- Use dynamic imports for components that need window/ethereum access
- Ensure all components have proper default exports
- Keep styles modular and scoped to components
- Handle loading and error states consistently
- Provide clear feedback for wallet connection requirements

## Navigation
- Include clear navigation links for all major features
- Show feature availability based on wallet connection
- Provide clear feedback when features require wallet connection
- Use consistent naming across the application

## Contract Function Checks
- Verify contract is deployed using contract.deployed()
- Check existence of required functions before calling them
- Add retry mechanism with exponential backoff for contract connections
- Validate user registration before any data access
- Check input parameters like CIDs are not empty
- Add specific error messages for common failure modes
- Validate contract responses before processing
- Show clear user messages about feature availability
- Avoid throwing errors for missing optional features
- Provide specific error messages for different failure modes
- Handle missing features gracefully with informative UI messages
- Check contract function existence before attempting calls
- Separate core feature errors from optional feature unavailability
- Verify contract deployment by checking function existence
- Auto-update contract address in constants.js during deployment
- Provide clear user feedback when features are not yet available
- Check for existence of data before attempting to load it
- Handle gracefully when contract functions are missing during deployment transitions
- Log to console when features are not available to help with debugging
- Validate all inputs before making contract calls
- Show specific error messages for each type of failure
- Preserve form data when contract calls fail
- Allow retrying failed operations
- Check contract connection before attempting any function calls
- Validate wallet connection before any blockchain interaction
- Handle revert messages from contract to show user-friendly errors
- Only validate core contract functions (e.g. checkUserExists) during connection
- Return empty/default values for optional features that aren't available
- Show clear user messages about feature availability
- Avoid throwing errors for missing optional features
- Provide specific error messages for different failure modes
- Handle missing features gracefully with informative UI messages
- Check contract function existence before attempting calls
- Separate core feature errors from optional feature unavailability
- Verify contract deployment by checking function existence
- Auto-update contract address in constants.js during deployment
- Provide clear user feedback when features are not yet available
- Check for existence of data before attempting to load it
- Handle gracefully when contract functions are missing during deployment transitions
- Log to console when features are not available to help with debugging
- Validate all inputs before making contract calls
- Show specific error messages for each type of failure
- Preserve form data when contract calls fail
- Allow retrying failed operations
- Check contract connection before attempting any function calls
- Validate wallet connection before any blockchain interaction
- Handle revert messages from contract to show user-friendly errors

## Audit Logs
- Audit logs feature is planned but not yet deployed in the current contract version
- Frontend should gracefully handle missing contract functions during deployment transitions

## Patient Settings
- Patient settings features are planned but not yet deployed in the current contract version
- Frontend should check for function existence before calling contract methods
- Use hasPatientSettings() to check for data existence before attempting to load
- Handle missing or undefined settings gracefully by providing default empty values
- Always verify contract functions exist before attempting to call them

## Gas Configuration
- For Polygon Amoy testnet:
  - Set fixed gas limit: 5000000
  - Set fixed gas price: 25000000000 (25 gwei) - minimum required
  - Avoid using "auto" settings which can exceed fee caps
  - Always include gas optimization in solidity config
- Network names in hardhat.config.js:
  - Use quotes around network names: "polygon_amoy"
  - Avoid trailing commas after network config
  - Keep network name consistent between config and deploy command
  - Network name must match exactly between hardhat.config.js and constants.js
  - Avoid hyphens in network names, use underscores instead

## Windows-Specific Instructions
- Use `npm install package-name` without additional flags or syntax on Windows
- Avoid using npm command concatenation with && on Windows
- For multiple commands, run them separately
- When environment variables are needed, create .env file manually rather than using command line
- For contract deployment on Windows:
  - Use `npx hardhat run scripts/deploy.js --network network_name` exactly as shown
  - Verify network exists first with `npx hardhat networks`
  - Run each command separately, avoid chaining with && or ;

Vision and Motivation
The central motivation behind De-Chat is to create a trustless, secure messaging platform that eliminates the risks associated with centralized systems. In healthcare, where communication often involves sensitive medical information, ensuring the privacy and security of messages is paramount. Current centralized systems for messaging or storing healthcare data are prone to cyberattacks, data breaches, and misuse by unauthorized parties. De-Chat’s decentralized approach, powered by blockchain, solves these problems by providing a tamper-proof communication system where data is not controlled by any single entity. This approach is designed to protect the privacy of users while offering a transparent, immutable, and auditable platform for communication.

Core Features and Functionality
De-Chat is built on a decentralized architecture, leveraging blockchain technology to store messages and manage users. At the heart of the application lies the use of smart contracts to manage user registration, message storage, and authentication. By using blockchain, De-Chat ensures that all communication is secure, transparent, and free from tampering.

Decentralized Messaging System: De-Chat utilizes blockchain to enable direct peer-to-peer communication between users, removing the need for centralized intermediaries. This peer-to-peer messaging ensures that messages are delivered in real-time without relying on a central server. Messages are stored on the blockchain, making them resistant to modification and ensuring integrity.

Blockchain-Based Authentication: Instead of relying on traditional password-based login systems, De-Chat leverages MetaMask integration for wallet-based authentication. Users authenticate themselves by connecting their MetaMask wallet, ensuring that only authorized users can access the platform. This wallet-based authentication is more secure than traditional username and password systems, as it relies on the private keys stored in users’ wallets.

Smart Contract-Based User Management: De-Chat uses Solidity smart contracts for managing user profiles, friend lists, and message histories. Through smart contracts, users can register, create custom usernames, add and remove friends, and store their messages securely. This decentralized approach eliminates the need for centralized user databases, offering better privacy and control over personal data.

Privacy-First Communication: One of the most significant advantages of De-Chat is the privacy of its communication system. Messages are encrypted, and only the intended recipient can read them. Additionally, because the platform operates on a decentralized network, there is no central authority that can intercept, censor, or alter the messages. The use of blockchain ensures that messages are immutable, transparent, and auditable, which is particularly important for healthcare applications where data integrity is critical.

Real-Time Messaging with Message History: De-Chat supports real-time messaging and allows users to view their message history, which is stored securely on the blockchain. Blockchain-based storage means that message histories cannot be deleted or altered, creating an immutable record that users can refer to for verification purposes. Messages are timestamped and ordered, ensuring proper sequencing and transparency in communication.

User-Friendly Interface: The frontend of De-Chat is designed using modern React and Next.js frameworks. These technologies enable the development of a highly responsive and intuitive user interface (UI) that provides an optimal user experience. The UI allows users to manage their profiles, search for friends, send and receive messages, and track their communication activity.

Data Privacy and Security: By leveraging blockchain, De-Chat removes the need for centralized servers to store sensitive data. This decentralized approach eliminates single points of failure and the risks of data breaches. Moreover, the integration of MetaMask allows for wallet-based authentication, adding an extra layer of security to user accounts. Users' private keys are never exposed to the platform, ensuring their information remains secure.

Enhanced User Control and Transparency: Blockchain technology enables users to have full control over their data. Each action (e.g., sending a message, registering a profile) is recorded on the blockchain, allowing for complete transparency. Users can verify the integrity of their messages and see if any changes have been made to their data.

Blockchain and Decentralization: A Technological Advantage
The use of Polygon (a layer-2 scaling solution for Ethereum) provides the necessary blockchain infrastructure for the De-Chat platform. Polygon offers high throughput and low-cost transactions, making it ideal for decentralized applications. De-Chat leverages the Polygon Amoy testnet to deploy its smart contracts, allowing for experimentation and testing before transitioning to the mainnet. This ensures that the system can scale efficiently without compromising on speed or security.

By utilizing blockchain technology, De-Chat offers a number of technological advantages over traditional messaging systems:

Immutability: Once a message is stored on the blockchain, it cannot be altered or deleted, ensuring that communication history remains intact and auditable.
Decentralization: With no central server or authority managing user data, De-Chat is resistant to attacks, censorship, and data manipulation.
Transparency: All interactions and transactions are publicly visible on the blockchain, providing a transparent and verifiable record of communication.
Scalability: By leveraging Polygon’s efficient blockchain infrastructure, De-Chat can scale to accommodate a growing number of users without sacrificing performance.
Security and Privacy Features
De-Chat prioritizes security and privacy, which are paramount in healthcare and other sensitive sectors. Several features contribute to the platform’s overall security:

End-to-End Encryption: All messages are encrypted end-to-end, ensuring that only the sender and recipient can read the contents of the communication. Even the platform itself cannot access the message data.

Smart Contract Security: The smart contracts that manage De-Chat’s functionality are thoroughly tested and audited to ensure that they are free from vulnerabilities and cannot be exploited by malicious actors.

Tamper-Proof Message Storage: Messages are stored on the blockchain, which is immutable and transparent. This guarantees that messages cannot be tampered with or deleted without leaving a trace, providing a higher level of integrity for sensitive communications.

No Central Authority: With no central server or governing body overseeing the platform, De-Chat eliminates the risks associated with single points of failure, such as data breaches or unauthorized access to personal information.

Future Enhancements
While De-Chat is already an advanced platform, there are several features planned for future releases:

End-to-End Encryption for Messages: While the current version includes basic encryption, future updates will ensure that all messages are fully encrypted end-to-end to enhance user privacy further.

Group Chat Support: The platform will expand to include group chat functionality, allowing users to create secure group conversations.

File Sharing and Multimedia Support: De-Chat plans to support the sharing of files, images, and other media types, making it a more versatile communication tool.

Voice and Video Calls: The integration of voice and video calling will allow users to communicate in real-time in a more interactive manner.

Cross-Chain Compatibility: De-Chat will eventually expand to work with multiple blockchain networks, providing greater flexibility and cross-chain functionality for users.

Conclusion
De-Chat is a pioneering decentralized messaging platform that addresses the privacy and security challenges of modern communication, particularly in healthcare. By utilizing blockchain technology, De-Chat ensures that all communications are secure, transparent, and resistant to censorship. The application’s focus on user privacy, combined with its decentralized architecture and secure smart contracts, makes it an ideal solution for industries that demand confidentiality and data integrity. With continued development and future enhancements, De-Chat has the potential to revolutionize secure communication and create new standards for privacy in the digital age.





1. **Key Derivation (PBKDF2)**:
```javascript
const key = CryptoJS.PBKDF2(passphrase, salt, {
  keySize: 256/32,  // 256-bit key
  iterations: 1000  // Number of iterations
});
```
- PBKDF2 (Password-Based Key Derivation Function 2) is used to derive a cryptographic key from the passphrase
- Uses 1000 iterations for key strengthening
- Produces a 256-bit key
- Uses a random salt (128 bits) to prevent rainbow table attacks

2. **Encryption (AES)**:
```javascript
const encrypted = CryptoJS.AES.encrypt(wordArray, key.toString());
```
- Uses AES (Advanced Encryption Standard) in CBC mode
- 256-bit key length
- Includes IV (Initialization Vector) automatically
- Outputs in Base64 format

3. **Hash Generation (SHA-256)**:
```javascript
const passphraseHash = CryptoJS.SHA256(passphrase + salt.toString()).toString();
```
- SHA-256 for hash verification
- Used to verify the correct passphrase without storing it
- Combines passphrase with salt for additional security

4. **Salt Generation**:
```javascript
const salt = CryptoJS.lib.WordArray.random(128/8);
```
- 128-bit random salt
- Generated using CryptoJS's secure random number generator
- Unique per encryption operation

Here's a detailed flow of the encryption process:

1. File Encryption:
```javascript
const encryptFileWithPassphrase = async (fileData, passphrase) => {
  // Generate random salt
  const salt = CryptoJS.lib.WordArray.random(128/8);

  // Derive key using PBKDF2
  const key = CryptoJS.PBKDF2(passphrase, salt, {
    keySize: 256/32,
    iterations: 1000
  });

  // Convert file data to WordArray
  const wordArray = CryptoJS.enc.Base64.parse(fileData);

  // Encrypt using AES
  const encrypted = CryptoJS.AES.encrypt(wordArray, key.toString());

  // Generate verification hash
  const passphraseHash = CryptoJS.SHA256(passphrase + salt.toString()).toString();

  return {
    success: true,
    encryptedData: encrypted.toString(),
    passphraseHash,
    salt: salt.toString()
  };
};
```

2. File Decryption:
```javascript
const decryptFileWithPassphrase = async (encryptedData, passphrase, expectedHash, salt) => {
  // Verify passphrase using hash
  const providedHash = CryptoJS.SHA256(passphrase + salt).toString();
  if (providedHash !== expectedHash) {
    throw new Error("Invalid decryption key");
  }

  // Recreate key using PBKDF2
  const key = CryptoJS.PBKDF2(passphrase, salt, {
    keySize: 256/32,
    iterations: 1000
  });

  // Decrypt data
  const decrypted = CryptoJS.AES.decrypt(encryptedData, key.toString());

  // Convert to Base64
  const decryptedBase64 = decrypted.toString(CryptoJS.enc.Base64);

  return { success: true, decryptedData: decryptedBase64 };
};
```

Security Features:
1. **Salt**: Prevents rainbow table attacks and ensures unique encryption even with the same passphrase
2. **PBKDF2**: Makes brute-force attacks computationally expensive
3. **Hash Verification**: Allows verification of correct passphrase without storing it
4. **AES-256**: Industry-standard symmetric encryption
5. **Secure Random Numbers**: Used for salt generation
6. **Base64 Encoding**: Safe storage and transmission of binary data

The encryption system provides:
- End-to-end encryption of files
- Secure key derivation
- Verification of decryption keys
- Protection against common attacks
- Safe storage of encrypted data on IPFS
