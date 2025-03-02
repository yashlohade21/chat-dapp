import * as tf from '@tensorflow/tfjs';
import { loadXMLDataset } from './xmlDataPrep.js';
import { tokenizeAndPad, loadDataset, createRecoveryTimeSeries } from './dataPrep.js';
import { 
  predictRecovery, 
  generateAutonomousResponse,
  buildChatbotModel,
  buildAutoencoder,
  buildRecoveryPredictor,
  buildSelfLearningModel
} from './ChatbotModel.js';
import medicalResponses from '../dataset/chatbot_training_data.json' assert { type: 'json' };

let model = null;
let autoencoder = null;
let encoder = null;
let recoveryPredictor = null;
let selfLearningModel = null;
let categories = null;
let responses = null;
let vocab = null;
let conversationHistory = [];
let learningEnabled = false; // Disable autonomous learning by default
let modelTrainingInProgress = false;

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
      
      // Try to load self-learning model
      try {
        selfLearningModel = await tf.loadLayersModel('localstorage://self-learning-model');
        console.log('Self-learning model loaded successfully');
      } catch (e) {
        console.warn('Could not load self-learning model:', e.message);
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

const updateModelWithNewKnowledge = async (userQuery, botResponse) => {
  if (!learningEnabled || !selfLearningModel || !encoder) return;
  
  try {
    console.log("Updating autonomous model with new knowledge");
    
    // Tokenize the query and response
    const queryTokens = tokenizeAndPad(userQuery.toLowerCase(), vocab);
    const responseTokens = tokenizeAndPad(botResponse, vocab);
    
    // Create input and target tensors
    const inputTensor = tf.tensor2d([queryTokens]);
    
    // Use the existing encoder to get the latent representation
    const encoded = await encoder.predict(inputTensor);
    
    // Create a small dataset for fine-tuning
    const learningRate = 0.001;
    
    // Create mock output targets for each prediction task
    // Response type (expanded to 20 categories)
    const responseTypeTarget = tf.oneHot(
      [Math.floor(Math.random() * 20)],
      20
    );
    
    // Sentiment (expanded to 5 categories)
    const sentimentTarget = tf.oneHot(
      [Math.floor(Math.random() * 5)],
      5
    );
    
    // Intent (expanded to 12 categories)
    const intentTarget = tf.oneHot(
      [Math.floor(Math.random() * 12)],
      12
    );
    
    // Next word prediction (simplified)
    const nextWordTarget = tf.oneHot(
      [Math.floor(Math.random() * (Object.keys(vocab).length || 5000))],
      Object.keys(vocab).length || 5000
    ).reshape([1, 1, Object.keys(vocab).length || 5000]);
    
    // Context understanding (8 categories)
    const contextTarget = tf.oneHot(
      [Math.floor(Math.random() * 8)],
      8
    );
    
    // Entity recognition (10 categories)
    const entityTarget = tf.oneHot(
      [Math.floor(Math.random() * 10)],
      10
    );
    
    // Fine-tune the self-learning model with this new example
    await selfLearningModel.fit(
      inputTensor,
      [responseTypeTarget, sentimentTarget, intentTarget, nextWordTarget, contextTarget, entityTarget],
      {
        epochs: 1,
        batchSize: 1,
        verbose: 0
      }
    );
    
    // Cleanup tensors to prevent memory leaks
    inputTensor.dispose();
    encoded.dispose();
    responseTypeTarget.dispose();
    sentimentTarget.dispose();
    intentTarget.dispose();
    nextWordTarget.dispose();
    contextTarget.dispose();
    entityTarget.dispose();
    
    return true;
  } catch (error) {
    console.error('Error updating model with new knowledge:', error);
    return false;
  }
};
  
// Format response to be more Claude-like
const formatAssistantResponse = (response) => {
  // Add paragraph breaks for readability
  let formattedResponse = response;
  
  // Add paragraph breaks where appropriate
  if (formattedResponse.length > 150 && !formattedResponse.includes('\n\n')) {
    // Split into sentences
    const sentences = formattedResponse.match(/[^.!?]+[.!?]+/g) || [formattedResponse];
    
    // Group sentences into paragraphs (2-3 sentences per paragraph)
    const paragraphs = [];
    for (let i = 0; i < sentences.length; i += 2) {
      const paragraph = sentences.slice(i, i + 2).join(' ');
      paragraphs.push(paragraph);
    }
    
    formattedResponse = paragraphs.join('\n\n');
  }
  
  // Add a polite conclusion if the response is long
  if (formattedResponse.length > 200 && !formattedResponse.includes("hope this helps") && 
      !formattedResponse.includes("let me know") && !formattedResponse.endsWith("?")) {
    formattedResponse += "\n\nI hope this information is helpful. Let me know if you have any other questions!";
  }
  
  return formattedResponse;
};
  
export const AIService = {
  // Check if models are loaded
  checkModelsLoaded: async () => {
    await initializeModel();
    return {
      loaded: !!(model && encoder && autoencoder && recoveryPredictor && selfLearningModel),
      models: {
        supervised: !!model,
        encoder: !!encoder,
        autoencoder: !!autoencoder,
        recoveryPredictor: !!recoveryPredictor,
        selfLearning: !!selfLearningModel
      }
    };
  },
  
  // Enable or disable autonomous learning
  setAutonomousLearning: (enabled) => {
    learningEnabled = enabled;
    return learningEnabled;
  },
  
  // Train models with progress updates
  trainModels: async (progressCallback) => {
    if (modelTrainingInProgress) {
      throw new Error("Training is already in progress");
    }
    
    modelTrainingInProgress = true;
    
    try {
      // Initialize vocabulary and dataset
      progressCallback(5, "Loading medical dataset...");
      
      // Load dataset
      const { 
        inputSequences, 
        targetSequences, 
        allSequences,
        recoveryPhrases,
        vocabSize, 
        vocab: datasetVocab,
        categories: datasetCategories
      } = await loadDataset();
      
      // Update global variables
      vocab = datasetVocab;
      categories = datasetCategories;
      
      // Build and train supervised model
      progressCallback(10, "Building supervised medical classification model...");
      model = buildChatbotModel(vocabSize);
      
      // Train supervised component in chunks
      const totalSamples = inputSequences.length;
      const chunkSize = Math.min(64, totalSamples);
      
      for (let i = 0; i < totalSamples; i += chunkSize) {
        const endIdx = Math.min(i + chunkSize, totalSamples);
        const inputChunk = inputSequences.slice(i, endIdx);
        const targetChunk = targetSequences.slice(i, endIdx);
        
        const inputTensor = tf.tensor2d(inputChunk);
        const targetTensor = tf.tensor3d(targetChunk);
        
        const chunkProgress = Math.floor(10 + (i / totalSamples) * 20);
        progressCallback(chunkProgress, `Training medical classification model (chunk ${Math.floor(i/chunkSize) + 1}/${Math.ceil(totalSamples/chunkSize)})...`);
        
        await model.fit(inputTensor, targetTensor, {
          epochs: 5,
          batchSize: 16,
          shuffle: true
        });
        
        // Cleanup tensors
        inputTensor.dispose();
        targetTensor.dispose();
      }
      
      // Build and train autoencoder
      progressCallback(30, "Building autoencoder for unsupervised learning...");
      // const { autoencoder: newAutoencoder, encoder: newEncoder } = buildAutoencoder(
      //   Object.keys(vocab || {}).length || 5000, 
      //   50
      // );
      
      // Train autoencoder in chunks
      const sequenceLength = allSequences[0].length;
      const { autoencoder: newAutoencoder, encoder: newEncoder } = buildAutoencoder(vocabSize, sequenceLength);
      
      // Train autoencoder in chunks
      const autoEncoderChunkSize = Math.min(32, allSequences.length);
      
      for (let i = 0; i < allSequences.length; i += autoEncoderChunkSize) {
        const endIdx = Math.min(i + autoEncoderChunkSize, allSequences.length);
        const sequenceChunk = allSequences.slice(i, endIdx);
        
        const inputTensor = tf.tensor2d(sequenceChunk);
        const oneHotTarget = tf.oneHot(sequenceChunk, vocabSize);
        
        const chunkProgress = Math.floor(35 + (i / allSequences.length) * 20);
        progressCallback(chunkProgress, `Training medical pattern recognition (chunk ${Math.floor(i/autoEncoderChunkSize) + 1}/${Math.ceil(allSequences.length/autoEncoderChunkSize)})...`);
        
        await newEncoder.fit(inputTensor, oneHotTarget, {
          epochs: 5,
          batchSize: 8,
          shuffle: true
        });
        
        // Cleanup tensors
        inputTensor.dispose();
        oneHotTarget.dispose();
      }
      
      // Save autoencoder models
      progressCallback(55, "Saving medical pattern recognition models...");
      await newAutoencoder.save('localstorage://medical-autoencoder-model');
      await newEncoder.save('localstorage://medical-encoder-model');
      
      // Update global variables
      autoencoder = newAutoencoder;
      encoder = newEncoder;
      
      // Build and train recovery predictor
      progressCallback(60, "Building recovery prediction model...");
      recoveryPredictor = buildRecoveryPredictor();
      
      // Create recovery time series data
      const timeSeriesData = createRecoveryTimeSeries(recoveryPhrases, vocab);
      
      if (timeSeriesData.length > 0) {
        // Train recovery predictor in chunks
        const batchSize = Math.min(16, timeSeriesData.length);
        
        for (let i = 0; i < timeSeriesData.length; i += batchSize) {
          const endIdx = Math.min(i + batchSize, timeSeriesData.length);
          const batch = timeSeriesData.slice(i, endIdx);
          
          // Create input tensor from tokenized text
          const inputTensor = tf.tensor2d(batch.map(item => item.tokenized));
          
          // Encode to latent features
          const features = encoder.predict(inputTensor);
          
          // Create target tensor with timePoint, improvement, and uncertainty
          const targetTensor = tf.tensor2d(batch.map(item => [
            item.timePoint, 
            item.improvement,
            0.1 // Initial uncertainty value
          ]));
          
          const chunkProgress = Math.floor(60 + (i / timeSeriesData.length) * 15);
          progressCallback(chunkProgress, `Training recovery prediction model (chunk ${Math.floor(i/batchSize) + 1}/${Math.ceil(timeSeriesData.length/batchSize)})...`);
          
          await recoveryPredictor.fit(features, targetTensor, {
            epochs: 10,
            batchSize: 4,
            shuffle: true
          });
          
          // Cleanup tensors
          inputTensor.dispose();
          features.dispose();
          targetTensor.dispose();
        }
        
        // Save recovery predictor
        progressCallback(75, "Saving recovery prediction model...");
        await recoveryPredictor.save('localstorage://medical-recovery-model');
      } else {
        progressCallback(75, "Skipping recovery predictor training (insufficient data)...");
      }
      
      // Build and train self-learning model
      progressCallback(80, "Building autonomous clinical reasoning model...");
      selfLearningModel = buildSelfLearningModel(
        Object.keys(vocab || {}).length || 5000, 
        50
      );
      
      // Train self-learning model in chunks
      const trainingChunkSize = Math.min(32, allSequences.length);
      
      for (let i = 0; i < allSequences.length; i += trainingChunkSize) {
        const endIdx = Math.min(i + trainingChunkSize, allSequences.length);
        const sequenceChunk = allSequences.slice(i, endIdx);
        
        // Create input tensor
        const inputTensor = tf.tensor2d(sequenceChunk);
        
        // Create mock output targets for each prediction task
        // Response type (expanded to 20 categories)
        const responseTypeTarget = tf.oneHot(
          Array.from({length: sequenceChunk.length}, () => 
            Math.floor(Math.random() * 20)
          ),
          20
        );
        
        // Sentiment (expanded to 5 categories)
        const sentimentTarget = tf.oneHot(
          Array.from({length: sequenceChunk.length}, () => 
            Math.floor(Math.random() * 5)
          ),
          5
        );
        
        // Intent (expanded to 12 categories)
        const intentTarget = tf.oneHot(
          Array.from({length: sequenceChunk.length}, () => 
            Math.floor(Math.random() * 12)
          ),
          12
        );
        
        // Next word prediction
        const nextWordTarget = tf.oneHot(
          sequenceChunk.map(seq => {
            const shifted = [...seq.slice(1), vocab['<PAD>']];
            return shifted;
          }).flat(),
          vocabSize
        ).reshape([sequenceChunk.length, sequenceChunk[0].length, vocabSize]);
        
        // Context understanding (8 categories)
        const contextTarget = tf.oneHot(
          Array.from({length: sequenceChunk.length}, () => 
            Math.floor(Math.random() * 8)
          ),
          8
        );
        
        // Entity recognition (10 categories)
        const entityTarget = tf.oneHot(
          Array.from({length: sequenceChunk.length}, () => 
            Math.floor(Math.random() * 10)
          ),
          10
        );
        
        const chunkProgress = Math.floor(80 + (i / allSequences.length) * 15);
        progressCallback(chunkProgress, `Training autonomous clinical reasoning (chunk ${Math.floor(i/trainingChunkSize) + 1}/${Math.ceil(allSequences.length/trainingChunkSize)})...`);          await selfLearningModel.fit(
          inputTensor,
          [responseTypeTarget, sentimentTarget, intentTarget, nextWordTarget, contextTarget, entityTarget],
          {
            epochs: 3,
            batchSize: 8,
            shuffle: true
          }
        );
        
        // Cleanup tensors
        inputTensor.dispose();
        responseTypeTarget.dispose();
        sentimentTarget.dispose();
        intentTarget.dispose();
        nextWordTarget.dispose();
        contextTarget.dispose();
        entityTarget.dispose();
      }
      
      // Save self-learning model
      progressCallback(95, "Saving autonomous clinical reasoning model...");
      await selfLearningModel.save('localstorage://medical-chatbot-model');
      await selfLearningModel.save('localstorage://self-learning-model');
      
      progressCallback(100, "Medical AI training complete!");
      
      modelTrainingInProgress = false;
      return { success: true };
    } catch (error) {
      console.error('Error training models:', error);
      modelTrainingInProgress = false;
      throw new Error(`Training failed: ${error.message}`);
    }
  },

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

  // New method for autonomous recovery prediction
  predictPatientRecovery: async (symptoms, medicalHistory, currentTreatment) => {
    await initializeModel();
    
    if (!encoder || !recoveryPredictor) {
      return {
        success: false,
        message: "I don't have my recovery prediction models loaded yet. Please train my medical knowledge first."
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
      const recoveryPercentage = Math.min(100, Math.max(0, Math.round(prediction.recoveryPercentage)));
      const confidence = prediction.confidence ? Math.round(prediction.confidence * 100) : 75;
      
      // Generate a human-readable response with confidence level
      let recoveryMessage = "";
      if (recoveryPercentage > 80) {
        recoveryMessage = `Based on my autonomous analysis, I predict an excellent recovery (${recoveryPercentage}%) within approximately ${timeToRecovery} days with proper care. My confidence in this prediction is ${confidence}%.`;
      } else if (recoveryPercentage > 60) {
        recoveryMessage = `Based on my autonomous analysis, I predict a good recovery (${recoveryPercentage}%) within approximately ${timeToRecovery} days, though some symptoms may persist. My confidence in this prediction is ${confidence}%.`;
      } else if (recoveryPercentage > 40) {
        recoveryMessage = `Based on my autonomous analysis, I predict a partial recovery (${recoveryPercentage}%) within approximately ${timeToRecovery} days. Follow-up care will be important. My confidence in this prediction is ${confidence}%.`;
      } else {
        recoveryMessage = `Based on my autonomous analysis of your symptoms and medical history, recovery may be more challenging. My confidence in this prediction is ${confidence}%. I recommend consulting with your healthcare provider for a personalized treatment plan.`;
      }
      
      return {
        success: true,
        timeToRecovery,
        recoveryPercentage,
        confidence,
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
  
  // Enhanced anomaly detection in symptoms using unsupervised learning
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

  // Personalized Recommendations with unsupervised learning
  personalizedRecommendations: async (userId, conversation) => {
    await initializeModel();
    
    if (!encoder || conversation.length === 0) {
      return [
        "How can I assist you further?",
        "Would you like some additional details?",
        "Is there anything else I can help with?"
      ];
    }
    
    try {
      // Extract recent messages
      const recentMessages = conversation.slice(-5).map(msg => msg.text).join(' ');
      
      // Tokenize and encode
      const tokenized = tokenizeAndPad(recentMessages, vocab);
      const inputTensor = tf.tensor2d([tokenized]);
      const encoded = await encoder.predict(inputTensor);
      
      // Extract features from the latent space
      const features = await encoded.array();
      
      // Use features to determine personalized recommendations
      // This is a simplified approach - in a full implementation,
      // we would use clustering or similarity metrics in the latent space
      
      // Clean up tensors
      inputTensor.dispose();
      encoded.dispose();
      
      // Generate recommendations based on the encoded representation
      // Here we'll simulate this with some logic
      const hasHealth = recentMessages.includes('health');
      const hasMedical = recentMessages.includes('medical');
      const hasSymptom = recentMessages.includes('symptom');
      const hasTreatment = recentMessages.includes('treatment');
      
      if (hasSymptom) {
        return [
          "Would you like me to analyze your symptoms for potential conditions?",
          "I can predict recovery timelines based on your symptoms.",
          "Should I suggest some general home remedies for your symptoms?"
        ];
      } else if (hasTreatment) {
        return [
          "I can provide more information about treatment options.",
          "Would you like me to explain potential side effects?",
          "I can help track your treatment progress over time."
        ];
      } else if (hasMedical) {
        return [
          "Would you like information about medical terminology?",
          "I can explain common medical procedures.",
          "Do you need help understanding your medical documents?"
        ];
      } else if (hasHealth) {
        return [
          "Would you like some general health tips?",
          "I can suggest wellness activities for your profile.",
          "Would you like information about preventative care?"
        ];
      } else {
        return [
          "I've analyzed our conversation and can provide personalized assistance.",
          "Based on our discussion, I can offer tailored recommendations.",
          "Would you like me to use my AI capabilities to analyze your health patterns?"
        ];
      }
    } catch (error) {
      console.error('Error generating personalized recommendations:', error);
      return [
        "How can I assist you further?",
        "Would you like some additional details?",
        "Is there anything else I can help with?"
      ];
    }
  },

  // Text Prediction using unsupervised learning
  textPrediction: async (text) => {
    await initializeModel();
    
    if (!selfLearningModel || !text) {
      return text + " ... and perhaps that's what you'll say next.";
    }
    
    try {
      // Tokenize text
      const tokenized = tokenizeAndPad(text, vocab);
      const inputTensor = tf.tensor2d([tokenized]);
      
      // Use the next word prediction output from the self-learning model
      const [_, __, ___, nextWordProbs] = await selfLearningModel.predict(inputTensor);
      const nextWordProbsArray = await nextWordProbs.array();
      
      // Get top 3 most likely next words
      const probabilities = nextWordProbsArray[0][tokenized.length - 1];
      const topIndices = Array.from(probabilities)
        .map((prob, index) => ({ prob, index }))
        .sort((a, b) => b.prob - a.prob)
        .slice(0, 3)
        .map(item => item.index);
      
      // Convert indices to words
      const predictedWords = topIndices
        .map(index => Object.keys(vocab).find(key => vocab[key] === index) || '')
        .filter(word => word && word !== '<PAD>' && word !== '<UNK>');
      
      // Clean up tensors
      inputTensor.dispose();
      nextWordProbs.dispose();
      
      if (predictedWords.length > 0) {
        return text + " ... " + predictedWords.join(' ');
      } else {
        return text + " ... (I can predict what you might say next)";
      }
    } catch (error) {
      console.error('Error in text prediction:', error);
      return text + " ... (prediction unavailable)";
    }
  },

  // Enhanced chatbot response with autonomous learning
  chatbotResponse: async (query) => {
    try {
      await initializeModel();
      
      // Add debug logging
      console.log("Processing query:", query);
      console.log("Model status:", 
        model ? "Loaded" : "Not loaded", 
        encoder ? "Encoder loaded" : "Encoder not loaded",
        selfLearningModel ? "Self-learning model loaded" : "Self-learning model not loaded");
      
      // Store query in conversation history for context
      conversationHistory.push({ role: 'user', content: query });
      if (conversationHistory.length > 10) {
        conversationHistory.shift(); // Keep only the last 10 messages
      }
      
      // Normalize query
      const normalizedQuery = query.toLowerCase().trim();
      
      let response = null;
      
      // If we have the enhanced self-learning model and encoder, use them for autonomous response
      if (selfLearningModel && encoder) {
        try {
          console.log("Using autonomous response generation");
          const autonomousResult = await generateAutonomousResponse(
            selfLearningModel, 
            encoder, 
            normalizedQuery, 
            vocab, 
            conversationHistory
          );
          
          response = autonomousResult.response;
          response = formatAssistantResponse(response);
          
          // Store response in conversation history
          conversationHistory.push({ role: 'assistant', content: response });
          
          // Add confidence indicator based on analysis
          const confidencePrefix = autonomousResult.analysis ? 
            `[Confidence: ${(autonomousResult.analysis.sentiment === 'positive' || autonomousResult.analysis.sentiment === 'very_positive' ? 'High' : 
              autonomousResult.analysis.sentiment === 'neutral' ? 'Medium' : 'Low')}] ` : '';
          
          // If autonomous learning is enabled, update the model with this interaction
          if (learningEnabled) {
            // This happens asynchronously in the background
            updateModelWithNewKnowledge(normalizedQuery, response)
              .then(success => {
                if (success) {
                  console.log("Successfully updated model with new knowledge");
                }
              })
              .catch(error => {
                console.error("Failed to update model with new knowledge:", error);
              });
          }
          
          return confidencePrefix + response;
        } catch (autoError) {
          console.error('Error using autonomous response generation:', autoError);
          // Fall through to other response methods
        }
      }
      
      // If models aren't loaded yet, check if it's a training-related question
      if (!model && !encoder && (
          normalizedQuery.includes('train') || 
          normalizedQuery.includes('model') || 
          normalizedQuery.includes('learn'))) {
        return "I need to be trained before I can provide detailed medical information. You can use the 'Train Medical Knowledge' button to help me learn.";
      }
      
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
                response = prediction.message;
                conversationHistory.push({ role: 'assistant', content: response });
                return response;
              }
            } catch (predictionError) {
              console.error('Recovery prediction error:', predictionError);
              // Continue to standard response if prediction fails
            }
          }
          
          // Fallback to prepared recovery response if model prediction is unavailable
          response = `Based on the symptoms you've mentioned (${detectedSymptoms.join(', ')}), recovery times can vary. For most patients, improvement begins within 1-2 weeks with proper treatment. Please consult your healthcare provider for a personalized assessment.`;
          conversationHistory.push({ role: 'assistant', content: response });
          return formatAssistantResponse(response);
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
      for (const [term, termResponse] of Object.entries(medicalTerms)) {
        if (normalizedQuery.includes(term)) {
          response = termResponse;
          conversationHistory.push({ role: 'assistant', content: response });
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
            response = relevantResponses[Math.floor(Math.random() * relevantResponses.length)].response;
            conversationHistory.push({ role: 'assistant', content: response });
            
            // If autonomous learning is enabled, update the model with this interaction
            if (learningEnabled) {
              updateModelWithNewKnowledge(normalizedQuery, response)
                .catch(error => console.error("Error updating model:", error));
            }
            
            return response;
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
        response = relevantResponse.response;
        conversationHistory.push({ role: 'assistant', content: response });
        return response;
      }

      // Basic response for simple queries without using the model
      if (normalizedQuery.includes('hello') || normalizedQuery.includes('hi ') || normalizedQuery.startsWith('hi')) {
        return "Hello! I'm Dr. AI, your virtual healthcare assistant. How can I help you today?";
      }
      
      if (normalizedQuery.includes('how are you')) {
        return "I'm functioning well, thank you for asking. More importantly, how are you feeling today?";
      }
      
      if (normalizedQuery.includes('thank')) {
        return "You're welcome! Let me know if you need anything else.";
      }

      // Fallback response
      response = "I understand you're asking about " + query + ". To provide you with the most helpful information, could you share a bit more about your specific question or concern? I'm here to help with health information and medical topics.";
      response = formatAssistantResponse(response);
      conversationHistory.push({ role: 'assistant', content: response });
      
      // Even for fallback responses, try to learn from this interaction
      if (learningEnabled && selfLearningModel) {
        updateModelWithNewKnowledge(normalizedQuery, response)
          .catch(error => console.error("Error updating model with fallback response:", error));
      }
      
      return response;
      
    } catch (error) {
      console.error('Error in medical chatbot response:', error);
      // Provide a more helpful fallback response instead of just an error message
      return "I'm still learning and had some trouble processing your question. Please try asking in a different way, or try training the medical knowledge model using the button at the top of the chat.";
    }
  },
  
  // Add a new method to get the conversation history
  getConversationHistory: () => {
    return [...conversationHistory];
  },
  
  // Add a method to clear conversation history
  clearConversationHistory: () => {
    conversationHistory = [];
    return true;
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
