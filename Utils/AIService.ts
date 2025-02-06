import natural from 'natural';
import Fuse from 'fuse.js';

type Sentiment = 'positive' | 'negative' | 'neutral';

interface FuseOptions {
  keys: string[];
  threshold: number;
  distance: number;
}

// Sentiment analyzer initialization
const analyzer = new natural.SentimentAnalyzer("English", natural.PorterStemmer, "afinn");

// Fuzzy search configuration
const fuseOptions: FuseOptions = {
  keys: ['name', 'msg'],
  threshold: 0.4,
  distance: 100
};

export const AIService = {
  analyzeSentiment: (message: string): Sentiment => {
    const words = new natural.WordTokenizer().tokenize(message);
    const score = analyzer.getSentiment(words);
    
    if (score > 0.2) return 'positive';
    if (score < -0.2) return 'negative';
    return 'neutral';
  },

  searchFriends: (query: string, friendList: any[]) => {
    const fuse = new Fuse(friendList, fuseOptions);
    return fuse.search(query);
  },

  generateReplySuggestions: (message: string): string[] => {
    const sentiment = AIService.analyzeSentiment(message);
    const suggestions: Record<Sentiment, string[]> = {
      positive: [
        "Thanks! 😊",
        "Great to hear that!",
        "Awesome!"
      ],
      negative: [
        "I understand",
        "Let me help",
        "Is everything okay?"
      ],
      neutral: [
        "Okay",
        "I see",
        "Tell me more"
      ]
    };

    return suggestions[sentiment];
  },

  categorizeMessage: (message: string): string => {
    if (message.endsWith('?')) return 'question';
    if (message.toUpperCase() === message) return 'emphasis';
    if (message.includes('http')) return 'link';
    return 'statement';
  },

  detectPHI: (message: string): string[] => {
    // Look for PHI related keywords in the message
    const terms = ['patient', 'ssn', 'dob', 'medical', 'health'];
    return terms.filter(term => message.toLowerCase().includes(term));
  }
};
