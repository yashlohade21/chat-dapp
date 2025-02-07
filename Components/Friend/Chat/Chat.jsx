import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";

// INTERNAL IMPORTS
import Style from "./Chat.module.css";
import images from "../../../assets";
import { converTime } from "../../../Utils/apiFeature";
import { Loader } from "../../index";
// NEW: Import IPFSService for file uploads in chat
import { IPFSService } from "../../../Utils/IPFSService";

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
  // US STATE
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

  const handleSendMessage = () => {
    if (!message.trim()) return;
    functionName({
      msg: message,
      address: router.query.address,
    });
    setMessage(""); // Clear input after sending
  };

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
              <div key={i}>
                {el.sender == chatData.address ? (
                  <div className={Style.Chat_box_left_title}>
                    <Image
                      src={images.accountName}
                      alt="image"
                      width={50}
                      height={50}
                    />
                    <span>
                      {chatData.name} <small>Time: {converTime(el.timestamp)}</small>
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
                      {userName} <small>Time: {converTime(el.timestamp)}</small>
                    </span>
                  </div>
                )}
                <p>
                  {el.msg.startsWith('[FILE]') ? (
                    (() => {
                      const [name, data] = el.msg.slice(6).split('|');
                      const isImage = name.match(/\.(jpg|jpeg|png|gif)$/i);
                      const isPDF = name.match(/\.pdf$/i);
                      
                      return isImage ? (
                        <img 
                          src={data} 
                          alt={name} 
                          style={{maxWidth: '200px'}} 
                        />
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
                {/* NEW: File upload input using IPFS; on successful upload, alert the user */}
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
                      try {
                        const result = await IPFSService.uploadFile(file);
                        if (!result.success) {
                          alert("Error uploading file: " + result.error);
                          return;
                        }
                        const msg = `[FILE]${file.name}|${result.url}`;
                        functionName({
                          msg,
                          address: router.query.address,
                        });
                        alert("File uploaded successfully!");
                      } catch (error) {
                        console.error("Error uploading file:", error);
                        alert("Error uploading file.");
                      }
                    }
                  }}
                />
                <label htmlFor="file">
                  <Image src={images.file} alt="file" width={50} height={50} style={{cursor: 'pointer'}} />
                </label>
              </div>
              {loading ? (
                <Loader />
              ) : (
                <Image
                  src={images.send}
                  alt="file"
                  width={50}
                  height={50}
                  onClick={handleSendMessage}
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
