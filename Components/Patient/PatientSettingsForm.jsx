import React, { useState, useEffect, useContext } from 'react';
import styles from './PatientSettingsForm.module.css';
import MedicalFileUpload from '../HIPAA/MedicalFileUpload';
import { connectingWithContract } from '../../Utils/apiFeature';
import { ChatAppContect } from '../../Context/ChatAppContext';

const PatientSettingsForm = ({ onDocumentsUpdate, initialDocuments = [], initialFormData = null }) => {
  const { account, savePatientData, loadPatientData, patientDataLoading } = useContext(ChatAppContect);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    dob: '',
    address: '',
    phone: '',
    medicalConditions: '',
    allergies: '',
    currentMedications: '',
    emergencyContact: '',
    insuranceProvider: '',
    policyNumber: ''
  });
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
          setFormData(result.data);
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

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!account) {
      setError('Please connect your wallet to save settings');
      return;
    }
    setError('');
    setSuccess('');
    const validationErrors = [];
    if (!formData.name) validationErrors.push("Name is required");
    if (!formData.email) validationErrors.push("Email is required");
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      validationErrors.push("Invalid email format");
    }
    if (validationErrors.length > 0) {
      setError(validationErrors.join(". "));
      return;
    }
    try {
      setLoading(true);
      // Save patient data securely on blockchain
      const result = await savePatientData({
        ...formData,
        owner: account,
        lastUpdated: Date.now()
      });
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

      setSuccess('Medical information saved successfully!');
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

  // Render the form along with appropriate loading and error messages
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
            <p>Encrypting and saving your information securely...</p>
          </div>
        )}
        {/* Render form fields for each patient detail */}
        <div className={styles.formGroup}>
          <label htmlFor="name">Full Name<span>*</span></label>
          <input id="name" name="name" type="text" value={formData.name} onChange={handleChange} required placeholder="Enter your full name" />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="email">Email<span>*</span></label>
          <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required placeholder="Enter your email address" />
        </div>
        {/* Additional form fields (dob, phone, address, etc.) */}
        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
          <label>Medical Documents</label>
          <MedicalFileUpload onUpload={(docs) => { setUploadedDocs(docs); onDocumentsUpdate?.(docs); }} account={account} />
        </div>
        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Medical Information'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PatientSettingsForm;
