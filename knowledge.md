De-Chat: A Decentralized Chat Application

## Context Management
- Always provide default values when destructuring from context
- Handle cases where context might be undefined during SSR
- Use optional chaining when accessing context values
- Include proper error boundaries for context-related errors
- Use `|| {}` when destructuring from useContext to handle SSR
- Allow unauthenticated access to index and 404 pages
- Prevent unnecessary redirects during initial page load
- When destructuring values that could be undefined, provide defaults: `const { account = '' } = useContext(ChatAppContect) || {}`

## Component Best Practices
- Always provide key props for mapped elements
- Include all dependencies in useEffect dependency arrays
- Use controlled inputs with value prop and onChange handler
- Remove or properly implement all referenced services before using them
- Handle loading states explicitly
- Clean up useEffect subscriptions when component unmounts
- Validate file uploads with size and type checks
- Always provide default values when destructuring from context
- Handle cases where context might be undefined during SSR
- Use optional chaining when accessing context values
- Include proper error boundaries for context-related errors
- Use `|| {}` when destructuring from useContext to handle SSR
- Allow unauthenticated access to index and 404 pages
- Prevent unnecessary redirects during initial page load
- When destructuring values that could be undefined, provide defaults: `const { account = '' } = useContext(ChatAppContect) || {}`

## Dependencies
Required packages for HIPAA compliance and security:
- crypto-js: For encryption of sensitive patient data
- tweetnacl: For asymmetric encryption
- tweetnacl-util: For encoding/decoding encrypted data
- axios: For making HTTP requests to IPFS/Pinata API

## Encryption Key Management
- Store encryption keys in localStorage to persist across sessions
- Generate new key only if none exists in localStorage
- Use Web Crypto API's subtle.generateKey when available
- Fall back to getRandomValues if subtle crypto fails
- Final fallback to CryptoJS.random
- Never store encryption keys on chain
- Use same key for related encrypt/decrypt operations
- Handle key generation failures gracefully with CryptoJS fallback

## Form Validation & Security
- Validate all patient data on client side before encryption
- Show HIPAA compliance warnings before submission
- Use loading states during encryption and upload
- Provide clear feedback about validation errors
- Sanitize all inputs before encryption
- Handle loading states during encryption and upload
- Show clear progress indicators for multi-step processes
- Validate all patient data on client side before encryption
- Show HIPAA compliance warnings before submission
- Use loading states during encryption and upload
- Provide clear feedback about validation errors
- Sanitize all inputs before encryption
- Handle loading states during encryption and upload
- Show clear progress indicators for multi-step processes

## File Storage
IPFS is used for decentralized file storage:
- Handle partial upload success - continue processing remaining files if one fails
- Validate both file type and size before upload attempt
- Show granular progress updates during encryption and upload
- Store encryption keys securely, but don't block upload if storage fails
- Implement retries with exponential backoff for IPFS fetches
- Always validate CIDs before storage/retrieval
- Store file metadata (name, size, type) with the upload
- Handle timeouts and connection issues gracefully
- When IPFS upload fails, preserve form data and allow retrying just the failed upload
- Show specific error messages from Pinata API when available
- Handle partial upload success - continue processing remaining files if one fails
- Validate both file type and size before upload attempt
- Show granular progress updates during encryption and upload
- Store encryption keys securely, but don't block upload if storage fails
- Implement retries with exponential backoff for IPFS fetches
- Always validate CIDs before storage/retrieval
- Store file metadata (name, size, type) with the upload
- Handle timeouts and connection issues gracefully
- When IPFS upload fails, preserve form data and allow retrying just the failed upload
- Show specific error messages from Pinata API when available
- Medical documents are uploaded to IPFS via Pinata
- Required environment variables: PINATA_API_KEY, PINATA_SECRET_KEY
- Files are referenced by their CID (Content Identifier)
- Patient data is encrypted before IPFS storage
- Only store CIDs on chain, never raw or encrypted data
- Always verify IPFS upload success before blockchain storage
- Gateway URL: https://gateway.pinata.cloud/ipfs/
- File size limit: 10MB per file
- Implement retries with exponential backoff for IPFS fetches
- Always validate CIDs before storage/retrieval
- Store file metadata (name, size, type) with the upload
- Handle timeouts and connection issues gracefully
- When IPFS upload fails, preserve form data and allow retrying just the failed upload
- Show specific error messages from Pinata API when available

## File Encryption Best Practices
- Store encrypted files as 'text/plain' type for consistent handling
- Use base64 encoding for binary data before encryption
- Store encryption metadata (salt, hash) separately from encrypted data
- Clear local storage when encryption format changes
- Always verify decryption key using hash before attempting decryption
- Handle binary data conversion consistently throughout the process

## TensorFlow.js Best Practices
- Give unique names to layers to prevent registration conflicts
- Dispose of models and tensors when no longer needed
- Initialize models only once and reuse the instance
- Clean up tensors after predictions to prevent memory leaks
- Use a singleton pattern for model services
- Handle model initialization errors gracefully
- Avoid reinitializing models during file processing

## UI Design Guidelines for Healthcare Applications
- Use white backgrounds for better readability and clean appearance
- Use green (#2E7D32) for headings and primary actions to align with healthcare standards
- Maintain high contrast between text (dark) and background (white) for accessibility
- Use subtle shadows and borders to create visual hierarchy
- Implement consistent spacing and padding across all components
- Use rounded corners (8-12px radius) for a modern, approachable feel
- Ensure all interactive elements have clear hover/focus states
- Use green for success states and red for errors/warnings
- Maintain consistent typography with clear hierarchy
- Ensure all forms and inputs follow healthcare UI conventions

## Chatbot Training and Implementation

### Dataset Structure
- Medical Q&A dataset in JSON format
- Each entry contains input (question) and response pairs
- Focus on healthcare domain-specific responses
- Store in dataset/chatbot_training_data.json

### Training Process
1. **Setup Dependencies**
```bash
npm install @tensorflow/tfjs
```

2. **Prepare Training Data**
- Create dataset directory
- Structure JSON with input/response pairs
- Include healthcare-focused conversations
- Validate data format before training

3. **Data Preprocessing**
- Tokenize text into words
- Build vocabulary from dataset
- Convert words to numerical sequences
- Pad sequences to fixed length
- Handle unknown words with <UNK> token

4. **Model Architecture**
- Simple sequence model for faster responses
- Embedding layer for word representation
- LSTM layer for sequence processing
- Dense output layer with softmax activation
- Compile with categorical crossentropy loss

5. **Training Script**
```javascript
npm run train-chatbot
```
- Loads and preprocesses dataset
- Builds model architecture
- Trains for 20 epochs
- Saves model to localStorage
- Monitors loss and accuracy

### Implementation Components
1. **Utils/dataPrep.js**
- Handles data loading and preprocessing
- Manages vocabulary creation
- Implements sequence padding
- Maximum sequence length: 20
- Vocabulary size: 5000 words

2. **Utils/ChatbotModel.js**
- Defines model architecture
- Sets hyperparameters
- Implements model building
- Handles model compilation

3. **Utils/AIService.js**
- Manages chatbot responses
- Implements response generation
- Handles error cases
- Provides fallback responses

4. **Components/ChatbotGlobal**
- Manages chat interface
- Handles user input
- Displays bot responses
- Shows typing indicators

### Response Generation
- Pattern matching for common queries
- Category-based response selection
- Fallback to general responses
- Healthcare-specific terminology
- HIPAA-compliant messaging

### Best Practices
- Keep responses healthcare-focused
- Maintain HIPAA compliance
- Include security disclaimers
- Provide step-by-step instructions
- Handle errors gracefully
- Show typing indicators
- Support keyboard navigation

### Performance Optimization
- Small model for quick responses
- Limited vocabulary size
- Fixed sequence length
- Browser-based inference
- Efficient pattern matching

### Security Considerations
- No medical advice in responses
- Clear healthcare disclaimers
- Privacy-focused responses
- HIPAA compliance in all communications
- Secure data handling references

### Maintenance
- Regular model retraining
- Dataset updates
- Response quality monitoring
- Performance tracking
- User feedback integration

## Unsupervised Learning for Patient Recovery Prediction

### Model Architecture
- **Autoencoder**: Learns patterns in medical text data without explicit labels
  - Encoder: Compresses input to latent space (32 dimensions)
  - Decoder: Reconstructs original input from latent representation
  - Used for anomaly detection in symptoms

- **Recovery Predictor**: Estimates recovery timeline and percentage
  - Input: Latent representation from encoder
  - Output: Two values - time to recovery (days) and recovery percentage

### Data Processing
- MAX_SEQUENCE_LENGTH: 50 tokens for better context understanding
- VOCAB_SIZE: 15000 words to handle medical terminology
- Recovery phrases extracted using keywords like 'recovery', 'healing', 'prognosis'
- Time series data created by mapping temporal phrases to numeric values

### Training Process
- Supervised component: Classification model for standard responses
- Unsupervised component: Autoencoder for pattern recognition
- Recovery predictor: Regression model for recovery metrics

### Implementation Notes
- Models saved to localStorage with specific keys:
  - 'medical-chatbot-model': Supervised classification model
  - 'medical-autoencoder-model': Full autoencoder
  - 'medical-encoder-model': Encoder component only
  - 'medical-recovery-model': Recovery prediction model
- Training done in small batches to prevent memory issues
- Tensor cleanup essential to prevent memory leaks

### Usage in UI
- Recovery prediction form collects:
  - Symptoms (required)
  - Medical history (optional)
  - Current treatment (optional)
- Results displayed with:
  - Recovery time estimate in days
  - Recovery percentage with visual progress bar
  - Personalized recommendations based on symptoms

## Next.js Configuration
- Project uses ES modules (package.json "type": "module")
- Use `export default` instead of `module.exports` in .js files
- Use .cjs extension for files that must use CommonJS
- next.config.js must use ES modules syntax to match project config
- When importing JSON files in ES modules, use import assertions: `import data from './data.json' assert { type: 'json' }`
- For TensorFlow.js performance in Node.js, install the optimized backend: `npm install @tensorflow/tfjs-node`

## How to Train the Chatbot Model

You can train the chatbot model in two ways:

## Method 1: Using the UI (Easiest)

1. Open the chatbot interface in your application
2. Look for the "Train Medical Knowledge" button at the top of the chat window
3. Click this button to start the training process
4. A loading screen will appear showing the training progress
5. Wait for the training to complete (this may take a few minutes)
6. Once training is complete, the chatbot will be ready to use with its enhanced capabilities

The training process in the UI will:
- Load the medical dataset (both JSON and XML data)
- Train the supervised classification model
- Build and train the autoencoder for unsupervised learning
- Create the recovery prediction model
- Train the self-learning model for autonomous responses

## Method 2: Using the Terminal (Advanced)

If you prefer to train the model directly through the terminal:

1. Open your terminal
2. Navigate to your project directory
3. Run the training script with:

```bash
node scripts/train-chatbot.js
```

This will execute the same training process as the UI method but with more detailed console output.

## What Happens During Training

The training process involves several steps:

1. **Data Loading**: The system loads medical conversations from both JSON and XML datasets
2. **Supervised Learning**: Trains a model to classify medical queries into categories
3. **Unsupervised Learning**: Creates an autoencoder to understand patterns in medical text
4. **Recovery Prediction**: Builds a specialized model for predicting recovery timelines
5. **Self-Learning**: Develops a model that can learn from new interactions

## After Training

Once training is complete:
- The models are saved to localStorage in your browser
- The chatbot will use these models to provide more accurate responses
- The self-learning capability will be activated, allowing the chatbot to improve with each interaction
- You'll see a "Self-learning AI active" indicator when the autonomous mode is enabled

The chatbot will now be able to:
- Provide medical information based on its training
- Predict recovery timelines for various conditions
- Learn from your interactions to improve its responses over time
- Detect unusual symptoms and provide relevant recommendations

If you have any issues with the training process, you can check the console logs for more detailed information about any errors that might occur.

### Method 1: Using the UI (Easiest)

1. Start the application by running:
   ```bash
   npm run dev
   ```

2. Open the application in your browser (typically at http://localhost:3000)

3. Look for the "Train Medical Knowledge" button in the chatbot interface
   - This button appears at the top of the chat window when the models aren't loaded yet

4. Click this button to start the training process
   - A loading screen will appear showing the training progress
   - You'll see progress indicators and steps being performed

5. Wait for the training to complete (this may take a few minutes)

6. Once training is complete, the chatbot will be ready to use with its enhanced capabilities

### Method 2: Using the Terminal (Advanced)

If you prefer to train the model directly through the terminal:

1. Open your terminal
2. Navigate to your project directory
3. Run the training script with:

```bash
node scripts/train-chatbot.js
```

This will execute the same training process as the UI method but with more detailed console output.

## What Happens During Training

The training process involves several steps:

1. **Data Loading**: The system loads medical conversations from both JSON and XML datasets
2. **Supervised Learning**: Trains a model to classify medical queries into categories
3. **Unsupervised Learning**: Creates an autoencoder to understand patterns in medical text
4. **Recovery Prediction**: Builds a specialized model for predicting recovery timelines
5. **Self-Learning**: Develops a model that can learn from new interactions

## After Training

Once training is complete:
- The models are saved to localStorage in your browser
- The chatbot will use these models to provide more accurate responses
- The self-learning capability will be activated, allowing the chatbot to improve with each interaction
- You'll see a "Self-learning AI active" indicator when the autonomous mode is enabled

The chatbot will now be able to:
- Provide medical information based on its training
- Predict recovery timelines for various conditions
- Learn from your interactions to improve its responses over time
- Detect unusual symptoms and provide relevant recommendations

If you have any issues with the training process, you can check the console logs for more detailed information about any errors that might occur.
