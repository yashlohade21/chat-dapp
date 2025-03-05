import React, { useState, useEffect, useContext } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";

//INTERNAL IMPORT
import Style from "./Friend.module.css";
import images from "../../assets";
import { ChatAppContect } from "../../Context/ChatAppContext";
import Card from "./Card/Card";
import Chat from "./Chat/Chat";

const Friend = () => {
  const {
    sendMessage,
    account,
    friendLists,
    readMessage,
    userName,
    loading,
    friendMsg,
    currentUserName,
    currentUserAddress,
    readUser,
  } = useContext(ChatAppContect);

  //STATES
  const [friendAddress, setFriendAddress] = useState("");
  const [message, setMessage] = useState("");
  const [chatData, setChatData] = useState({
    name: "",
    address: "",
  });

  const router = useRouter();

  // If no account is connected, show a warning message
  if (!account) {
    return (
      <div className={Style.connectWalletWarning}>
        <div className={Style.warningContainer}>
          <Image src={images.accountName} alt="Wallet" width={50} height={50} />
          <h2>Connect Your Wallet</h2>
          <p>Please connect your MetaMask wallet to access the chat functionality.</p>
          <p>You need to be logged in to view and send messages.</p>
          <button 
            onClick={() => window.location.reload()}
            className={Style.connectButton}
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={Style.Friend}>
      <div className={Style.Friend_box}>
        <div className={Style.Friend_box_left}>
          <div className={Style.Friend_box_left_header}>
            <h3>Your Contacts</h3>
            <p>{friendLists.length} friends</p>
          </div>
          
          {friendLists.length > 0 ? (
            <div className={Style.Friend_box_left_list}>
              {friendLists.map((el, i) => (
                <Card
                  key={i + 1}
                  el={el}
                  i={i}
                  readMessage={readMessage}
                  readUser={readUser}
                />
              ))}
            </div>
          ) : (
            <div className={Style.Friend_box_left_empty}>
              <Image src={images.friends} alt="No friends" width={80} height={80} />
              <h4>No contacts yet</h4>
              <p>Add friends to start chatting</p>
            </div>
          )}
        </div>
        <div className={Style.Friend_box_right}>
          <Chat
            functionName={sendMessage}
            readMessage={readMessage}
            friendMsg={friendMsg}
            account={account}
            userName={userName}
            loading={loading}
            currentUserName={currentUserName}
            currentUserAddress={currentUserAddress}
            readUser={readUser}
          />
        </div>
      </div>
    </div>
  );
};

export default Friend;
