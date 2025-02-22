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
  '.dcm',
  'application/zip',
  'application/x-zip-compressed'
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // Increased to 50MB to accommodate ZIP files

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
  const [epochProgress, setEpochProgress] = useState({ current: 0, total: 50 });

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
        setError(`Some files have invalid types. Allowed types: PDF, ZIP, Images. Invalid files: ${invalidFiles.map(f => f.name).join(', ')}`);
        return;
      }
      if (oversizedFiles.length > 0) {
        setError(`Some files exceed the 50MB size limit: ${oversizedFiles.map(f => f.name).join(', ')}`);
        setError('Some files exceed the 50MB size limit.');
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
      setError(`Some files have invalid types. Allowed types: PDF, ZIP, Images. Invalid files: ${invalidFiles.map(f => f.name).join(', ')}`);
      return;
    }
    if (oversizedFiles.length > 0) {
      setError(`Some files exceed the 50MB size limit: ${oversizedFiles.map(f => f.name).join(', ')}`);
      setError('Some files exceed the 50MB size limit.');
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
        
        setProgress((i / files.length) * 25);

        const fileData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        if (!fileData) {
          throw new Error('Failed to read file');
        }

        const encryptResult = await encryptFileWithPassphrase(fileData, randomKey);
        
        if (!encryptResult.success) {
          throw new Error(encryptResult.error || "Encryption failed");
        }

        const fileMetadata = {
          cid: null,
          passphraseHash: encryptResult.passphraseHash,
          salt: encryptResult.salt,
          prefix: encryptResult.prefix,
          name: file.name,
          type: file.type,
          size: file.size,
          timestamp: Date.now(),
          owner: account
        };

        const encryptedBlob = new Blob([encryptResult.encryptedData], { 
          type: 'application/octet-stream' 
        });
        
        const encryptedFile = new File([encryptedBlob], file.name, { 
          type: 'application/octet-stream' 
        });

        const result = await IPFSService.uploadFile(encryptedFile);
        if (!result.success) {
          throw new Error(result.error || 'Upload failed');
        }

        fileMetadata.cid = result.cid;

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
      setShowDecryptionKey(true);
      alert(`File(s) uploaded successfully!\nYour decryption key: ${randomKey}\n\nPlease save this key securely - you'll need it to view your files.`);
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
      console.log('Fetching file from IPFS:', file.cid);
      const response = await IPFSService.getFile(file.cid);
      if (!response.success) {
        throw new Error(`Failed to fetch file ${file.name} from IPFS: ${response.error}`);
      }
      console.log('File fetched successfully');

      console.log('Attempting decryption...');
      const decryptionResult = await decryptFileWithPassphrase(
        response.data,
        providedKey,
        file.passphraseHash,
        file.salt
      );

      if (!decryptionResult.success) {
        throw new Error(decryptionResult.error || "Decryption failed");
      }
      console.log('Decryption successful');

      const decryptedData = file.prefix 
        ? file.prefix + decryptionResult.decryptedData 
        : decryptionResult.decryptedData;

      const base64Data = file.prefix 
        ? decryptedData.split(',')[1] 
        : decryptedData;

      const binaryString = window.atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: file.type });
      const url = URL.createObjectURL(blob);

      setDecryptedFiles(prev => [...prev, {
        ...file,
        content: url
      }]);

      setTimeout(() => {
        setDecryptedFiles(prev => {
          prev.forEach(f => {
            if (f.cid !== file.cid && f.content?.startsWith('blob:')) {
              URL.revokeObjectURL(f.content);
            }
          });
          return prev.filter(f => f.cid === file.cid);
        });
      }, 2000);

    } catch (err) {
      console.error('Decryption error:', err);
      setError(`Error: ${err.message || 'Failed to decrypt file'}. Please make sure you entered the correct key.`);
    } finally {
      setDecrypting(false);
    }
  };

  useEffect(() => {
    return () => {
      decryptedFiles.forEach(file => {
        if (file.content && file.content.startsWith('blob:')) {
          URL.revokeObjectURL(file.content);
        }
      });
    };
  }, [decryptedFiles]);

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
          />
        </div>

        <div className={styles.uploadInfo}>
          <p>Accepted formats: PDF, ZIP, Images</p>
          <p>Maximum file size: 50MB</p>
            disabled={uploading}
            className={styles.fileInput}
          <p>Accepted formats: PDF, JPEG, PNG, GIF, DICOM, ZIP</p>
          <p>Maximum file size: 50MB</p>
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
          <div className={styles.progressContainer}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
              <span>{progress}% Complete</span>
            </div>
            
            {epochProgress.current > 0 && (
              <div className={styles.epochProgress}>
                <div className={styles.epochBar}>
                  <div 
                    className={styles.epochFill} 
                    style={{ width: `${(epochProgress.current / epochProgress.total) * 100}%` }} 
                  />
                </div>
                <span>AI Processing: Epoch {epochProgress.current}/{epochProgress.total}</span>
              </div>
            )}
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

      {decryptedFiles.length > 0 && (
        <div className={styles.previewContainer}>
          <h4>Decrypted File Preview</h4>
          {decryptedFiles.map((file) => (
            <div key={file.cid} className={styles.previewItem}>
              <h5>{file.name}</h5>
              <div className={styles.previewContent}>
                {file.type === 'application/pdf' ? (
                  <iframe
                    src={file.content}
                    className={styles.pdfPreview}
                    title={file.name}
                  />
                ) : file.type.startsWith('image/') ? (
                  <img 
                    src={file.content} 
                    alt={file.name}
                    className={styles.imagePreview}
                  />
                ) : (
                  <div className={styles.fileInfo}>
                    <p>File type: {file.type}</p>
                    <p>Size: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    <a 
                      href={file.content} 
                      download={file.name}
                      className={styles.downloadLink}
                    >
                      Download File
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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