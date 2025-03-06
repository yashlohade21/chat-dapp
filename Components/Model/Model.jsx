import React, { useState, useContext, useEffect } from "react";
import Image from "next/image";

//INTERNAL IMPORT
import Style from "./Model.module.css";
import images from "../../assets";
import { ChatAppContect } from "../../Context/ChatAppContext";
import { Loader } from "../../Components/index";

const Model = ({ openBox, title, address, head, info, smallInfo, image, functionName }) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("0");
  const { loading, connectWallet } = useContext(ChatAppContect);

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert("Please enter your name");
      return;
    }

    if (!address) {
      // Store form data temporarily
      localStorage.setItem('pendingAccount', JSON.stringify({ name, category }));
      // Close modal
      openBox(false);
      // Connect wallet
      await connectWallet();
      return;
    }

    functionName({ 
      name, 
      category 
    });
  };

  // Load pending account data if exists
  useEffect(() => {
    const pendingAccount = localStorage.getItem('pendingAccount');
    if (pendingAccount) {
      const { name: savedName, category: savedCategory } = JSON.parse(pendingAccount);
      setName(savedName);
      setCategory(savedCategory);
    }
  }, []);

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

          {loading === true ? (
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
                <button onClick={handleSubmit}>
                  <Image src={images.send} alt="send" width={24} height={24} />
                  {!address ? 'Continue & Connect Wallet' : 'Create Account'}
                </button>

                <button onClick={() => openBox(false)}>
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
