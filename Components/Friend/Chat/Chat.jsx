import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";

//INTERNAL IMPORT
import Style from "./Chat.module.css";
import images from "../../../assets";
import { converTime } from "../../../Utils/apiFeature";
import { Loader } from "../../index";

const Chat = ({
  functionName,
  readMessage,
  friendMsg,
  account,
  userName,
  loading,
  currentUserName,
  currentUserAddress,
  readUser,
}) => {
  //USTE STATE
  const [message, setMessage] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [sentiment, setSentiment] = useState(null);
  const [chatData, setChatData] = useState({
    name: "",
    address: "",
  });

  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;
    setChatData(router.query);
    console.log(router.query);
  }, [router.isReady]);

  useEffect(() => {
    if (chatData.address) {
      readMessage(chatData.address);
      readUser(chatData.address);
    }
  }, []);

  return (
    <div className={Style.Chat}>
      {currentUserName && currentUserAddress ? (
        <div className={Style.Chat_user_info}>
          <Image src={images.accountName} alt="image" width={70} height={70} />
          <div className={Style.Chat_user_info_box}>
            <h4>{currentUserName}</h4>
            <p className={Style.show}>{currentUserAddress}</p>
          </div>
        </div>
      ) : (
        ""
      )}

      <div className={Style.Chat_box_box}>
        <div className={Style.Chat_box}>
          <div className={Style.Chat_box_left}>
            {friendMsg.map((el, i) => (
              <div>
                {el.sender == chatData.address ? (
                  <div className={Style.Chat_box_left_title}>
                    <Image
                      src={images.accountName}
                      alt="image"
                      width={50}
                      height={50}
                    />
                    <span>
                      {chatData.name} {""}
                      <small>Time: {converTime(el.timestamp)}</small>
                    </span>
                  </div>
                ) : (
                  <div className={Style.Chat_box_left_title}>
                    <Image
                      src={images.accountName}
                      alt="image"
                      width={50}
                      height={50}
                    />
                    <span>
                      {userName} {""}
                      <small>Time: {converTime(el.timestamp)}</small>
                    </span>
                  </div>
                )}
                <p key={i + 1}>
                  {el.msg.startsWith('[FILE]') ? (
                    (() => {
                      const [name, data] = el.msg.slice(6).split('|');
                      const isImage = name.match(/\.(jpg|jpeg|png|gif)$/i);
                      const isPDF = name.match(/\.pdf$/i);
                      
                      return isImage ? (
                        <img src={data} alt={name} style={{maxWidth: '200px'}} />
                      ) : isPDF ? (
                        <a href={data} download={name}>Download PDF: {name}</a>
                      ) : (
                        <a href={data} download={name}>Download: {name}</a>
                      );
                    })()
                  ) : (
                    el.msg
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>

        {currentUserName && currentUserAddress ? (
          <div className={Style.Chat_box_send}>
            <div className={Style.Chat_box_send_img}>
              <Image src={images.smile} alt="smile" width={50} height={50} />
              <input
                type="text"
                placeholder="type your message"
                onChange={(e) => {
                  const newMessage = e.target.value;
                  setMessage(newMessage);
                  if (newMessage.length > 3) {
                    const newSuggestions = AIService.generateReplySuggestions(newMessage);
                    setSuggestions(newSuggestions);
                    setSentiment(AIService.analyzeSentiment(newMessage));
                  }
                }}
              />
              {suggestions.length > 0 && (
                <div className={Style.Chat_suggestions}>
                  {suggestions.map((suggestion, i) => (
                    <button 
                      key={i}
                      onClick={() => setMessage(suggestion)}
                      className={Style.suggestion_btn}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
              <div className={Style.file_upload}>
                <input
                  type="file"
                  id="file"
                  className={Style.file_input}
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                      // Convert file to IPFS-compatible format
                      const reader = new FileReader();
                      reader.onloadend = async () => {
                        try {
                          const msg = `[FILE]${file.name}|${reader.result}`;
                          functionName({
                            msg,
                            address: router.query.address,
                          });
                        } catch (error) {
                          console.error("Error uploading file:", error);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <div className={Style.file_upload}>
                <input
                  type="file"
                  id="file"
                  className={Style.file_input}
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        alert('File size should be less than 5MB');
                        return;
                      }
                      
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const msg = `[FILE]${file.name}|${reader.result}`;
                        functionName({
                          msg,
                          address: router.query.address,
                        });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <label htmlFor="file">
                  <Image src={images.file} alt="file" width={50} height={50} style={{cursor: 'pointer'}} />
                </label>
              </div>
              </div>
              {loading == true ? (
                <Loader />
              ) : (
                <Image
                  src={images.send}
                  alt="file"
                  width={50}
                  height={50}
                  onClick={() =>
                    functionName({
                      msg: message,
                      address: router.query.address,
                    })
                  }
                />
              )}
            </div>
          </div>
        ) : (
          ""
        )}
      </div>
    </div>
  );
};

export default Chat;
