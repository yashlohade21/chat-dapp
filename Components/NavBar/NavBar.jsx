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

  //USESTATE
  const [active, setActive] = useState(2);
  const [open, setOpen] = useState(false);
  const [openModel, setOpenModel] = useState(false);

  const { account, userName, connectWallet, createAccount, error } = useContext(ChatAppContect);

  useEffect(() => {
    if (account) {
      const pendingAccount = localStorage.getItem('pendingAccount');
      if (pendingAccount) {
        const { name, category } = JSON.parse(pendingAccount);
        createAccount({ name, category });
        localStorage.removeItem('pendingAccount');
      }
    }
  }, [account]);

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
            {!userName && (
              <button 
                onClick={() => setOpenModel(true)}
                className={Style.createAccountBtn}
              >
                Create Account
              </button>
            )}
            
            {account ? (
              <button className={Style.connectedWalletBtn}>
                <Image
                  src={userName ? images.accountName : images.create2}
                  alt="Account image"
                  width={20}
                  height={20}
                />
                <small>{userName || account.slice(0, 6)}...</small>
              </button>
            ) : null}
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
      {error == "" ? "" : <Error error={error} />}
    </div>
  );
};

export default NavBar;
