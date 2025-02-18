import CryptoJS from 'crypto-js';

const encryptFileWithPassphrase = async (fileData, passphrase) => {
  try {
    if (!fileData || !passphrase) {
      throw new Error('Invalid encryption input: data or passphrase is missing');
    }

    // Generate a random salt
    const salt = CryptoJS.lib.WordArray.random(128/8);

    // Derive key using PBKDF2
    const key = CryptoJS.PBKDF2(passphrase, salt, {
      keySize: 256/32,
      iterations: 1000
    });

    // Convert ArrayBuffer to WordArray
    let wordArray;
    if (fileData instanceof ArrayBuffer) {
      const uint8Array = new Uint8Array(fileData);
      wordArray = CryptoJS.lib.WordArray.create(uint8Array);
    } else if (typeof fileData === 'string') {
      wordArray = CryptoJS.enc.Base64.parse(fileData);
    } else {
      throw new Error('Unsupported file data format');
    }

    // Important: Use key.toString() consistently in both encryption and decryption
    const encrypted = CryptoJS.AES.encrypt(wordArray, key.toString());
    const passphraseHash = CryptoJS.SHA256(passphrase + salt.toString()).toString();

    return {
      success: true,
      encryptedData: encrypted.toString(),
      passphraseHash,
      salt: salt.toString()
    };
  } catch (error) {
    console.error('Encryption error:', error);
    return { success: false, error: error.message };
  }
};

const decryptFileWithPassphrase = async (encryptedData, passphrase, expectedHash, salt) => {
  try {
    if (!encryptedData || !passphrase || !expectedHash || !salt) {
      throw new Error('Missing required decryption parameters');
    }

    // Verify passphrase using hash
    const providedHash = CryptoJS.SHA256(passphrase + salt).toString();
    if (providedHash !== expectedHash) {
      throw new Error("Invalid decryption key");
    }

    // Recreate key using PBKDF2 - use exact same parameters as encryption
    const key = CryptoJS.PBKDF2(passphrase, salt, {
      keySize: 256/32,
      iterations: 1000
    });

    try {
      // Important: Use key.toString() to match encryption
      const decrypted = CryptoJS.AES.decrypt(encryptedData, key.toString());
      
      // Verify decrypted data
      if (!decrypted || decrypted.sigBytes <= 0) {
        throw new Error("Decryption produced invalid data");
      }

      // Convert to base64
      const base64String = decrypted.toString(CryptoJS.enc.Base64);
      if (!base64String) {
        throw new Error("Failed to convert decrypted data to base64");
      }

      return { success: true, decryptedData: base64String };
    } catch (e) {
      console.error('Decryption operation error:', e);
      throw new Error('Failed to decrypt data - invalid key or corrupted data');
    }
  } catch (error) {
    console.error("Decryption error:", error);
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

export {
  encryptFileWithPassphrase,
  decryptFileWithPassphrase,
  generatePatientKeyPair,
  getPatientKeys
};
