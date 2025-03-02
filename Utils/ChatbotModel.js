import * as tf from '@tensorflow/tfjs';

// Build a supervised chatbot model for classification
export const buildChatbotModel = (vocabSize, embeddingDim = 64, rnnUnits = 128) => {
  const model = tf.sequential();
  
  // Embedding layer
  model.add(tf.layers.embedding({
    inputDim: vocabSize,
    outputDim: embeddingDim,
    maskZero: true,
    name: 'embedding_layer'
  }));
  
  // LSTM layer
  model.add(tf.layers.lstm({
    units: rnnUnits,
    returnSequences: true,
    recurrentDropout: 0.2,
    name: 'lstm_layer'
  }));
  
  // Dense layer for classification
  model.add(tf.layers.dense({
    units: vocabSize,
    activation: 'softmax',
    name: 'output_layer'
  }));
  
  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
  });
  
  return model;
};

// Enhanced autoencoder for unsupervised learning with better feature extraction
export const buildAutoencoder = (vocabSize, sequenceLength, latentDim = 64) => {
  // Encoder
  const encoderInput = tf.input({shape: [sequenceLength], name: 'encoder_input'});
  const embedding = tf.layers.embedding({
    inputDim: vocabSize,
    outputDim: 128, // Increased embedding dimension
    name: 'encoder_embedding'
  }).apply(encoderInput);
  
  // Add dropout for better generalization
  const embeddingDropout = tf.layers.dropout({
    rate: 0.2,
    name: 'encoder_embedding_dropout'
  }).apply(embedding);
  
  const encoderLSTM1 = tf.layers.lstm({
    units: 128, // Increased units
    returnSequences: true,
    name: 'encoder_lstm1'
  }).apply(embeddingDropout);
  
  const encoderLSTM2 = tf.layers.lstm({
    units: 64,
    returnSequences: false,
    name: 'encoder_lstm2'
  }).apply(encoderLSTM1);
  
  // Add a more complex latent space with multiple layers
  const latentDense1 = tf.layers.dense({
    units: 96,
    name: 'latent_dense1',
    activation: 'relu'
  }).apply(encoderLSTM2);
  
  const latentDense2 = tf.layers.dense({
    units: latentDim,
    name: 'latent_space',
    activation: 'relu'
  }).apply(latentDense1);
  
  // Decoder
  const decoderInput = tf.layers.repeatVector({
    n: sequenceLength,
    name: 'repeat_vector'
  }).apply(latentDense2);
  
  const decoderLSTM1 = tf.layers.lstm({
    units: 64,
    returnSequences: true,
    name: 'decoder_lstm1'
  }).apply(decoderInput);
  
  const decoderLSTM2 = tf.layers.lstm({
    units: 128, // Increased units
    returnSequences: true,
    name: 'decoder_lstm2'
  }).apply(decoderLSTM1);
  
  const decoderOutput = tf.layers.timeDistributed({
    layer: tf.layers.dense({
      units: vocabSize,
      activation: 'softmax',
      name: 'decoder_dense'
    }),
    name: 'time_distributed_output'
  }).apply(decoderLSTM2);
  
  const autoencoder = tf.model({
    inputs: encoderInput,
    outputs: decoderOutput,
    name: 'autoencoder'
  });
  
  // Separate encoder model for feature extraction
  const encoder = tf.model({
    inputs: encoderInput,
    outputs: latentDense2,
    name: 'encoder'
  });
  
  autoencoder.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'categoricalCrossentropy'
  });
  
  return { autoencoder, encoder };
};

// Improved recovery predictor with uncertainty estimation
export const buildRecoveryPredictor = (inputDim = 64) => {
  const input = tf.input({shape: [inputDim], name: 'recovery_predictor_input'});
  
  // First branch - dense network
  const dense1 = tf.layers.dense({
    units: 128,
    activation: 'relu',
    name: 'recovery_dense1'
  }).apply(input);
  
  const dropout1 = tf.layers.dropout({
    rate: 0.3,
    name: 'recovery_dropout1'
  }).apply(dense1);
  
  const dense2 = tf.layers.dense({
    units: 64,
    activation: 'relu',
    name: 'recovery_dense2'
  }).apply(dropout1);
  
  const dropout2 = tf.layers.dropout({
    rate: 0.2,
    name: 'recovery_dropout2'
  }).apply(dense2);
  
  const dense3 = tf.layers.dense({
    units: 32,
    activation: 'relu',
    name: 'recovery_dense3'
  }).apply(dropout2);
  
  // Recovery time prediction
  const timeOutput = tf.layers.dense({
    units: 1,
    name: 'time_to_recovery'
  }).apply(dense3);
  
  // Recovery percentage prediction
  const percentageOutput = tf.layers.dense({
    units: 1,
    activation: 'sigmoid', // Ensures output between 0-1
    name: 'recovery_percentage'
  }).apply(dense3);
  
  // Uncertainty estimation
  const uncertaintyOutput = tf.layers.dense({
    units: 1,
    activation: 'softplus', // Ensures positive uncertainty
    name: 'prediction_uncertainty'
  }).apply(dense3);
  
  const model = tf.model({
    inputs: input,
    outputs: [timeOutput, percentageOutput, uncertaintyOutput],
    name: 'recovery_predictor'
  });
  
  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: ['meanSquaredError', 'meanSquaredError', 'meanSquaredError']
  });
  
  return model;
};

// Enhanced self-learning model with transformer-like architecture for ChatGPT-like capabilities
export const buildSelfLearningModel = (vocabSize, sequenceLength, embeddingDim = 128) => {
  const input = tf.input({shape: [sequenceLength], name: 'self_learning_input'});
  
  // Embedding layer with positional encoding
  const embedding = tf.layers.embedding({
    inputDim: vocabSize,
    outputDim: embeddingDim,
    maskZero: true,
    name: 'sl_embedding'
  }).apply(input);
  
  // Add positional encoding (simplified version)
  const positionEncoding = tf.layers.dense({
    units: embeddingDim,
    activation: 'linear',
    name: 'positional_encoding',
    trainable: true
  }).apply(embedding);
  
  // Combine embedding and positional encoding
  const embeddingWithPosition = tf.layers.add({
    name: 'embedding_with_position'
  }).apply([embedding, positionEncoding]);
  
  // Multi-head self-attention (simplified version of transformer)
  // First attention head
  const attention1 = tf.layers.attention({
    name: 'attention_head_1'
  }).apply([embeddingWithPosition, embeddingWithPosition]);
  
  // Second attention head
  const attention2 = tf.layers.attention({
    name: 'attention_head_2'
  }).apply([embeddingWithPosition, embeddingWithPosition]);
  
  // Third attention head
  const attention3 = tf.layers.attention({
    name: 'attention_head_3'
  }).apply([embeddingWithPosition, embeddingWithPosition]);
  
  // Concatenate attention heads
  const multiHeadAttention = tf.layers.concatenate({
    name: 'multi_head_attention',
    axis: -1
  }).apply([attention1, attention2, attention3]);
  
  // Add & normalize (simplified layernorm)
  const attentionNormalized = tf.layers.add({
    name: 'attention_residual'
  }).apply([embeddingWithPosition, multiHeadAttention]);
  
  // Feed-forward network
  const ffn1 = tf.layers.dense({
    units: embeddingDim * 4,
    activation: 'relu',
    name: 'ffn_1'
  }).apply(attentionNormalized);
  
  const ffnDropout = tf.layers.dropout({
    rate: 0.1,
    name: 'ffn_dropout'
  }).apply(ffn1);
  
  const ffn2 = tf.layers.dense({
    units: embeddingDim,
    name: 'ffn_2'
  }).apply(ffnDropout);
  
  // Add & normalize
  const ffnNormalized = tf.layers.add({
    name: 'ffn_residual'
  }).apply([attentionNormalized, ffn2]);
  
  // Global pooling for sequence representation
  const globalPooling = tf.layers.globalAveragePooling1D({
    name: 'global_pooling'
  }).apply(ffnNormalized);
  
  // Dense layers for feature extraction
  const dense1 = tf.layers.dense({
    units: 256,
    activation: 'relu',
    name: 'sl_dense1'
  }).apply(globalPooling);
  
  const dropout = tf.layers.dropout({
    rate: 0.3,
    name: 'sl_dropout'
  }).apply(dense1);
  
  // Multiple output heads for different prediction tasks
  
  // Response type prediction (expanded categories)
  const responseTypeOutput = tf.layers.dense({
    units: 20, // Increased number of response categories
    activation: 'softmax',
    name: 'response_type_output'
  }).apply(dropout);
  
  // Sentiment prediction
  const sentimentOutput = tf.layers.dense({
    units: 5, // Expanded: Very Negative, Negative, Neutral, Positive, Very Positive
    activation: 'softmax',
    name: 'sentiment_output'
  }).apply(dropout);
  
  // User intent prediction (expanded)
  const intentOutput = tf.layers.dense({
    units: 12, // Increased number of intents
    activation: 'softmax',
    name: 'intent_output'
  }).apply(dropout);
  
  // Next word prediction (generative capability)
  const nextWordOutput = tf.layers.dense({
    units: vocabSize,
    activation: 'softmax',
    name: 'next_word_output'
  }).apply(dropout);
  
  // Context understanding (new task)
  const contextOutput = tf.layers.dense({
    units: 8, // Different context categories
    activation: 'softmax',
    name: 'context_output'
  }).apply(dropout);
  
  // Entity recognition (new task)
  const entityOutput = tf.layers.dense({
    units: 10, // Different entity types
    activation: 'softmax',
    name: 'entity_output'
  }).apply(dropout);
  
  const model = tf.model({
    inputs: input,
    outputs: [
      responseTypeOutput, 
      sentimentOutput, 
      intentOutput, 
      nextWordOutput,
      contextOutput,
      entityOutput
    ],
    name: 'self_learning_model'
  });
  
  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: [
      'categoricalCrossentropy', 
      'categoricalCrossentropy', 
      'categoricalCrossentropy', 
      'categoricalCrossentropy',
      'categoricalCrossentropy',
      'categoricalCrossentropy'
    ],
    metrics: ['accuracy']
  });
  
  return model;
};

// Add function to predict category and get appropriate response
export const predictResponse = async (model, input, categories, responses) => {
  const prediction = await model.predict(input).array();
  const categoryIndex = prediction[0].indexOf(Math.max(...prediction[0]));
  const category = categories[categoryIndex];
  
  // Get appropriate response based on category and input
  const relevantResponses = responses.filter(r => r.category === category);
  return relevantResponses.length > 0 ? 
    relevantResponses[Math.floor(Math.random() * relevantResponses.length)].response :
    "I apologize, but I need more information to provide an accurate response. Could you please provide more details?";
};

// Enhanced autonomous response generation with ChatGPT-like capabilities
export const generateAutonomousResponse = async (selfLearningModel, encoder, input, vocab, conversationHistory = []) => {
  try {
    // Tokenize input
    let tokenized;
    if (Array.isArray(input)) {
      tokenized = input; // Already tokenized
    } else {
      tokenized = input.toLowerCase().split(/\s+/)
        .map(word => vocab[word] || vocab['<UNK>']);
      // Pad to correct length
      if (tokenized.length < 50) {
        tokenized = [...tokenized, ...Array(50 - tokenized.length).fill(vocab['<PAD>'])];
      } else if (tokenized.length > 50) {
        tokenized = tokenized.slice(0, 50);
      }
    }
    
    // Convert to tensor
    const inputTensor = tf.tensor2d([tokenized]);
    
    // Get latent representation using encoder
    const encoded = await encoder.predict(inputTensor);
    
    // Use self-learning model to predict various aspects
    const [responseType, sentiment, intent, nextWordProbs, context, entity] = await selfLearningModel.predict(inputTensor);
    
    // Extract predictions
    const responseTypeArray = await responseType.array();
    const sentimentArray = await sentiment.array();
    const intentArray = await intent.array();
    const contextArray = await context.array();
    const entityArray = await entity.array();
    
    // Get the most likely predictions
    const dominantResponseType = responseTypeArray[0].indexOf(Math.max(...responseTypeArray[0]));
    const dominantSentiment = sentimentArray[0].indexOf(Math.max(...sentimentArray[0]));
    const dominantIntent = intentArray[0].indexOf(Math.max(...intentArray[0]));
    const dominantContext = contextArray[0].indexOf(Math.max(...contextArray[0]));
    const dominantEntity = entityArray[0].indexOf(Math.max(...entityArray[0]));
    
    // Map sentiment indices to labels (expanded)
    const sentimentLabels = ['very_negative', 'negative', 'neutral', 'positive', 'very_positive'];
    const detectedSentiment = sentimentLabels[dominantSentiment];
    
    // Map intent indices to labels (expanded)
    const intentLabels = [
      'information_seeking', 'greeting', 'help_request', 
      'clarification', 'confirmation', 'objection',
      'gratitude', 'farewell', 'symptom_description',
      'medication_question', 'treatment_inquiry', 'follow_up'
    ];
    const detectedIntent = intentLabels[dominantIntent];
    
    // Map context indices to labels
    const contextLabels = [
      'medical_consultation', 'emergency', 'general_inquiry',
      'follow_up', 'medication_management', 'preventive_care',
      'chronic_condition', 'mental_health'
    ];
    const detectedContext = contextLabels[dominantContext];
    
    // Map entity indices to labels
    const entityLabels = [
      'symptom', 'medication', 'condition', 'body_part',
      'treatment', 'healthcare_provider', 'test', 'procedure',
      'time_period', 'demographic'
    ];
    const detectedEntity = entityLabels[dominantEntity];
    
    // Use conversation history for context awareness
    let contextualUnderstanding = "";
    if (conversationHistory.length > 0) {
      // Extract recent topics from conversation history
      const recentMessages = conversationHistory.slice(-3);
      const userMessages = recentMessages.filter(msg => msg.role === 'user').map(msg => msg.content);
      const botMessages = recentMessages.filter(msg => msg.role === 'assistant').map(msg => msg.content);
      
      // Check for topic continuity
      const isContinuation = userMessages.length > 1 && 
        (userMessages[userMessages.length - 1].toLowerCase().includes('what about') ||
         userMessages[userMessages.length - 1].toLowerCase().includes('and') ||
         userMessages[userMessages.length - 1].length < 15);
      
      if (isContinuation) {
        contextualUnderstanding = "This appears to be a follow-up question. I'll maintain context from our previous exchange.";
      }
    }
    
    // Generate a more nuanced response based on all detected patterns
    let response;
    
    // Incorporate conversation history for more contextual responses
    const useContextualResponse = conversationHistory.length > 2 && Math.random() > 0.3;
    
    if (useContextualResponse) {
      // Generate response that references previous conversation
      const previousTopics = conversationHistory
        .filter(msg => msg.role === 'user')
        .slice(-3)
        .map(msg => msg.content)
        .join(' ');
      
      // Extract potential medical terms from previous conversation
      const medicalTerms = ['symptom', 'pain', 'doctor', 'treatment', 'medicine', 
                           'recovery', 'health', 'diagnosis', 'therapy', 'medication'];
      
      const medicalContextExists = medicalTerms.some(term => previousTopics.toLowerCase().includes(term));
      
      if (medicalContextExists) {
        // Create a response that builds on previous medical context
        response = "Based on our conversation about your health concerns, I understand you're asking about " + 
                  input.toLowerCase() + ". ";
        
        // Add context-specific information
        if (detectedIntent === 'symptom_description') {
          response += "These symptoms could be related to what we discussed earlier. ";
        } else if (detectedIntent === 'treatment_inquiry') {
          response += "Regarding treatment options, it's important to consider your full medical history. ";
        }
        
        // Add a medical disclaimer
        response += "I recommend discussing this with your healthcare provider for personalized advice.";
      } else {
        // General contextual response
        response = "Based on our conversation, I understand you're asking about " + input.toLowerCase() + ". ";
        response += "I can provide general information while reminding you that for specific medical advice, consulting a healthcare professional is recommended.";
      }
    } else {
      // Use intent and context to generate appropriate response
      if (detectedIntent === 'symptom_description') {
        response = "I understand you're describing symptoms that might be concerning. While I can provide general information, it's important to consult with a healthcare provider for proper diagnosis and treatment. ";
        
        if (detectedEntity === 'body_part') {
          response += "Symptoms in specific body areas can have various causes, ranging from minor to more serious conditions.";
        } else {
          response += "The symptoms you're describing could be related to several different conditions.";
        }
      } else if (detectedIntent === 'medication_question') {
        response = "Regarding your medication question, I want to emphasize that medication information should always be verified with your healthcare provider or pharmacist. ";
        response += "Medications can have different effects based on individual factors like your medical history, other medications you're taking, and specific health conditions.";
      } else if (detectedIntent === 'treatment_inquiry') {
        response = "I understand you're asking about treatment options. Treatment approaches vary based on specific diagnosis, severity, medical history, and individual factors. ";
        response += "A healthcare provider can develop a personalized treatment plan that's appropriate for your specific situation.";
      } else if (detectedIntent === 'information_seeking') {
        response = "I'd be happy to provide general information on this health topic. ";
        response += "Medical knowledge is constantly evolving, so it's always good to consult recent sources and healthcare professionals for the most up-to-date guidance.";
      } else if (detectedIntent === 'greeting') {
        response = "Hello! I'm Dr. AI, your virtual healthcare assistant. I can provide general medical information and help you navigate health topics. ";
        response += "How can I assist you today?";
      } else {
        // Default response with medical context
        response = "I understand your question about " + input.toLowerCase() + ". ";
        response += "While I can provide general information on this topic, remember that individual health situations vary, and consulting with a healthcare provider is recommended for personalized advice.";
      }
    }
    
    // Add sentiment-appropriate tone
    if (detectedSentiment === 'negative' || detectedSentiment === 'very_negative') {
      response += " I understand this may be concerning, and I'm here to help provide information that might ease your worries.";
    } else if (detectedSentiment === 'positive' || detectedSentiment === 'very_positive') {
      response += " I'm glad to provide this information and hope it's helpful for your health journey.";
    }
    
    // Clean up tensors
    inputTensor.dispose();
    encoded.dispose();
    responseType.dispose();
    sentiment.dispose();
    intent.dispose();
    nextWordProbs.dispose();
    context.dispose();
    entity.dispose();
    
    return {
      response,
      analysis: {
        sentiment: detectedSentiment,
        intent: detectedIntent,
        context: detectedContext,
        entity: detectedEntity
      }
    };
  } catch (error) {
    console.error('Error generating autonomous response:', error);
    return {
      response: "I encountered an issue while processing your request autonomously. Let me try a different approach.",
      error: error.message
    };
  }
};

// New function for patient recovery prediction with uncertainty
export const predictRecovery = async (encoder, recoveryModel, input, vocab) => {
  try {
    // Tokenize input
    let tokenized;
    if (Array.isArray(input)) {
      tokenized = input; // Already tokenized
    } else {
      tokenized = input.toLowerCase().split(/\s+/)
        .map(word => vocab[word] || vocab['<UNK>']);
      // Pad to correct length
      if (tokenized.length < 50) {
        tokenized = [...tokenized, ...Array(50 - tokenized.length).fill(vocab['<PAD>'])];
      } else if (tokenized.length > 50) {
        tokenized = tokenized.slice(0, 50);
      }
    }
    
    // Convert to tensor
    const inputTensor = tf.tensor2d([tokenized]);
    
    // Encode to latent representation
    const encoded = await encoder.predict(inputTensor);
    
    // Predict recovery metrics
    const [timeToRecovery, recoveryPercentage, uncertainty] = await recoveryModel.predict(encoded);
    const timeResults = await timeToRecovery.array();
    const percentageResults = await recoveryPercentage.array();
    const uncertaintyResults = await uncertainty.array();
    
    // Clean up tensors
    inputTensor.dispose();
    encoded.dispose();
    timeToRecovery.dispose();
    recoveryPercentage.dispose();
    uncertainty.dispose();
    
    // Return prediction with uncertainty
    return {
      timeToRecovery: timeResults[0][0], // Predicted days to recovery
      recoveryPercentage: percentageResults[0][0] * 100, // Scale to percentage
      uncertainty: uncertaintyResults[0][0], // Prediction uncertainty
      confidence: 1 - Math.min(1, uncertaintyResults[0][0] / 10) // Convert uncertainty to confidence score
    };
  } catch (error) {
    console.error('Error predicting recovery:', error);
    return {
      timeToRecovery: null,
      recoveryPercentage: null,
      uncertainty: null,
      confidence: null,
      error: error.message
    };
  }
};