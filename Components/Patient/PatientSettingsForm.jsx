import React, { useState, useEffect } from 'react';
import styles from './PatientSettingsForm.module.css';
import MedicalFileUpload from '../HIPAA/MedicalFileUpload';
import { CryptoService } from '../../Utils/CryptoService';
import { IPFSService } from '../../Utils/IPFSService';
import { connectingWithContract } from '../../Utils/apiFeature';

const PatientSettingsForm = ({ onDocumentsUpdate, initialDocuments = [], initialFormData = null }) => {
  const [formData, setFormData] = useState({
    name: initialFormData?.name ?? '',
    email: initialFormData?.email ?? '',
    dob: initialFormData?.dob ?? '',
    address: initialFormData?.address ?? '',
    phone: initialFormData?.phone ?? '',
    medicalConditions: initialFormData?.medicalConditions ?? '',
    allergies: initialFormData?.allergies ?? '',
    currentMedications: initialFormData?.currentMedications ?? '',
    emergencyContact: initialFormData?.emergencyContact ?? '',
    insuranceProvider: initialFormData?.insuranceProvider ?? '',
    policyNumber: initialFormData?.policyNumber ?? ''
  });

  const [uploadedDocs, setUploadedDocs] = useState(initialDocuments);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      const contract = await connectingWithContract();
      
      // Get or generate encryption key
      const { publicKey, privateKey } = CryptoService.getPatientKeys();
      
      // Store form data in localStorage for persistence
      localStorage.setItem('patientFormData', JSON.stringify({
        ...formData,
        lastUpdated: Date.now()
      }));

      // Encrypt data
      const encryptedData = CryptoService.encryptMessage(
        JSON.stringify({
          ...formData,
          lastUpdated: Date.now()
        }),
        privateKey
      );

      // Upload to IPFS
      const ipfsResult = await IPFSService.uploadJSON(
        encryptedData,
        `patient_data_${Date.now()}.json`
      );

      if (!ipfsResult.success) {
        throw new Error('Failed to upload data to IPFS');
      }

      // Store document metadata
      const secureStorage = JSON.parse(localStorage.getItem('secureFileStorage') || '{}');
      uploadedDocs.forEach(doc => {
        secureStorage[doc.cid] = {
          ...doc,
          timestamp: Date.now()
        };
      });
      localStorage.setItem('secureFileStorage', JSON.stringify(secureStorage));

      // Update contract
      if (typeof contract.updatePatientSettings === "function") {
        const tx = await contract.updatePatientSettings(
          ipfsResult.cid,
          uploadedDocs.map(doc => doc.cid)
        );
        await tx.wait();
      }

      setSuccess('Medical information saved successfully!');
      if (onDocumentsUpdate) {
        onDocumentsUpdate(uploadedDocs);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      let errorMessage = error.message || 'Failed to save settings';
      if (error.code === 4001) {
        errorMessage = 'Transaction was rejected. Please try again.';
      } else if (error.message?.includes('user rejected')) {
        errorMessage = 'You rejected the transaction. Please try again.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedData = localStorage.getItem('patientFormData');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setFormData(prev => ({
          ...prev,
          ...parsed
        }));
      } catch (error) {
        console.error('Error loading saved form data:', error);
      }
    }
  }, []);

  return (
    <div className={styles.formContainer}>
      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}
      <form onSubmit={handleSubmit} className={styles.form}>
        {loading && (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner}></div>
            <p>Encrypting and saving your information securely...</p>
          </div>
        )}
        <div className={styles.formGroup}>
          <label htmlFor="name">Full Name<span>*</span></label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="email">Email<span>*</span></label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="dob">Date of Birth</label>
          <input
            id="dob"
            name="dob"
            type="date"
            value={formData.dob}
            onChange={handleChange}
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="address">Address</label>
          <input
            id="address"
            name="address"
            type="text"
            value={formData.address}
            onChange={handleChange}
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="phone">Phone Number</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="medicalConditions">Medical Conditions</label>
          <textarea
            id="medicalConditions"
            name="medicalConditions"
            value={formData.medicalConditions}
            onChange={handleChange}
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="allergies">Allergies</label>
          <textarea
            id="allergies"
            name="allergies"
            value={formData.allergies}
            onChange={handleChange}
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="currentMedications">Current Medications</label>
          <textarea
            id="currentMedications"
            name="currentMedications"
            value={formData.currentMedications}
            onChange={handleChange}
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="emergencyContact">Emergency Contact</label>
          <input
            id="emergencyContact"
            name="emergencyContact"
            type="text"
            value={formData.emergencyContact}
            onChange={handleChange}
            placeholder="Name, Phone, Relation"
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="insuranceProvider">Insurance Provider</label>
          <input
            id="insuranceProvider"
            name="insuranceProvider"
            type="text"
            value={formData.insuranceProvider}
            onChange={handleChange}
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="policyNumber">Policy Number</label>
          <input
            id="policyNumber"
            name="policyNumber"
            type="text"
            value={formData.policyNumber}
            onChange={handleChange}
          />
        </div>
        <div className={styles.formGroup}>
          <label>Medical Documents</label>
          <MedicalFileUpload onUpload={(docs) => {
            setUploadedDocs(docs);
            onDocumentsUpdate?.(docs);
          }} />
        </div>
        <div className={styles.formGroup}>
          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Medical Information'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PatientSettingsForm;
