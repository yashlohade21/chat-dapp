import React, { useEffect, useState, useRef, useCallback, useContext } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { AIService, SUPPORTED_LANGUAGES } from "../../../Utils/AIService";
import Style from "./Chat.module.css";
import images from "../../../assets";
import { converTime } from "../../../Utils/apiFeature";
import { Loader } from "../../index";
import { IPFSService } from "../../../Utils/IPFSService";
import { decryptFileWithPassphrase } from "../../../Utils/CryptoService";
import { ChatAppContect } from "../../../Context/ChatAppContext";


const MetricsChart = React.memo(({ data }) => (
  <div className={Style.metrics_chart}>
    <h4>Translation Accuracy Trends</h4>
    <LineChart
      width={600}
      height={300}
      data={data}
      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
    >
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis
        dataKey="timestamp"
        tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()}
      />
      <YAxis 
        domain={[0.6, 1]} 
        tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
      />
      <Tooltip
        formatter={(value) => `${(value * 100).toFixed(1)}%`}
        labelFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()}
      />
      <Legend />
      <Line
        type="monotone"
        dataKey="accuracy"
        stroke="#8884d8"
        name="Accuracy"
        isAnimationActive={false}
      />
      <Line
        type="monotone"
        dataKey="confidence"
        stroke="#82ca9d"
        name="Confidence"
        isAnimationActive={false}
      />
    </LineChart>
  </div>
));

const TranslationUI = React.memo(({ 
  selectedLanguage,
  onLanguageChange,
  showMetrics,
  onToggleMetrics,
  showTranslation,
  translatedMessage,
  onCloseTranslation,
  translationMetrics,
  historicalMetrics 
}) => {
  if (!SUPPORTED_LANGUAGES || !Array.isArray(SUPPORTED_LANGUAGES)) {
    return null;
  }
  
  return (
    <div className={Style.translation_container}>
      <div className={Style.translation_header}>
        <select
          value={selectedLanguage}
          onChange={onLanguageChange}
          className={Style.language_select}
        >
          {SUPPORTED_LANGUAGES.map(lang => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
        <button
          onClick={onToggleMetrics}
          className={Style.metrics_toggle}
        >
          {showMetrics ? '📊 Hide Metrics' : '📊 Show Metrics'}
        </button>
      </div>

      <div className={Style.translation_content}>
        <div className={Style.translation_text}>
          {translatedMessage}
        </div>
        
        {translationMetrics && (
          <div className={Style.metrics_badge}>
            Accuracy: {(translationMetrics.accuracy * 100).toFixed(1)}%
          </div>
        )}
      </div>

      {showMetrics && historicalMetrics?.length > 0 && (
        <MetricsChart data={historicalMetrics} />
      )}
    </div>
  );
});

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

const ChatbotPanel = ({ response, onClose }) => (
  <div className={Style.side_panel}>
    <div className={Style.panel_header}>
      <h3>AI Assistant</h3>
      <button onClick={onClose} className={Style.panel_close}>×</button>
    </div>
    <div className={Style.panel_content}>
      <div className={Style.chatbot_response}>
        {response}
      </div>
      <div className={Style.chatbot_suggestions}>
        <button className={Style.suggestion_btn}>Tell me more</button>
        <button className={Style.suggestion_btn}>Give an example</button>
        <button className={Style.suggestion_btn}>Explain differently</button>
      </div>
    </div>
  </div>
);

const RecommendationsPanel = ({ recommendations, onClose }) => (
  <div className={Style.side_panel}>
    <div className={Style.panel_header}>
      <h3>Smart Suggestions</h3>
      <button onClick={onClose} className={Style.panel_close}>×</button>
    </div>
    <div className={Style.panel_content}>
      {recommendations.map((rec, index) => (
        <div key={index} className={Style.recommendation_item}>
          <p>{rec}</p>
          <div className={Style.recommendation_actions}>
            <button className={Style.action_btn}>Use</button>
            <button className={Style.action_btn}>Modify</button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const Chat = ({ currentAccount, currentUser, currentFriend }) => {
  const router = useRouter();
  const { readMessage, readUser, sendMessage, friendMsg, loading, userName, account } = useContext(ChatAppContect) || {};
  const [message, setMessage] = useState("");
  const [showTranslation, setShowTranslation] = useState(false);
  const [translatedMessage, setTranslatedMessage] = useState("");
  const [messageCategory, setMessageCategory] = useState("general");
  const [selectedLanguage, setSelectedLanguage] = useState('es');
  const [translationMetrics, setTranslationMetrics] = useState(null);
  const [showMetrics, setShowMetrics] = useState(false);
  const [historicalMetrics, setHistoricalMetrics] = useState([]);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [appointmentData, setAppointmentData] = useState({
    date: "",
    time: "",
    reason: "",
    symptoms: "",
    urgency: "normal"
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [localLoading, setLocalLoading] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [currentDecryptionKey, setCurrentDecryptionKey] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [sentiment, setSentiment] = useState(null);
  const [showPHIWarning, setShowPHIWarning] = useState(false);
  const [chatData, setChatData] = useState({ address: "", name: "" });
  const [chatBoxRef, setChatBoxRef] = useState(null);
  const [notification, setNotification] = useState(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [showChatbotResponse, setShowChatbotResponse] = useState(false);
  const [chatbotResponse, setChatbotResponse] = useState('');
  const [decrypting, setDecrypting] = useState(false);
  const messagesEndRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(false);

  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [friendMsg, autoScroll]);

  useEffect(() => {
    if (!router.isReady) return;
    
    setChatData({
      address: router.query.address || "",
      name: router.query.name || ""
    });
  }, [router.isReady, router.query]);

  useEffect(() => {
    if (chatData.address) {
      readMessage(chatData.address);
      readUser(chatData.address);
    }
  }, [chatData.address, readMessage, readUser]);

  const toggleAutoScroll = () => {
    setAutoScroll(prev => !prev);
  };

  const handleLanguageChange = useCallback((e) => {
    setSelectedLanguage(e.target.value);
  }, []);

  const handleToggleMetrics = useCallback(() => {
    setShowMetrics(prev => !prev);
  }, []);

  const handleCloseTranslation = useCallback(() => {
    setShowTranslation(false);
  }, []);

  const handleTranslateMessage = useCallback(async () => {
    if (!message.trim()) {
      alert("Please type a message to translate");
      return;
    }
    try {
      const result = await AIService.translateMessage(message, selectedLanguage);
      setTranslatedMessage(result.translation);
      setTranslationMetrics(result.metrics);
      setShowTranslation(true);
      
      setHistoricalMetrics(prev => [
        {
          accuracy: result.metrics.accuracy,
          confidence: result.metrics.confidence,
          timestamp: result.metrics.timestamp
        },
        ...prev.slice(0, 9)
      ]);
    } catch (error) {
      console.error('Translation error:', error);
      alert("Failed to translate message");
    }
  }, [message, selectedLanguage]);

  const handleMessageChange = useCallback((e) => {
    const newMessage = e.target.value;
    setMessage(newMessage);
    
    if (newMessage.length > 3) {
      try {
        const newSuggestions = AIService.generateReplySuggestions(newMessage);
        setSuggestions(newSuggestions);
        setSentiment(AIService.analyzeSentiment(newMessage));
        setMessageCategory(AIService.classifyTopic(newMessage));
        
        const phiTerms = AIService.detectPHI(newMessage);
        if (phiTerms.length > 0) {
          setShowPHIWarning(true);
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    } else {
      setSuggestions([]);
      setSentiment(null);
      setMessageCategory("general");
    }
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!message.trim() || loading) return;
    
    try {
      setLocalLoading(true);
      await sendMessage({
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
  }, [message, loading, sendMessage, chatData.address]);

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
        const img = document.createElement('img');
        img.src = `data:image/${name.split('.').pop()};base64,${decryptResult.decryptedData}`;
        const win = window.open("", "_blank");
        win.document.write(`
          <html>
            <head>
              <title>${name}</title>
              <style>
                body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #292F3F; }
                img { max-width: 100%; max-height: 100vh; object-fit: contain; }
              </style>
            </head>
            <body>
              ${img.outerHTML}
            </body>
          </html>
        `);
      } else if (isPDF) {
        const pdfBlob = new Blob([decryptResult.decryptedData], { type: 'application/pdf' });
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const win = window.open("", "_blank");
        win.document.write(`
          <html>
            <head>
              <title>${name}</title>
              <style>
                body { margin: 0; }
                iframe { border: none; width: 100vw; height: 100vh; }
              </style>
            </head>
            <body>
              <iframe src="${pdfUrl}#toolbar=0" type="application/pdf"></iframe>
            </body>
          </html>
        `);
      } else {
        const fileBlob = new Blob([decryptResult.decryptedData], { type: file.type || 'application/octet-stream' });
        const downloadUrl = URL.createObjectURL(fileBlob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
      }
    } catch (error) {
      console.error('Decryption error:', error);
      alert(`Error decrypting file: ${error.message}`);
    } finally {
      setDecrypting(false);
    }
  };

  const handleSummarizeChat = () => {
    if (friendMsg.length === 0) {
      alert("No messages to summarize");
      return;
    }
    const allMessages = friendMsg.map(msg => msg.msg).join(" ");
    const summary = AIService.summarizeText(allMessages);
    alert("Chat Summary:\n" + summary);
  };

  const handleChatbotQuery = useCallback(async () => {
    try {
      const response = await AIService.chatbotResponse("How can I help?");
      setChatbotResponse(response);
      setShowChatbotResponse(true);
    } catch (error) {
      console.error("Chatbot error:", error);
      setNotification({
        type: 'error',
        message: error.message || "An error occurred while fetching the chatbot response."
      });
    }
  }, []);

  const handleTextPrediction = useCallback(() => {
    if (!message.trim()) {
      setNotification({
        type: 'warning',
        message: 'Please type some text for prediction'
      });
      return;
    }
    try {
      const predicted = AIService.textPrediction(message);
      setMessage(predicted);
    } catch (error) {
      console.error("Text prediction error:", error);
      setNotification({
        type: 'error',
        message: error.message || "An error occurred while predicting text."
      });
    }
  }, [message]);

  const handlePersonalizedRecommendations = useCallback(() => {
    try {
      const conversation = friendMsg.map(m => m.msg).join(" ");
      const recs = AIService.personalizedRecommendations(userName, conversation);
      setRecommendations(recs);
      setShowRecommendations(true);
    } catch (error) {
      console.error("Recommendations error:", error);
      setNotification({
        type: 'error',
        message: error.message
      });
    }
  }, [friendMsg, userName]);

  const Notification = ({ type, message, onClose }) => {
    useEffect(() => {
      const timer = setTimeout(() => {
        onClose(); // Automatically close the notification after 5 seconds
      }, 15000);
  
      return () => clearTimeout(timer); // Cleanup the timer on unmount
    }, [onClose]);
  
    return (
      <div className={`${Style.notification} ${Style[`notification_${type}`]}`}>
        <span>{message}</span>
        <button onClick={onClose} className={Style.notification_close}>×</button>
      </div>
    );
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
          const result = await IPFSService.uploadFile(file);
          if (!result.success) {
            throw new Error(`Failed to upload ${file.name}: ${result.error}`);
          }

          const msg = `[FILE]${file.name}|${result.url}`;
          await sendMessage({
            msg,
            address: currentFriend.address,
          });

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

  const handleAppointmentSubmit = async (e) => {
    e.preventDefault();
    if (!appointmentData.date || !appointmentData.time || !appointmentData.reason) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      setLocalLoading(true);
      
      const uploadedFileUrls = [];
      
      if (selectedFiles.length > 0) {
        setUploadProgress(0);
        const totalFiles = selectedFiles.length;
        
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          const result = await IPFSService.uploadFile(file);
          
          if (result.success) {
            uploadedFileUrls.push({
              name: file.name,
              url: result.url,
              type: file.type
            });
          } else {
            console.error(`Failed to upload file ${file.name}:`, result.error);
          }
          
          setUploadProgress(((i + 1) / totalFiles) * 100);
        }
      }
      
      let appointmentMsg = `🏥 *New Appointment Request*\n
📅 Date: ${appointmentData.date}
⏰ Time: ${appointmentData.time}
📝 Reason: ${appointmentData.reason}
${appointmentData.symptoms ? `🔍 Symptoms: ${appointmentData.symptoms}` : ''}
🚨 Urgency: ${appointmentData.urgency.toUpperCase()}`;

      if (uploadedFileUrls.length > 0) {
        appointmentMsg += '\n\n📎 Attached Files:';
        
        for (const file of uploadedFileUrls) {
          appointmentMsg += `\n- [${file.name}](${file.url})`;
          appointmentMsg += `\n  [FILE]${file.name}|${file.url}`;
        }
      }
      
      await sendMessage({
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
      setSelectedFiles([]);
      setUploadProgress(0);
    } catch (error) {
      console.error("Error sending appointment request:", error);
      alert("Failed to send appointment request. Please try again.");
    } finally {
      setLocalLoading(false);
    }
  };


  return (
    <div className={Style.Chat}>
      {userName && account ? (
        <div className={Style.Chat_user_info}>
          <Image 
            src={images.accountName} 
            alt="Profile" 
            width={70} 
            height={70} 
            className={Style.profile_image}
          />
          <div className={Style.Chat_user_info_box}>
            <h4>{userName}</h4>
            <p className={Style.show}>{account}</p>
          </div>
          <button 
            onClick={toggleAutoScroll} 
            className={`${Style.autoScrollToggle} ${autoScroll ? Style.autoScrollActive : ''}`}
            title={autoScroll ? "Disable Auto-Scroll" : "Enable Auto-Scroll"}
          >
            {autoScroll ? "Auto-Scroll: ON" : "Auto-Scroll: OFF"}
          </button>
        </div>
      ) : null}
  
  <div className={Style.Chat_box_box}>
  <div className={Style.Chat_box}>
    <div className={Style.Chat_box_left}>
      {friendMsg && friendMsg.length > 0 ? (
        friendMsg.map((el, i) => (
          <div key={i} className={Style.Chat_message_container}>
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
                          style={{ maxWidth: '100%' }}
                        />
                      ) : (
                        <a href={fileUrl} download={fileName} className={Style.fileLink}>
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
                  return (
                    <a href={data} download={name} className={Style.fileLink}>
                      <div className={Style.filePreview}>
                        {isImage ? (
                          <>
                            <span>🖼️</span>
                            <span>{name}</span>
                          </>
                        ) : isPDF ? (
                          <>
                            <span>📄</span>
                            <span>{name}</span>
                          </>
                        ) : (
                          <>
                            <span>📎</span>
                            <span>{name}</span>
                          </>
                        )}
                      </div>
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
  
      {userName && account && (
        <div className={Style.Chat_box_send}>
          <div className={Style.Chat_box_send_wrapper}>
            <div className={Style.Chat_box_send_input}>
              <div className={Style.ai_actions}>
                <button 
                  onClick={handleSummarizeChat}
                  className={Style.ai_button}
                  title="Summarize Chat"
                >
                  📝
                </button>
                <button
                  onClick={handleTranslateMessage}
                  className={Style.ai_button}
                  title="Translate Message"
                >
                  🌐
                </button>
                <button
                  onClick={() => setShowAppointmentForm(true)}
                  className={Style.ai_button}
                  title="Schedule Appointment"
                >
                  📅
                </button>
                <button
                  onClick={handleTextPrediction}
                  className={Style.ai_button}
                  title="Smart Complete"
                >
                  ✨
                </button>
                <button
                  onClick={handlePersonalizedRecommendations}
                  className={Style.ai_button}
                  title="Get Suggestions"
                >
                  💡
                </button>
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
                className={`${Style.message_input} ${localLoading || loading ? Style.input_disabled : ''}`}
              />
  
              {message.length > 0 && sentiment && (
                <div className={Style.sentiment_indicator}>
                  {sentiment === 'positive' && '😊'}
                  {sentiment === 'negative' && '😔'}
                  {sentiment === 'neutral' && '😐'}
                  <span className={Style.sentiment_text}>{sentiment}</span>
                </div>
              )}
  
              <div className={Style.send_actions}>
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
  
            {showRecommendations && (
              <RecommendationsPanel
                recommendations={recommendations}
                onClose={() => setShowRecommendations(false)}
              />
            )}
  
            {showChatbotResponse && (
              <ChatbotPanel
                response={chatbotResponse}
                onClose={() => setShowChatbotResponse(false)}
              />
            )}
  
            {showTranslation && (
              <div className={Style.translation_side_panel}>
                <div className={Style.translation_container}>
                  <div className={Style.translation_header}>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className={Style.language_select}
                    >
                      {SUPPORTED_LANGUAGES.map(lang => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setShowMetrics(!showMetrics)}
                      className={Style.metrics_toggle}
                    >
                      {showMetrics ? '📊 Hide Metrics' : '📊 Show Metrics'}
                    </button>
                  </div>
  
                  <div className={Style.translation_content}>
                    <div className={Style.translation_text}>
                      {translatedMessage}
                    </div>
                    
                    {translationMetrics && (
                      <div className={Style.metrics_badge}>
                        Accuracy: {(translationMetrics.accuracy * 100).toFixed(1)}%
                      </div>
                    )}
                  </div>
  
                  {showMetrics && historicalMetrics?.length > 0 && (
                    <MetricsChart data={historicalMetrics} />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
  
     {showAppointmentForm && (
        <div className={Style.modal_overlay}>
          <div className={Style.modal_content}>
            <div className={Style.appointment_header}>
              <h3>Schedule Appointment</h3>
              <button 
                className={Style.close_modal_btn} 
                onClick={() => setShowAppointmentForm(false)}
                aria-label="Close appointment form"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <div className={Style.appointment_scroll_container}>
              <form onSubmit={handleAppointmentSubmit} className={Style.appointment_form}>
              <div className={Style.appointment_section}>
                  <h4 className={Style.section_title}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    Date & Time
                  </h4>
                  
                  <div className={Style.form_row}>
                    <div className={Style.form_group}>
                      <label>
                        Date<span className={Style.required}>*</span>
                      </label>
                      <div className={Style.date_input_wrapper}>
                        <input
                          type="date"
                          value={appointmentData.date}
                          onChange={(e) => setAppointmentData({...appointmentData, date: e.target.value})}
                          min={new Date().toISOString().split('T')[0]}
                          required
                          className={Style.date_input}
                        />
                        <svg className={Style.date_icon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="16" y1="2" x2="16" y2="6"></line>
                          <line x1="8" y1="2" x2="8" y2="6"></line>
                          <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                      </div>
                    </div>
                    
                    <div className={Style.form_group}>
                      <label>
                        Time<span className={Style.required}>*</span>
                      </label>
                      <div className={Style.time_input_wrapper}>
                        <input
                          type="time"
                          value={appointmentData.time}
                          onChange={(e) => setAppointmentData({...appointmentData, time: e.target.value})}
                          required
                          className={Style.time_input}
                        />
                        <svg className={Style.time_icon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className={Style.appointment_section}>
                  <h4 className={Style.section_title}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    Appointment Details
                  </h4>
                  
                  <div className={Style.form_group}>
                    <label>
                      Reason for Visit<span className={Style.required}>*</span>
                    </label>
                    <input
                      type="text"
                      value={appointmentData.reason}
                      onChange={(e) => setAppointmentData({...appointmentData, reason: e.target.value})}
                      placeholder="Brief reason for appointment"
                      required
                      className={Style.text_input}
                    />
                  </div>
                  
                  <div className={Style.form_group}>
                    <label>Symptoms</label>
                    <textarea
                      value={appointmentData.symptoms}
                      onChange={(e) => setAppointmentData({...appointmentData, symptoms: e.target.value})}
                      placeholder="Describe your symptoms in detail..."
                      rows="3"
                      className={Style.textarea_input}
                    />
                  </div>
                </div>
                
                <div className={Style.appointment_section}>
                  <h4 className={Style.section_title}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    Priority
                  </h4>
                  
                  <div className={Style.urgency_options}>
                    <label className={`${Style.urgency_option} ${appointmentData.urgency === "low" ? Style.selected : ""}`}>
                      <input
                        type="radio"
                        name="urgency"
                        value="low"
                        checked={appointmentData.urgency === "low"}
                        onChange={() => setAppointmentData({...appointmentData, urgency: "low"})}
                      />
                      <div className={Style.urgency_content}>
                        <div className={`${Style.urgency_indicator} ${Style.low}`}></div>
                        <div className={Style.urgency_text}>
                          <span>Low Priority</span>
                          <small>Regular check-up</small>
                        </div>
                      </div>
                    </label>
                    
                    <label className={`${Style.urgency_option} ${appointmentData.urgency === "normal" ? Style.selected : ""}`}>
                      <input
                        type="radio"
                        name="urgency"
                        value="normal"
                        checked={appointmentData.urgency === "normal"}
                        onChange={() => setAppointmentData({...appointmentData, urgency: "normal"})}
                      />
                      <div className={Style.urgency_content}>
                        <div className={`${Style.urgency_indicator} ${Style.normal}`}></div>
                        <div className={Style.urgency_text}>
                          <span>Normal Priority</span>
                          <small>Minor health issue</small>
                        </div>
                      </div>
                    </label>
                    
                    <label className={`${Style.urgency_option} ${appointmentData.urgency === "high" ? Style.selected : ""}`}>
                      <input
                        type="radio"
                        name="urgency"
                        value="high"
                        checked={appointmentData.urgency === "high"}
                        onChange={() => setAppointmentData({...appointmentData, urgency: "high"})}
                      />
                      <div className={Style.urgency_content}>
                        <div className={`${Style.urgency_indicator} ${Style.high}`}></div>
                        <div className={Style.urgency_text}>
                          <span>High Priority</span>
                          <small>Urgent care needed</small>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
                {selectedFiles.length > 0 && (
                  <div className={Style.appointment_section}>
                    <h4 className={Style.section_title}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                        <polyline points="13 2 13 9 20 9"></polyline>
                      </svg>
                      Attached Files
                    </h4>
                    
                    <div className={Style.selected_files_list}>
                      {selectedFiles.map((file, index) => (
                        <div key={index} className={Style.selected_file_item}>
                          <div className={Style.file_icon}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                              <polyline points="13 2 13 9 20 9"></polyline>
                            </svg>
                          </div>
                          <div className={Style.file_details}>
                            <span className={Style.file_name}>{file.name}</span>
                            <span className={Style.file_size}>{(file.size / 1024).toFixed(1)} KB</span>
                          </div>
                          <button 
                            type="button" 
                            className={Style.remove_file_btn}
                            onClick={() => removeFile(index)}
                            aria-label="Remove file"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className={Style.form_actions}>
                  <div className={Style.file_upload_wrapper}>
                    <input
                      type="file"
                      id="appointment_files"
                      className={Style.file_input}
                      onChange={handleFileSelect}
                      multiple
                    />
                    <label htmlFor="appointment_files" className={Style.file_upload_btn}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                      Attach Files
                    </label>
                  </div>
                  
                  <div className={Style.submit_actions}>
                    <button 
                      type="button" 
                      className={Style.cancel_btn}
                      onClick={() => setShowAppointmentForm(false)}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className={Style.submit_btn}
                      disabled={!appointmentData.date || !appointmentData.time || !appointmentData.reason}
                    >
                      {localLoading ? (
                        <>
                          <span className={Style.spinner}></span>
                          Scheduling...
                        </>
                      ) : (
                        <>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                          </svg>
                          Schedule Appointment
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;