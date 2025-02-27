import * as tf from '@tensorflow/tfjs';
import fs from 'fs';
import path from 'path';
import { loadXMLDataset } from './xmlDataPrep.js';

const MAX_SEQUENCE_LENGTH = 50; // Increased for better context understanding
const VOCAB_SIZE = 15000; // Increased for medical vocabulary

export const loadDataset = async () => {
  // Load and combine datasets
  const jsonPath = path.join(process.cwd(), 'dataset', 'chatbot_training_data.json');
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const xmlData = await loadXMLDataset();
  
  // Combine conversations
  const allConversations = [...jsonData.conversations, ...xmlData];
  
  // Build vocabulary from all text
  const allText = allConversations.flatMap(pair => [pair.input, pair.response]);
  const vocab = buildVocabulary(allText);
  
  // Process data for supervised component
  const inputSequences = allConversations.map(pair => tokenizeAndPad(pair.input, vocab));
  const targetSequences = allConversations.map(pair => {
    const sequence = tokenizeAndPad(pair.response, vocab);
    return tf.oneHot(sequence, Object.keys(vocab).length).arraySync();
  });
  
  // Process data for unsupervised component (autoencoder)
  const allSequences = allConversations.flatMap(pair => [
    tokenizeAndPad(pair.input, vocab),
    tokenizeAndPad(pair.response, vocab)
  ]);
  
  // Extract medical recovery data
  const recoveryPhrases = extractRecoveryPhrases(allConversations);
  
  console.log(`Vocabulary size: ${Object.keys(vocab).length}`);
  console.log(`Total training pairs: ${allConversations.length}`);
  console.log(`Recovery phrases extracted: ${recoveryPhrases.length}`);
  
  return {
    inputSequences,
    targetSequences,
    allSequences,
    recoveryPhrases,
    vocabSize: Object.keys(vocab).length,
    vocab,
    categories: jsonData.categories
  };
};

const buildVocabulary = (texts) => {
  const wordFreq = {};
  const medicalTerms = new Set([
    'diagnosis', 'treatment', 'symptoms', 'medication', 'prescription',
    'doctor', 'hospital', 'patient', 'medical', 'health', 'disease',
    'condition', 'therapy', 'clinical', 'healthcare', 'recovery',
    'improvement', 'prognosis', 'healing', 'progress', 'outcome',
    'remission', 'rehabilitation', 'complications', 'relapse'
  ]);
  
  texts.forEach(text => {
    text.toLowerCase().split(/\s+/).forEach(word => {
      // Prioritize medical terms by giving them higher frequency
      if (medicalTerms.has(word)) {
        wordFreq[word] = (wordFreq[word] || 0) + 10;
      } else {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });
  });
  
  // Sort by frequency and take top VOCAB_SIZE words
  const sortedWords = Object.entries(wordFreq)
    .sort(([,a], [,b]) => b - a)
    .slice(0, VOCAB_SIZE - 2)
    .map(([word]) => word);
  
  const vocab = {
    '<PAD>': 0,
    '<UNK>': 1,
    ...Object.fromEntries(sortedWords.map((word, i) => [word, i + 2]))
  };
  
  return vocab;
};

const tokenizeAndPad = (text, vocab) => {
  const tokens = text.toLowerCase().split(/\s+/)
    .map(word => vocab[word] || vocab['<UNK>']);
  
  if (tokens.length > MAX_SEQUENCE_LENGTH) {
    return tokens.slice(0, MAX_SEQUENCE_LENGTH);
  }
  return [...tokens, ...Array(MAX_SEQUENCE_LENGTH - tokens.length).fill(vocab['<PAD>'])];
};

const extractRecoveryPhrases = (conversations) => {
  const recoveryKeywords = [
    'improved', 'recovery', 'better', 'healing', 'progress',
    'remission', 'outcome', 'prognosis', 'rehabilitation'
  ];
  
  // Extract conversations related to recovery
  return conversations.filter(conv => {
    const text = (conv.input + ' ' + conv.response).toLowerCase();
    return recoveryKeywords.some(keyword => text.includes(keyword));
  });
};

// New function to create time-series data from recovery phrases
export const createRecoveryTimeSeries = (recoveryPhrases, vocab) => {
  // Extract temporal indicators and health states
  const timeSeriesData = [];
  
  // Map temporal phrases to numeric values (days)
  const temporalMap = {
    'immediately': 1,
    'few hours': 0.5,
    'day': 1,
    'days': 3,
    'week': 7,
    'weeks': 14, 
    'month': 30,
    'months': 90,
    'year': 365
  };
  
  // Simplistic extraction of temporal patterns
  recoveryPhrases.forEach(phrase => {
    const text = phrase.input + ' ' + phrase.response;
    let timePoint = 0;
    let improvement = 0;
    
    // Extract time information
    for (const [term, value] of Object.entries(temporalMap)) {
      if (text.includes(term)) {
        // Extract numbers before temporal terms
        const match = text.match(new RegExp(`(\\d+)\\s+${term}`));
        if (match) {
          timePoint = parseInt(match[1]) * value;
        } else {
          timePoint = value;
        }
        break;
      }
    }
    
    // Extract improvement level
    if (text.includes('full recovery') || text.includes('completely recovered')) {
      improvement = 1.0;
    } else if (text.includes('significant improvement') || text.includes('major progress')) {
      improvement = 0.8;
    } else if (text.includes('moderate improvement') || text.includes('some progress')) {
      improvement = 0.5;
    } else if (text.includes('slight improvement') || text.includes('minor progress')) {
      improvement = 0.3;
    } else if (text.includes('no improvement') || text.includes('no change')) {
      improvement = 0.0;
    } else {
      // Default modest improvement
      improvement = 0.4;
    }
    
    if (timePoint > 0) {
      timeSeriesData.push({
        text: text,
        timePoint: timePoint,
        improvement: improvement,
        tokenized: tokenizeAndPad(text, vocab)
      });
    }
  });
  
  return timeSeriesData;
};

export { tokenizeAndPad }; // Export for use in other modules
