import React, { useState, useEffect, useContext } from 'react';
import PatientSettingsForm from '../Components/Patient/PatientSettingsForm';
import styles from '../Components/Patient/PatientSettingsForm.module.css';
import { ChatAppContect } from '../Context/ChatAppContext';

const Settings = () => {
  const { account, userName } = useContext(ChatAppContect) || {};
  const [formData, setFormData] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('documents');

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
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
          <h1>Patient Dashboard</h1>
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
                <span className={styles.infoLabel}>Wallet Address:</span>
                <span className={styles.accountAddress}>{account}</span>
              </div>
            </div>
          </div>
        )}
        
        <div className={styles.tabsContainer}>
          <button 
            className={`${styles.tabButton} ${activeTab === 'documents' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('documents')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            Medical Documents
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'profile' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            Profile Settings
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'security' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            Security
          </button>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading your medical information...</p>
        </div>
      ) : (
        <div className={styles.settingsLayout}>
          {activeTab === 'documents' && (
            <PatientSettingsForm 
              onDocumentsUpdate={setDocuments}
              initialDocuments={documents}
              initialFormData={formData}
            />
          )}
          
          {activeTab === 'profile' && (
            <div className={styles.comingSoonCard}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <h2>Profile Settings Coming Soon</h2>
              <p>We're working on this feature. Check back soon for updates!</p>
            </div>
          )}
          
          {activeTab === 'security' && (
            <div className={styles.comingSoonCard}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <h2>Security Settings Coming Soon</h2>
              <p>Enhanced security features are on the way. Stay tuned!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Settings;