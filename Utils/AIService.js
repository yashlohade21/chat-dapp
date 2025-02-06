import natural from 'natural';
import Fuse from 'fuse.js';

// Sentiment analyzer initialization
const analyzer = new natural.SentimentAnalyzer("English", natural.PorterStemmer, "afinn");

// Fuzzy search configuration
const fuseOptions = {
  keys: ['name', 'msg'],
  threshold: 0.4,
  distance: 100
};

export const AIService = {
  // Analyze message sentiment
  analyzeSentiment: (message) => {
    const words = new natural.WordTokenizer().tokenize(message);
    const score = analyzer.getSentiment(words);
    
    if (score > 0.2) return 'positive';
    if (score < -0.2) return 'negative';
    return 'neutral';
  },

  // Fuzzy search for friends
  searchFriends: (query, friendList) => {
    const fuse = new Fuse(friendList, fuseOptions);
    return fuse.search(query);
  },

  // Smart reply suggestions based on message content
  generateReplySuggestions: (message) => {
    const sentiment = AIService.analyzeSentiment(message);
    
    // Basic reply suggestions based on sentiment
    const suggestions = {
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

  // Categorize message type
  categorizeMessage: (message) => {
    if (message.endsWith('?')) return 'question';
    if (message.toUpperCase() === message) return 'emphasis';
    if (message.includes('http')) return 'link';
    return 'statement';
  }
};
