import * as tf from '@tensorflow/tfjs';
import medicalResponses from '../dataset/chatbot_training_data.json' assert { type: 'json' };
import { loadXMLDataset } from './xmlDataPrep.js';

// Maximum sequence length for input text
const MAX_SEQUENCE_LENGTH = 50;
// Maximum vocabulary size
const VOCAB_SIZE = 5000;

// Tokenize and pad a text input
export const tokenizeAndPad = (text, vocab) => {
  if (!text) return Array(MAX_SEQUENCE_LENGTH).fill(vocab['<PAD>']);
  
  // Tokenize by splitting on whitespace and converting to lowercase
  const tokens = text.toLowerCase().split(/\s+/);
  
  // Convert tokens to indices using vocabulary
  const indices = tokens.map(token => vocab[token] || vocab['<UNK>']);
  
  // Pad or truncate to MAX_SEQUENCE_LENGTH
  if (indices.length < MAX_SEQUENCE_LENGTH) {
    return [...indices, ...Array(MAX_SEQUENCE_LENGTH - indices.length).fill(vocab['<PAD>'])];
  } else {
    return indices.slice(0, MAX_SEQUENCE_LENGTH);
  }
};

// Create one-hot encoded target sequences
const createTargetSequences = (categories, categoryIndices) => {
  return categoryIndices.map(index => {
    const oneHot = Array(categories.length).fill(0);
    oneHot[index] = 1;
    return oneHot;
  });
};

// Load and prepare dataset
export const loadDataset = async () => {
  try {
    console.log('Loading dataset...');
    
    // Get conversations from JSON dataset
    const { conversations, categories } = medicalResponses;
    
    // Try to load additional XML dataset if available
    let xmlData = [];
    try {
      xmlData = await loadXMLDataset();
      console.log(`Loaded ${xmlData.length} additional items from XML dataset`);
    } catch (error) {
      console.warn('Could not load XML dataset:', error.message);
    }
    
    // Combine datasets
    const allConversations = [
      ...conversations,
      ...xmlData.map(item => ({
        input: item.question,
        response: item.answer,
        category: item.category || 'medical_info'
      }))
    ];
    
    // Build vocabulary
    const allText = allConversations.flatMap(pair => [pair.input, pair.response]);
    const words = new Set();
    allText.forEach(text => text.toLowerCase().split(/\s+/).forEach(word => words.add(word)));
    
    // Create vocabulary with special tokens
    const vocab = {
      '<PAD>': 0,
      '<UNK>': 1,
    };
    
    // Add words to vocabulary (limit to VOCAB_SIZE)
    const wordArray = Array.from(words);
    for (let i = 0; i < Math.min(wordArray.length, VOCAB_SIZE - 2); i++) {
      vocab[wordArray[i]] = i + 2;
    }
    
    // Tokenize inputs
    const inputSequences = allConversations.map(pair => 
      tokenizeAndPad(pair.input, vocab)
    );
    
    // Get category indices
    const categoryIndices = allConversations.map(pair => 
      categories.indexOf(pair.category)
    );
    
    // Create one-hot encoded targets
    const targetSequences = createTargetSequences(categories, categoryIndices);
    
    // Create all sequences for unsupervised learning
    const allSequences = allConversations.flatMap(pair => [
      tokenizeAndPad(pair.input, vocab),
      tokenizeAndPad(pair.response, vocab)
    ]);
    
    // Extract recovery-related phrases for recovery prediction
    const recoveryPhrases = allConversations
      .filter(pair => 
        pair.category === 'recovery' || 
        pair.input.toLowerCase().includes('recover') ||
        pair.response.toLowerCase().includes('recover') ||
        pair.input.toLowerCase().includes('healing') ||
        pair.response.toLowerCase().includes('healing') ||
        pair.input.toLowerCase().includes('prognosis') ||
        pair.response.toLowerCase().includes('prognosis')
      )
      .map(pair => ({
        text: pair.response,
        input: pair.input
      }));
    
    console.log(`Dataset prepared: ${inputSequences.length} conversations, ${Object.keys(vocab).length} vocabulary items, ${recoveryPhrases.length} recovery phrases`);
    
    return {
      inputSequences,
      targetSequences,
      allSequences,
      recoveryPhrases,
      vocabSize: Object.keys(vocab).length,
      vocab,
      categories
    };
  } catch (error) {
    console.error('Error loading dataset:', error);
    throw error;
  }
};

// Create time series data for recovery prediction
export const createRecoveryTimeSeries = (recoveryPhrases, vocab) => {
  if (!recoveryPhrases || recoveryPhrases.length === 0) return [];
  
  const timeSeriesData = [];
  
  // Extract time information from recovery phrases
  const timeRegex = /(\d+)(?:\s*-\s*\d+)?\s*(day|week|month|hour)/i;
  const percentRegex = /(\d+)(?:\s*-\s*\d+)?\s*(%|percent)/i;
  
  recoveryPhrases.forEach(phrase => {
    // Tokenize the text
    const tokenized = tokenizeAndPad(phrase.text, vocab);
    
    // Extract time information
    let timePoint = 0;
    const timeMatch = phrase.text.match(timeRegex);
    if (timeMatch) {
      const value = parseInt(timeMatch[1], 10);
      const unit = timeMatch[2].toLowerCase();
      
      // Convert to days
      if (unit.includes('hour')) {
        timePoint = value / 24;
      } else if (unit.includes('day')) {
        timePoint = value;
      } else if (unit.includes('week')) {
        timePoint = value * 7;
      } else if (unit.includes('month')) {
        timePoint = value * 30;
      }
    } else {
      // If no explicit time, estimate based on keywords
      if (phrase.text.includes('quick') || phrase.text.includes('fast')) {
        timePoint = 3;
      } else if (phrase.text.includes('soon')) {
        timePoint = 7;
      } else if (phrase.text.includes('gradual')) {
        timePoint = 14;
      } else if (phrase.text.includes('long')) {
        timePoint = 30;
      } else {
        timePoint = 10; // Default
      }
    }
    
    // Extract improvement percentage
    let improvement = 0;
    const percentMatch = phrase.text.match(percentRegex);
    if (percentMatch) {
      improvement = parseInt(percentMatch[1], 10) / 100;
    } else {
      // If no explicit percentage, estimate based on keywords
      if (phrase.text.includes('full') || phrase.text.includes('complete')) {
        improvement = 1.0;
      } else if (phrase.text.includes('significant') || phrase.text.includes('substantial')) {
        improvement = 0.8;
      } else if (phrase.text.includes('partial')) {
        improvement = 0.5;
      } else if (phrase.text.includes('minimal') || phrase.text.includes('slight')) {
        improvement = 0.3;
      } else {
        improvement = 0.7; // Default
      }
    }
    
    // Add to time series data
    timeSeriesData.push({
      tokenized,
      timePoint,
      improvement
    });
  });
  
  return timeSeriesData;
};

export const trainModels = async (progressCallback) => {
  try {
    // Load and preprocess dataset
    const { inputSequences, targetSequences, allSequences, recoveryPhrases, vocabSize } = await loadDataset();
    
    // Build and train supervised model
    progressCallback(10, "Building supervised model...");
    const model = buildChatbotModel(vocabSize);
    
    // Train supervised model
    const inputTensor = tf.tensor2d(inputSequences);
    const targetTensor = tf.tensor2d(targetSequences);
    
    await model.fit(inputTensor, targetTensor, {
      epochs: 10,
      batchSize: 32,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          progressCallback(10 + (epoch / 10) * 20, `Training supervised model (epoch ${epoch + 1}/10)...`);
        }
      }
    });
    
    // Save supervised model
    await model.save('localstorage://medical-chatbot-model');
    
    // Build and train autoencoder
    progressCallback(30, "Building autoencoder...");
    const { autoencoder, encoder } = buildAutoencoder(vocabSize);
    
    const autoencoderInput = tf.tensor2d(allSequences);
    await autoencoder.fit(autoencoderInput, autoencoderInput, {
      epochs: 5,
      batchSize: 32,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          progressCallback(30 + (epoch / 5) * 20, `Training autoencoder (epoch ${epoch + 1}/5)...`);
        }
      }
    });
    
    // Save autoencoder models
    await autoencoder.save('localstorage://medical-autoencoder-model');
    await encoder.save('localstorage://medical-encoder-model');
    
    // Build and train recovery predictor
    progressCallback(60, "Building recovery predictor...");
    const recoveryPredictor = buildRecoveryPredictor();
    
    const recoveryData = createRecoveryTimeSeries(recoveryPhrases, vocab);
    const recoveryInput = tf.tensor2d(recoveryData.map(item => item.tokenized));
    const recoveryTarget = tf.tensor2d(recoveryData.map(item => [item.timePoint, item.improvement]));
    
    await recoveryPredictor.fit(recoveryInput, recoveryTarget, {
      epochs: 10,
      batchSize: 16,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          progressCallback(60 + (epoch / 10) * 20, `Training recovery predictor (epoch ${epoch + 1}/10)...`);
        }
      }
    });
    
    // Save recovery predictor
    await recoveryPredictor.save('localstorage://medical-recovery-model');
    
    // Build and train self-learning model
    progressCallback(80, "Building self-learning model...");
    const selfLearningModel = buildSelfLearningModel(vocabSize);
    
    const selfLearningInput = tf.tensor2d(allSequences);
    await selfLearningModel.fit(selfLearningInput, selfLearningInput, {
      epochs: 5,
      batchSize: 32,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          progressCallback(80 + (epoch / 5) * 20, `Training self-learning model (epoch ${epoch + 1}/5)...`);
        }
      }
    });
    
    // Save self-learning model
    await selfLearningModel.save('localstorage://self-learning-model');
    
    progressCallback(100, "Training complete!");
    return { success: true };
  } catch (error) {
    console.error('Error training models:', error);
    throw new Error(`Training failed: ${error.message}`);
  }
};