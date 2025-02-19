// import natural from 'natural';
import Fuse from 'fuse.js';

export const SUPPORTED_LANGUAGES = [
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'hi', name: 'Hindi' }
];

// Fuzzy search configuration
const fuseOptions = {
  keys: ['name', 'msg'],
  threshold: 0.4,
  distance: 100
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
  }
};
