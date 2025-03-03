import React, { useState, useEffect, useContext } from 'react';
import styles from './PatientSettingsForm.module.css';
import MedicalFileUpload from '../HIPAA/MedicalFileUpload';
import { connectingWithContract } from '../../Utils/apiFeature';
import { ChatAppContect } from '../../Context/ChatAppContext';
import { decryptFileWithPassphrase } from '../../Utils/CryptoService';
import { IPFSService } from '../../Utils/IPFSService';

const PatientSettingsForm = ({ onDocumentsUpdate, initialDocuments = [], initialFormData = null }) => {
  const { account, savePatientData, loadPatientData, patientDataLoading } = useContext(ChatAppContect) || {};
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [decryptionKey, setDecryptionKey] = useState('');
  const [decryptedContent, setDecryptedContent] = useState(null);
  const [decrypting, setDecrypting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!account) return;
      try {
        setLoading(true);
        const result = await loadPatientData?.(account);
        if (result && result.data) {
          setUploadedDocs(result.data.documents || []);
        }
        const secureStorage = JSON.parse(localStorage.getItem('secureFileStorage') || '{}');
        const userDocs = Object.values(secureStorage).filter(doc => doc.owner === account);
        setUploadedDocs(userDocs);
      } catch (error) {
        console.error('Error loading patient data:', error);
        setError('Failed to load patient data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [account, loadPatientData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!account) {
      setError('Please connect your wallet to save settings');
      return;
    }
    setError('');
    setSuccess('');
    
    try {
      setLoading(true);
      // Update local document storage if needed
      const secureStorage = JSON.parse(localStorage.getItem('secureFileStorage') || '{}');
      uploadedDocs.forEach(doc => {
        secureStorage[doc.cid] = {
          ...doc,
          timestamp: Date.now(),
          owner: account
        };
      });
      localStorage.setItem('secureFileStorage', JSON.stringify(secureStorage));

      // Optionally update document CIDs on-chain if your contract supports it
      const contract = await connectingWithContract();
      if (contract && typeof contract.addDocumentCID === "function") {
        for (const doc of uploadedDocs) {
          try {
            const tx = await contract.addDocumentCID(doc.cid);
            await tx.wait();
          } catch (err) {
            console.error('Error adding document CID:', err);
          }
        }
      }

      setSuccess('Medical documents updated successfully!');
      if (onDocumentsUpdate) {
        onDocumentsUpdate(uploadedDocs);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Failed to save settings: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentClick = (doc) => {
    setSelectedDoc(doc);
    setDecryptedContent(null);
    setDecryptionKey('');
  };

  const closeDocumentPreview = () => {
    setSelectedDoc(null);
    setDecryptedContent(null);
    setDecryptionKey('');
  };

  const handleDecrypt = async () => {
    if (!selectedDoc || !decryptionKey) {
      setError('Please select a document and enter a decryption key');
      return;
    }

    setDecrypting(true);
    setError('');
    
    try {
      const response = await IPFSService.getFile(selectedDoc.cid);
      
      if (!response.success) {
        throw new Error(`Failed to fetch file from IPFS: ${response.error}`);
      }
      
      const decryptionResult = await decryptFileWithPassphrase(
        response.data,
        decryptionKey,
        selectedDoc.passphraseHash,
        selectedDoc.salt
      );

      if (!decryptionResult.success) {
        throw new Error(decryptionResult.error || "Decryption failed. Please check your key.");
      }

      const decryptedData = selectedDoc.prefix 
        ? selectedDoc.prefix + decryptionResult.decryptedData 
        : decryptionResult.decryptedData;

      setDecryptedContent(decryptedData);
      setSuccess('Document decrypted successfully!');
    } catch (error) {
      console.error('Decryption error:', error);
      setError(error.message || 'Failed to decrypt document');
    } finally {
      setDecrypting(false);
    }
  };

  const getDocumentIcon = (type) => {
    if (type.includes('pdf')) {
      return (
        <svg className={styles.docIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      );
    } else if (type.includes('image')) {
      return (
        <svg className={styles.docIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
      );
    } else {
      return (
        <svg className={styles.docIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
          <polyline points="13 2 13 9 20 9"></polyline>
        </svg>
      );
    }
  };

  return (
    <div className={styles.formContainer}>
      {error && (
        <div className={styles.error}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12" y2="16"></line>
          </svg>
          {error}
        </div>
      )}
      {success && (
        <div className={styles.success}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          {success}
        </div>
      )}
      <form onSubmit={handleSubmit} className={styles.form}>
        {loading && (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner}></div>
            <p>Saving your information securely...</p>
          </div>
        )}
        
        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
          <label>Medical Documents</label>
          <MedicalFileUpload onUpload={(docs) => { setUploadedDocs(docs); onDocumentsUpdate?.(docs); }} account={account} />
        </div>

        {uploadedDocs.length > 0 && (
          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <h3 className={styles.sectionTitle}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              Your Medical Documents
            </h3>
            <div className={styles.documentsGrid}>
              {uploadedDocs.map((doc) => (
                <div 
                  key={doc.cid} 
                  className={styles.documentCard}
                  onClick={() => handleDocumentClick(doc)}
                >
                  <div className={styles.documentIcon}>
                    {getDocumentIcon(doc.type)}
                  </div>
                  <div className={styles.documentInfo}>
                    <h4 className={styles.documentName}>{doc.name}</h4>
                    <p className={styles.documentMeta}>
                      <span className={styles.documentSize}>{(doc.size / 1024).toFixed(1)} KB</span>
                      <span className={styles.documentDate}>
                        {doc.timestamp ? new Date(doc.timestamp).toLocaleDateString() : 'Unknown date'}
                      </span>
                    </p>
                  </div>
                  <div className={styles.documentActions}>
                    <button 
                      className={styles.viewButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDocumentClick(doc);
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                      View
                    </button>
                    <button 
                      className={styles.decryptButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDocumentClick(doc);
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                      Decrypt
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Medical Documents'}
          </button>
        </div>
      </form>

      {selectedDoc && (
        <div className={styles.documentPreviewOverlay} onClick={closeDocumentPreview}>
          <div className={styles.documentPreviewContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.documentPreviewHeader}>
              <h3>{selectedDoc.name}</h3>
              <button className={styles.closeButton} onClick={closeDocumentPreview}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className={styles.documentPreviewBody}>
              <div className={styles.documentDetails}>
                <p><strong>Type:</strong> {selectedDoc.type}</p>
                <p><strong>Size:</strong> {(selectedDoc.size / 1024).toFixed(1)} KB</p>
                <p><strong>Uploaded:</strong> {selectedDoc.timestamp ? new Date(selectedDoc.timestamp).toLocaleString() : 'Unknown'}</p>
                <p><strong>CID:</strong> <span className={styles.cid}>{selectedDoc.cid}</span></p>
              </div>
              
              {!decryptedContent ? (
                <div className={styles.decryptionSection}>
                  <h4>Decrypt Document</h4>
                  <div className={styles.decryptionForm}>
                    <input 
                      type="password" 
                      placeholder="Enter decryption key" 
                      value={decryptionKey}
                      onChange={(e) => setDecryptionKey(e.target.value)}
                      className={styles.decryptionInput}
                    />
                    <button 
                      className={styles.decryptActionButton}
                      onClick={handleDecrypt}
                      disabled={decrypting || !decryptionKey}
                    >
                      {decrypting ? (
                        <>
                          <div className={styles.buttonSpinner}></div>
                          Decrypting...
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                          </svg>
                          Decrypt Document
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.previewContent}>
                  <h4>Document Preview</h4>
                  {selectedDoc.type.includes('image') ? (
                    <img 
                      src={decryptedContent} 
                      alt={selectedDoc.name} 
                      className={styles.previewImage}
                    />
                  ) : selectedDoc.type.includes('pdf') ? (
                    <div className={styles.pdfPreviewContainer}>
                      <iframe 
                        src={decryptedContent} 
                        className={styles.pdfPreview} 
                        title={selectedDoc.name}
                      />
                    </div>
                  ) : (
                    <div className={styles.genericPreview}>
                      <p>This file type cannot be previewed directly.</p>
                      <a 
                        href={decryptedContent} 
                        download={selectedDoc.name}
                        className={styles.downloadLink}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Download File
                      </a>
                    </div>
                  )}
                </div>
              )}
              
              <div className={styles.documentActions}>
                {!decryptedContent ? (
                  <button 
                    className={styles.viewDocumentButton}
                    onClick={handleDecrypt}
                    disabled={decrypting || !decryptionKey}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    View Document
                  </button>
                ) : (
                  <a 
                    href={decryptedContent} 
                    download={selectedDoc.name}
                    className={styles.downloadButton}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download Document
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientSettingsForm;
