import CryptoJS from 'crypto-js';

const encryptFileWithPassphrase = async (fileData, passphrase) => {
  try {
    if (!fileData || !passphrase) {
      throw new Error('Invalid encryption input: data or passphrase is missing');
    }

    const salt = CryptoJS.lib.WordArray.random(128/8);
    const key = CryptoJS.PBKDF2(passphrase, salt, {
      keySize: 256/32,
      iterations: 1000
    });

    // Store the original data URL prefix if it exists
    let prefix = '';
    let dataToEncrypt = fileData;
    
    if (typeof fileData === 'string' && fileData.startsWith('data:')) {
      const matches = fileData.match(/^data:(.+);base64,(.+)$/);
      if (!matches) {
        throw new Error('Invalid data URL format');
      }
      prefix = `data:${matches[1]};base64,`;
      dataToEncrypt = matches[2];
    }

    // Encrypt the data
    const wordArray = CryptoJS.enc.Base64.parse(dataToEncrypt);
    const encrypted = CryptoJS.AES.encrypt(wordArray, key.toString());
    const passphraseHash = CryptoJS.SHA256(passphrase + salt.toString()).toString();

    return {
      success: true,
      encryptedData: encrypted.toString(),
      prefix,
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

    const decrypted = CryptoJS.AES.decrypt(encryptedData, key.toString());
    const decryptedData = decrypted.toString(CryptoJS.enc.Base64);
    
    if (!decryptedData) {
      throw new Error("Decryption produced invalid data");
    }

    return { success: true, decryptedData };
  } catch (error) {
    console.error("Decryption error:", error);
    return { success: false, error: error.message };
  }
};

export {
  encryptFileWithPassphrase,
  decryptFileWithPassphrase
};
