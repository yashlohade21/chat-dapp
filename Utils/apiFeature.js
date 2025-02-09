import { ethers } from "ethers";
import Web3Modal from "web3modal";

import {
  ChatAppAddress,
  ChatAppABI,
  handleNetworkSwitch,
} from "../Context/constants";

export const ChechIfWalletConnected = async () => {
  try {
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
    if (!window.ethereum) {
      console.log("Please install MetaMask");
      return "";
    }
    await handleNetworkSwitch();
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts found");
    }
    return accounts[0];
  } catch (error) {
    console.error("Error connecting wallet:", error);
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
