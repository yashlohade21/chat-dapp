import React, { useState, useEffect, useContext } from 'react';
import PatientSettingsForm from '../Components/Patient/PatientSettingsForm';
import DocumentSidebar from '../Components/Patient/DocumentSidebar';
import styles from '../Components/Patient/PatientSettingsForm.module.css';
import { ChatAppContect } from '../Context/ChatAppContext';

const Settings = () => {
  const { account, userName } = useContext(ChatAppContect);
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
        
        if (storedData.owner === account) {
          setFormData(storedData);
          
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
          <div className={styles.connectIcon}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#f18303" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <h2>Connect Your Wallet</h2>
          <p>Please connect your wallet to access your medical records and settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <h1>Patient Settings</h1>
          <div className={styles.headerDivider}></div>
          <p className={styles.headerDescription}>
            Securely manage your medical information and documents
          </p>
        </div>
        
        {userName && (
          <div className={styles.userInfoCard}>
            <div className={styles.userInfoHeader}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>Profile Information</span>
            </div>
            <div className={styles.userInfoContent}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Name:</span>
                <span className={styles.infoValue}>{userName}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Address:</span>
                <span className={styles.infoValue}>{account}</span>
              </div>
            </div>
          </div>
        )}
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