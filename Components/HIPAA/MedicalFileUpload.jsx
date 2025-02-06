import React, { useState, useEffect } from 'react';
import styles from './HIPAACompliance.module.css';
import { IPFSService } from '../../Utils/IPFSService';
import { CryptoService } from '../../Utils/CryptoService';
import CryptoJS from 'crypto-js';

const allowedFileTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/dicom',
  '.dcm'
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const MedicalFileUpload = ({ onUpload }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [patientKeys, setPatientKeys] = useState(null);
  const [hashInput, setHashInput] = useState('');
  const [showEncryptionKey, setShowEncryptionKey] = useState(false);
  const [uploadedHash, setUploadedHash] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [decryptedFiles, setDecryptedFiles] = useState([]);
  const [decrypting, setDecrypting] = useState(false);

  useEffect(() => {
    try {
      const keys = CryptoService.getPatientKeys();
      setPatientKeys(keys);
    } catch (err) {
      setError('Error initializing encryption keys');
    }
  }, []);

  const handleFileSelect = (event) => {
    try {
      const selectedFiles = Array.from(event.target.files || []);
      const invalidFiles = selectedFiles.filter(
        file => !allowedFileTypes.includes(file.type)
      );
      const oversizedFiles = selectedFiles.filter(
        file => file.size > MAX_FILE_SIZE
      );
      if (invalidFiles.length > 0) {
        setError('Some files have invalid types. Please upload only medical images, PDFs, or DICOM files.');
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

  const handleHashSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!hashInput.trim()) {
        setError('Please enter your hash key');
        return;
      }
      const storedKeys = CryptoService.getPatientKeys();
      const verifyHash = CryptoJS.SHA256(storedKeys.publicKey + storedKeys.privateKey).toString();
      if (hashInput === verifyHash) {
        setShowEncryptionKey(true);
        setError('');
        alert('Hash verified successfully!');
      } else {
        setError('Invalid hash key. Please try again.');
        setShowEncryptionKey(false);
      }
    } catch (err) {
      console.error('Hash verification error:', err);
      setError('Error verifying hash key');
    }
  };

  const handleUpload = async () => {
    if (!files.length) {
      setError('Please select files to upload');
      return;
    }
    if (!patientKeys) {
      setError('Encryption keys not available');
      return;
    }
    setUploading(true);
    setProgress(0);
    setError('');
    const uploadedFilesArray = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress((i / files.length) * 25);
        const fileData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsArrayBuffer(file);
        });
        setProgress(25 + (i / files.length) * 25);
        const { encryptedData, encryptedKey, hash } = await CryptoService.encryptFileWithPatientKey(fileData);
        const encryptedFile = new File([encryptedData], file.name, { type: file.type });
        setProgress(50 + (i / files.length) * 25);
        const result = await IPFSService.uploadFile(encryptedFile);
        if (!result.success) {
          throw new Error(result.error || 'Upload failed');
        }
        try {
          const secureStorage = JSON.parse(localStorage.getItem('secureFileStorage') || '{}');
          secureStorage[result.cid] = {
            cid: result.cid,
            encryptedKey,
            hash,
            name: file.name,
            type: file.type,
            size: file.size,
            timestamp: Date.now()
          };
          localStorage.setItem('secureFileStorage', JSON.stringify(secureStorage));
        } catch (storageError) {
          console.error('Failed to store encryption details:', storageError);
        }
        uploadedFilesArray.push({
          cid: result.cid,
          name: file.name,
          type: file.type,
          size: file.size,
          timestamp: Date.now(),
          hash
        });
        setProgress(75 + (i / files.length) * 25);
      }
      setUploadedFiles(uploadedFilesArray);
      if (onUpload) {
        await onUpload(uploadedFilesArray);
      }
      setFiles([]);
      setProgress(100);
      setTimeout(() => setProgress(0), 1000);
      const verificationHash = CryptoJS.SHA256(patientKeys.publicKey + patientKeys.privateKey).toString();
      setUploadedHash(verificationHash);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Error uploading files: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDecryptFiles = async () => {
    if (!showEncryptionKey) {
      setError('Please verify your hash key first');
      return;
    }

    setDecrypting(true);
    setError('');
    
    const secureStorage = JSON.parse(localStorage.getItem('secureFileStorage') || '{}');
    const decryptedArray = [];
    
    try {
      for (const file of uploadedFiles) {
        try {
          setProgress((decryptedArray.length / uploadedFiles.length) * 100);
          
          const response = await IPFSService.getFile(file.cid);
          if (!response.success) {
            throw new Error(`Failed to fetch file ${file.name} from IPFS`);
          }
          
          const fileInfo = secureStorage[file.cid];
          if (!fileInfo) {
            throw new Error(`Encryption details missing for file: ${file.name}`);
          }
          
          const decryptedContent = await CryptoService.decryptFileWithPatientKey(
            response.data,
            fileInfo.encryptedKey,
            fileInfo.hash
          );
          
          decryptedArray.push({
            cid: file.cid,
            name: file.name,
            type: file.type,
            content: decryptedContent
          });
        } catch (fileError) {
          console.error(`Error decrypting ${file.name}:`, fileError);
          setError(prev => prev + `\nFailed to decrypt ${file.name}: ${fileError.message}`);
        }
      }
      
      if (decryptedArray.length > 0) {
        setDecryptedFiles(decryptedArray);
      }
    } catch (err) {
      console.error('Decryption error:', err);
      setError('Error during decryption: ' + err.message);
    } finally {
      setDecrypting(false);
      setProgress(0);
    }
  };

  return (
    <div className={styles.uploadContainer}>
      <h3>Secure Medical File Upload</h3>
      <div className={styles.uploadArea}>
        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          accept={allowedFileTypes.join(',')}
          disabled={uploading}
          className={styles.fileInput}
        />
        <div className={styles.uploadInfo}>
          <p>Accepted formats: PDF, JPEG, PNG, DICOM</p>
          <p>Maximum file size: 10MB</p>
          <p>Files will be encrypted before upload</p>
          <p><strong>Note:</strong> After upload, you'll receive a hash key to decrypt your files later.</p>
        </div>
        {files.length > 0 && (
          <div className={styles.selectedFiles}>
            <h4>Selected Files:</h4>
            <ul>
              {files.map((file, index) => (
                <li key={index}>
                  {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
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
        <button
          onClick={handleUpload}
          disabled={files.length === 0 || uploading}
          className={styles.uploadButton}
        >
          {uploading ? 'Processing...' : 'Upload Securely'}
        </button>
        {uploadedHash && (
          <div className={styles.hashResult}>
            <h4>Your File Decryption Hash Key</h4>
            <div className={styles.hashDisplay}>
              <p>{uploadedHash}</p>
            </div>
            <p className={styles.warning}>
              ⚠️ Save this hash key! You'll need it to decrypt your files later.
            </p>
          </div>
        )}
      </div>

      <div className={styles.hashSection}>
        <h4>Verify Your Hash Key</h4>
        <form onSubmit={handleHashSubmit} className={styles.hashForm}>
          <input
            type="text"
            value={hashInput}
            onChange={(e) => setHashInput(e.target.value)}
            placeholder="Enter your hash key"
            className={styles.hashInput}
          />
          <button type="submit" className={styles.verifyButton}>
            Verify Hash
          </button>
        </form>
      </div>

      {showEncryptionKey && patientKeys && (
        <div className={styles.keysSection}>
          <h4>Your Encryption Keys</h4>
          <div className={styles.keyDisplay}>
            <p><strong>Public Key:</strong> {patientKeys.publicKey}</p>
            <p><strong>Private Key:</strong> {patientKeys.privateKey}</p>
            <p className={styles.warning}>
              ⚠️ Keep these keys safe! You'll need them to decrypt your files.
            </p>
          </div>
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className={styles.decryptSection}>
          <button 
            onClick={handleDecryptFiles} 
            className={styles.decryptButton}
            disabled={decrypting || !showEncryptionKey}
          >
            {decrypting ? 'Decrypting...' : 'Decrypt Files'}
          </button>
          {decrypting && (
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill} 
                style={{ width: `${progress}%` }}
              />
              <span>Decrypting: {progress}% Complete</span>
            </div>
          )}
        </div>
      )}

      {decryptedFiles.length > 0 && (
        <div className={styles.decryptedFilesSection}>
          <h4>Decrypted Files</h4>
          <ul>
            {decryptedFiles.map((file) => (
              <li key={file.cid} className={styles.decryptedFile}>
                <h5>{file.name}</h5>
                <div className={styles.fileContent}>
                  {file.type.startsWith('image') ? (
                    <img 
                      src={`data:${file.type};base64,${file.content}`} 
                      alt={file.name} 
                      className={styles.decryptedImage}
                    />
                  ) : file.type === 'application/pdf' ? (
                    <iframe 
                      title={file.name} 
                      src={`data:${file.type};base64,${file.content}`} 
                      className={styles.decryptedPdf}
                    />
                  ) : (
                    <pre className={styles.decryptedText}>{file.content}</pre>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
};

export default MedicalFileUpload;
