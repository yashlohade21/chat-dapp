import React, { useState, useCallback, useContext, useRef, useEffect } from 'react';
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
  "How do I talk to doctors about sensitive topics?",
  
  // Recovery Questions
  "How long will it take to recover from my cold?",
  "What's the typical recovery time for a sprained ankle?",
  "Can you predict my recovery timeline?",
  "Will I fully recover from my symptoms?"
];

const ChatbotGlobal = () => {
  const [isOpen, setIsOpen] = useState(true); // Visible by default
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const { userName } = useContext(ChatAppContect) || {};
  const [activeFeature, setActiveFeature] = useState(null); // For recovery prediction form
  
  // Recovery prediction form state
  const [symptoms, setSymptoms] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [currentTreatment, setCurrentTreatment] = useState('');
  
  const messagesEndRef = useRef(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Add welcome message on first load
  useEffect(() => {
    if (messages.length === 0) {
      setTimeout(() => {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setMessages([
            { 
              type: 'bot', 
              text: `Hello${userName ? ` ${userName}` : ''}! I'm your healthcare assistant. How can I help you today?` 
            }
          ]);
        }, 1500);
      }, 500);
    }
  }, [userName]);

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
        
        // Check if this is a recovery-related question
        if (
          messageText.toLowerCase().includes('recover') || 
          messageText.toLowerCase().includes('get better') || 
          messageText.toLowerCase().includes('healing') ||
          messageText.toLowerCase().includes('prognosis')
        ) {
          // After a short delay, suggest the recovery prediction feature
          setTimeout(() => {
            setMessages(prev => [
              ...prev, 
              { 
                type: 'bot', 
                text: "Would you like me to predict your recovery timeline based on your symptoms and medical history? This can give you a personalized estimate.",
                actions: [
                  {
                    label: "Yes, predict my recovery",
                    handler: () => setActiveFeature('recovery-prediction')
                  },
                  {
                    label: "No thanks",
                    handler: () => {} // Do nothing
                  }
                ]
              }
            ]);
          }, 1000);
        }
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
  
  const handleRecoveryPrediction = async () => {
    if (!symptoms.trim()) {
      setError("Please enter your symptoms to get a recovery prediction");
      return;
    }
    
    setIsTyping(true);
    setActiveFeature(null);
    
    try {
      const predictionResult = await AIService.predictPatientRecovery(
        symptoms,
        medicalHistory,
        currentTreatment
      );
      
      if (predictionResult.success) {
        const message = {
          type: 'bot',
          text: predictionResult.message,
          recovery: {
            timeToRecovery: predictionResult.timeToRecovery,
            recoveryPercentage: predictionResult.recoveryPercentage,
            recommendations: predictionResult.recommendations
          }
        };
        
        setMessages(prev => [...prev, message]);
        
        // Add recommendations as a separate message
        if (predictionResult.recommendations && predictionResult.recommendations.length > 0) {
          setTimeout(() => {
            setMessages(prev => [...prev, {
              type: 'bot',
              text: "Here are some recommendations based on your situation:\n\n" + 
                predictionResult.recommendations.map(rec => `• ${rec}`).join('\n')
            }]);
          }, 1000);
        }
      } else {
        setMessages(prev => [...prev, { type: 'bot', text: predictionResult.message || "I couldn't generate a recovery prediction at this time." }]);
      }
    } catch (error) {
      console.error('Recovery prediction error:', error);
      setMessages(prev => [...prev, { 
        type: 'error', 
        text: 'Sorry, I encountered an error with the recovery prediction. Please try again later.' 
      }]);
    } finally {
      setIsTyping(false);
      // Reset form
      setSymptoms('');
      setMedicalHistory('');
      setCurrentTreatment('');
    }
  };

  const renderSuggestedQuestions = () => (
    <div className={Style.suggested_questions}>
      <p className={Style.suggestions_title}>You can also ask:</p>
      <div className={Style.suggestions_grid}>
        {SUGGESTED_QUESTIONS.slice(0, 6).map((question, index) => (
          <button
            key={index}
            className={Style.suggestion_btn}
            onClick={() => handleSuggestedQuestion(question)}
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
  
  const renderRecoveryPredictionForm = () => (
    <div className={Style.recoveryForm}>
      <h4>Recovery Prediction</h4>
      <p>Please provide the following information to get a personalized recovery prediction:</p>
      
      <div className={Style.formGroup}>
        <label htmlFor="symptoms">Symptoms *</label>
        <textarea
          id="symptoms"
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          placeholder="Describe your symptoms in detail (required)"
          rows={3}
          className={Style.textArea}
        />
      </div>
      
      <div className={Style.formGroup}>
        <label htmlFor="medicalHistory">Medical History</label>
        <textarea
          id="medicalHistory"
          value={medicalHistory}
          onChange={(e) => setMedicalHistory(e.target.value)}
          placeholder="Any relevant medical history (optional)"
          rows={2}
          className={Style.textArea}
        />
      </div>
      
      <div className={Style.formGroup}>
        <label htmlFor="currentTreatment">Current Treatment</label>
        <textarea
          id="currentTreatment"
          value={currentTreatment}
          onChange={(e) => setCurrentTreatment(e.target.value)}
          placeholder="Any treatments you're currently receiving (optional)"
          rows={2}
          className={Style.textArea}
        />
      </div>
      
      {error && <div className={Style.error}>{error}</div>}
      
      <div className={Style.formActions}>
        <button 
          className={Style.cancelBtn}
          onClick={() => setActiveFeature(null)}
        >
          Cancel
        </button>
        <button 
          className={Style.predictBtn}
          onClick={handleRecoveryPrediction}
          disabled={!symptoms.trim()}
        >
          Predict Recovery
        </button>
      </div>
    </div>
  );

  const renderMessageContent = (message) => {
    // Render message text
    if (message.text) {
      return <p>{message.text}</p>;
    }
    return null;
  };
  
  const renderMessageActions = (message) => {
    if (message.actions && message.actions.length > 0) {
      return (
        <div className={Style.messageActions}>
          {message.actions.map((action, index) => (
            <button
              key={index}
              className={Style.actionButton}
              onClick={action.handler}
            >
              {action.label}
            </button>
          ))}
        </div>
      );
    }
    return null;
  };
  
  const renderRecoveryDetails = (recovery) => {
    if (!recovery) return null;
    
    return (
      <div className={Style.recoveryDetails}>
        <div className={Style.recoveryMetrics}>
          <div className={Style.metric}>
            <span className={Style.metricLabel}>Recovery Time:</span>
            <span className={Style.metricValue}>{recovery.timeToRecovery} days</span>
          </div>
          <div className={Style.metric}>
            <span className={Style.metricLabel}>Recovery Percentage:</span>
            <span className={Style.metricValue}>{recovery.recoveryPercentage}%</span>
          </div>
        </div>
        <div className={Style.recoveryProgress}>
          <div 
            className={Style.progressBar} 
            style={{width: `${recovery.recoveryPercentage}%`}}
          ></div>
        </div>
      </div>
    );
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
        <h3>AI Health Assistant</h3>
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
              <div>
                <p>Hello{userName ? ` ${userName}` : ''}! I'm your healthcare assistant.</p>
                <p>I can help you with health questions, recovery predictions, and medical information.</p>
              </div>
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
                <div className={Style.messageContent}>
                  {renderMessageContent(msg)}
                  {renderMessageActions(msg)}
                  {msg.recovery && renderRecoveryDetails(msg.recovery)}
                </div>
              </div>
            ))}
            {!isTyping && !activeFeature && renderSuggestedQuestions()}
          </>
        )}
        
        {isTyping && (
          <div className={`${Style.message} ${Style.bot}`}>
            <span className={Style.bot_avatar}>🤖</span>
            <p className={Style.typing_indicator}>typing</p>
          </div>
        )}
        
        {activeFeature === 'recovery-prediction' && renderRecoveryPredictionForm()}
        
        <div ref={messagesEndRef} />
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
          disabled={activeFeature !== null}
        />
        <button 
          onClick={() => handleSendMessage()}
          className={Style.send_btn}
          disabled={!inputValue.trim() || isTyping || activeFeature !== null}
        >
        </button>
      </div>
    </div>
  );
};

export default ChatbotGlobal;
