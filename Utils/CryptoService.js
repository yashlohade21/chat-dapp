import CryptoJS from 'crypto-js';

const arrayBufferToWordArray = (arrayBuffer) => {
  const uint8Array = new Uint8Array(arrayBuffer);
  const words = [];
  for (let i = 0; i < uint8Array.length; i += 4) {
    words.push(
      (uint8Array[i] << 24) |
      (uint8Array[i + 1] << 16) |
      (uint8Array[i + 2] << 8) |
      uint8Array[i + 3]
    );
  }
  return CryptoJS.lib.WordArray.create(words, uint8Array.length);
};

const wordArrayToArrayBuffer = (wordArray) => {
  const words = wordArray.words;
  const sigBytes = wordArray.sigBytes;
  const u8 = new Uint8Array(sigBytes);
  for (let i = 0; i < sigBytes; i++) {
    const byte = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    u8[i] = byte;
  }
  return u8.buffer;
};

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
      wordArray = arrayBufferToWordArray(fileData);
    } else if (typeof fileData === 'string') {
      wordArray = CryptoJS.enc.Base64.parse(fileData);
    } else {
      throw new Error('Unsupported file data format');
    }

    // Encrypt using AES
    const encrypted = CryptoJS.AES.encrypt(wordArray, key.toString());
    
    // Generate verification hash
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

    const providedHash = CryptoJS.SHA256(passphrase + salt).toString();
    if (providedHash !== expectedHash) {
      throw new Error("Invalid decryption key");
    }

    const key = CryptoJS.PBKDF2(passphrase, salt, {
      keySize: 256/32,
      iterations: 1000
    });

    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, key.toString());
      if (!decrypted || decrypted.sigBytes <= 0) {
        throw new Error("Decryption produced invalid data");
      }

      // Convert to ArrayBuffer for consistent binary handling
      const arrayBuffer = wordArrayToArrayBuffer(decrypted);
      const base64String = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

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

export {
  encryptFileWithPassphrase,
  decryptFileWithPassphrase
};
