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

// New function to build an autoencoder for unsupervised learning
export const buildAutoencoder = (vocabSize, sequenceLength, latentDim = 32) => {
  // Encoder
  const encoderInput = tf.input({shape: [sequenceLength], name: 'encoder_input'});
  const embedding = tf.layers.embedding({
    inputDim: vocabSize,
    outputDim: 64,
    name: 'encoder_embedding'
  }).apply(encoderInput);
  
  const encoderLSTM1 = tf.layers.lstm({
    units: 64,
    returnSequences: true,
    name: 'encoder_lstm1'
  }).apply(embedding);
  
  const encoderLSTM2 = tf.layers.lstm({
    units: 32,
    returnSequences: false,
    name: 'encoder_lstm2'
  }).apply(encoderLSTM1);
  
  const latentSpace = tf.layers.dense({
    units: latentDim,
    name: 'latent_space',
    activation: 'relu'
  }).apply(encoderLSTM2);
  
  // Decoder
  const decoderInput = tf.layers.repeatVector({
    n: sequenceLength,
    name: 'repeat_vector'
  }).apply(latentSpace);
  
  const decoderLSTM1 = tf.layers.lstm({
    units: 32,
    returnSequences: true,
    name: 'decoder_lstm1'
  }).apply(decoderInput);
  
  const decoderLSTM2 = tf.layers.lstm({
    units: 64,
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
    outputs: latentSpace,
    name: 'encoder'
  });
  
  autoencoder.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'categoricalCrossentropy'
  });
  
  return { autoencoder, encoder };
};

// New model for recovery prediction
export const buildRecoveryPredictor = (inputDim = 32) => {
  const model = tf.sequential({name: 'recovery_predictor'});
  
  model.add(tf.layers.dense({
    inputShape: [inputDim],
    units: 64,
    activation: 'relu',
    name: 'recovery_dense1'
  }));
  
  model.add(tf.layers.dropout({
    rate: 0.3,
    name: 'recovery_dropout1'
  }));
  
  model.add(tf.layers.dense({
    units: 32,
    activation: 'relu',
    name: 'recovery_dense2'
  }));
  
  model.add(tf.layers.dropout({
    rate: 0.2,
    name: 'recovery_dropout2'
  }));
  
  model.add(tf.layers.dense({
    units: 16,
    activation: 'relu',
    name: 'recovery_dense3'
  }));
  
  model.add(tf.layers.dense({
    units: 2, // [time_to_recovery, recovery_percentage]
    name: 'recovery_output'
  }));
  
  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'meanSquaredError'
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

// New function for patient recovery prediction
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
    const recoveryPrediction = await recoveryModel.predict(encoded);
    const results = await recoveryPrediction.array();
    
    // Clean up tensors
    inputTensor.dispose();
    encoded.dispose();
    recoveryPrediction.dispose();
    
    // Return prediction
    return {
      timeToRecovery: results[0][0], // Predicted days to recovery
      recoveryPercentage: results[0][1] // Predicted recovery percentage
    };
  } catch (error) {
    console.error('Error predicting recovery:', error);
    return {
      timeToRecovery: null,
      recoveryPercentage: null,
      error: error.message
    };
  }
};