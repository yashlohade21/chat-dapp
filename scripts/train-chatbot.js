import * as tf from '@tensorflow/tfjs';
import { loadDataset } from '../Utils/dataPrep.js';
import { buildChatbotModel } from '../Utils/ChatbotModel.js';

const trainModel = async () => {
  console.log('Loading medical dataset (JSON + XML)...');
  const { inputSequences, targetSequences, vocabSize, vocab } = await loadDataset();
  
  // Even smaller batch size and fewer epochs
  const batchSize = 8;
  const epochs = 30;
  
  console.log(`Building model with vocabulary size ${vocabSize}`);
  const model = buildChatbotModel(vocabSize);
  
  // Split data into smaller chunks
  const totalSamples = inputSequences.length;
  const chunkSize = Math.min(10, totalSamples);
  
  for (let i = 0; i < totalSamples; i += chunkSize) {
    const endIdx = Math.min(i + chunkSize, totalSamples);
    const inputChunk = inputSequences.slice(i, endIdx);
    const targetChunk = targetSequences.slice(i, endIdx);
    
    const inputTensor = tf.tensor2d(inputChunk);
    const targetTensor = tf.tensor3d(targetChunk);
    
    console.log(`Training on chunk ${i/chunkSize + 1}/${Math.ceil(totalSamples/chunkSize)}`);
    await model.fit(inputTensor, targetTensor, {
      epochs,
      batchSize,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`Epoch ${epoch + 1}/${epochs}: loss = ${logs.loss.toFixed(4)}`);
        }
      }
    });
    
    // Cleanup tensors
    inputTensor.dispose();
    targetTensor.dispose();
  }

  console.log('Saving model...');
  await model.save('localstorage://medical-chatbot-model');
  
  console.log('Training complete!');
};

trainModel().catch(console.error);
