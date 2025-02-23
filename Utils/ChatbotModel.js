import * as tf from '@tensorflow/tfjs';

export const buildChatbotModel = (vocabSize, numCategories, embeddingDim = 128, rnnUnits = 256) => {
  const model = tf.sequential();
  
  // Input embedding layer
  model.add(tf.layers.embedding({
    inputDim: vocabSize,
    outputDim: embeddingDim,
    maskZero: true
  }));
  
  // Bidirectional LSTM for better context understanding
  model.add(tf.layers.bidirectional({
    layer: tf.layers.lstm({
      units: rnnUnits,
      returnSequences: true,
      recurrentDropout: 0.2
    })
  }));
  
  // Another LSTM layer
  model.add(tf.layers.lstm({
    units: rnnUnits,
    returnSequences: false,
    recurrentDropout: 0.2
  }));
  
  // Dense layers with dropout for regularization
  model.add(tf.layers.dense({
    units: rnnUnits,
    activation: 'relu'
  }));
  
  model.add(tf.layers.dropout(0.5));
  
  // Output layer for category classification
  model.add(tf.layers.dense({
    units: numCategories,
    activation: 'softmax'
  }));
  
  // Compile with categorical crossentropy for multi-class classification
  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'categoricalCrossentropy',
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
