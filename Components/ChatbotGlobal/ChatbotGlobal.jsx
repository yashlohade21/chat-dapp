import React, { useState, useCallback, useContext } from 'react';
import { AIService } from '../../Utils/AIService';
import { ChatAppContect } from '../../Context/ChatAppContext';
import Style from './ChatbotGlobal.module.css';

const ChatbotGlobal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const { userName } = useContext(ChatAppContect);

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim()) return;

    // Add user message
    setMessages(prev => [...prev, { type: 'user', text: inputValue }]);
    
    try {
      const response = await AIService.chatbotResponse(inputValue);
      setMessages(prev => [...prev, { type: 'bot', text: response }]);
    } catch (error) {
      console.error('Chatbot error:', error);
      setMessages(prev => [...prev, { 
        type: 'error', 
        text: 'Sorry, I encountered an error. Please try again.' 
      }]);
    }
    
    setInputValue('');
  }, [inputValue]);

  if (!isOpen) {
    return (
      <button 
        className={Style.chatbot_trigger}
        onClick={() => setIsOpen(true)}
        title="Open AI Assistant"
      >
        🤖
      </button>
    );
  }

  return (
    <div className={Style.chatbot_container}>
      <div className={Style.chatbot_header}>
        <h3>AI Assistant</h3>
        <button onClick={() => setIsOpen(false)} className={Style.close_btn}>×</button>
      </div>

      <div className={Style.messages_container}>
        {messages.length === 0 ? (
          <div className={Style.welcome_message}>
            <span className={Style.bot_avatar}>🤖</span>
            <p>Hello{userName ? ` ${userName}` : ''}! How can I assist you today?</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div 
              key={index} 
              className={`${Style.message} ${Style[msg.type]}`}
            >
              {msg.type === 'bot' && <span className={Style.bot_avatar}>🤖</span>}
              <p>{msg.text}</p>
            </div>
          ))
        )}
      </div>

      <div className={Style.input_container}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type your message..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSendMessage();
            }
          }}
        />
        <button 
          onClick={handleSendMessage}
          className={Style.send_btn}
          disabled={!inputValue.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatbotGlobal;
