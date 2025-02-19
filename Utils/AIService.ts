// import natural from 'natural';
import Fuse from 'fuse.js';

type Sentiment = 'positive' | 'negative' | 'neutral';
type TopicCategory = 'appointment' | 'prescription' | 'general';

interface FuseOptions {
  keys: string[];
  threshold: number;
  distance: number;
}

// Fuzzy search configuration
const fuseOptions: FuseOptions = {
  keys: ['name', 'msg'],
  threshold: 0.4,
  distance: 100
};

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
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

export interface AIMetrics {
  accuracy: number;
  confidence: number;
  timestamp: number;
}

export const AIService = {
  // Existing methods
  analyzeSentiment: (message: string): Sentiment => {
    const text = message.toLowerCase();
    
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

  // New method: Summarize Text
  summarizeText: (text: string): string => {
    // Basic implementation - returns first 100 chars with ellipsis
    // TODO: Integrate with a proper summarization API/model
    const sentences = text.split(/[.!?]+/);
    const firstThreeSentences = sentences.slice(0, 3).join('. ');
    return firstThreeSentences + (sentences.length > 3 ? '...' : '');
  },

  // New method: Translate Message
  translateMessage: async (message: string, targetLang: LanguageCode): Promise<{
    translation: string;
    metrics: AIMetrics;
  }> => {
    // Simulated translation with metrics
    const metrics = {
      accuracy: 0.85 + Math.random() * 0.15, // Simulated accuracy between 85-100%
      confidence: 0.75 + Math.random() * 0.25, // Simulated confidence between 75-100%
      timestamp: Date.now()
    };

    // In a real implementation, this would call a translation API
    return {
      translation: `[${targetLang.toUpperCase()}] ${message}`,
      metrics
    };
  },

  // New method: Classify Topic
  classifyTopic: (text: string): TopicCategory => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('appointment') || lowerText.includes('schedule')) return 'appointment';
    if (lowerText.includes('medication') || lowerText.includes('prescription')) return 'prescription';
    return 'general';
  },

  // Existing methods
  generateReplySuggestions: (message: string): string[] => {
    const text = message.toLowerCase();
    
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

  // Categorize message type
  categorizeMessage: (message: string): string => {
    const text = message.toLowerCase();
    
    if (text.includes('?')) return 'question';
    if (text.includes('appointment') || text.includes('schedule')) return 'appointment';
    if (text.includes('symptom') || text.includes('pain')) return 'medical';
    if (text.includes('medication') || text.includes('medicine')) return 'prescription';
    if (text.includes('thank')) return 'gratitude';
    if (text.includes('treatment') || text.includes('therapy')) return 'treatment';
    return 'general';
  },

  // Fuzzy search configuration
  searchFriends: (query: string, friendList: any[]) => {
    const fuse = new Fuse(friendList, fuseOptions);
    return fuse.search(query);
  },

  // Detect PHI related keywords in the message
  detectPHI: (message: string): string[] => {
    const terms = ['patient', 'ssn', 'dob', 'medical', 'health'];
    return terms.filter(term => message.toLowerCase().includes(term));
  },

  // Add method to get historical metrics
  getHistoricalMetrics: (): AIMetrics[] => {
    // Simulate historical data
    const now = Date.now();
    return Array.from({ length: 10 }, (_, i) => ({
      accuracy: 0.80 + Math.random() * 0.20,
      confidence: 0.70 + Math.random() * 0.30,
      timestamp: now - (i * 24 * 60 * 60 * 1000) // Last 10 days
    }));
  }
};
