import React, { useState, useCallback, useContext } from 'react';
import { AIService } from '../../Utils/AIService';
import { ChatAppContect } from '../../Context/ChatAppContext';
import Style from './ChatbotGlobal.module.css';

const SUGGESTED_QUESTIONS = [
  // General Health
  "What should I do if I'm feeling anxious?",
  "How can I improve my sleep habits?",
  "What are healthy eating tips for teens?",
  "How do I maintain good mental health?",
  "What exercises are good for teenagers?",
  
  // Personal Health
  "How do I deal with acne?",
  "Is my weight healthy for my age?",
  "How can I handle stress during exams?",
  "What should I know about puberty?",
  "How much sleep do teenagers need?",

  // Healthcare System
  "Do I need a parent for doctor visits?",
  "How do I find a teen health specialist?",
  "What vaccines do teens need?",
  "Are my health conversations private?",
  "How do I talk to doctors about sensitive topics?"
];

const ChatbotGlobal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const { userName } = useContext(ChatAppContect) || {};

  const handleSendMessage = useCallback(async (messageText = inputValue) => {
    if (!messageText.trim()) return;

    try {
      setError(null);
      const userMessage = { type: 'user', text: messageText };
      setMessages(prev => [...prev, userMessage]);
      
      setInputValue('');
      setIsTyping(true);

      const response = await AIService.chatbotResponse(messageText);
      
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

  const handleSuggestedQuestion = (question) => {
    handleSendMessage(question);
  };

  const renderSuggestedQuestions = () => (
    <div className={Style.suggested_questions}>
      <p className={Style.suggestions_title}>You can also ask:</p>
      {SUGGESTED_QUESTIONS.map((question, index) => (
        <button
          key={index}
          className={Style.suggestion_btn}
          onClick={() => handleSuggestedQuestion(question)}
        >
          {question}
        </button>
      ))}
    </div>
  );

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
          <>
            <div className={Style.welcome_message}>
              <span className={Style.bot_avatar}>🤖</span>
              <p>Hello{userName ? ` ${userName}` : ''}! How can I assist you today?</p>
            </div>
            {renderSuggestedQuestions()}
          </>
        ) : (
          <>
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`${Style.message} ${Style[msg.type]}`}
              >
                {msg.type === 'bot' && <span className={Style.bot_avatar}>🤖</span>}
                <p>{msg.text}</p>
              </div>
            ))}
            {!isTyping && renderSuggestedQuestions()}
          </>
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
          onClick={() => handleSendMessage()}
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
