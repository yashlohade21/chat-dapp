import * as tf from '@tensorflow/tfjs';

class DocumentDetectionService {
  constructor() {
    this.model = null;
    this.initialized = false;
    this.accuracy = 0;
  }

  async initialize() {
    if (this.initialized) return;

    // Create a simple RNN model
    this.model = tf.sequential();
    
    // Input layer - Changed to dense layer only since we don't need sequence processing
    this.model.add(tf.layers.dense({
      inputShape: [5],  // Match our 5 features
      units: 32,
      activation: 'relu'
    }));

    // Additional dense layers instead of LSTM
    this.model.add(tf.layers.dense({
      units: 64,
      activation: 'relu'
    }));

    this.model.add(tf.layers.dense({
      units: 32,
      activation: 'relu'
    }));

    // Dense output layer
    this.model.add(tf.layers.dense({
      units: 1,
      activation: 'sigmoid'
    }));

    // Compile the model
    this.model.compile({
      optimizer: 'adam',
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    // Train the model with sample data
    await this.trainModel();
    this.initialized = true;
  }

  async trainModel() {
    // Sample training data (medical document features)
    const trainFeatures = [
      // [keyword_freq, structure_score, format_score, header_score, content_density]
      [0.8, 0.7, 0.6, 0.9, 0.8],  // Real medical document
      [0.2, 0.1, 0.1, 0.2, 0.1],  // Fake document
      [0.9, 0.8, 0.7, 0.8, 0.9],  // Real medical document
      [0.1, 0.2, 0.1, 0.1, 0.2],  // Fake document
      [0.7, 0.8, 0.8, 0.7, 0.7],  // Real medical document
      [0.3, 0.2, 0.1, 0.2, 0.1]   // Fake document
    ];

    const trainLabels = [1, 0, 1, 0, 1, 0]; // 1 for real, 0 for fake

    // Convert to tensors
    const xs = tf.tensor2d(trainFeatures);
    const ys = tf.tensor1d(trainLabels);

    // Train the model
    const history = await this.model.fit(xs, ys, {
      epochs: 50,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          this.accuracy = logs.acc;
          console.log(`Epoch ${epoch}: accuracy = ${logs.acc}`);
        }
      }
    });

    // Clean up tensors
    xs.dispose();
    ys.dispose();

    return history;
  }

  async detectFakeDocument(file, onEpochProgress) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Extract features from the document
      const features = await this.extractFeatures(file);
      
      // Convert features to tensor
      const inputTensor = tf.tensor2d([features]);
      
      // Train or fine-tune the model with progress callback
      await this.model.fit(inputTensor, tf.tensor2d([[1]]), {
        epochs: 50,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            this.accuracy = logs.acc;
            if (onEpochProgress) {
              onEpochProgress(epoch + 1, 50);
            }
          }
        }
      });
      
      // Make prediction
      const prediction = await this.model.predict(inputTensor).data();
      
      // Clean up
      inputTensor.dispose();
      
      // Get confidence score (0-1)
      const confidence = prediction[0];
      
      return {
        isReal: confidence > 0.5,
        confidence: confidence,
        accuracy: this.accuracy
      };
    } catch (error) {
      console.error('Error in fake document detection:', error);
      throw error;
    }
  }

  async extractFeatures(file) {
    // Extract features from the document
    const features = [
      await this.calculateMedicalKeywordFrequency(file),
      await this.calculateStructureScore(file),
      await this.calculateFormatScore(file),
      await this.calculateHeaderScore(file),
      await this.calculateContentDensity(file)
    ];
    
    return features;
  }

  async calculateMedicalKeywordFrequency(file) {
    const text = await this.extractText(file);
    const medicalKeywords = [
      'patient', 'diagnosis', 'treatment', 'medical', 'hospital',
      'doctor', 'prescription', 'symptoms', 'examination', 'report'
    ];
    
    const words = text.toLowerCase().split(/\W+/);
    const keywordCount = words.filter(word => medicalKeywords.includes(word)).length;
    return keywordCount / words.length;
  }

  async calculateStructureScore(file) {
    // Analyze document structure (sections, headers, etc.)
    return 0.8; // Placeholder
  }

  async calculateFormatScore(file) {
    // Check if format matches medical document standards
    return 0.7; // Placeholder
  }

  async calculateHeaderScore(file) {
    // Analyze presence and format of medical headers
    return 0.9; // Placeholder
  }

  async calculateContentDensity(file) {
    // Analyze content density and medical terminology
    return 0.8; // Placeholder
  }

  async extractText(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target.result);
      };
      reader.readAsText(file);
    });
  }
}

export const documentDetectionService = new DocumentDetectionService();
