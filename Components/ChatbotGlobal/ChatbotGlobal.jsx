import React, { useState, useCallback, useContext } from 'react';
import { AIService } from '../../Utils/AIService';
import { ChatAppContect } from '../../Context/ChatAppContext';
import Style from './ChatbotGlobal.module.css';

const ChatbotGlobal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const { userName } = useContext(ChatAppContect) || {};

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim()) return;

    try {
      setError(null);
      // Add user message
      const userMessage = { type: 'user', text: inputValue };
      setMessages(prev => [...prev, userMessage]);
      
      // Clear input and show typing indicator
      setInputValue('');
      setIsTyping(true);

      // Get chatbot response
      const response = await AIService.chatbotResponse(inputValue);
      
      // Add bot response with slight delay for natural feel
      setTimeout(() => {
        setMessages(prev => [...prev, { type: 'bot', text: response }]);
        setIsTyping(false);
      }, 500);
      
    } catch (error) {
      console.error('Chatbot error:', error);
      setError(error.message || 'An error occurred while processing your message');
      setMessages(prev => [...prev, { 
        type: 'error', 
        text: 'Sorry, I encountered an error. Please try again.' 
      }]);
      setIsTyping(false);
    }
  }, [inputValue]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

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
        {error && (
          <div className={Style.error_message}>
            {error}
          </div>
        )}
        
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
        
        {isTyping && (
          <div className={`${Style.message} ${Style.bot}`}>
            <span className={Style.bot_avatar}>🤖</span>
            <p className={Style.typing_indicator}>typing...</p>
          </div>
        )}
      </div>

      <div className={Style.input_container}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          className={Style.input}
          aria-label="Chat message"
        />
        <button 
          onClick={handleSendMessage}
          className={Style.send_btn}
          disabled={!inputValue.trim() || isTyping}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatbotGlobal;
