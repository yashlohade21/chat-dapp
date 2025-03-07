import React, { useEffect, useState, useContext } from "react";

//INTERNAL IMPORT
import { ChatAppContect } from "../Context/ChatAppContext";
import { Filter, Friend } from "../Components/index";
import Style from "../styles/index.module.css";
import images from "../assets";
import Image from "next/image";

const ChatApp = () => {
  const { account, connectWallet } = useContext(ChatAppContect) || {};

  const handleConnectWallet = () => {
    // Clear the logged out flag when user wants to connect
    localStorage.removeItem("userLoggedOut");
    connectWallet();
  };

  // If no account is connected, show a warning message
  if (!account) {
    return (
      <div className={Style.connectWalletWarning}>
        <div className={Style.warningContainer}>
          <Image src={images.logo} alt="Logo" width={80} height={80} />
          <h2>Welcome to De-Chat</h2>
          <p>Connect your MetaMask wallet to start chatting securely.</p>
          <p>This decentralized chat application requires a wallet connection to access all features.</p>
          <button 
            onClick={handleConnectWallet}
            className={Style.connectButton}
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Filter />
      <Friend />
    </div>
  );
};

export default ChatApp;
