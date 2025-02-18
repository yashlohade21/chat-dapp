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
      const numbers = [...uint8Array];
      wordArray = CryptoJS.lib.WordArray.create(numbers);
    } else if (typeof fileData === 'string') {
      wordArray = CryptoJS.enc.Base64.parse(fileData);
    } else {
      throw new Error('Unsupported file data format');
    }

    // Encrypt the WordArray
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

    // Recreate key using PBKDF2
    const key = CryptoJS.PBKDF2(passphrase, salt, {
      keySize: 256/32,
      iterations: 1000
    });

    /* 
      IMPORTANT CHANGE:
      The encrypted file is stored on IPFS as a Blob (text) and then fetched as an ArrayBuffer.
      IPFSService.getFile converts it to a base64 string.
      This means that the encryptedData we receive is a base64-encoded version of the 
      ciphertext (which was originally produced by CryptoJS.AES.encrypt).
      We need to decode it (using window.atob) to retrieve the original ciphertext string.
    */
    const decodedCiphertext = window.atob(encryptedData);

    // Decrypt data using the decoded ciphertext 
    const decrypted = CryptoJS.AES.decrypt(decodedCiphertext, key);
    
    // Convert decrypted data to base64 string so it can be used as a data URI (for images, etc.)
    const base64String = decrypted.toString(CryptoJS.enc.Base64);
    if (!base64String) {
      throw new Error("Decryption failed - invalid key or corrupted data");
    }

    return { success: true, decryptedData: base64String };
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
