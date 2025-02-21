import React, { useState, useEffect, useContext } from 'react';
import styles from './PatientSettingsForm.module.css';
import MedicalFileUpload from '../HIPAA/MedicalFileUpload';
import { connectingWithContract } from '../../Utils/apiFeature';
import { ChatAppContect } from '../../Context/ChatAppContext';

const PatientSettingsForm = ({ onDocumentsUpdate, initialDocuments = [], initialFormData = null }) => {
  const { account, savePatientData, loadPatientData, patientDataLoading } = useContext(ChatAppContect);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!account) return;
      try {
        setLoading(true);
        const result = await loadPatientData(account);
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

        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Medical Documents'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PatientSettingsForm;
