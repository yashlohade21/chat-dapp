import React, { useState, useEffect } from 'react';
import styles from './HIPAACompliance.module.css';
import { IPFSService } from '../../Utils/IPFSService';
import { encryptFileWithPassphrase, decryptFileWithPassphrase } from '../../Utils/CryptoService';
import CryptoJS from 'crypto-js';
import { documentDetectionService } from '../../Utils/DocumentDetectionService';

const allowedFileTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/dicom',
  'image/gif',
  '.dcm'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const arrayBufferToBase64 = (buffer) => {
  if (!buffer) {
    console.error('arrayBufferToBase64 received undefined buffer');
    return null;
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

// const base64ToArrayBuffer = (base64) => {
//   const binary_string = window.atob(base64);
//   const bytes = new Uint8Array(binary_string.length);
//   for (let i = 0; i < binary_string.length; i++) {
//     bytes[i] = binary_string.charCodeAt(i);
//   }
//   return bytes.buffer;
// };

const MedicalFileUpload = ({ onUpload, account }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [decryptedFiles, setDecryptedFiles] = useState([]);
  const [decrypting, setDecrypting] = useState(false);
  const [showDecryptionKey, setShowDecryptionKey] = useState(false);
  const [generatedPassphrase, setGeneratedPassphrase] = useState('');

  useEffect(() => {
    if (account) {
      const secureStorage = JSON.parse(localStorage.getItem('secureFileStorage') || '{}');
      const userFiles = Object.values(secureStorage).filter(file => file.owner === account);
      setUploadedFiles(userFiles);
      setDecryptedFiles([]);
    } else {
      setUploadedFiles([]);
      setDecryptedFiles([]);
    }
  }, [account]);

  const handleFileSelect = (event) => {
    try {
      const selectedFiles = Array.from(event.target.files || []);
      const invalidFiles = selectedFiles.filter(file => !allowedFileTypes.includes(file.type));
      const oversizedFiles = selectedFiles.filter(file => file.size > MAX_FILE_SIZE);
      if (invalidFiles.length > 0) {
        setError('Some files have invalid types. Please upload only supported file types.');
        return;
      }
      if (oversizedFiles.length > 0) {
        setError('Some files exceed the 10MB size limit.');
        return;
      }
      setFiles(selectedFiles);
      setError('');
    } catch (err) {
      console.error('Error selecting files:', err);
      setError('Error selecting files. Please try again.');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add(styles.active);
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove(styles.active);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove(styles.active);
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleFiles = (selectedFiles) => {
    const invalidFiles = selectedFiles.filter(file => !allowedFileTypes.includes(file.type));
    const oversizedFiles = selectedFiles.filter(file => file.size > MAX_FILE_SIZE);
    
    if (invalidFiles.length > 0) {
      setError('Some files have invalid types. Please upload only supported file types.');
      return;
    }
    if (oversizedFiles.length > 0) {
      setError('Some files exceed the 10MB size limit.');
      return;
    }
    setFiles(selectedFiles);
    setError('');
  };

  const detectFakeDocument = (file) => {
    const requiredKeywords = ["medical", "patient", "report", "hospital", "diagnosis"];
    const lowerName = file.name.toLowerCase();
    return !requiredKeywords.some(keyword => lowerName.includes(keyword));
  };

  const handleUpload = async () => {
    if (!files.length || !account) {
      setError(files.length ? 'Please connect your wallet' : 'Please select files');
      return;
    }

    setUploading(true);
    setProgress(0);
    setError('');

    try {
      const randomKey = CryptoJS.lib.WordArray.random(32).toString();
      setGeneratedPassphrase(randomKey);

      const uploadedFilesArray = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const detectionResult = await documentDetectionService.detectFakeDocument(file);
        if (!detectionResult.isReal) {
          throw new Error(`The document ${file.name} failed authenticity check (Confidence: ${Math.round(detectionResult.confidence * 100)}%)`);
        }
        setProgress((i / files.length) * 25);

        // Read file as ArrayBuffer
        const fileBuffer = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = (err) => reject(err);
          reader.readAsArrayBuffer(file);
        });

        if (!fileBuffer) {
          throw new Error('Failed to read file');
        }

        // Encrypt the file data
        const encryptResult = await encryptFileWithPassphrase(fileBuffer, randomKey);
        
        if (!encryptResult.success) {
          throw new Error(encryptResult.error || "Encryption failed");
        }

        // Create a Blob from the encrypted data
        const encryptedBlob = new Blob([encryptResult.encryptedData], { type: file.type });
        const encryptedFile = new File([encryptedBlob], file.name, { type: file.type });

        // Upload to IPFS
        const result = await IPFSService.uploadFile(encryptedFile);
        if (!result.success) {
          throw new Error(result.error || 'Upload failed');
        }

        const fileMetadata = {
          cid: result.cid,
          passphraseHash: encryptResult.passphraseHash,
          salt: encryptResult.salt,
          name: file.name,
          type: file.type,
          size: file.size,
          timestamp: Date.now(),
          owner: account
        };

        try {
          const secureStorage = JSON.parse(localStorage.getItem('secureFileStorage') || '{}');
          secureStorage[result.cid] = fileMetadata;
          localStorage.setItem('secureFileStorage', JSON.stringify(secureStorage));
        } catch (storageError) {
          console.error('Failed to store encryption details:', storageError);
        }

        uploadedFilesArray.push(fileMetadata);
        setProgress(75 + (i / files.length) * 25);
      }

      setUploadedFiles(prev => {
        const userFiles = prev.filter(file => file.owner === account);
        return [...userFiles, ...uploadedFilesArray];
      });

      if (onUpload) {
        await onUpload(uploadedFilesArray);
      }

      setFiles([]);
      setProgress(100);
      alert(`File(s) uploaded successfully!\nYour decryption key: ${randomKey}\n\nPlease save this key securely - you'll need it to view your files.`);
      setShowDecryptionKey(true);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Error uploading files: ' + (err.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const base64ToArrayBuffer = (base64) => {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };
  
  const handleDecrypt = async (file, providedKey) => {
    if (!account) {
      setError('Please connect your wallet to view documents');
      return;
    }
  
    if (file.owner !== account) {
      setError('You are not authorized to view this document');
      return;
    }
  
    setDecrypting(true);
    setError('');
  
    try {
      const response = await IPFSService.getFile(file.cid);
      if (!response.success) {
        throw new Error(`Failed to fetch file ${file.name} from IPFS`);
      }
  
      const decryptionResult = await decryptFileWithPassphrase(
        response.data,
        providedKey,
        file.passphraseHash,
        file.salt
      );
  
      if (!decryptionResult.success) {
        throw new Error(decryptionResult.error || "Decryption failed");
      }
  
      // Convert base64 to ArrayBuffer
      const arrayBuffer = base64ToArrayBuffer(decryptionResult.decryptedData);
  
      // Create a Blob from the ArrayBuffer
      const blob = new Blob([arrayBuffer], { type: file.type });
  
      // Create a URL for the Blob
      const url = URL.createObjectURL(blob);
  
      setDecryptedFiles((prev) => [
        ...prev,
        {
          cid: file.cid,
          name: file.name,
          type: file.type,
          content: url, // Use the Blob URL for rendering
        },
      ]);
    } catch (err) {
      console.error('Decryption error:', err);
      setError('Error decrypting file. Please make sure you entered the correct key.');
    } finally {
      setDecrypting(false);
    }
  };

  return (
    <div className={styles.uploadContainer}>
      <h3>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        Secure Medical File Upload
      </h3>
      
      <div className={styles.uploadArea}>
        <div 
          className={styles.dropZone}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('fileInput').click()}
        >
          <svg className={styles.uploadIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <p>Drag and drop your files here or click to browse</p>
          <input
            id="fileInput"
            type="file"
            multiple
            onChange={(e) => handleFiles(Array.from(e.target.files || []))}
            accept={allowedFileTypes.join(',')}
            disabled={uploading}
            className={styles.fileInput}
          />
        </div>

        <div className={styles.uploadInfo}>
          <p>Accepted formats: PDF, JPEG, PNG, GIF, DICOM</p>
          <p>Maximum file size: 10MB</p>
        </div>

        {files.length > 0 && (
          <div className={styles.selectedFiles}>
            <h4>Selected Files:</h4>
            <ul>
              {files.map((file, index) => (
                <li key={index}>
                  <span>{file.name}</span>
                  <span>({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {uploading && (
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            <span>{progress}% Complete</span>
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        <button
          onClick={handleUpload}
          disabled={files.length === 0 || uploading}
          className={styles.uploadButton}
        >
          {uploading ? (
            <>
              <svg className={styles.spinner} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
              </svg>
              Processing...
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              Upload Securely
            </>
          )}
        </button>
      </div>

      {uploadedFiles.length > 0 && (
        <div className={styles.uploadedFiles}>
          <h4>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
              <polyline points="13 2 13 9 20 9"></polyline>
            </svg>
            Your Uploaded Documents
          </h4>
          <ul>
            {uploadedFiles.map((file) => (
              <li key={file.cid} className={styles.uploadedFile}>
                <div className={styles.fileInfo}>
                  <span>{file.name}</span>
                  <span>({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
                <button
                  onClick={() => {
                    const providedKey = window.prompt("Please enter your decryption key to view this document:");
                    if (providedKey) handleDecrypt(file, providedKey);
                  }}
                  disabled={decrypting}
                  className={styles.decryptButton}
                >
                  {decrypting ? 'Decrypting...' : 'View Document'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {decryptedFiles.map((file) => (
        <li key={file.cid} className={styles.decryptedFile}>
          <h5>{file.name}</h5>
          <div className={styles.fileContent}>
            {file.type === 'application/pdf' ? (
              <iframe
                src={file.content}
                width="100%"
                height="600px"
                title={file.name}
                className={styles.pdfViewer}
              />
            ) : (
              <a href={file.content} download={file.name} className={styles.downloadLink}>
                Download {file.name}
              </a>
            )}
          </div>
        </li>
      ))}

      {showDecryptionKey && (
        <div className={styles.decryptionKeyModal}>
          <h4>IMPORTANT: Your Decryption Key</h4>
          <p>Please save this key securely – you will need it to decrypt your files:</p>
          <pre>{generatedPassphrase}</pre>
          <button onClick={() => setShowDecryptionKey(false)}>Close</button>
        </div>
      )}
    </div>
  );
};

export default MedicalFileUpload;