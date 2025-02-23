import * as tf from '@tensorflow/tfjs';
import { buildChatbotModel, predictResponse } from './ChatbotModel';
import medicalResponses from '../dataset/chatbot_training_data.json';

let model = null;
let categories = null;
let responses = null;

const initializeModel = async () => {
  if (!model) {
    try {
      // Load model from localStorage or use basic response system
      const savedModel = localStorage.getItem('medical-chatbot-model');
      if (savedModel) {
        console.log('Loading saved model...');
        model = await tf.loadLayersModel('localstorage://medical-chatbot-model');
        console.log('Model loaded successfully');
      } else {
        console.log('No saved model found, using basic response system');
        // Initialize with basic response system
        categories = medicalResponses.categories;
        responses = medicalResponses.conversations;
      }
    } catch (error) {
      console.error('Error initializing model:', error);
      // Don't throw error, fallback to basic responses
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
    return 'general';
  },

  // Summarize Text
  summarizeText: (text) => {
    const sentences = text.split(/[.!?]+/);
    const firstThreeSentences = sentences.slice(0, 3).join('. ');
    return firstThreeSentences + (sentences.length > 3 ? '...' : '');
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

  // New method: Personalized Recommendations
  personalizedRecommendations: (userId, conversation) => {
    // Placeholder logic for personalized recommendations.
    return [
      "How can I assist you further?",
      "Would you like some additional details?",
      "Is there anything else I can help with?"
    ];
  },

  // New method: Text Prediction
  textPrediction: (text) => {
    // Append a predictive phrase as a placeholder.
    return text + " ... and perhaps that's what you'll say next.";
  },

  // New method: Chatbot Response
  chatbotResponse: async (query) => {
    try {
      await initializeModel();
      
      // Normalize query
      const normalizedQuery = query.toLowerCase().trim();
      
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
          // Convert query to model input format
          const input = tf.tensor2d([Array(20).fill(0)]); // Placeholder input
          const response = await predictResponse(model, input, categories, responses);
          input.dispose(); // Clean up tensor
          return response;
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
