import * as tf from '@tensorflow/tfjs';
import { loadDataset, createRecoveryTimeSeries } from '../Utils/dataPrep.js';
import { 
  buildChatbotModel, 
  buildAutoencoder, 
  buildRecoveryPredictor 
} from '../Utils/ChatbotModel.js';

const trainModel = async () => {
  console.log('Loading medical dataset (JSON + XML)...');
  const { 
    inputSequences, 
    targetSequences, 
    allSequences,
    recoveryPhrases,
    vocabSize, 
    vocab,
    categories
  } = await loadDataset();
  
  // Even smaller batch size and fewer epochs for supervised component
  const batchSize = 16;
  const epochs = 50;
  
  console.log(`Building supervised model with vocabulary size ${vocabSize}`);
  const model = buildChatbotModel(vocabSize);
  
  // Train supervised component
  console.log('Training supervised component...');
  // Split data into smaller chunks for memory efficiency
  const totalSamples = inputSequences.length;
  const chunkSize = Math.min(64, totalSamples);
  
  for (let i = 0; i < totalSamples; i += chunkSize) {
    const endIdx = Math.min(i + chunkSize, totalSamples);
    const inputChunk = inputSequences.slice(i, endIdx);
    const targetChunk = targetSequences.slice(i, endIdx);
    
    const inputTensor = tf.tensor2d(inputChunk);
    const targetTensor = tf.tensor3d(targetChunk);
    
    console.log(`Training supervised model on chunk ${i/chunkSize + 1}/${Math.ceil(totalSamples/chunkSize)}`);
    await model.fit(inputTensor, targetTensor, {
      epochs: Math.max(5, Math.floor(epochs / Math.ceil(totalSamples/chunkSize))),
      batchSize,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`Supervised Epoch ${epoch + 1}: loss = ${logs.loss.toFixed(4)}`);
        }
      }
    });
    
    // Cleanup tensors
    inputTensor.dispose();
    targetTensor.dispose();
  }

  console.log('Saving supervised model...');
  await model.save('localstorage://medical-chatbot-model');
  
  // Build and train autoencoder (unsupervised component)
  console.log('Building autoencoder for unsupervised learning...');
  const sequenceLength = allSequences[0].length; // Should be MAX_SEQUENCE_LENGTH
  const { autoencoder, encoder } = buildAutoencoder(vocabSize, sequenceLength);
  
  console.log('Training autoencoder...');
  // Prepare data for autoencoder (one-hot encoding)
  const autoEncoderChunkSize = Math.min(32, allSequences.length);
  
  for (let i = 0; i < allSequences.length; i += autoEncoderChunkSize) {
    const endIdx = Math.min(i + autoEncoderChunkSize, allSequences.length);
    const sequenceChunk = allSequences.slice(i, endIdx);
    
    const inputTensor = tf.tensor2d(sequenceChunk);
    const oneHotTarget = tf.oneHot(sequenceChunk, vocabSize);
    
    console.log(`Training autoencoder on chunk ${i/autoEncoderChunkSize + 1}/${Math.ceil(allSequences.length/autoEncoderChunkSize)}`);
    await autoencoder.fit(inputTensor, oneHotTarget, {
      epochs: 10,
      batchSize: 8,
      shuffle: true,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`Autoencoder Epoch ${epoch + 1}: loss = ${logs.loss.toFixed(4)}`);
        }
      }
    });
    
    // Cleanup tensors
    inputTensor.dispose();
    oneHotTarget.dispose();
  }
  
  console.log('Saving autoencoder and encoder...');
  await autoencoder.save('localstorage://medical-autoencoder-model');
  await encoder.save('localstorage://medical-encoder-model');
  
  // Train recovery predictor if we have recovery data
  if (recoveryPhrases && recoveryPhrases.length > 0) {
    console.log(`Preparing recovery prediction model with ${recoveryPhrases.length} phrases`);
    // Create time series data
    const timeSeriesData = createRecoveryTimeSeries(recoveryPhrases, vocab);
    
    if (timeSeriesData.length > 0) {
      // Extract features using encoder
      const recoveryPredictor = buildRecoveryPredictor();
      
      // Process recovery data in smaller batches
      const batchSize = Math.min(16, timeSeriesData.length);
      
      for (let i = 0; i < timeSeriesData.length; i += batchSize) {
        const endIdx = Math.min(i + batchSize, timeSeriesData.length);
        const batch = timeSeriesData.slice(i, endIdx);
        
        // Create input tensor from tokenized text
        const inputTensor = tf.tensor2d(batch.map(item => item.tokenized));
        
        // Encode to latent features
        const features = encoder.predict(inputTensor);
        
        // Create target tensor with timePoint and improvement
        const targetTensor = tf.tensor2d(batch.map(item => [
          item.timePoint, item.improvement
        ]));
        
        console.log(`Training recovery predictor on batch ${i/batchSize + 1}/${Math.ceil(timeSeriesData.length/batchSize)}`);
        await recoveryPredictor.fit(features, targetTensor, {
          epochs: 20,
          batchSize: 4,
          validationSplit: 0.2,
          callbacks: {
            onEpochEnd: (epoch, logs) => {
              console.log(`Recovery Predictor Epoch ${epoch + 1}: loss = ${logs.loss.toFixed(4)}`);
            }
          }
        });
        
        // Cleanup tensors
        inputTensor.dispose();
        features.dispose();
        targetTensor.dispose();
      }
      
      console.log('Saving recovery predictor...');
      await recoveryPredictor.save('localstorage://medical-recovery-model');
    } else {
      console.log('No valid time series data extracted, skipping recovery predictor training');
    }
  }
  
  console.log('Training complete!');
};

trainModel().catch(console.error);
