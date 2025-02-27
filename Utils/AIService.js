import * as tf from '@tensorflow/tfjs';
import { loadXMLDataset } from './xmlDataPrep.js';
import { tokenizeAndPad } from './dataPrep.js';
import { predictRecovery } from './ChatbotModel.js';
import medicalResponses from '../dataset/chatbot_training_data.json';

let model = null;
let autoencoder = null;
let encoder = null;
let recoveryPredictor = null;
let categories = null;
let responses = null;
let vocab = null;

const initializeModel = async () => {
  if (!model) {
    try {
      // Load models from localStorage
      console.log('Loading models...');
      
      // Try to load supervised model
      try {
        model = await tf.loadLayersModel('localstorage://medical-chatbot-model');
        console.log('Supervised model loaded successfully');
      } catch (e) {
        console.warn('Could not load supervised model:', e.message);
      }
      
      // Try to load unsupervised models
      try {
        encoder = await tf.loadLayersModel('localstorage://medical-encoder-model');
        console.log('Encoder model loaded successfully');
        
        autoencoder = await tf.loadLayersModel('localstorage://medical-autoencoder-model');
        console.log('Autoencoder model loaded successfully');
      } catch (e) {
        console.warn('Could not load unsupervised models:', e.message);
      }
      
      // Try to load recovery predictor
      try {
        recoveryPredictor = await tf.loadLayersModel('localstorage://medical-recovery-model');
        console.log('Recovery predictor loaded successfully');
      } catch (e) {
        console.warn('Could not load recovery predictor:', e.message);
      }
      
      // Always initialize categories and responses from the dataset
      categories = medicalResponses.categories;
      responses = medicalResponses.conversations;
      
      // Build vocabulary (simplified version)
      const allText = responses.flatMap(pair => [pair.input, pair.response]);
      const words = new Set();
      allText.forEach(text => text.toLowerCase().split(/\s+/).forEach(word => words.add(word)));
      vocab = {
        '<PAD>': 0,
        '<UNK>': 1,
        ...Object.fromEntries([...words].map((word, i) => [word, i + 2]))
      };
      
    } catch (error) {
      console.error('Error initializing models:', error);
      // Fallback to basic response system
      categories = medicalResponses.categories;
      responses = medicalResponses.conversations;
    }
  }
};

export const AIService = {
  // Simple sentiment analysis based on keywords
  analyzeSentiment: (message) => {
    const text = message.toLowerCase();
    
    // Medical/healthcare specific sentiment words
    const positiveWords = [
      'better', 'improving', 'good', 'great', 'thanks', 'thank', 'helpful',
      'recovered', 'healing', 'progress', 'resolved', 'relief'
    ];
    const negativeWords = [
      'pain', 'worse', 'bad', 'sick', 'hurt', 'uncomfortable', 'severe',
      'symptoms', 'problem', 'issues', 'concerned', 'worried'
    ];
    
    const positiveScore = positiveWords.filter(word => text.includes(word)).length;
    const negativeScore = negativeWords.filter(word => text.includes(word)).length;
    
    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  },

  // Generate medical/healthcare focused reply suggestions
  generateReplySuggestions: (message) => {
    const text = message.toLowerCase();
    
    // Medical appointment scheduling
    if (text.includes('appointment') || text.includes('schedule') || text.includes('book')) {
      return [
        'What date and time works best for you?',
        'Would you prefer a morning or afternoon appointment?',
        'I can help you schedule that. What day would you like?'
      ];
    }

    // Symptom discussion
    if (text.includes('symptom') || text.includes('pain') || text.includes('feeling')) {
      return [
        'Could you describe your symptoms in more detail?',
        'How long have you been experiencing these symptoms?',
        'Have you noticed any patterns with your symptoms?'
      ];
    }

    // Medication related
    if (text.includes('medicine') || text.includes('medication') || text.includes('prescription')) {
      return [
        'Are you currently taking any other medications?',
        'Have you experienced any side effects?',
        'When did you last take your medication?'
      ];
    }

    // Treatment discussion
    if (text.includes('treatment') || text.includes('therapy') || text.includes('procedure')) {
      return [
        'How are you responding to the treatment so far?',
        'Have you had any concerns about the treatment?',
        'Would you like more information about the treatment options?'
      ];
    }

    // Recovery prediction related
    if (text.includes('recover') || text.includes('healing') || text.includes('prognosis') || text.includes('get better')) {
      return [
        'Based on similar cases, recovery typically takes 2-4 weeks with proper care.',
        'Would you like me to analyze your recovery trajectory?',
        'I can help you track your recovery progress over time.'
      ];
    }

    // General greetings
    if (text.includes('hello') || text.includes('hi ') || text.startsWith('hi') || text.includes('hey')) {
      return [
        'Hello! How can I assist you today?',
        'Hi there! What brings you in today?',
        'Hello! How are you feeling today?'
      ];
    }

    // Gratitude
    if (text.includes('thank')) {
      return [
        'You\'re welcome! Let me know if you need anything else.',
        'Happy to help! Take care.',
        'Of course! Don\'t hesitate to ask if you have more questions.'
      ];
    }

    // Default suggestions
    return [
      'Could you tell me more about that?',
      'How can I assist you further?',
      'Is there anything specific you\'d like to discuss?'
    ];
  },

  // Search through messages
  searchMessages: (query, messages) => {
    if (!query || !messages) return [];
    
    const searchTerm = query.toLowerCase();
    return messages.filter(msg => 
      msg.text.toLowerCase().includes(searchTerm)
    );
  },

  // Categorize message type
  categorizeMessage: (message) => {
    const text = message.toLowerCase();
    
    if (text.includes('?')) return 'question';
    if (text.includes('appointment') || text.includes('schedule')) return 'appointment';
    if (text.includes('symptom') || text.includes('pain')) return 'medical';
    if (text.includes('medication') || text.includes('medicine')) return 'prescription';
    if (text.includes('thank')) return 'gratitude';
    if (text.includes('treatment') || text.includes('therapy')) return 'treatment';
    if (text.includes('recover') || text.includes('healing') || text.includes('prognosis')) return 'recovery';
    return 'general';
  },

  // Summarize Text
  summarizeText: (text) => {
    const sentences = text.split(/[.!?]+/);
    const firstThreeSentences = sentences.slice(0, 3).join('. ');
    return firstThreeSentences + (sentences.length > 3 ? '...' : '');
  },

  // New method for recovery prediction
  predictPatientRecovery: async (symptoms, medicalHistory, currentTreatment) => {
    await initializeModel();
    
    if (!encoder || !recoveryPredictor) {
      return {
        success: false,
        message: "Recovery prediction models are not available. Please train the models first."
      };
    }
    
    try {
      // Combine inputs into a single text
      const combinedText = `
        Symptoms: ${symptoms}
        Medical History: ${medicalHistory}
        Current Treatment: ${currentTreatment}
      `;
      
      // Tokenize the input
      const tokenizedInput = tokenizeAndPad(combinedText, vocab);
      
      // Get recovery prediction
      const prediction = await predictRecovery(encoder, recoveryPredictor, tokenizedInput, vocab);
      
      if (prediction.error) {
        return {
          success: false,
          message: `Could not predict recovery: ${prediction.error}`
        };
      }
      
      // Format the prediction results
      const timeToRecovery = Math.max(1, Math.round(prediction.timeToRecovery));
      const recoveryPercentage = Math.min(100, Math.max(0, Math.round(prediction.recoveryPercentage * 100)));
      
      // Generate a human-readable response
      let recoveryMessage = "";
      if (recoveryPercentage > 80) {
        recoveryMessage = `Based on similar cases, you are likely to experience an excellent recovery (${recoveryPercentage}%) within approximately ${timeToRecovery} days with proper care and treatment adherence.`;
      } else if (recoveryPercentage > 60) {
        recoveryMessage = `Based on similar cases, you are likely to experience a good recovery (${recoveryPercentage}%) within approximately ${timeToRecovery} days, though some symptoms may persist.`;
      } else if (recoveryPercentage > 40) {
        recoveryMessage = `Based on similar cases, you may experience a partial recovery (${recoveryPercentage}%) within approximately ${timeToRecovery} days. Follow-up care will be important.`;
      } else {
        recoveryMessage = `Based on your symptoms and medical history, recovery may be more challenging. I recommend consulting with your healthcare provider for a personalized treatment plan.`;
      }
      
      return {
        success: true,
        timeToRecovery,
        recoveryPercentage,
        message: recoveryMessage,
        recommendations: generateRecoveryRecommendations(symptoms, recoveryPercentage, timeToRecovery)
      };
    } catch (error) {
      console.error('Error in recovery prediction:', error);
      return {
        success: false,
        message: "An error occurred during recovery prediction. Please try again later."
      };
    }
  },
  
  // Anomaly detection in symptoms
  detectAnomalies: async (symptoms) => {
    await initializeModel();
    
    if (!autoencoder || !encoder) {
      return { 
        anomalies: [],
        message: "Anomaly detection models not available."
      };
    }
    
    try {
      // Tokenize symptoms
      const tokenizedSymptoms = tokenizeAndPad(symptoms, vocab);
      
      // Create input tensor
      const inputTensor = tf.tensor2d([tokenizedSymptoms]);
      
      // Encode and reconstruct
      const encoded = encoder.predict(inputTensor);
      const reconstructed = autoencoder.predict(inputTensor);
      
      // Convert to arrays
      const inputArray = await inputTensor.array();
      const reconstructedArray = await reconstructed.array();
      
      // Calculate reconstruction error for each token
      const errors = [];
      for (let i = 0; i < tokenizedSymptoms.length; i++) {
        // Skip padding tokens
        if (tokenizedSymptoms[i] === vocab['<PAD>']) continue;
        
        const word = Object.keys(vocab).find(key => vocab[key] === tokenizedSymptoms[i]) || '<UNK>';
        
        // Calculate error (using argmax since these are one-hot encoded)
        const predictedToken = Array.from(reconstructedArray[0][i]).indexOf(Math.max(...reconstructedArray[0][i]));
        const reconstructionError = tokenizedSymptoms[i] !== predictedToken ? 1 : 0;
        
        errors.push({
          word,
          error: reconstructionError
        });
      }
      
      // Find anomalies (words with high reconstruction error)
      const anomalies = errors.filter(item => item.error > 0).map(item => item.word);
      
      // Clean up tensors
      inputTensor.dispose();
      encoded.dispose();
      reconstructed.dispose();
      
      // Generate message
      let message = "No unusual symptoms detected.";
      if (anomalies.length > 0) {
        message = `Unusual symptom patterns detected: ${anomalies.join(', ')}. These may warrant additional attention.`;
      }
      
      return {
        anomalies,
        message
      };
    } catch (error) {
      console.error('Error in anomaly detection:', error);
      return {
        anomalies: [],
        message: "Could not analyze symptoms for anomalies."
      };
    }
  },

  // Translate Message
  translateMessage: async (message, targetLang) => {
    // Simulated translations for different languages
    const translations = {
      es: {
        text: `¡Hola! ${message}`,
        accuracy: 0.92,
        confidence: 0.89
      },
      fr: {
        text: `Bonjour! ${message}`,
        accuracy: 0.91,
        confidence: 0.88
      },
      de: {
        text: `Hallo! ${message}`,
        accuracy: 0.90,
        confidence: 0.87
      },
      it: {
        text: `Ciao! ${message}`,
        accuracy: 0.89,
        confidence: 0.86
      },
      pt: {
        text: `Olá! ${message}`,
        accuracy: 0.88,
        confidence: 0.85
      },
      ru: {
        text: `Привет! ${message}`,
        accuracy: 0.87,
        confidence: 0.84
      },
      zh: {
        text: `你好！${message}`,
        accuracy: 0.86,
        confidence: 0.83
      },
      ja: {
        text: `こんにちは！${message}`,
        accuracy: 0.85,
        confidence: 0.82
      },
      ko: {
        text: `안녕하세요! ${message}`,
        accuracy: 0.84,
        confidence: 0.81
      },
      hi: {
        text: `नमस्ते! ${message}`,
        accuracy: 0.83,
        confidence: 0.80
      }
    };

    const translation = translations[targetLang] || {
      text: `[${targetLang.toUpperCase()}] ${message}`,
      accuracy: 0.80,
      confidence: 0.75
    };

    return {
      translation: translation.text,
      metrics: {
        accuracy: translation.accuracy,
        confidence: translation.confidence,
        timestamp: Date.now()
      }
    };
  },

  getHistoricalMetrics: () => {
    const now = Date.now();
    return Array.from({ length: 10 }, (_, i) => ({
      accuracy: 0.80 + Math.random() * 0.20,
      confidence: 0.70 + Math.random() * 0.30,
      timestamp: now - (i * 24 * 60 * 60 * 1000)
    }));
  },

  // Personalized Recommendations
  personalizedRecommendations: (userId, conversation) => {
    // Placeholder logic for personalized recommendations.
    return [
      "How can I assist you further?",
      "Would you like some additional details?",
      "Is there anything else I can help with?"
    ];
  },

  // Text Prediction
  textPrediction: (text) => {
    // Append a predictive phrase as a placeholder.
    return text + " ... and perhaps that's what you'll say next.";
  },

  // Chatbot Response
  chatbotResponse: async (query) => {
    try {
      await initializeModel();
      
      // Normalize query
      const normalizedQuery = query.toLowerCase().trim();
      
      // Check for recovery-related queries
      if (normalizedQuery.includes('recover') || 
          normalizedQuery.includes('prognosis') || 
          normalizedQuery.includes('heal') ||
          normalizedQuery.includes('get better')) {
        
        // Extract potential symptoms from context
        const symptomKeywords = ['pain', 'fever', 'cough', 'headache', 'nausea', 'dizzy', 'tired', 'fatigue'];
        let detectedSymptoms = [];
        
        symptomKeywords.forEach(symptom => {
          if (normalizedQuery.includes(symptom)) {
            detectedSymptoms.push(symptom);
          }
        });
        
        if (detectedSymptoms.length > 0) {
          // If we have encoded models available, try to predict recovery
          if (encoder && recoveryPredictor) {
            try {
              const prediction = await AIService.predictPatientRecovery(
                detectedSymptoms.join(', '), 
                "Unknown medical history", 
                "Standard care"
              );
              
              if (prediction.success) {
                return prediction.message;
              }
            } catch (predictionError) {
              console.error('Recovery prediction error:', predictionError);
              // Continue to standard response if prediction fails
            }
          }
          
          // Fallback to prepared recovery response if model prediction is unavailable
          return `Based on the symptoms you've mentioned (${detectedSymptoms.join(', ')}), recovery times can vary. For most patients, improvement begins within 1-2 weeks with proper treatment. Please consult your healthcare provider for a personalized assessment.`;
        }
      }
      
      // Medical domain-specific responses
      const medicalTerms = {
        headache: 'Headaches can have many causes including stress, dehydration, or underlying medical conditions. Please consult your healthcare provider for proper diagnosis and treatment.',
        pain: 'When discussing pain, it\'s important to note: 1. Location 2. Intensity 3. Duration 4. Triggers. This helps healthcare providers make accurate assessments.',
        'blood pressure': 'Blood pressure monitoring is essential for heart health. Normal range is typically around 120/80 mmHg. Regular monitoring through our platform helps track trends.',
        medication: 'For medication-related queries: 1. Always follow prescribed dosage 2. Report side effects 3. Use our platform to track medication schedules.',
        prescription: 'Prescriptions can be securely managed through our platform. Always consult your healthcare provider for medication changes.'
      };

      // Check for exact medical term matches first
      for (const [term, response] of Object.entries(medicalTerms)) {
        if (normalizedQuery.includes(term)) {
          return response;
        }
      }

      // If model exists, try to use it
      if (model) {
        try {
          // Tokenize the query
          const tokenizedQuery = tokenizeAndPad(normalizedQuery, vocab);
          const inputTensor = tf.tensor2d([tokenizedQuery]);
          
          // Get prediction
          const prediction = await model.predict(inputTensor);
          const categoryIndex = (await prediction.argMax(-1).data())[0];
          inputTensor.dispose();
          prediction.dispose();
          
          // Find responses in the predicted category
          const category = categories[categoryIndex % categories.length];
          const relevantResponses = responses.filter(r => r.category === category);
          
          if (relevantResponses.length > 0) {
            return relevantResponses[Math.floor(Math.random() * relevantResponses.length)].response;
          }
        } catch (modelError) {
          console.error('Error using model:', modelError);
          // Fall through to basic response
        }
      }

      // Find most relevant response from dataset
      const relevantResponse = responses.find(r => 
        normalizedQuery.includes(r.input.toLowerCase())
      );

      if (relevantResponse) {
        return relevantResponse.response;
      }

      // Fallback response
      return "I understand you have a medical-related question. For your safety and privacy: 1. Please be specific 2. Note that I can't provide medical advice 3. Use our platform to securely communicate with healthcare providers.";
      
    } catch (error) {
      console.error('Error in medical chatbot response:', error);
      return "I apologize, but I'm having trouble processing your query. For your safety, please contact your healthcare provider directly.";
    }
  }
};

// Helper function to generate recovery recommendations
const generateRecoveryRecommendations = (symptoms, recoveryPercentage, timeToRecovery) => {
  const recommendations = [];
  
  // Default recommendations
  recommendations.push("Continue to follow your prescribed treatment plan.");
  recommendations.push("Maintain adequate hydration and rest.");
  
  // Add specific recommendations based on symptoms
  if (symptoms.includes('pain')) {
    recommendations.push("Use pain management techniques as recommended by your healthcare provider.");
  }
  
  if (symptoms.includes('fever')) {
    recommendations.push("Monitor temperature regularly and use fever reducers as prescribed.");
  }
  
  if (symptoms.includes('cough')) {
    recommendations.push("Use humidifiers and stay hydrated to help manage cough symptoms.");
  }
  
  // Add recovery-specific recommendations
  if (recoveryPercentage < 50) {
    recommendations.push("Consider scheduling a follow-up with your provider sooner than initially planned.");
  }
  
  if (timeToRecovery > 14) {
    recommendations.push("Set realistic expectations for recovery and pace your activities accordingly.");
  }
  
  return recommendations;
};
