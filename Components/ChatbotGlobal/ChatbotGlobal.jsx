import React, { useState, useCallback, useContext, useRef, useEffect } from 'react';
import { AIService } from '../../Utils/AIService';
import { ChatAppContect } from '../../Context/ChatAppContext';
import Style from './ChatbotGlobal.module.css';

const SUGGESTED_QUESTIONS = [
  // General Health Questions
  "What are the best ways to boost my immune system naturally?",
  "How much water should I drink daily for optimal health?",
  "What are the health benefits of regular exercise?",
  "How can I improve my sleep quality?",
  "What foods are good for brain health?",

  // Specific Conditions
  "What are the early warning signs of diabetes?",
  "How can I manage my anxiety without medication?",
  "What causes chronic migraines and how can I prevent them?",
  "What's the difference between a cold and allergies?",
  "How can I lower my cholesterol naturally?",

  // Prevention & Wellness
  "What preventive screenings should I get at my age?",
  "How can I maintain a healthy weight long-term?",
  "What vitamins should I take daily?",
  "How can I reduce my risk of heart disease?",
  "What's the best exercise for someone with joint pain?",

  // Treatment & Recovery
  "How long does recovery from COVID-19 typically take?",
  "What home remedies work for treating a sore throat?",
  "How can I speed up muscle recovery after exercise?",
  "What should I do for a minor burn at home?",
  "How long should I rest after a concussion?",
  
  // Additional Questions - Nutrition
  "What are the healthiest foods for heart health?",
  "How can I get enough protein on a vegetarian diet?",
  "What foods should I avoid if I have high blood pressure?",
  "Are there foods that can help reduce inflammation?",
  "What's the best diet for someone with type 2 diabetes?",
  
  // Additional Questions - Mental Health
  "What are effective ways to manage stress naturally?",
  "How can I improve my focus and concentration?",
  "What are signs of depression I should watch for?",
  "How does exercise affect mental health?",
  "What techniques help with panic attacks?",
  
  // Additional Questions - Common Conditions
  "What causes seasonal allergies and how can I manage them?",
  "How can I tell if my headache is a migraine?",
  "What are the warning signs of high blood pressure?",
  "How can I manage arthritis pain naturally?",
  "What should I know about preventing skin cancer?",
  
  // Additional Questions - Lifestyle
  "How much exercise is ideal for overall health?",
  "What's the relationship between sleep and weight?",
  "How can I improve my posture when working at a desk?",
  "What are the health benefits of meditation?",
  "How can I build healthy habits that stick?"
];

const ChatbotGlobal = () => {
  const [isOpen, setIsOpen] = useState(true); // Visible by default
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const { userName } = useContext(ChatAppContect) || {};
  const [activeFeature, setActiveFeature] = useState(null); // For recovery prediction form
  const [autonomousMode, setAutonomousMode] = useState(false); // Disable autonomous mode by default
  const [conversationHistory, setConversationHistory] = useState([]);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [trainingStep, setTrainingStep] = useState('');
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [learningAnimation, setLearningAnimation] = useState(false);
  const [currentQuestionSet, setCurrentQuestionSet] = useState(0); // Track which set of questions to show
  
  // Recovery prediction form state
  const [symptoms, setSymptoms] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [currentTreatment, setCurrentTreatment] = useState('');
  
  const messagesEndRef = useRef(null);
  
  // Check if models are loaded
  useEffect(() => {
    const checkModels = async () => {
      const status = await AIService.checkModelsLoaded();
      setModelsLoaded(status.loaded);
    };
    checkModels();
  }, []);
  
  // Get conversation history from AIService
  useEffect(() => {
    const getHistory = async () => {
      const history = await AIService.getConversationHistory();
      setConversationHistory(history);
    };
    getHistory();
  }, [messages]);
  
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
              text: `Hello${userName ? ` ${userName}` : ''}! I'm Dr. AI, your helpful medical assistant. I'm here to provide health information and answer your medical questions. How can I assist you today?`,
              analysis: {
                mode: 'standard',
                confidence: 'high'
              }
            }
          ]);
        }, 1500);
      }, 500);
    }
  }, [userName]);

  // Learning animation effect
  useEffect(() => {
    if (autonomousMode) {
      const interval = setInterval(() => {
        setLearningAnimation(prev => !prev);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [autonomousMode]);

  const handleSendMessage = useCallback(async (messageText = inputValue) => {
    if (!messageText.trim()) return;

    try {
      setError(null);
      const userMessage = { type: 'user', text: messageText };
      setMessages(prev => [...prev, userMessage]);
      
      setInputValue('');
      setIsTyping(true);

      // Change the question set after user asks a question
      setCurrentQuestionSet(prevSet => (prevSet + 1) % 5);

      // Get response from AIService, using autonomous mode
      const response = await AIService.chatbotResponse(messageText);
      
      // Extract confidence if it's in the response
      let confidence = 'medium';
      let responseText = response;
      
      if (response.startsWith('[Confidence: ')) {
        const confidenceMatch = response.match(/\[Confidence: (High|Medium|Low)\]/);
        if (confidenceMatch) {
          confidence = confidenceMatch[1].toLowerCase();
          responseText = response.replace(/\[Confidence: (High|Medium|Low)\] /, '');
        }
      }
      
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          type: 'bot', 
          text: responseText,
          analysis: {
            mode: autonomousMode ? 'autonomous' : 'standard',
            confidence: confidence
          }
        }]);
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
                text: "I notice you're asking about recovery. I can provide a personalized recovery prediction using my analysis model. Would you like me to analyze your condition and estimate your recovery timeline?",
                actions: [
                  {
                    label: "Yes, analyze my condition",
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
        text: 'I apologize, but I encountered a technical issue while analyzing your query. Please try again or rephrase your question.' 
      }]);
      setIsTyping(false);
    }
  }, [inputValue, autonomousMode]);

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
      setError("Please describe your symptoms to receive a medical assessment");
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
          analysis: {
            mode: 'standard',
            confidence: predictionResult.confidence ? 
              (predictionResult.confidence > 80 ? 'high' : 
              predictionResult.confidence > 50 ? 'medium' : 'low') : 'medium'
          },
          recovery: {
            timeToRecovery: predictionResult.timeToRecovery,
            recoveryPercentage: predictionResult.recoveryPercentage,
            confidence: predictionResult.confidence || null,
            recommendations: predictionResult.recommendations
          }
        };
        
        setMessages(prev => [...prev, message]);
        
        // Add recommendations as a separate message
        if (predictionResult.recommendations && predictionResult.recommendations.length > 0) {
          setTimeout(() => {
            setMessages(prev => [...prev, {
              type: 'bot',
              text: "Based on my analysis, here are my recommendations:\n\n" + 
                predictionResult.recommendations.map(rec => `• ${rec}`).join('\n') + 
                "\n\nRemember, this is informational and not a substitute for professional medical care. Please consult with your healthcare provider for a comprehensive evaluation.",
              analysis: {
                mode: 'standard',
                confidence: 'high'
              }
            }]);
          }, 1000);
        }
      } else {
        setMessages(prev => [...prev, { 
          type: 'bot', 
          text: predictionResult.message || "I'm unable to provide a clinical assessment with the information provided. Please provide more details about your symptoms or consult with your healthcare provider.",
          analysis: {
            mode: 'standard',
            confidence: 'low'
          }
        }]);
      }
    } catch (error) {
      console.error('Recovery prediction error:', error);
      setMessages(prev => [...prev, { 
        type: 'error', 
        text: 'I apologize, but I encountered an error while analyzing your clinical information. Please try again later or consult with your healthcare provider for immediate concerns.' 
      }]);
    } finally {
      setIsTyping(false);
      // Reset form
      setSymptoms('');
      setMedicalHistory('');
      setCurrentTreatment('');
    }
  };
  
  const toggleAutonomousMode = () => {
    const newMode = !autonomousMode;
    setAutonomousMode(newMode);
    
    // Update the AIService autonomous learning setting
    AIService.setAutonomousLearning(newMode);
    
    setMessages(prev => [...prev, { 
      type: 'system', 
      text: `${newMode ? 'Enabled' : 'Disabled'} autonomous learning mode. ${newMode ? 'I will now learn from our interactions to provide better responses.' : 'I will no longer learn from our interactions.'}` 
    }]);
  };
  
  const clearConversation = async () => {
    await AIService.clearConversationHistory();
    setMessages([{ 
      type: 'system', 
      text: 'Conversation history cleared. How can I help you today?' 
    }]);
  };
  
  const handleTrainModel = async () => {
    setIsTraining(true);
    setTrainingProgress(0);
    setTrainingStep('Initializing training...');
    setShowLoadingScreen(true);
  
    try {
      await AIService.trainModels((progress, step) => {
        setTrainingProgress(progress);
        setTrainingStep(step);
      });
  
      setModelsLoaded(true);
      setMessages(prev => [
        ...prev,
        { type: 'system', text: 'Training complete! I\'m now ready to help you with medical questions using my enhanced knowledge.' }
      ]);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        { type: 'error', text: `Training failed: ${error.message}` }
      ]);
    } finally {
      setIsTraining(false);
      setShowLoadingScreen(false);
    }
  };

  const renderSuggestedQuestions = () => {
    // Calculate which questions to show based on currentQuestionSet
    const startIdx = currentQuestionSet * 8;
    const questionsToShow = SUGGESTED_QUESTIONS.slice(startIdx, startIdx + 8);
    
    return (
      <div className={Style.suggested_questions}>
        <p className={Style.suggestions_title}>You can ask me about:</p>
        <div className={Style.suggestions_grid}>
          {questionsToShow.map((question, index) => (
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
  };
  
  const renderRecoveryPredictionForm = () => (
    <div className={Style.recoveryForm}>
      <h4>Recovery Assessment</h4>
      <p>Please provide the following information for a personalized recovery estimation:</p>
      
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
          placeholder="Any relevant medical history, conditions, or allergies (optional)"
          rows={2}
          className={Style.textArea}
        />
      </div>
      
      <div className={Style.formGroup}>
        <label htmlFor="currentTreatment">Current Medications/Treatment</label>
        <textarea
          id="currentTreatment"
          value={currentTreatment}
          onChange={(e) => setCurrentTreatment(e.target.value)}
          placeholder="Any medications or treatments you're currently receiving (optional)"
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
          Analyze & Predict
        </button>
      </div>
      
      <div className={Style.medicalDisclaimer}>
        Note: This is not a substitute for professional medical advice, diagnosis, or treatment.
        Always seek the advice of your physician or other qualified health provider.
      </div>
    </div>
  );
  
  const renderTrainingProgress = () => (
    <div className={Style.trainingProgress}>
      <h4>Training Medical AI</h4>
      <p>{trainingStep}</p>
      <div className={Style.progressBar}>
        <div 
          className={Style.progressFill} 
          style={{width: `${trainingProgress}%`}}
        ></div>
      </div>
      <div className={Style.progressLabel}>
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
      <p>Please wait while I learn from medical knowledge. This helps me provide more accurate and helpful responses.</p>
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
            <span className={Style.metricLabel}>Estimated Recovery Time:</span>
            <span className={Style.metricValue}>{recovery.timeToRecovery} days</span>
          </div>
          <div className={Style.metric}>
            <span className={Style.metricLabel}>Recovery Prognosis:</span>
            <span className={Style.metricValue}>{recovery.recoveryPercentage}%</span>
          </div>
          {recovery.confidence && (
            <div className={Style.metric}>
              <span className={Style.metricLabel}>Prediction Confidence:</span>
              <span className={Style.metricValue}>{recovery.confidence}%</span>
            </div>
          )}
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
  
  const renderAnalysisBadge = (analysis) => {
    if (!analysis) return null;
    
    const modeText = analysis.mode === 'autonomous' ? 'AI-MD' : 'Basic';
    const confidenceClass = `confidence-${analysis.confidence || 'medium'}`;
    
    return (
      <div className={`${Style.analysisBadge} ${Style[confidenceClass]}`}>
        {modeText}
      </div>
    );
  };

  if (!isOpen) {
    return (
      <button 
        className={Style.chatbot_trigger}
        onClick={() => setIsOpen(true)}
        title="Open Medical Assistant"
      >
        👨‍⚕️
      </button>
    );
  }

  return (
    <div className={Style.chatbot_container}>
      {showLoadingScreen && (
        <div className={Style.loadingScreen}>
          <div className={Style.loadingAnimation}></div>
          <div className={Style.loadingText}>Training Medical AI</div>
          <div className={Style.loadingProgress}>
            <div 
              className={Style.loadingProgressFill} 
              style={{width: `${trainingProgress}%`}}
            ></div>
          </div>
          <div className={Style.loadingStep}>{trainingStep}</div>
        </div>
      )}
      
      <div className={Style.chatbot_header}>
        <h3>Medical Assistant</h3>
        <div className={Style.headerControls}>
          <button 
            onClick={toggleAutonomousMode} 
            className={`${Style.modeToggle} ${autonomousMode ? Style.modeActive : ''}`}
            title={autonomousMode ? "Disable advanced learning" : "Enable advanced learning"}
          >
            🧠
          </button>
          <button 
            onClick={clearConversation} 
            className={Style.clearBtn}
            title="Clear conversation"
          >
            🗑️
          </button>
          <button 
            onClick={() => setIsOpen(false)} 
            className={Style.close_btn}
            title="Minimize"
          >
            ×
          </button>
        </div>
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
              <span className={Style.bot_avatar}>👨‍⚕️</span>
              <div>
                <p>Hello{userName ? ` ${userName}` : ''}! I'm your medical assistant powered by AI.</p>
                <p>I can provide health information, answer medical questions, and offer personalized insights based on the latest research.</p>
                {autonomousMode && (
                  <div className={`${Style.learningIndicator} ${learningAnimation ? Style.learningPulse : ''}`}>
                    Learning mode active - I improve with each conversation
                  </div>
                )}
              </div>
            </div>
            
            {!modelsLoaded && (
              <button 
                className={Style.trainModelBtn}
                onClick={handleTrainModel}
                disabled={isTraining}
              >
                {isTraining ? 'Training in progress...' : '🧠 Train Medical Knowledge'}
              </button>
            )}
            
            {renderSuggestedQuestions()}
          </>
        ) : (
          <>
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`${Style.message} ${Style[msg.type]}`}
              >
                {msg.type === 'bot' && (
                  <>
                    <span className={Style.bot_avatar}>👨‍⚕️</span>
                    {msg.analysis && renderAnalysisBadge(msg.analysis)}
                  </>
                )}
                {msg.type === 'system' && <span className={Style.system_icon}>ℹ️</span>}
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
            <span className={Style.bot_avatar}>👨‍⚕️</span>
            <p className={Style.typing_indicator}>thinking</p>
          </div>
        )}
        
        {activeFeature === 'recovery-prediction' && renderRecoveryPredictionForm()}
        {activeFeature === 'training' && renderTrainingProgress()}
        
        <div ref={messagesEndRef} />
      </div>

      <div className={Style.input_container}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask me any health or medical question..."
          className={Style.input}
          aria-label="Medical query"
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