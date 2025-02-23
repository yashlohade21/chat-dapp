import * as tf from '@tensorflow/tfjs';
import fs from 'fs';
import path from 'path';
import { loadXMLDataset } from './xmlDataPrep.js';

const MAX_SEQUENCE_LENGTH = 30; // Increased for medical terminology
const VOCAB_SIZE = 10000; // Increased for medical vocabulary

export const loadDataset = async () => {
  // Load and combine both datasets
  const jsonPath = path.join(process.cwd(), 'dataset', 'chatbot_training_data.json');
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const xmlData = await loadXMLDataset();
  
  // Combine conversations
  const allConversations = [...jsonData.conversations, ...xmlData];
  
  // Build vocabulary from all text
  const allText = allConversations.flatMap(pair => [pair.input, pair.response]);
  const vocab = buildVocabulary(allText);
  
  // Convert text to sequences with one-hot encoding for targets
  const inputSequences = allConversations.map(pair => tokenizeAndPad(pair.input, vocab));
  const targetSequences = allConversations.map(pair => {
    const sequence = tokenizeAndPad(pair.response, vocab);
    return tf.oneHot(sequence, Object.keys(vocab).length).arraySync();
  });
  
  console.log(`Vocabulary size: ${Object.keys(vocab).length}`);
  console.log(`Total training pairs: ${allConversations.length}`);
  
  return {
    inputSequences,
    targetSequences,
    vocabSize: Object.keys(vocab).length,
    vocab
  };
};

const buildVocabulary = (texts) => {
  const wordFreq = {};
  const medicalTerms = new Set([
    'diagnosis', 'treatment', 'symptoms', 'medication', 'prescription',
    'doctor', 'hospital', 'patient', 'medical', 'health', 'disease',
    'condition', 'therapy', 'clinical', 'healthcare'
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

export { tokenizeAndPad }; // Export for use in other modules
