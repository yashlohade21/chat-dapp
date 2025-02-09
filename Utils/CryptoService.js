import CryptoJS from 'crypto-js';

const encryptFileWithPassphrase = async (fileData, passphrase) => {
  try {
    const salt = CryptoJS.lib.WordArray.random(128/8);
    
    // Create key using PBKDF2
    const key = CryptoJS.PBKDF2(passphrase, salt, {
      keySize: 256/32,
      iterations: 1000
    });

    // Create WordArray from the base64 string
    const wordArray = CryptoJS.enc.Base64.parse(fileData);
    
    // Encrypt the data
    const encrypted = CryptoJS.AES.encrypt(wordArray, key.toString());
    const encryptedString = encrypted.toString();
    
    // Create hash for verification
    const passphraseHash = CryptoJS.SHA256(passphrase + salt.toString()).toString();
    
    return { 
      success: true, 
      encryptedData: encryptedString, 
      passphraseHash,
      salt: salt.toString()
    };
  } catch (error) {
    console.error("Error encrypting file:", error);
    return { success: false, error: error.message };
  }
};

const decryptFileWithPassphrase = async (encryptedData, passphrase, expectedHash, salt) => {
  try {
    // Verify passphrase
    const providedHash = CryptoJS.SHA256(passphrase + salt).toString();
    if (providedHash !== expectedHash) {
      throw new Error("Invalid decryption key");
    }

    // Recreate the same key using PBKDF2
    const key = CryptoJS.PBKDF2(passphrase, salt, {
      keySize: 256/32,
      iterations: 1000
    });

    // Decrypt the data
    const decrypted = CryptoJS.AES.decrypt(encryptedData, key.toString());
    
    // Convert to Base64
    const decryptedBase64 = decrypted.toString(CryptoJS.enc.Base64);
    if (!decryptedBase64) {
      throw new Error("Decryption failed - invalid key or corrupted data");
    }

    return { success: true, decryptedData: decryptedBase64 };
  } catch (error) {
    console.error("Error decrypting file:", error);
    return { success: false, error: error.message };
  }
};

const generatePatientKeyPair = () => {
  try {
    const publicKey = CryptoJS.lib.WordArray.random(32).toString();
    const privateKey = CryptoJS.lib.WordArray.random(32).toString();
    
    const patientKeys = {
      publicKey,
      privateKey,
      timestamp: Date.now(),
      hash: CryptoJS.SHA256(publicKey + privateKey).toString()
    };
    
    localStorage.setItem('patientKeys', JSON.stringify(patientKeys));
    
    return patientKeys;
  } catch (error) {
    console.error('Error generating patient key pair:', error);
    throw new Error('Failed to generate encryption keys');
  }
};

const getPatientKeys = () => {
  try {
    const storedKeys = localStorage.getItem('patientKeys');
    if (!storedKeys) {
      return generatePatientKeyPair();
    }
    
    const keys = JSON.parse(storedKeys);
    const verifyHash = CryptoJS.SHA256(keys.publicKey + keys.privateKey).toString();
    if (verifyHash !== keys.hash) {
      throw new Error('Keys integrity check failed');
    }
    
    return keys;
  } catch (error) {
    console.error('Error retrieving patient keys:', error);
    return generatePatientKeyPair();
  }
};

// Single export statement for all functions
export {
  encryptFileWithPassphrase,
  decryptFileWithPassphrase,
  generatePatientKeyPair,
  getPatientKeys
};