import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/router";

// INTERNAL IMPORTS
import Style from "./Chat.module.css";
import images from "../../../assets";
import { converTime } from "../../../Utils/apiFeature";
import { Loader } from "../../index";
import { IPFSService } from "../../../Utils/IPFSService";
import { AIService } from "../../../Utils/AIService";

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
  // STATE
  const [message, setMessage] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [sentiment, setSentiment] = useState(null);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [chatData, setChatData] = useState({ address: "", name: "" });
  const [appointmentData, setAppointmentData] = useState({
    date: "",
    time: "",
    reason: "",
    symptoms: "",
    urgency: "normal",
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;
    setChatData({
      address: router.query.address || "",
      name: router.query.name || ""
    });
  }, [router.isReady]);

  useEffect(() => {
    if (chatData.address) {
      readMessage(chatData.address);
      readUser(chatData.address);
    }
  }, [chatData.address]);

  const handleMessageChange = (e) => {
    const newMessage = e.target.value;
    setMessage(newMessage);
    
    if (newMessage.length > 3) {
      try {
        const newSuggestions = AIService.generateReplySuggestions(newMessage);
        setSuggestions(newSuggestions);
        setSentiment(AIService.analyzeSentiment(newMessage));
      } catch (error) {
        console.error('Error generating suggestions:', error);
        setSuggestions([]);
        setSentiment(null);
      }
    } else {
      setSuggestions([]);
      setSentiment(null);
    }
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;
    functionName({
      msg: message,
      address: chatData.address,
    });
    setMessage("");
    setSuggestions([]);
    setSentiment(null);
  };

  const handleAppointmentSubmit = async (e) => {
    e.preventDefault();
    if (!appointmentData.date || !appointmentData.time || !appointmentData.reason) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      // Format appointment message
      const appointmentMsg = `🏥 Appointment Request:\nDate: ${appointmentData.date}\nTime: ${appointmentData.time}\nReason: ${appointmentData.reason}\nSymptoms: ${appointmentData.symptoms || 'None provided'}\nUrgency: ${appointmentData.urgency}`;
      
      await functionName({
        msg: appointmentMsg,
        address: chatData.address,
      });

      setShowAppointmentForm(false);
      setAppointmentData({
        date: "",
        time: "",
        reason: "",
        symptoms: "",
        urgency: "normal",
      });
    } catch (error) {
      console.error("Error sending appointment request:", error);
      alert("Failed to send appointment request. Please try again.");
    }
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);
    const maxFiles = 5;
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (selectedFiles.length + files.length > maxFiles) {
      alert(`You can only upload up to ${maxFiles} files at a time`);
      return;
    }

    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        alert(`File ${file.name} is too large. Maximum size is 5MB`);
        return false;
      }
      return true;
    });

    setSelectedFiles(prev => [...prev, ...validFiles].slice(0, maxFiles));
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleFilesUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploadProgress(0);
    const totalFiles = selectedFiles.length;
    let uploadedFiles = 0;

    try {
      for (const file of selectedFiles) {
        const result = await IPFSService.uploadFile(file);
        if (!result.success) {
          throw new Error(`Failed to upload ${file.name}: ${result.error}`);
        }

        const msg = `[FILE]${file.name}|${result.url}`;
        await functionName({
          msg,
          address: chatData.address,
        });

        uploadedFiles++;
        setUploadProgress((uploadedFiles / totalFiles) * 100);
      }

      setSelectedFiles([]);
      setUploadProgress(0);
      alert("All files uploaded successfully!");
    } catch (error) {
      console.error("Error uploading files:", error);
      alert(`Error uploading files: ${error.message}`);
    }
  };

  const messagesEndRef = useRef(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [friendMsg]);

  return (
    <div className={Style.Chat}>
      {currentUserName && currentUserAddress ? (
        <div className={Style.Chat_user_info}>
          <Image 
            src={images.accountName} 
            alt="Profile" 
            width={70} 
            height={70} 
            className={Style.profile_image}
          />
          <div className={Style.Chat_user_info_box}>
            <h4>{currentUserName}</h4>
            <p className={Style.show}>{currentUserAddress}</p>
          </div>
        </div>
      ) : null}

      <div className={Style.Chat_box_box}>
        <div className={Style.Chat_box}>
          <div className={Style.Chat_box_left}>
            {friendMsg.length > 0 ? (
              friendMsg.map((el, i) => (
                <div key={i}>
                  <div className={Style.Chat_box_left_title}>
                    <Image
                      src={images.accountName}
                      alt="Profile"
                      width={50}
                      height={50}
                    />
                    <span>
                      {el.sender === chatData.address ? chatData.name : userName}
                      <small>Time: {converTime(el.timestamp)}</small>
                    </span>
                  </div>
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
                            loading="lazy"
                          />
                        ) : isPDF ? (
                          <a href={data} download={name}>
                            <span>📄</span> {name}
                          </a>
                        ) : (
                          <a href={data} download={name}>
                            <span>📎</span> {name}
                          </a>
                        );
                      })()
                    ) : (
                      el.msg
                    )}
                  </p>
                </div>
              ))
            ) : (
              <div className={Style.Chat_box_empty}>
                <h3>No messages yet</h3>
                <p>Start the conversation by sending a message or scheduling an appointment!</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {currentUserName && currentUserAddress && (
        <div className={Style.Chat_box_send}>
          <div className={Style.Chat_box_send_img}>
            <div className={Style.action_button} onClick={() => setShowAppointmentForm(true)} title="Schedule Appointment">
              <Image 
                src={images.smile} 
                alt="Schedule Appointment" 
                width={50} 
                height={50}
              />
            </div>
            
            <input
              type="text"
              placeholder="Type your message..."
              value={message}
              onChange={handleMessageChange}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            
            <div className={Style.file_upload}>
              <input
                type="file"
                id="file"
                className={Style.file_input}
                accept="image/*,.pdf,.doc,.docx"
                onChange={handleFileSelect}
                multiple
              />
              <label htmlFor="file" title="Upload Files">
                <Image 
                  src={images.file} 
                  alt="Upload" 
                  width={50} 
                  height={50}
                />
              </label>
            </div>
            
            {loading ? (
              <div className={`${Style.action_button} ${Style.loading_indicator}`}>
                <Loader />
              </div>
            ) : (
              <div className={Style.action_button} onClick={handleSendMessage} title="Send Message">
                <Image
                  src={images.send}
                  alt="Send"
                  width={50}
                  height={50}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Appointment Form Modal */}
      {showAppointmentForm && (
        <div className={Style.modal_overlay}>
          <div className={Style.modal_content}>
            <h3>Schedule Appointment</h3>
            <form onSubmit={handleAppointmentSubmit} className={Style.appointment_form}>
              <div className={Style.form_group}>
                <label>Date*:</label>
                <input
                  type="date"
                  value={appointmentData.date}
                  onChange={(e) => setAppointmentData({...appointmentData, date: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              
              <div className={Style.form_group}>
                <label>Time*:</label>
                <input
                  type="time"
                  value={appointmentData.time}
                  onChange={(e) => setAppointmentData({...appointmentData, time: e.target.value})}
                  required
                />
              </div>
              
              <div className={Style.form_group}>
                <label>Reason for Visit*:</label>
                <input
                  type="text"
                  value={appointmentData.reason}
                  onChange={(e) => setAppointmentData({...appointmentData, reason: e.target.value})}
                  placeholder="Brief reason for appointment"
                  required
                />
              </div>
              
              <div className={Style.form_group}>
                <label>Symptoms:</label>
                <textarea
                  value={appointmentData.symptoms}
                  onChange={(e) => setAppointmentData({...appointmentData, symptoms: e.target.value})}
                  placeholder="Describe your symptoms"
                  rows="3"
                />
              </div>
              
              <div className={Style.form_group}>
                <label>Urgency:</label>
                <select
                  value={appointmentData.urgency}
                  onChange={(e) => setAppointmentData({...appointmentData, urgency: e.target.value})}
                >
                  <option value="low">Low - Regular checkup</option>
                  <option value="normal">Normal - Minor health issue</option>
                  <option value="high">High - Urgent care needed</option>
                </select>
              </div>

              <div className={Style.file_upload_section}>
                <label htmlFor="appointment-files">
                  📎 Attach Documents (Optional)
                  <br />
                  <small>Upload up to 5 files (max 5MB each)</small>
                </label>
                <input
                  type="file"
                  id="appointment-files"
                  multiple
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx"
                  style={{ display: 'none' }}
                />
                
                {selectedFiles.length > 0 && (
                  <div className={Style.file_list}>
                    {selectedFiles.map((file, index) => (
                      <div key={index} className={Style.file_item}>
                        <span className={Style.file_item_name}>{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className={Style.remove_file}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    
                    {uploadProgress > 0 && (
                      <div className={Style.upload_progress}>
                        <div 
                          className={Style.upload_progress_bar}
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    )}
                    
                    <button
                      type="button"
                      onClick={handleFilesUpload}
                      className={Style.submit_btn}
                      style={{ marginTop: '1rem' }}
                    >
                      Upload Selected Files
                    </button>
                  </div>
                )}
              </div>

              <div className={Style.form_buttons}>
                <button type="submit" className={Style.submit_btn}>
                  Send Request
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowAppointmentForm(false);
                    setSelectedFiles([]);
                    setUploadProgress(0);
                  }}
                  className={Style.cancel_btn}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
