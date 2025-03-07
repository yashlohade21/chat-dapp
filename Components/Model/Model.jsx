import React, { useState, useContext, useEffect } from "react";
import Image from "next/image";

//INTERNAL IMPORT
import Style from "./Model.module.css";
import images from "../../assets";
import { ChatAppContect } from "../../Context/ChatAppContext";
import { Loader } from "../../Components/index";

const Model = ({ openBox, title, address, head, info, smallInfo, image, functionName }) => {
  const [name, setName] = useState("");
  const { loading, connectWallet, createAccount } = useContext(ChatAppContect);
  const [processingAccount, setProcessingAccount] = useState(false);

  // Load pending account data if exists
  useEffect(() => {
    const pendingAccount = localStorage.getItem('pendingAccount');
    if (pendingAccount) {
      const { name: savedName } = JSON.parse(pendingAccount);
      setName(savedName);
    }
  }, []);

  // Check if we need to create an account after wallet connection
  useEffect(() => {
    const createPendingAccount = async () => {
      const pendingAccount = localStorage.getItem('pendingAccount');
      
      if (pendingAccount && address && !processingAccount) {
        try {
          setProcessingAccount(true);
          const { name: savedName } = JSON.parse(pendingAccount);
          
          // Create the account with the saved name
          await createAccount({ name: savedName });
          
          // Clear the pending account data
          localStorage.removeItem('pendingAccount');
        } catch (error) {
          console.error("Error creating account after wallet connection:", error);
        } finally {
          setProcessingAccount(false);
        }
      }
    };

    createPendingAccount();
  }, [address, createAccount, processingAccount]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert("Please enter your name");
      return;
    }

    // If wallet is not connected, store the name and connect wallet
    if (!address) {
      // Store form data temporarily
      localStorage.setItem('pendingAccount', JSON.stringify({ name }));
      
      // Close modal
      openBox(false);
      
      // Connect to MetaMask
      try {
        await connectWallet();
        // The account creation will be handled by the useEffect above
      } catch (error) {
        console.error("Error connecting wallet:", error);
        alert("Failed to connect wallet. Please try again.");
      }
    } else {
      // If wallet is already connected, create account directly
      await functionName({ name });
    }
  };

  return (
    <div className={Style.Model}>
      <div className={Style.Model_box}>
        <div className={Style.Model_box_left}>
          <Image 
            src={image} 
            alt="buddy" 
            width={500} 
            height={500} 
            priority
            quality={100}
          />
        </div>
        <div className={Style.Model_box_right}>
          <h1>
            {title} <span>{head}</span>
          </h1>
          <p>{info}</p>
          <small>{!address ? "Fill in your details and connect wallet to create account" : smallInfo}</small>

          {loading || processingAccount ? (
            <div className={Style.loaderContainer}>
              <Loader />
              <p>{processingAccount ? "Creating your account..." : "Connecting to wallet..."}</p>
            </div>
          ) : (
            <div className={Style.Model_box_right_name}>
              <div className={Style.Model_box_right_name_info}>
                <Image
                  src={images.username}
                  alt="user"
                  width={24}
                  height={24}
                />
                <input
                  type="text"
                  placeholder="Enter your name"
                  onChange={(e) => setName(e.target.value)}
                  value={name}
                  required
                />
              </div>

              {address && (
                <div className={Style.Model_box_right_name_info}>
                  <Image
                    src={images.account}
                    alt="wallet"
                    width={24}
                    height={24}
                  />
                  <div className={Style.walletAddress}>
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </div>
                </div>
              )}

              {!address && (
                <p className={Style.Model_box_right_name_info}>
                  👉 After filling details, click continue to connect MetaMask
                </p>
              )}

              <div className={Style.Model_box_right_name_btn}>
                <button onClick={handleSubmit} disabled={loading || processingAccount}>
                  <Image src={images.send} alt="send" width={24} height={24} />
                  {!address ? 'Connect MetaMask & Create Account' : 'Create Account'}
                </button>

                <button onClick={() => openBox(false)} disabled={loading || processingAccount}>
                  <Image src={images.close} alt="close" width={24} height={24} />
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Model;
