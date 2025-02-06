import React, { useState, useContext } from "react";
import Image from "next/image";

//INTERNAL IMPORT
import Style from "./Model.module.css";
import images from "../../assets";
import { ChatAppContect } from "../../Context/ChatAppContext";
import { Loader } from "../../Components/index";

const Model = ({ openBox, title, address, head, info, smallInfo, image, functionName }) => {
  const [name, setName] = useState("");
  const [userAddress, setUserAddress] = useState(address);
  // New state for category: default to "0" (Patient)
  const [category, setCategory] = useState("0");

  const { loading } = useContext(ChatAppContect);
  return (
    <div className={Style.Model}>
      <div className={Style.Model_box}>
        <div className={Style.Model_box_left}>
          <Image src={image} alt="buddy" width={700} height={700} />
        </div>
        <div className={Style.Model_box_right}>
          <h1>
            {title} <span>{head}</span>
          </h1>
          <p>{info}</p>
          <small>{smallInfo}</small>

          {loading === true ? (
            <Loader />
          ) : (
            <div className={Style.Model_box_right_name}>
              <div className={Style.Model_box_right_name_info}>
                <Image
                  src={images.username}
                  alt="user"
                  width={30}
                  height={30}
                />
                <input
                  type="text"
                  placeholder="Your name"
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className={Style.Model_box_right_name_info}>
                <Image src={images.account} alt="address" width={30} height={30} />
                <input
                  type="text"
                  placeholder={address || "Enter address.."}
                  onChange={(e) => setUserAddress(e.target.value)}
                />
              </div>
              {/* Category Selection */}
              <div className={Style.Model_box_right_name_info}>
                <Image src={images.account} alt="category" width={30} height={30} />
                <select 
                  onChange={(e) => setCategory(e.target.value)} 
                  defaultValue="0"
                  className={Style.Model_box_right_name_select}
                  required
                  aria-label="Select account type"
                >
                  <option value="" disabled>Select account type</option>
                  <option value="0">Patient</option>
                  <option value="1">Doctor</option>
                </select>
              </div>

              <div className={Style.Model_box_right_name_btn}>
                <button onClick={() => functionName({ name, userAddress, category })}>
                  <Image src={images.send} alt="send" width={30} height={30} />
                  Submit
                </button>

                <button onClick={() => openBox(false)}>
                  <Image src={images.close} alt="close" width={30} height={30} />
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
