import * as tf from '@tensorflow/tfjs';

export const buildChatbotModel = (vocabSize, embeddingDim = 32, rnnUnits = 64) => {
  const model = tf.sequential();
  
  // Even smaller embedding dimension
  model.add(tf.layers.embedding({
    inputDim: vocabSize,
    outputDim: embeddingDim,
    maskZero: true
  }));
  
  // Single LSTM layer with minimal units
  model.add(tf.layers.lstm({
    units: rnnUnits,
    returnSequences: true,
    recurrentDropout: 0.2
  }));
  
  // Dense layer for classification
  model.add(tf.layers.dense({
    units: vocabSize,
    activation: 'softmax'
  }));
  
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
