// import natural from 'natural';
import Fuse from 'fuse.js';

type Sentiment = 'positive' | 'negative' | 'neutral';

interface FuseOptions {
  keys: string[];
  threshold: number;
  distance: number;
}

// Sentiment analyzer initialization
// const analyzer = new natural.SentimentAnalyzer("English", natural.PorterStemmer, "afinn");

// Fuzzy search configuration
const fuseOptions: FuseOptions = {
  keys: ['name', 'msg'],
  threshold: 0.4,
  distance: 100
};

export const AIService = {
  // Simple sentiment analysis based on keywords
  analyzeSentiment: (message: string): 'positive' | 'negative' | 'neutral' => {
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
  generateReplySuggestions: (message: string): string[] => {
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
  }
};
