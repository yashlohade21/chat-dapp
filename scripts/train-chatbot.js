import * as tf from '@tensorflow/tfjs';
import { loadDataset } from '../Utils/dataPrep.js';
import { buildChatbotModel } from '../Utils/ChatbotModel.js';

const trainModel = async () => {
  console.log('Loading medical dataset (JSON + XML)...');
  const { inputSequences, targetSequences, vocabSize } = await loadDataset();
  
  console.log('Building enhanced medical chatbot model...');
  const model = buildChatbotModel(vocabSize);
  
  console.log('Converting to tensors...');
  const inputTensor = tf.tensor2d(inputSequences);
  const targetTensor = tf.tensor3d(targetSequences);
  
  console.log('Starting training with medical focus...');
  await model.fit(inputTensor, targetTensor, {
    epochs: 100, // Increased epochs for better learning
    batchSize: 32,
    validationSplit: 0.2,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        console.log(`Epoch ${epoch + 1}/100: loss = ${logs.loss.toFixed(4)}, accuracy = ${logs.accuracy.toFixed(4)}, val_loss = ${logs.val_loss.toFixed(4)}`);
      }
    }
  });
  
  console.log('Saving medical chatbot model...');
  await model.save('localstorage://medical-chatbot-model');
  console.log('Training complete!');
  
  // Cleanup
  inputTensor.dispose();
  targetTensor.dispose();
};

// Start training
trainModel().catch(console.error);
