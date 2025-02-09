import React, { useState, useEffect, useContext } from 'react';
import PatientSettingsForm from '../Components/Patient/PatientSettingsForm';
import DocumentSidebar from '../Components/Patient/DocumentSidebar';
import styles from '../Components/Patient/PatientSettingsForm.module.css';
import { ChatAppContect } from '../Context/ChatAppContext';

const Settings = () => {
  const { account } = useContext(ChatAppContect);
  const [formData, setFormData] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      if (!account) {
        setLoading(false);
        return;
      }

      try {
        const storedData = JSON.parse(localStorage.getItem('patientFormData') || '{}');
        
        // Only load data if it belongs to the current account
        if (storedData.owner === account) {
          setFormData(storedData);
          
          // Load documents that belong to this account
          const secureStorage = JSON.parse(localStorage.getItem('secureFileStorage') || '{}');
          const userDocs = Object.values(secureStorage).filter(doc => doc.owner === account);
          setDocuments(userDocs);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        setError('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [account]);

  if (!account) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.connectMessage}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f18303" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <h2>Connect Your Wallet</h2>
          <p>Please connect your wallet to access patient settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1>Patient Settings</h1>
        <p>Manage your medical information and documents securely</p>
      </div>
      {loading ? (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner}></div>
          <p>Loading your medical information...</p>
        </div>
      ) : (
        <div className={styles.settingsLayout}>
          <PatientSettingsForm 
            onDocumentsUpdate={setDocuments}
            initialDocuments={documents}
            initialFormData={formData}
          />
        </div>
      )}
    </div>
  );
};

export default Settings;
