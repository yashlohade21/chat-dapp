import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import CryptoJS from "crypto-js";
import { ethers } from "ethers";

import {
  ChechIfWalletConnected,
  connectWallet,
  connectingWithContract,
} from "../Utils/apiFeature";
import { IPFSService } from "../Utils/IPFSService";

export const ChatAppContect = React.createContext();

export const ChatAppProvider = ({ children }) => {
  //USESTATE
  const [account, setAccount] = useState("");
  const [userName, setUserName] = useState("");
  const [friendLists, setFriendLists] = useState([]);
  const [friendMsg, setFriendMsg] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userLists, setUserLists] = useState([]);
  const [error, setError] = useState("");

  //CHAT USER DATA
  const [currentUserName, setCurrentUserName] = useState("");
  const [currentUserAddress, setCurrentUserAddress] = useState("");

  const router = useRouter();

  //FETCH DATA TIME OF PAGE LOAD
  const fetchData = async () => {
    try {
      // Check if user is logged out
      if (localStorage.getItem("userLoggedOut") === "true") {
        console.log("User is logged out, skipping wallet connection");
        return;
      }

      const address = await ChechIfWalletConnected();
      setAccount(address || ""); // Set empty string if no address
      if (address) {
        //GET CONTRACT
        const contract = await connectingWithContract();
        //GET ACCOUNT
        const connectAccount = await connectWallet();
        setAccount(connectAccount);
        //GET USER NAME
        const userName = await contract.getUsername(connectAccount);
        setUserName(userName);
        //GET MY FRIEND LIST
        const friendLists = await contract.getMyFriendList();
        setFriendLists(friendLists);

        //GET ALL APP USER LIST
        const userList = await contract.getAllAppUser();
        const newArray = userList.filter(
          (user) => user.accountAddress.toLowerCase() !== address
        );

        const filterArray = filterUsersExcludingFriends(newArray, friendLists);
        console.log(filterArray);
        setUserLists(filterArray);
      }
    } catch (error) {
      // setError("Please Install And Connect Your Wallet");
      console.log(error);
    }
  };

  function filterUsersExcludingFriends(newArray, friendLists) {
    const friendAddresses = new Set(friendLists.map((friend) => friend.pubkey));

    return newArray.filter((user) => !friendAddresses.has(user.accountAddress));
  }
  useEffect(() => {
    fetchData();
  }, []);

  // Logout function
  const logout = () => {
    // Clear all user-related state
    setAccount("");
    setUserName("");
    setFriendLists([]);
    setFriendMsg([]);
    setUserLists([]);
    setCurrentUserName("");
    setCurrentUserAddress("");
    
    // Set a flag in localStorage to indicate user is logged out
    localStorage.setItem("userLoggedOut", "true");
    
    // Clear any stored user data in localStorage
    localStorage.removeItem("walletConnected");
    
    // Attempt to disconnect from MetaMask if possible
    if (window.ethereum && window.ethereum.removeAllListeners) {
      window.ethereum.removeAllListeners();
    }
    
    // Redirect to home page
    router.push("/");
    
    // Optional: Display a success message
    setTimeout(() => {
      setError(""); // Clear any existing errors
    }, 100);
    
    console.log("User logged out successfully");
  };

  //READ MESSAGE
  const readMessage = async (friendAddress) => {
    try {
      const address = await ChechIfWalletConnected();
      if (address) {
        const contract = await connectingWithContract();
        const read = await contract.readMessage(friendAddress);
        setFriendMsg(read);
      }
    } catch (error) {
      console.log("Currently You Have no Message");
    }
  };

  //CREATE ACCOUNT
  const createAccount = async ({ name }) => {
    try {
      setError("");
      if (!name || !name.trim()) {
        return setError("Name cannot be empty");
      }

      if (!account) {
        const walletAddress = await connectWallet();
        if (!walletAddress) {
          return setError("Please connect your wallet to create an account");
        }
        setAccount(walletAddress);
      }

      setLoading(true);
      const contract = await connectingWithContract();
      
      // Check if user already exists
      const userExists = await contract.checkUserExists(account);
      if (userExists) {
        setLoading(false);
        return setError("Account already exists for this wallet address");
      }
      
      console.log("Creating account with name:", name);
      const getCreatedUser = await contract.createAccount(name);

      // Wait for transaction to be mined
      const receipt = await getCreatedUser.wait();
      console.log("Account created successfully:", receipt);
      
      // Update the username state
      setUserName(name);
      
      // Clear the logged out flag when creating a new account
      localStorage.removeItem("userLoggedOut");
      
      // Refresh the page to update UI
      window.location.reload();
    } catch (error) {
      console.error("Error creating account:", error);
      let errorMessage = "Error creating your account";
      
      if (error.code === 4001) {
        errorMessage = "Transaction rejected. Please approve the transaction to create your account.";
      } else if (error.message && error.message.includes("User already exists")) {
        errorMessage = "You already have an account with this wallet address";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  //ADD YOUR FRIENDS
  const addFriends = async ({ name, userAddress }) => {
    console.log(name, userAddress);
    try {
      if (!name || !userAddress) return setError("Please provide data");
      const contract = await connectingWithContract();
      const addMyFriend = await contract.addFriend(userAddress, name);
      setLoading(true);
      await addMyFriend.wait();
      setLoading(false);
      router.push("/");
      window.location.reload();
    } catch (error) {
      setError("Something went wrong while adding friends, try again");
    }
  };

  //SEND MESSAGE TO YOUR FRIEND
  const sendMessage = async ({ msg, address }) => {
    try {
      if (!msg || !address) {
        throw new Error("Message and recipient address are required");
      }
      if (!account) {
        throw new Error("Please connect your wallet first");
      }
      
      const contract = await connectingWithContract();
      if (!contract) {
        throw new Error("Failed to connect to contract");
      }
      
      // Check if the recipient exists
      const userExists = await contract.checkUserExists(address);
      if (!userExists) {
        throw new Error("Recipient does not exist");
      }

      // Validate that the recipient is in your friend list
      const friendLists = await contract.getMyFriendList();
      const isFriend = friendLists.some(friend => friend.pubkey.toLowerCase() === address.toLowerCase());
      if (!isFriend) {
        throw new Error("You can only send messages to your friends");
      }
      
      setLoading(true);
      
      // Get provider to access current gas price
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const gasPrice = await provider.getGasPrice();
      
      // Send message with explicit gas configuration
      const transaction = await contract.sendMessage(address, msg, {
        gasLimit: 5000000,
        gasPrice: gasPrice.mul(125).div(100) // Add 25% to current gas price
      });
      
      // Wait for transaction confirmation, with timeout handling
      const receipt = await Promise.race([
        transaction.wait(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Transaction timeout")), 30000)
        )
      ]);
      
      if (!receipt.status) {
        throw new Error("Transaction failed");
      }
      
      // Refresh messages after successful send
      await readMessage(address);
    } catch (error) {
      console.error("Error sending message:", error);
      let errorMessage = "Failed to send message";
      
      if (error.code === -32603) {
        errorMessage = "Network error. Please check your wallet settings and try again.";
      } else if (error.message.includes("user rejected")) {
        errorMessage = "Transaction was rejected by user";
      } else if (error.message.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for transaction. Please check your wallet balance.";
      } else if (error.message.includes("timeout")) {
        errorMessage = "Transaction timed out. The network may be congested, please try again.";
      } else if (error.message.includes("nonce")) {
        errorMessage = "Transaction nonce error. Please reset your wallet or try again.";
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  //READ INFO
  const readUser = async (userAddress) => {
    const contract = await connectingWithContract();
    const userName = await contract.getUsername(userAddress);
    setCurrentUserName(userName);
    setCurrentUserAddress(userAddress);
  };

  // Add doctor-related state
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  // Function to fetch doctors
  const fetchDoctors = async () => {
    try {
      setLoadingDoctors(true);
      const contract = await connectingWithContract();
      
      // In faucet mode, if getAllAppUsers is not available, return empty array
      if (typeof contract.getAllAppUsers === "function") {
        const allUsers = await contract.getAllAppUsers();
        setDoctors(allUsers);
      } else {
        console.log("Using faucet mode for doctor list");
        // Return empty array in faucet mode
        setDoctors([]);
      }
    } catch (error) {
      console.error("Error fetching doctors:", error);
      // In case of error, return empty array to match chat pattern
      setDoctors([]);
    } finally {
      setLoadingDoctors(false);
    }
  };

  // Add fetchDoctors to useEffect
  useEffect(() => {
    if (account) {
      fetchDoctors();
    }
  }, [account]);

  // Add function to check if patient settings exist
  const checkPatientSettings = async (address) => {
    try {
      const contract = await connectingWithContract();
      if (!contract) {
        console.log("Contract not available");
        return false;
      }

      // First try to get user info to verify account exists
      const userExists = await contract.checkUserExists(address);
      if (!userExists) {
        console.log("User does not exist");
        return false;
      }

      // Then check for patient settings
      try {
        const settings = await contract.getPatientSettings(address);
        return settings && settings.dataCID && settings.dataCID.length > 0;
      } catch (error) {
        // If getPatientSettings fails, the user has no settings
        console.log("No patient settings found");
        return false;
      }
    } catch (error) {
      console.error("Error checking patient settings:", error);
      return false;
    }
  };

  const [patientDataLoading, setPatientDataLoading] = useState(false);

  // Function to save patient data to blockchain
  const savePatientData = async (formData) => {
    try {
      if (!account) {
        throw new Error("Please connect your wallet");
      }

      // Add version check
      const contract = await connectingWithContract();
      try {
        // Try to get existing data first
        const [existingCID, , existingVersion] = await contract.getPatientData(account);
        if (existingVersion && existingVersion > formData.version) {
          throw new Error("Newer version exists - please refresh data first");
        }
      } catch (error) {
        // Ignore errors here - likely means no existing data
        console.log("No existing data found, proceeding with save");
      }

      // Validate required fields
      if (!formData.name || !formData.email) {
        throw new Error("Missing required fields: Name and Email are needed");
      }

      setPatientDataLoading(true);

      // Generate a new encryption key
      const encryptionKey = CryptoJS.lib.WordArray.random(32).toString();
      const dataString = JSON.stringify({
          ...formData,
          version: Date.now(),
          updatedAt: new Date().toISOString()
      });

      // Encrypt data
      const encryptedData = CryptoJS.AES.encrypt(dataString, encryptionKey).toString();

      // Upload to IPFS
      const ipfsResult = await IPFSService.uploadJSON(encryptedData, 'patient-data.json');
      if (!ipfsResult.success) {
        throw new Error("Failed to upload encrypted patient data to IPFS");
      }

      // Store encryption key securely
      const secureStorage = {
          key: encryptionKey,
          cid: ipfsResult.cid,
          timestamp: Date.now(),
          version: Date.now()
      };
      localStorage.setItem(`patientData_${account}`, JSON.stringify(secureStorage));

      // Save CID to blockchain
      const tx = await contract.updatePatientData(ipfsResult.cid);
      setLoading(true);
      await tx.wait();
      setLoading(false);
      
      return { success: true, encryptionKey };
    } catch (error) {
      console.error("Error saving patient data:", error);
      throw error;
    } finally {
      setPatientDataLoading(false);
    }
  };

  // Function to load patient data from blockchain
  const loadPatientData = async (patientAddress) => {
    try {
      if (!patientAddress) {
        console.log("No patient address provided");
        return null;
      }
      const contract = await connectingWithContract();
      if (!contract) {
        console.log("Contract connection failed");
        return null;
      }

      // Ensure the patient exists before fetching data
      const userExists = await contract.checkUserExists(patientAddress);
      if (!userExists) {
        console.log("Patient does not exist");
        return null;
      }

      // Try to get patient data from the contract
      try {
        const [dataCID, timestamp, version, exists] = await contract.getPatientData(patientAddress);
        if (!exists || !dataCID) {
          console.log("No patient data found");
          return null;
        }

        // Retrieve the stored encryption details
        const secureStorage = JSON.parse(localStorage.getItem(`patientData_${patientAddress}`) || '{}');
        if (!secureStorage.key || secureStorage.cid !== dataCID) {
          console.log("No matching encryption key found locally");
          return null;
        }

        // Fetch encrypted data from IPFS
        const ipfsResult = await IPFSService.getJSON(dataCID);
        if (!ipfsResult.success) {
          throw new Error("Failed to fetch data from IPFS");
        }

        // Decrypt the received data using the key stored locally
        const decryptedBytes = CryptoJS.AES.decrypt(ipfsResult.data.data, secureStorage.key);
        const decryptedData = JSON.parse(decryptedBytes.toString(CryptoJS.enc.Utf8));

        return {
          data: decryptedData,
          timestamp,
          version
        };
      } catch (error) {
        // If getPatientData is not a function, log a graceful message
        if (error.message.includes("not a function")) {
          console.log("Patient data feature not available in current contract version");
          return null;
        }
        throw error;
      }
    } catch (error) {
      console.error("Error loading patient data:", error);
      return null;
    }
  };

  return (
    <ChatAppContect.Provider
      value={{
        readMessage,
        createAccount,
        addFriends,
        sendMessage,
        readUser,
        connectWallet,
        ChechIfWalletConnected,
        connectingWithContract,
        account,
        userName,
        friendLists,
        friendMsg,
        userLists,
        loading,
        error,
        currentUserName,
        currentUserAddress,
        doctors,
        loadingDoctors,
        checkPatientSettings,
        savePatientData,
        loadPatientData,
        patientDataLoading,
        logout
      }}
    >
      {children}
    </ChatAppContect.Provider>
  );
};

export default ChatAppProvider;
