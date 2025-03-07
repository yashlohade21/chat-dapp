import { ethers } from "ethers";
import Web3Modal from "web3modal";

import {
  ChatAppAddress,
  ChatAppABI,
  handleNetworkSwitch,
} from "../Context/constants";

export const ChechIfWalletConnected = async () => {
  try {
    // Check if user is logged out
    if (localStorage.getItem("userLoggedOut") === "true") {
      console.log("User is logged out, skipping wallet connection check");
      return null;
    }

    if (!window.ethereum) {
      console.log("Install MetaMask");
      return null;
    }
    // Trigger network switching to ensure proper chainId format (e.g., 0x13882)
    await handleNetworkSwitch();

    const accounts = await window.ethereum.request({
      method: "eth_accounts",
    });

    if (accounts.length === 0) {
      console.log("No accounts found. Please connect your wallet.");
      return null;
    }
    return accounts[0];
  } catch (error) {
    console.error("Error checking wallet connection:", error);
    return null;
  }
};

export const connectWallet = async () => {
  try {
    // Check if user is logged out
    if (localStorage.getItem("userLoggedOut") === "true") {
      console.log("User is logged out, clearing flag before connecting wallet");
      localStorage.removeItem("userLoggedOut");
    }

    if (!window.ethereum) {
      alert("Please install MetaMask to use this application");
      return "";
    }
    
    // First ensure we're on the correct network
    try {
      await handleNetworkSwitch();
    } catch (switchError) {
      console.error("Network switch failed:", switchError);
      // Continue anyway, as the user might have rejected the network switch
    }
    
    // Request account access
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    
    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts found or user rejected the connection");
    }
    
    console.log("Wallet connected:", accounts[0]);
    return accounts[0];
  } catch (error) {
    console.error("Error connecting wallet:", error);
    if (error.code === 4001) {
      // User rejected the request
      alert("You rejected the connection request. Please connect your wallet to continue.");
    } else {
      alert("Error connecting to wallet: " + (error.message || "Unknown error"));
    }
    return "";
  }
};

const fetchContract = (signerOrProvider) =>
  new ethers.Contract(ChatAppAddress, ChatAppABI, signerOrProvider);

export const connectingWithContract = async (retries = 3) => {
  // Check if user is logged out
  if (localStorage.getItem("userLoggedOut") === "true") {
    console.log("User is logged out, skipping contract connection");
    return null;
  }

  for (let i = 0; i < retries; i++) {
    try {
      // Initialize Web3Modal with options
      const web3Modal = new Web3Modal({
        network: "polygon_amoy", // optional
        cacheProvider: true, // optional
        providerOptions: {} // required - empty for MetaMask only
      });
      
      const connection = await web3Modal.connect();
      const provider = new ethers.providers.Web3Provider(connection);
      const signer = provider.getSigner();
      const contract = fetchContract(signer);
      await contract.deployed();
      return contract;
    } catch (error) {
      console.error(`Contract connection attempt ${i + 1} failed:`, error);
      if (i === retries - 1) throw error;
      await new Promise(resolve =>
        setTimeout(resolve, Math.pow(2, i) * 1000)
      );
    }
  }
  throw new Error("Failed to connect to contract after multiple attempts");
};

export const converTime = (time) => {
  const newTime = new Date(time.toNumber() * 1000);
  return `${newTime.getHours()}:${newTime.getMinutes()}:${newTime.getSeconds()} Date: ${newTime.getDate()}/${newTime.getMonth() + 1}/${newTime.getFullYear()}`;
};
