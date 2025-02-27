# Chatbot Training Enhancement Plan

This document provides clear, unambiguous instructions to enhance and “train the chatbot so that it can give some good and nice answers.” The goal is to improve the model’s performance by revisiting data preprocessing, model architecture, training hyperparameters, and the integration of the trained model into the AI service. The following are the concrete steps and code/pseudocode modifications needed.

---

### 1. Data Preparation Adjustments

• In Utils/dataPrep.js:  
 – Verify that both JSON and XML conversations are combined.  
 – Adjust sequence-related constants if needed (e.g. increase `MAX_SEQUENCE_LENGTH` for richer input).  
 – (Optional) Improve tokenization (e.g., remove punctuation, use more robust splitting).

*Pseudocode snippet:*
```javascript
// In Utils/dataPrep.js
const MAX_SEQUENCE_LENGTH = 30; // Consider increasing if input sentences are long
// Optionally, add more cleaning steps to text (e.g., remove punctuation)
```

---

### 2. Model Architecture Options

There are two primary approaches:

A. **Classification-Based Answer Selection (Current Design)**  
 – The model learns to map an input sequence to one of N categories.  
 – In Utils/ChatbotModel.js, ensure the output layer uses the correct number of categories.

*Modification needed in train script:*  
Provide the `numCategories` when building the model.
```javascript
// In scripts/train-chatbot.js, when calling buildChatbotModel:
const numCategories = medicalDataset.vocab && medicalDataset.responses 
  ? medicalDataset.vocab.categories.length // or count unique categories from training data
  : 10; // default if not available
// Change the function call to:
const model = buildChatbotModel(vocabSize, numCategories);
```

B. **Sequence-to-Sequence (Seq2Seq) for Text Generation**  
 – Replace the current sequential classification model with an encoder-decoder architecture  
 – This approach generates full text answers rather than selecting among predefined responses.

*Pseudocode snippet (optional alternative):*
```javascript
// In Utils/ChatbotModel.js, add a new factory function for Seq2Seq:
export const buildSeq2SeqModel = (vocabSize, embeddingDim = 128, rnnUnits = 256, sequenceLength = 30) => {
  // Encoder
  const encoderInputs = tf.input({shape: [sequenceLength]});
  const encoderEmbedding = tf.layers.embedding({
    inputDim: vocabSize,
    outputDim: embeddingDim,
    maskZero: true
  }).apply(encoderInputs);
  const [encoderOutput, stateH, stateC] = tf.layers.lstm({
    units: rnnUnits,
    returnState: true
  }).apply(encoderEmbedding);
  
  // Decoder
  const decoderInputs = tf.input({shape: [sequenceLength]});
  const decoderEmbedding = tf.layers.embedding({
    inputDim: vocabSize,
    outputDim: embeddingDim,
    maskZero: true
  }).apply(decoderInputs);
  const decoderLSTM = tf.layers.lstm({
    units: rnnUnits,
    returnSequences: true
  });
  const decoderOutputs = decoderLSTM.apply(decoderEmbedding, {initialState: [stateH, stateC]});
  const outputs = tf.layers.dense({units: vocabSize, activation: 'softmax'}).apply(decoderOutputs);
  
  const model = tf.model({inputs: [encoderInputs, decoderInputs], outputs});
  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'sparseCategoricalCrossentropy',
    metrics: ['accuracy']
  });
  return model;
};
```
• Note: If you choose Seq2Seq, you must update the training script and the inference method in AIService accordingly.

---

### 3. Training Script Modifications

In scripts/train-chatbot.js, update the training procedure to improve performance:

• Increase the number of epochs and add training callbacks (e.g., early stopping).  
• Ensure that the input and target tensors are correctly built from the dataset.

*Code snippet:*
```javascript
// In scripts/train-chatbot.js
import * as tf from '@tensorflow/tfjs';
import { loadDataset } from '../Utils/dataPrep.js';
import { buildChatbotModel } from '../Utils/ChatbotModel.js';

const trainModel = async () => {
  console.log('Loading medical dataset (JSON + XML)...');
  const { inputSequences, targetSequences, vocabSize, vocab } = await loadDataset();
  
  // Determine number of categories (for classification-based approach)
  const uniqueCategories = new Set();
  for (const conv of vocab.responses || []) {
    // Optionally, derive categories from responses if available
    uniqueCategories.add(conv.category);
  }
  const numCategories = uniqueCategories.size || 10;
  
  console.log(`Building enhanced medical chatbot model with vocabSize=${vocabSize} and ${numCategories} categories...`);
  const model = buildChatbotModel(vocabSize, numCategories);
  
  // Convert training data to tensors
  const inputTensor = tf.tensor2d(inputSequences);
  const targetTensor = tf.tensor3d(targetSequences);
  
  console.log('Starting training with enhanced parameters...');
  await model.fit(inputTensor, targetTensor, {
    epochs: 100,
    batchSize: 32,
    validationSplit: 0.2,
    callbacks: [
      tf.callbacks.earlyStopping({ monitor: 'val_loss', patience: 5 })
      // Optionally, add model checkpoint saving
    ]
  });
  
  console.log('Saving trained medical chatbot model...');
  await model.save('localstorage://medical-chatbot-model');
  console.log('Training complete!');
  
  inputTensor.dispose();
  targetTensor.dispose();
};

trainModel().catch(console.error);
```

---

### 4. Integration into AIService

In Utils/AIService.js, update the `chatbotResponse` method to use the trained model:

• If using a classification-based model:
 – Convert the query to a token sequence.  
 – Run model prediction to get category probabilities.  
 – Select a response from the dataset filtered by predicted category.

*Code pseudocode:*
```javascript
export const predictResponse = async (model, input, categories, responses) => {
  const prediction = await model.predict(input).array();
  // Assume prediction[0] contains probabilities:
  const categoryIndex = prediction[0].indexOf(Math.max(...prediction[0]));
  const predictedCategory = categories[categoryIndex];
  // Filter responses by category:
  const relevantResponses = responses.filter(r => r.category === predictedCategory);
  return relevantResponses.length > 0 ? 
         relevantResponses[Math.floor(Math.random() * relevantResponses.length)].response :
         "I need more details to provide an answer.";
};
```

• If using a Seq2Seq model, implement a loop prediction mechanism to generate token ids until a stop token, and then map tokens back to text.

---

### 5. Testing and Evaluation

After training and integration, test the trained model by using sample queries to ensure that the chatbot provides “good and nice answers.”  
• Use the console logs and TF.js callbacks to monitor performance.  
• Iterate by adjusting hyperparameters or model architecture if responses are unsatisfactory.

---

This plan outlines all key changes (data prep tuning, model architecture choices, training script updates, and AIService integration) necessary to train the chatbot for improved results. Implement these modifications step-by-step and then validate the improvements with testing.

