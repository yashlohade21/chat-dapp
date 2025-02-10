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
import { encryptFileWithPassphrase, decryptFileWithPassphrase } from "../../../Utils/CryptoService";
import CryptoJS from "crypto-js";

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
  const [decrypting, setDecrypting] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [currentDecryptionKey, setCurrentDecryptionKey] = useState('');
  const [localLoading, setLocalLoading] = useState(false);

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

  const handleSendMessage = async () => {
    if (!message.trim() || localLoading) return;
    
    try {
      setLocalLoading(true);
      await functionName({
        msg: message,
        address: chatData.address,
      });
      setMessage("");
      setSuggestions([]);
      setSentiment(null);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = error.message || "Failed to send message. Please try again later.";
      alert(errorMessage);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleAppointmentSubmit = async (e) => {
    e.preventDefault();
    if (!appointmentData.date || !appointmentData.time || !appointmentData.reason) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      let uploadedFileUrls = [];
      let decryptionKeys = [];
      
      // First handle any file uploads
      if (selectedFiles.length > 0) {
        setUploadProgress(0);
        const totalFiles = selectedFiles.length;
        
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          try {
            const fileBuffer = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = (error) => reject(new Error(`Failed to read file: ${error.message}`));
              reader.readAsArrayBuffer(file);
            });
            
            const base64Data = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
            const randomKey = CryptoJS.lib.WordArray.random(32).toString();
            
            const encryptionResult = await encryptFileWithPassphrase(base64Data, randomKey);
            if (!encryptionResult.success) {
              throw new Error(`Encryption failed for ${file.name}`);
            }
            
            const encryptedFileBlob = new Blob([encryptionResult.encryptedData], { type: file.type });
            const encryptedFile = new File([encryptedFileBlob], file.name, { type: file.type });
            
            const result = await IPFSService.uploadFile(encryptedFile);
            if (!result.success) {
              throw new Error(`Failed to upload ${file.name}`);
            }
            
            uploadedFileUrls.push(`[ENC_FILE]${file.name}|${result.url}|${encryptionResult.passphraseHash}|${encryptionResult.salt}`);
            decryptionKeys.push({ fileName: file.name, key: randomKey });
            
            setUploadProgress(((i + 1) / totalFiles) * 100);
          } catch (fileError) {
            console.error(`Error processing file ${file.name}:`, fileError);
            continue;
          }
        }
      }
      
      // Format appointment message with emojis and better structure
      const appointmentMsg = `🏥 *New Appointment Request*\n
📅 Date: ${appointmentData.date}
⏰ Time: ${appointmentData.time}
📝 Reason: ${appointmentData.reason}
${appointmentData.symptoms ? `🔍 Symptoms: ${appointmentData.symptoms}` : ''}
🚨 Urgency: ${appointmentData.urgency.toUpperCase()}`;
      
      // Send appointment message
      await functionName({
        msg: appointmentMsg,
        address: chatData.address,
      });
      
      // Send file messages
      for (const fileUrl of uploadedFileUrls) {
        await functionName({
          msg: fileUrl,
          address: chatData.address,
        });
      }

      // Show decryption keys in modal
      if (decryptionKeys.length > 0) {
        setCurrentDecryptionKey(decryptionKeys.map(dk => 
          `File: ${dk.fileName}\nKey: ${dk.key}`
        ).join('\n\n'));
        setShowKeyModal(true);
      }

      setShowAppointmentForm(false);
      setAppointmentData({
        date: "",
        time: "",
        reason: "",
        symptoms: "",
        urgency: "normal",
      });
      setSelectedFiles([]);
      setUploadProgress(0);
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
    if (!selectedFiles.length) return;
    setUploadProgress(0);
    const totalFiles = selectedFiles.length;
    let uploadedFiles = 0;

    try {
      for (const file of selectedFiles) {
        try {
          const fileBuffer = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(new Error(`Failed to read file: ${error.message}`));
            reader.readAsArrayBuffer(file);
          });
          
          let base64Data;
          try {
            base64Data = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
          } catch (error) {
            throw new Error(`Failed to convert file to base64: ${error.message}`);
          }

          const randomKey = CryptoJS.lib.WordArray.random(32).toString();
          const encryptionResult = await encryptFileWithPassphrase(base64Data, randomKey);
          if (!encryptionResult.success) {
            throw new Error(`Encryption failed for ${file.name}: ${encryptionResult.error}`);
          }
          const { encryptedData, passphraseHash, salt } = encryptionResult;

          const encryptedFileBlob = new Blob([encryptedData], { type: file.type });
          const encryptedFile = new File([encryptedFileBlob], file.name, { type: file.type });

          const result = await IPFSService.uploadFile(encryptedFile);
          if (!result.success) {
            throw new Error(`Failed to upload ${file.name}: ${result.error}`);
          }

          const msg = `[ENC_FILE]${file.name}|${result.url}|${passphraseHash}|${salt}`;
          await functionName({
            msg,
            address: chatData.address,
          });

          const keyMessage = `File "${file.name}" encrypted successfully!\n\nDecryption key (save this securely):\n${randomKey}`;
          
          const textarea = document.createElement('textarea');
          textarea.value = randomKey;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          
          if (window.confirm(keyMessage + '\n\nClick OK to copy the key to clipboard')) {
            try {
              textarea.select();
              document.execCommand('copy');
              alert('Decryption key copied to clipboard!');
            } catch (copyError) {
              console.error('Failed to copy to clipboard:', copyError);
              alert('Could not copy automatically. Please manually select and copy the key:\n\n' + randomKey);
            }
          }
          
          document.body.removeChild(textarea);

          uploadedFiles++;
          setUploadProgress((uploadedFiles / totalFiles) * 100);
        } catch (fileError) {
          console.error(`Error processing file ${file.name}:`, fileError);
          alert(`Failed to process ${file.name}: ${fileError.message}`);
          continue;
        }
      }
      
      if (uploadedFiles === 0) {
        throw new Error('No files were successfully uploaded');
      }
      
      setSelectedFiles([]);
      setUploadProgress(0);
      alert(`Successfully uploaded ${uploadedFiles} out of ${totalFiles} files`);
    } catch (error) {
      console.error("Error uploading files:", error);
      alert(`Error uploading files: ${error.message}`);
    }
  };

  const handleDecryptChatFile = async (name, url, passphraseHash, salt) => {
    const providedKey = window.prompt(`Enter decryption key for "${name}":`);
    if (!providedKey) return;
    
    setDecrypting(true);
    try {
      const cid = url.split('/').pop();
      if (!cid) {
        throw new Error('Invalid file URL');
      }

      const response = await IPFSService.getFile(cid);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch file from IPFS');
      }

      const decryptResult = await decryptFileWithPassphrase(response.data, providedKey, passphraseHash, salt);
      if (!decryptResult.success) {
        throw new Error(decryptResult.error || 'Failed to decrypt file');
      }

      const isImage = name.match(/\.(jpg|jpeg|png|gif)$/i);
      const isPDF = name.match(/\.pdf$/i);
      
      if (isImage) {
        const img = new Image();
        img.src = `data:image/${name.split('.').pop()};base64,${decryptResult.decryptedData}`;
        const win = window.open("");
        win.document.write(img.outerHTML);
      } else if (isPDF) {
        window.open(`data:application/pdf;base64,${decryptResult.decryptedData}`, '_blank');
      } else {
        const link = document.createElement('a');
        link.href = `data:application/octet-stream;base64,${decryptResult.decryptedData}`;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Decryption error:', error);
      alert(`Error decrypting file: ${error.message}`);
    } finally {
      setDecrypting(false);
    }
  };

  const DecryptionKeyModal = ({ show, onClose, decryptionKey }) => {
    if (!show) return null;

    return (
      <div className={Style.modal_overlay}>
        <div className={Style.modal_content} style={{ maxWidth: '500px' }}>
          <h3>🔐 Decryption Keys</h3>
          <div className={Style.decryption_key_content}>
            <p>Please save these decryption keys securely. You'll need them to access your files later.</p>
            <pre className={Style.key_display}>{decryptionKey}</pre>
            <div className={Style.key_actions}>
              <button
                className={Style.copy_btn}
                onClick={() => {
                  navigator.clipboard.writeText(decryptionKey);
                  alert('Keys copied to clipboard!');
                }}
              >
                📋 Copy Keys
              </button>
              <button className={Style.close_btn} onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
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
                  <div className={Style.Chat_message_text}>
                    {el.msg.startsWith('[ENC_FILE]') ? (
                      (() => {
                        const parts = el.msg.slice(9).split('|'); // remove prefix "[ENC_FILE]"
                        const [fileName, fileUrl, passphraseHash, salt] = parts;
                        const isImage = fileName.match(/\.(jpg|jpeg|png|gif)$/i);
                        return (
                          <div>
                            {isImage ? (
                              <img 
                                src={fileUrl} 
                                alt={fileName} 
                                loading="lazy" 
                                style={{ maxWidth: '300px' }}
                              />
                            ) : (
                              <a href={fileUrl} download={fileName}>
                                <span>📎</span> {fileName}
                              </a>
                            )}
                            <button 
                              onClick={() => handleDecryptChatFile(fileName, fileUrl, passphraseHash, salt)}
                              style={{ display: 'block', marginTop: '0.5rem' }}
                            >
                              Decrypt File
                            </button>
                          </div>
                        );
                      })()
                    ) : el.msg.startsWith('[FILE]') ? (
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
                      <p>{el.msg}</p>
                    )}
                  </div>
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
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !localLoading) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={localLoading || loading}
              className={localLoading || loading ? Style.input_disabled : ''}
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
            
            {localLoading || loading ? (
              <div className={`${Style.action_button} ${Style.loading_indicator}`}>
                <Loader />
              </div>
            ) : (
              <div 
                className={Style.action_button} 
                onClick={handleSendMessage} 
                title="Send Message"
              >
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

      {showAppointmentForm && (
        <div className={Style.modal_overlay}>
          <div className={Style.modal_content}>
            <h3>📅 Schedule Appointment</h3>
            <form onSubmit={handleAppointmentSubmit} className={Style.appointment_form}>
              <div className={Style.form_group}>
                <label>Date*</label>
                <input
                  type="date"
                  value={appointmentData.date}
                  onChange={(e) => setAppointmentData({...appointmentData, date: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              
              <div className={Style.form_group}>
                <label>Time*</label>
                <input
                  type="time"
                  value={appointmentData.time}
                  onChange={(e) => setAppointmentData({...appointmentData, time: e.target.value})}
                  required
                />
              </div>
              
              <div className={Style.form_group}>
                <label>Reason for Visit*</label>
                <input
                  type="text"
                  value={appointmentData.reason}
                  onChange={(e) => setAppointmentData({...appointmentData, reason: e.target.value})}
                  placeholder="Brief reason for appointment"
                  required
                />
              </div>
              
              <div className={Style.form_group}>
                <label>Symptoms</label>
                <textarea
                  value={appointmentData.symptoms}
                  onChange={(e) => setAppointmentData({...appointmentData, symptoms: e.target.value})}
                  placeholder="Describe your symptoms in detail..."
                  rows="3"
                />
              </div>
              
              <div className={Style.form_group}>
                <label>Urgency Level</label>
                <select
                  value={appointmentData.urgency}
                  onChange={(e) => setAppointmentData({...appointmentData, urgency: e.target.value})}
                  className={Style[`urgency_${appointmentData.urgency}`]}
                >
                  <option value="low">🟢 Low - Regular checkup</option>
                  <option value="normal">🟡 Normal - Minor health issue</option>
                  <option value="high">🔴 High - Urgent care needed</option>
                </select>
              </div>

              <div className={Style.form_group}>
                <label className={Style.file_upload_label}>
                  <span>📎 Attach Medical Documents</span>
                  <small>Upload relevant medical records, test results, or prescriptions</small>
                </label>
                <div 
                  className={Style.file_upload_area}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add(Style.drag_over);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove(Style.drag_over);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove(Style.drag_over);
                    const files = Array.from(e.dataTransfer.files);
                    handleFileSelect({ target: { files } });
                  }}
                  onClick={() => document.getElementById('appointment-files').click()}
                >
                  <input
                    type="file"
                    id="appointment-files"
                    multiple
                    onChange={handleFileSelect}
                    accept="image/*,.pdf,.doc,.docx"
                    className={Style.file_input}
                  />
                  <div className={Style.upload_icon}>📤</div>
                  <p>Drop files here or click to browse</p>
                  <small>Maximum 5 files (5MB each)</small>
                </div>
                
                {selectedFiles.length > 0 && (
                  <div className={Style.selected_files}>
                    {selectedFiles.map((file, index) => (
                      <div key={index} className={Style.file_item}>
                        <span className={Style.file_icon}>
                          {file.type.includes('image') ? '🖼️' : '📄'}
                        </span>
                        <span className={Style.file_name}>{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className={Style.remove_file}
                          aria-label="Remove file"
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
                  </div>
                )}
              </div>

              <div className={Style.form_buttons}>
                <button type="submit" className={Style.submit_btn}>
                  Schedule Appointment
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

      <DecryptionKeyModal
        show={showKeyModal}
        onClose={() => setShowKeyModal(false)}
        decryptionKey={currentDecryptionKey}
      />
    </div>
  );
};

export default Chat;