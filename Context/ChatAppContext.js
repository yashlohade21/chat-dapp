import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";

//INTERNAL IMPORT
import {
  ChechIfWalletConnected,
  connectWallet,
  connectingWithContract,
} from "../Utils/apiFeature";

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
  const createAccount = async ({ name, category }) => {
    try {
      if (!name || !account) {
        return setError("Name And Account Address cannot be empty");
      }

      const contract = await connectingWithContract();
      const getCreatedUser = await contract.createAccount(name, category);

      setLoading(true);
      await getCreatedUser.wait();
      setLoading(false);
      
      // Store user type in localStorage for future reference
      localStorage.setItem('userCategory', category);
      
      window.location.reload();
    } catch (error) {
      console.error("Error creating account:", error);
      setError("Error while creating your account. Please reload browser");
    }
  };

  // Add function to check user category
  const getUserCategory = async (address) => {
    try {
      const contract = await connectingWithContract();
      if (!contract) return null;
      
      // First try to get from localStorage for quick access
      const storedCategory = localStorage.getItem('userCategory');
      if (storedCategory !== null) {
        return storedCategory;
      }

      // If not in localStorage, get from contract
      const user = await contract.getUserInfo(address);
      if (user && user.category !== undefined) {
        localStorage.setItem('userCategory', user.category.toString());
        return user.category.toString();
      }
      
      return null;
    } catch (error) {
      console.error("Error getting user category:", error);
      return null;
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
      if (!msg || !address) return setError("Please Type your Message");

      const contract = await connectingWithContract();
      const addMessage = await contract.sendMessage(address, msg);
      setLoading(true);
      await addMessage.wait();
      setLoading(false);
      window.location.reload();
    } catch (error) {
      setError("Please reload and try again");
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
      if (!contract) return false;
      
      // First check if the function exists
      if (typeof contract.hasPatientSettings !== 'function') {
        console.log("hasPatientSettings function not available");
        return false;
      }

      const hasSettings = await contract.hasPatientSettings(address);
      return hasSettings;
    } catch (error) {
      console.error("Error checking patient settings:", error);
      return false;
    }
  };

  return (
    <ChatAppContect.Provider
      value={{
        readMessage,
        createAccount,
        getUserCategory,
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
      }}
    >
      {children}
    </ChatAppContect.Provider>
  );
};
