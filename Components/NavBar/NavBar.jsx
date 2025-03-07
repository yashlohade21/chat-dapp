import React, { useEffect, useState, useContext } from "react";
import Image from "next/image";
import Link from "next/link";

//INTERNAL IMPORT
import Style from "./NavBar.module.css";
import { ChatAppContect } from "../../Context/ChatAppContext";
import { Model, Error } from "../index";
import images from "../../assets";

const NavBar = () => {
  const menuItems = [
    {
      menu: "All Users",
      link: "alluser",
    },
    {
      menu: "CHAT",
      link: "/",
    },
    {
      menu: "Doctors",
      link: "/doctor-directory",
    },
    {
      menu: "Analytics",
      link: "/analytics",
    },
    {
      menu: "Settings",
      link: "/settings",
    },
  ];

  const [active, setActive] = useState(2);
  const [open, setOpen] = useState(false);
  const [openModel, setOpenModel] = useState(false);
  const [openUserModel, setOpenUserModel] = useState(false);

  const { account, userName, connectWallet, createAccount, error, logout } = useContext(ChatAppContect);

  const handleLogout = () => {
    logout();
  };

  return (
    <div className={Style.NavBar}>
      <div className={Style.NavBar_box}>
        <div className={Style.NavBar_box_left}>
          <Image src={images.logo} alt="logo" width={50} height={50} />
        </div>
        <div className={Style.NavBar_box_right}>
          <div className={Style.NavBar_box_right_menu}>
            {menuItems.map((el, i) => (
              <div
                onClick={() => setActive(i + 1)}
                key={i + 1}
                className={`${Style.NavBar_box_right_menu_items} ${
                  active == i + 1 ? Style.active_btn : ""
                }`}
              >
                <Link
                  className={Style.NavBar_box_right_menu_items_link}
                  href={el.link}
                >
                  {el.menu}
                </Link>
              </div>
            ))}
          </div>

          <div className={Style.NavBar_box_right_buttons}>
            {!account ? (
              <>
                <button 
                  onClick={connectWallet}
                  className={Style.connectWalletBtn}
                >
                  <Image src={images.accountName} alt="Account" width={20} height={20} />
                  Connect Wallet
                </button>
                <button 
                  onClick={() => setOpenModel(true)}
                  className={Style.createAccountBtn}
                >
                  <Image src={images.create2} alt="Create" width={20} height={20} />
                  Create Account
                </button>
              </>
            ) : (
              <div className={Style.loggedInControls}>
                <button 
                  className={Style.connectedWalletBtn}
                  onClick={() => setOpenUserModel(true)}
                >
                  <Image
                    src={userName ? images.accountName : images.create2}
                    alt="Account image"
                    width={20}
                    height={20}
                  />
                  <small>{userName || account.slice(0, 6)}...</small>
                </button>
                
                <button 
                  onClick={handleLogout}
                  className={Style.logoutBtn}
                >
                  <Image src={images.close} alt="Logout" width={16} height={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {openModel && (
        <div className={Style.modelBox}>
          <Model
            openBox={setOpenModel}
            title="Welcome to"
            head="De-Chat"
            info="Secure Decentralized Healthcare Messaging"
            smallInfo="Enter your details to get started..."
            image={images.hero}
            functionName={createAccount}
            address={account}
          />
        </div>
      )}

      {openUserModel && (
        <div className={Style.modelBox}>
          <UserAccountModel 
            openBox={setOpenUserModel}
            account={account}
            createAccount={createAccount}
          />
        </div>
      )}

      {error == "" ? "" : <Error error={error} />}
    </div>
  );
};

const UserAccountModel = ({ openBox, account, createAccount }) => {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    setLoading(true);
    try {
      await createAccount({ name });
      openBox(false);
    } catch (error) {
      console.error("Error creating account:", error);
      setError(error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={Style.userAccountModel}>
      <div className={Style.userAccountModel_box}>
        <div className={Style.userAccountModel_box_header}>
          <h2>Create Your Account</h2>
          <button onClick={() => openBox(false)} className={Style.closeButton}>
            <Image src={images.close} alt="Close" width={20} height={20} />
          </button>
        </div>

        {error && <div className={Style.errorMessage}>{error}</div>}

        <div className={Style.userAccountModel_box_form}>
          <div className={Style.formGroup}>
            <label>Your Name</label>
            <div className={Style.inputWithIcon}>
              <Image src={images.username} alt="User" width={20} height={20} />
              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className={Style.formGroup}>
            <label>MetaMask Address</label>
            <div className={Style.walletAddress}>
              {account}
            </div>
          </div>

          <div className={Style.buttonGroup}>
            <button 
              onClick={handleSubmit}
              className={Style.submitButton}
              disabled={loading}
            >
              {loading ? (
                <div className={Style.buttonLoader}></div>
              ) : (
                <>
                  <Image src={images.create2} alt="Create" width={20} height={20} />
                  Create Account
                </>
              )}
            </button>
            <button 
              onClick={() => openBox(false)}
              className={Style.cancelButton}
              disabled={loading}
            >
              <Image src={images.close} alt="Cancel" width={20} height={20} />
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NavBar;
