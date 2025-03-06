import React, { useState, useContext, useEffect } from "react";
import Image from "next/image";

// INTERNAL IMPORT
import Style from "./Model.module.css";
import images from "../../assets";
import { ChatAppContect } from "../../Context/ChatAppContext";
import { Loader } from "../../Components/index";

const Model = ({ openBox, title, address, head, info, smallInfo, image, functionName }) => {
  const [name, setName] = useState("");
  const [userAddress, setUserAddress] = useState(address);
  const [category, setCategory] = useState("0");
  const { loading, createAccount, connectWallet, account } = useContext(ChatAppContect);

  const handleCreateAccount = async () => {
    if (!account) {
      await connectWallet();
      return;
    }

    if (!name) {
      console.error("Name cannot be empty");
      return;
    }

    try {
      await createAccount({ name, userAddress: account, category });
      console.log("Account created successfully");
      window.location.reload();
    } catch (error) {
      console.error("Error creating account:", error);
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

          {loading ? (
            <Loader />
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

              <div className={Style.Model_box_right_name_info}>
                <Image src={images.account} alt="user" width={30} height={30} />
                <input
                  type="text"
                  placeholder={address || "Enter address.."}
                  onChange={(e) => setUserAddress(e.target.value)}
                  value={userAddress}
                  disabled={!!address}
                />
              </div>
              
              <div className={Style.Model_box_right_name_info}>
                <Image 
                  src={images.account} 
                  alt="category" 
                  width={24} 
                  height={24} 
                />
                <select 
                  onChange={(e) => setCategory(e.target.value)} 
                  value={category}
                  className={Style.Model_box_right_name_select}
                  required
                >
                  <option value="0">Patient</option>
                  <option value="1">Doctor</option>
                </select>
              </div>

              {!address && (
                <p className={Style.Model_box_right_name_info}>
                  👉 After filling details, click continue to connect wallet
                </p>
              )}

              <div className={Style.Model_box_right_name_btn}>
                <button onClick={handleCreateAccount}>
                  {""}
                  <Image src={images.send} alt="send" width={30} height={30} />
                  {""}
                  Submit
                </button>

                <button onClick={() => openBox(false)}>
                  {""}
                  <Image src={images.close} alt="send" width={30} height={30} />
                  {""}
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