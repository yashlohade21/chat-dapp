# XML Dataset Training Plan

This document details the steps to pre-process an XML medical dataset and merge it with the existing JSON training data so that the chatbot model is trained on a wider range of medical queries. The goal is for the trained model to answer everything related to medical topics as reflected in the XML files.

---

## 1. Install and Setup

- **Install the XML Parser Library:**  
  Use [xml2js](https://www.npmjs.com/package/xml2js) to parse XML files.
  ```bash
  npm install xml2js
  ```

---

## 2. Pre-processing the XML Dataset

**Create a new module: `Utils/xmlDataPrep.js`**

This module will:
- Read all XML files in the `dataset` directory.
- Parse each XML file using xml2js.
- Extract question and answer pairs from XML elements (e.g., from `<Original-Question>` tags and associated summary tags if available).
- Produce an array of objects in the format:
  ```json
  { "input": "Question text", "response": "Answer text" }
  ```

**Key Pseudocode:**
```javascript
import fs from 'fs';
import path from 'path';
import xml2js from 'xml2js';

export const loadXMLDataset = async () => {
  // Get all XML files in the 'dataset' directory
  const datasetPath = path.join(process.cwd(), 'dataset');
  const xmlFiles = fs.readdirSync(datasetPath).filter(file => file.endsWith('.xml'));
  
  const parser = new xml2js.Parser();
  const conversations = [];
  
  for (const file of xmlFiles) {
    const xmlContent = fs.readFileSync(path.join(datasetPath, file), 'utf8');
    let result;
    try {
      result = await parser.parseStringPromise(xmlContent);
    } catch(err) {
      console.error("Error parsing XML file:", file, err);
      continue;
    }
    
    // Assume a structure like: <Questions><Original-Question ...>Question text</Original-Question></Questions>
    if (result && result.Questions && result.Questions['Original-Question']) {
      const questions = result.Questions['Original-Question'];
      for (const q of questions) {
        // Extract the question text. Many XML files use text content or attributes.
        const input = (typeof q._ === 'string' && q._.trim()) || (q.$ && q.$.qfile ? `Question from file ${q.$.qfile}` : '');
        // Use a summary if available, or provide a placeholder response.
        const response = (q.summary && q.summary[0]) || "For detailed information, please consult your healthcare provider.";
        if (input) {
          conversations.push({ input, response });
        }
      }
    }
  }
  
  return conversations;
};
```

---

## 3. Merging the Datasets

To improve coverage, merge the XML-derived question/response pairs with the existing JSON training data.

**In your training script (`scripts/train-chatbot.js`), add:**
```javascript
import { loadDataset as loadJSONDataset } from '../Utils/dataPrep.js';
import { loadXMLDataset } from '../Utils/xmlDataPrep.js';

// Function to merge datasets and preprocess text
const loadCombinedDataset = async () => {
  // Load existing JSON data (already tokenized in dataPrep.js)
  const jsonData = await loadJSONDataset();  // returns { inputSequences, targetSequences, vocab ... }
  
  // Load XML dataset (raw question-response pairs)
  const xmlConversations = await loadXMLDataset(); // array of { input, response }
  
  // Initialize arrays for XML tokenized data
  const xmlInputs = [];
  const xmlResponses = [];
  
  // Reuse the tokenizeAndPad function from dataPrep.js
  // (Assuming you export it or duplicate similar logic here)
  for (const pair of xmlConversations) {
    const tokenizedInput = tokenizeAndPad(pair.input, jsonData.vocab);
    const tokenizedResponse = tokenizeAndPad(pair.response, jsonData.vocab);
    xmlInputs.push(tokenizedInput);
    xmlResponses.push(tokenizedResponse);
  }
  
  // Merge the JSON and XML sequences
  const mergedInputs = jsonData.inputSequences.concat(xmlInputs);
  const mergedResponses = jsonData.targetSequences.concat(xmlResponses);
  
  return {
    inputSequences: mergedInputs,
    targetSequences: mergedResponses,
    vocabSize: jsonData.vocabSize
  };
};
```
*Note: Ensure that `tokenizeAndPad` and vocabulary management are shared between modules for consistency.*

---

## 4. Training the Model with the Merged Dataset

1. **Update the Training Script:**  
   Modify `scripts/train-chatbot.js` to load and use the merged dataset.
   ```javascript
   import * as tf from '@tensorflow/tfjs-node';
   import { buildChatbotModel } from '../Utils/ChatbotModel.js';
   import { loadCombinedDataset } from '../Utils/dataPrep.js';  // Update this to load the merged data

   const trainModel = async () => {
     console.log('Loading combined dataset...');
     const { inputSequences, targetSequences, vocabSize } = await loadCombinedDataset();
     
     console.log('Building model...');
     const model = buildChatbotModel(vocabSize);
     
     console.log('Converting to tensors...');
     const inputTensor = tf.tensor2d(inputSequences);
     const targetTensor = tf.tensor2d(targetSequences);
     
     console.log('Starting training...');
     await model.fit(inputTensor, targetTensor, {
       epochs: 20,
       batchSize: 32,
       validationSplit: 0.2,
       callbacks: {
         onEpochEnd: (epoch, logs) => {
           console.log(`Epoch ${epoch + 1}: loss = ${logs.loss.toFixed(4)}, accuracy = ${logs.accuracy.toFixed(4)}`);
         }
       }
     });
     
     console.log('Saving model...');
     await model.save('localstorage://chatbot-model');
     console.log('Training complete!');
     
     // Cleanup
     inputTensor.dispose();
     targetTensor.dispose();
   };

   trainModel().catch(console.error);
   ```

2. **Run the Training:**  
   In the terminal, execute:
   ```bash
   npm run train-chatbot
   ```
   This will load both the JSON and XML datasets, merge them after pre-processing, train the model for 20 epochs, and save the trained model.

---

## 5. Expected Outcome

- The model will be trained on a richer dataset that includes both your original JSON training data and the XML medical questions.
- The chatbot should now be better equipped to answer a wide range of medical-related queries accurately.
- The answers will cover various topics—symptoms, records, medication, appointments, insurance, and privacy—with structured, step-by-step information and safety disclaimers.

---

This plan specifies how to pre-process the XML dataset, merge it with existing training data, and retrain the chatbot model to achieve comprehensive medical responses.

