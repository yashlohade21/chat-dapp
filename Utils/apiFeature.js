import { ethers } from "ethers";
import Web3Modal from "web3modal";

import {
  ChatAppAddress,
  ChatAppABI,
  handleNetworkSwitch,
} from "../Context/constants";

export const ChechIfWalletConnected = async () => {
  try {
    if (!window.ethereum) return console.log("Install MateMask");
    const network = await handleNetworkSwitch();
    const accounts = await window.ethereum.request({
      method: "eth_accounts",
    });

    const firstAccount = accounts[0];
    return firstAccount;
  } catch (error) {
    console.log(error);
  }
};

export const connectWallet = async () => {
  try {
    if (!window.ethereum) {
      alert("Please install MetaMask");
      return;
    }
    
    // First switch to the correct network
    await handleNetworkSwitch();
    
    // Then request account access
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    
    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts found");
    }
    
    const firstAccount = accounts[0];
    return firstAccount;
  } catch (error) {
    console.error("Error connecting wallet:", error);
    alert("Failed to connect wallet. Please try again.");
    return "";
  }
};

const fetchContract = (signerOrProvider) =>
  new ethers.Contract(ChatAppAddress, ChatAppABI, signerOrProvider);

export const connectingWithContract = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const web3modal = new Web3Modal();
      const connection = await web3modal.connect();
      const provider = new ethers.providers.Web3Provider(connection);
      const signer = provider.getSigner();
      const contract = fetchContract(signer);
      
      // Verify contract is deployed and accessible
      try {
        await contract.deployed();
        return contract;
      } catch (deployError) {
        console.error("Contract not deployed:", deployError);
        throw new Error("Smart contract not deployed on this network");
      }
    } catch (error) {
      console.error(`Contract connection attempt ${i + 1} failed:`, error);
      if (i === retries - 1) throw error;
      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
  throw new Error("Failed to connect to contract after multiple attempts");
};

export const converTime = (time) => {
  const newTime = new Date(time.toNumber());

  const realTime =
    newTime.getHours() +
    "/" +
    newTime.getMinutes() +
    "/" +
    newTime.getSeconds() +
    "  Date:" +
    newTime.getDate() +
    "/" +
    (newTime.getMonth() + 1) +
    "/" +
    newTime.getFullYear();

  return realTime;
};
