import { ethers } from 'ethers';
import CryptoJS from 'crypto-js';
import { box, randomBytes } from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';

export const CryptoService = {
  // Generate a symmetric key for message encryption
  generateMessageKey: () => {
    try {
      if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        return window.crypto.subtle.generateKey(
          {
            name: "AES-GCM",
            length: 256
          },
          true,
          ["encrypt", "decrypt"]
        ).then(key => {
          return window.crypto.subtle.exportKey("raw", key);
        }).then(keyBuffer => {
          return CryptoJS.lib.WordArray.create(
            new Uint8Array(keyBuffer)
          ).toString();
        }).catch(error => {
          console.error('Subtle crypto failed, falling back:', error);
          const array = new Uint8Array(32);
          window.crypto.getRandomValues(array);
          return CryptoJS.lib.WordArray.create(array).toString();
        });
      }
      const array = new Uint8Array(32);
      window.crypto.getRandomValues(array);
      return CryptoJS.lib.WordArray.create(array).toString();
    } catch (error) {
      console.error('Error generating encryption key:', error);
      return CryptoJS.lib.WordArray.random(256 / 8).toString();
    }
  },

  // Encrypt message using AES
  encryptMessage: (message, key) => {
    let input;
    if (typeof message === "string") {
      input = message;
    } else if (message instanceof Uint8Array) {
      input = CryptoJS.lib.WordArray.create(message);
    } else {
      input = message;
    }
    return CryptoJS.AES.encrypt(input, key).toString();
  },

  // Decrypt message using AES
  decryptMessage: (encryptedMessage, key) => {
    const bytes = CryptoJS.AES.decrypt(encryptedMessage, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  },

  // Sign message using user's Ethereum private key
  signMessage: async (message, signer) => {
    const messageHash = ethers.utils.hashMessage(message);
    return await signer.signMessage(messageHash);
  },

  // Verify message signature
  verifySignature: (message, signature, address) => {
    const messageHash = ethers.utils.hashMessage(message);
    const recoveredAddress = ethers.utils.recoverAddress(messageHash, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  },

  // Generate key pair for asymmetric encryption
  generateKeyPair: () => {
    const keyPair = box.keyPair();
    return {
      publicKey: encodeBase64(keyPair.publicKey),
      privateKey: encodeBase64(keyPair.secretKey)
    };
  },

  // Encrypt message using recipient's public key
  encryptAsymmetric: (message, recipientPublicKey, senderPrivateKey) => {
    const ephemeralKeyPair = box.keyPair();
    const sharedKey = box.before(
      decodeBase64(recipientPublicKey),
      decodeBase64(senderPrivateKey)
    );
    const nonce = randomBytes(box.nonceLength);
    const messageUint8 = new TextEncoder().encode(message);
    const encryptedMessage = box.after(messageUint8, nonce, sharedKey);
    
    return {
      encrypted: encodeBase64(encryptedMessage),
      nonce: encodeBase64(nonce)
    };
  },

  // Decrypt message using recipient's private key
  decryptAsymmetric: (encryptedData, senderPublicKey, recipientPrivateKey) => {
    const sharedKey = box.before(
      decodeBase64(senderPublicKey),
      decodeBase64(recipientPrivateKey)
    );
    const decryptedMessage = box.open.after(
      decodeBase64(encryptedData.encrypted),
      decodeBase64(encryptedData.nonce),
      sharedKey
    );
    if (!decryptedMessage) {
      throw new Error('Failed to decrypt message');
    }
    return new TextDecoder().decode(decryptedMessage);
  },

  // Generate audit log entry
  generateAuditLog: (action, data) => {
    return {
      timestamp: Date.now(),
      action,
      data,
      hash: CryptoJS.SHA256(JSON.stringify({ action, data, timestamp: Date.now() })).toString()
    };
  },

  // New: Encrypt file using hybrid encryption (AES + asymmetric)
  encryptMessageHybrid: (message, recipientPublicKey, senderPrivateKey) => {
    const symmetricKey = CryptoService.generateMessageKey();
    const encryptedMessage = CryptoService.encryptMessage(message, symmetricKey);
    const encryptedKeyObj = CryptoService.encryptAsymmetric(symmetricKey, recipientPublicKey, senderPrivateKey);
    return JSON.stringify({
      encryptedMessage,
      encryptedKey: encryptedKeyObj.encrypted,
      nonce: encryptedKeyObj.nonce,
    });
  },

  // New: Decrypt message using hybrid decryption
  decryptMessageHybrid: (payload, senderPublicKey, recipientPrivateKey) => {
    try {
      const parsed = JSON.parse(payload);
      const symmetricKey = CryptoService.decryptAsymmetric(
        { encrypted: parsed.encryptedKey, nonce: parsed.nonce },
        senderPublicKey,
        recipientPrivateKey
      );
      return CryptoService.decryptMessage(parsed.encryptedMessage, symmetricKey);
    } catch (error) {
      throw new Error("Hybrid decryption failed: " + error.message);
    }
  },

  // Existing file encryption feature
  encryptFile: async (fileData) => {
    try {
      const key = await CryptoService.generateMessageKey();
      const wordArray = CryptoJS.lib.WordArray.create(fileData);
      const encrypted = CryptoService.encryptMessage(wordArray, key);
      return {
        encryptedData: encrypted,
        key: key
      };
    } catch (error) {
      console.error('Error encrypting file:', error);
      throw new Error('File encryption failed');
    }
  },

  // Existing file decryption feature
  decryptFile: async (encryptedData, key) => {
    try {
      const decrypted = CryptoService.decryptMessage(encryptedData, key);
      const wordArray = CryptoJS.enc.Base64.parse(decrypted);
      return wordArray.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Error decrypting file:', error);
      throw new Error('File decryption failed');
    }
  },

  // New: Encrypt file with hash verification for document integrity
  encryptFileWithHash: async (fileData) => {
    try {
      const { encryptedData, key } = await CryptoService.encryptFile(fileData);
      const fileHash = CryptoJS.SHA256(encryptedData).toString();
      return { encryptedData, key, hash: fileHash };
    } catch (error) {
      console.error('Error in encryptFileWithHash:', error);
      throw new Error('File encryption with hash failed');
    }
  },

  // New: Decrypt file with hash validation—checks file integrity before decryption
  decryptFileWithHash: async (encryptedData, key, expectedHash) => {
    try {
      const currentHash = CryptoJS.SHA256(encryptedData).toString();
      if (currentHash !== expectedHash) {
        throw new Error('File integrity check failed: Hash mismatch');
      }
      const decryptedData = await CryptoService.decryptFile(encryptedData, key);
      return decryptedData;
    } catch (error) {
      console.error('Error in decryptFileWithHash:', error);
      throw error;
    }
  },

  // Generate patient's encryption key pair
  generatePatientKeyPair: () => {
    try {
      const keyPair = box.keyPair();
      const publicKey = encodeBase64(keyPair.publicKey);
      const privateKey = encodeBase64(keyPair.secretKey);
      
      // Store keys securely in localStorage
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
  },

  // Get patient's stored keys
  getPatientKeys: () => {
    try {
      const storedKeys = localStorage.getItem('patientKeys');
      if (!storedKeys) {
        return CryptoService.generatePatientKeyPair();
      }
      
      const keys = JSON.parse(storedKeys);
      // Verify keys integrity
      const verifyHash = CryptoJS.SHA256(keys.publicKey + keys.privateKey).toString();
      if (verifyHash !== keys.hash) {
        throw new Error('Keys integrity check failed');
      }
      
      return keys;
    } catch (error) {
      console.error('Error retrieving patient keys:', error);
      // If there's any error, generate new keys
      return CryptoService.generatePatientKeyPair();
    }
  },

  // Encrypt file with patient's public key and hash
  encryptFileWithPatientKey: async (fileData) => {
    try {
      const { publicKey } = CryptoService.getPatientKeys();
      
      // Generate a unique symmetric key for this file
      const symmetricKey = await CryptoService.generateMessageKey();
      
      // Encrypt file with symmetric key
      const wordArray = CryptoJS.lib.WordArray.create(fileData);
      const encryptedData = CryptoService.encryptMessage(wordArray, symmetricKey);
      
      // Encrypt symmetric key with patient's public key
      const encryptedKey = CryptoService.encryptAsymmetric(
        symmetricKey,
        publicKey,
        publicKey // In this case, sender and recipient are the same (patient)
      );
      
      // Generate hash of encrypted data
      const hash = CryptoJS.SHA256(encryptedData).toString();
      
      return {
        encryptedData,
        encryptedKey,
        hash,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error encrypting file with patient key:', error);
      throw new Error('File encryption failed');
    }
  },

  // Decrypt file with patient's private key and verify hash
  decryptFileWithPatientKey: async (encryptedData, encryptedKey, expectedHash) => {
    try {
      // First verify the hash
      const currentHash = CryptoJS.SHA256(encryptedData).toString();
      if (currentHash !== expectedHash) {
        throw new Error('File integrity check failed: Hash mismatch');
      }
      
      const { privateKey, publicKey } = CryptoService.getPatientKeys();
      
      // Decrypt the symmetric key
      const symmetricKey = CryptoService.decryptAsymmetric(
        encryptedKey,
        publicKey, // In this case, sender and recipient are the same (patient)
        privateKey
      );
      
      // Decrypt the file data
      const decrypted = CryptoService.decryptMessage(encryptedData, symmetricKey);
      const wordArray = CryptoJS.enc.Base64.parse(decrypted);
      
      return wordArray.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Error decrypting file with patient key:', error);
      throw error;
    }
  },
};
