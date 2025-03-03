import React, { useState, useEffect } from 'react';
import styles from './HIPAACompliance.module.css';
import { IPFSService } from '../../Utils/IPFSService';
import { encryptFileWithPassphrase, decryptFileWithPassphrase } from '../../Utils/CryptoService';
import CryptoJS from 'crypto-js';

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

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const MedicalFileUpload = ({ onUpload, account }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [showDecryptionKey, setShowDecryptionKey] = useState(false);
  const [generatedPassphrase, setGeneratedPassphrase] = useState('');

  useEffect(() => {
    if (account) {
      const secureStorage = JSON.parse(localStorage.getItem('secureFileStorage') || '{}');
      const userFiles = Object.values(secureStorage).filter(file => file.owner === account);
      setUploadedFiles(userFiles);
    } else {
      setUploadedFiles([]);
    }
  }, [account]);

  const handleFileSelect = (event) => {
    try {
      const selectedFiles = Array.from(event.target.files || []);
      const invalidFiles = selectedFiles.filter(file => !allowedFileTypes.includes(file.type));
      const oversizedFiles = selectedFiles.filter(file => file.size > MAX_FILE_SIZE);
      
      if (invalidFiles.length > 0) {
        setError(`Some files have invalid types. Allowed types: PDF, ZIP, Images.`);
        return;
      }
      if (oversizedFiles.length > 0) {
        setError(`Some files exceed the 50MB size limit.`);
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
      setError(`Some files have invalid types. Allowed types: PDF, ZIP, Images.`);
      return;
    }
    if (oversizedFiles.length > 0) {
      setError(`Some files exceed the 50MB size limit.`);
      return;
    }
    
    setFiles(selectedFiles);
    setError('');
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

  return (
    <div className={styles.compactUploadContainer}>
      <div className={styles.uploadHeader}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <h3>Upload Medical Files</h3>
      </div>
      
      <div className={styles.compactUploadArea}>
        <div 
          className={styles.compactDropZone}
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
          <p>Drag files here or click to browse</p>
          <input
            id="fileInput"
            type="file"
            multiple
            onChange={handleFileSelect}
            accept={allowedFileTypes.join(',')}
            className={styles.fileInput}
          />
          <span className={styles.uploadHint}>PDF, JPEG, PNG, GIF, DICOM, ZIP (max 50MB)</span>
        </div>

        {files.length > 0 && (
          <div className={styles.selectedFilesContainer}>
            <div className={styles.selectedFilesHeader}>
              <h4>Selected Files</h4>
              <span>{files.length} file(s)</span>
            </div>
            <ul className={styles.selectedFilesList}>
              {files.map((file, index) => (
                <li key={index} className={styles.selectedFileItem}>
                  <div className={styles.fileTypeIcon}>
                    {file.type.includes('pdf') ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                      </svg>
                    ) : file.type.includes('image') ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                        <polyline points="13 2 13 9 20 9"></polyline>
                      </svg>
                    )}
                  </div>
                  <div className={styles.fileDetails}>
                    <span className={styles.fileName}>{file.name}</span>
                    <span className={styles.fileSize}>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {uploading && (
          <div className={styles.progressContainer}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
            <span className={styles.progressText}>{progress.toFixed(0)}% Complete</span>
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
              <div className={styles.buttonSpinner}></div>
              Processing...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              Upload Securely
            </>
          )}
        </button>
      </div>

      {showDecryptionKey && (
        <div className={styles.decryptionKeyModal}>
          <div className={styles.decryptionKeyContent}>
            <h4>IMPORTANT: Your Decryption Key</h4>
            <p>Please save this key securely – you will need it to decrypt your files:</p>
            <div className={styles.keyContainer}>
              <pre>{generatedPassphrase}</pre>
              <button 
                className={styles.copyButton}
                onClick={() => {
                  navigator.clipboard.writeText(generatedPassphrase);
                  alert('Decryption key copied to clipboard!');
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Copy
              </button>
            </div>
            <div className={styles.modalActions}>
              <button onClick={() => setShowDecryptionKey(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicalFileUpload;