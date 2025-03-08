import React, { useState, useEffect } from 'react';
import styles from './HIPAACompliance.module.css';
import { IPFSService } from '../../Utils/IPFSService';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const MedicalFileUpload = ({ onUpload, account }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [showHashKey, setShowHashKey] = useState(false);
  const [fileHashKey, setFileHashKey] = useState('');

  useEffect(() => {
    if (account) {
      const fileStorage = JSON.parse(localStorage.getItem('fileStorage') || '{}');
      const userFiles = Object.values(fileStorage).filter(file => file.owner === account);
      setUploadedFiles(userFiles);
    } else {
      setUploadedFiles([]);
    }
  }, [account]);

  const handleFileSelect = (event) => {
    try {
      const selectedFiles = Array.from(event.target.files || []);
      const oversizedFiles = selectedFiles.filter(file => file.size > MAX_FILE_SIZE);
      
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
    const oversizedFiles = selectedFiles.filter(file => file.size > MAX_FILE_SIZE);
    
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
      const uploadedFilesArray = [];
      const hashKeys = [];
  
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
  
        setProgress((i / files.length) * 50);
  
        // Upload file to IPFS
        const result = await IPFSService.uploadFile(file);
        if (!result.success) {
          throw new Error(result.error || 'Upload failed');
        }
  
        // Verify file integrity by fetching it back
        const fetchResult = await IPFSService.getFile(result.cid);
        if (!fetchResult.success) {
          throw new Error('File verification failed');
        }
  
        const fileMetadata = {
          cid: result.cid,
          name: file.name,
          type: file.type,
          size: file.size,
          timestamp: Date.now(),
          owner: account
        };
  
        hashKeys.push(result.cid);
  
        // Store file metadata in localStorage
        try {
          const fileStorage = JSON.parse(localStorage.getItem('fileStorage') || '{}');
          fileStorage[result.cid] = fileMetadata;
          localStorage.setItem('fileStorage', JSON.stringify(fileStorage));
        } catch (storageError) {
          console.error('Failed to store file details:', storageError);
        }
  
        uploadedFilesArray.push(fileMetadata);
        setProgress(50 + (i / files.length) * 50);
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
  
      setFileHashKey(hashKeys.join(', '));
      setShowHashKey(true);
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
            className={styles.fileInput}
          />
          <span className={styles.uploadHint}>All file types supported (max 50MB)</span>
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
              Upload to IPFS
            </>
          )}
        </button>
      </div>

      {showHashKey && (
        <div className={styles.decryptionKeyModal}>
          <div className={styles.decryptionKeyContent}>
            <h4>IMPORTANT: Your IPFS Hash Key</h4>
            <p>Please save this hash key securely – you will need it to access your files:</p>
            <div className={styles.keyContainer}>
              <pre>{fileHashKey}</pre>
              <button 
                className={styles.copyButton}
                onClick={() => {
                  navigator.clipboard.writeText(fileHashKey);
                  alert('IPFS hash key copied to clipboard!');
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
              <button onClick={() => setShowHashKey(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicalFileUpload;