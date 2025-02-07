import React, { useState, useEffect, useContext } from 'react';
import PatientSettingsForm from '../Components/Patient/PatientSettingsForm';
import DocumentSidebar from '../Components/Patient/DocumentSidebar';
import styles from '../Components/Patient/PatientSettingsForm.module.css';
import { ChatAppContect } from '../Context/ChatAppContext';
import { connectingWithContract } from '../Utils/apiFeature';
import { CryptoService } from '../Utils/CryptoService';
import { IPFSService } from '../Utils/IPFSService';

const Settings = () => {
  const { account, checkPatientSettings } = useContext(ChatAppContect) || {};
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      if (!account) {
        setLoading(false);
        return;
      }

      try {
        setLoadingMessage('Connecting to blockchain...');
        const contract = await connectingWithContract();
        if (!contract) {
          throw new Error("Could not connect to blockchain");
        }

        // Get patient keys
        const { publicKey, privateKey } = CryptoService.getPatientKeys();
        if (!publicKey || !privateKey) {
          setError("Encryption keys not found. Please save your settings first.");
          setLoading(false);
          return;
        }

        // Try to load from localStorage first for immediate display
        const savedData = localStorage.getItem('patientFormData');
        if (savedData) {
          try {
            const parsed = JSON.parse(savedData);
            setFormData(parsed);
          } catch (error) {
            console.error('Error loading saved form data:', error);
          }
        }

        // Load documents from localStorage
        const secureStorage = JSON.parse(localStorage.getItem('secureFileStorage') || '{}');
        if (Object.keys(secureStorage).length > 0) {
          const docs = Object.values(secureStorage);
          setDocuments(docs);
        }

        // Then load from blockchain/IPFS for latest data
        const hasSettings = await checkPatientSettings(account);
        if (hasSettings) {
          setLoadingMessage('Fetching patient settings...');
          try {
            const settings = await contract.getPatientSettings(account);
            
            if (settings && settings.patientDataCID) {
              setLoadingMessage('Retrieving encrypted data from IPFS...');
              const ipfsResult = await IPFSService.getJSON(settings.patientDataCID);
              
              if (ipfsResult.success && ipfsResult.data) {
                try {
                  const encryptedData = typeof ipfsResult.data === 'string' 
                    ? ipfsResult.data 
                    : ipfsResult.data.data;

                  const decryptedData = CryptoService.decryptMessage(encryptedData, privateKey);
                  const parsedData = JSON.parse(decryptedData);

                  setFormData(parsedData);
                  localStorage.setItem('patientFormData', JSON.stringify(parsedData));

                  if (settings.documentCIDs && settings.documentCIDs.length > 0) {
                    const updatedDocs = settings.documentCIDs.map(cid => ({
                      ...secureStorage[cid],
                      cid,
                      url: `https://gateway.pinata.cloud/ipfs/${cid}`,
                    }));
                    setDocuments(updatedDocs);
                  }
                } catch (parseError) {
                  console.error("Error parsing decrypted data:", parseError);
                  setError("Retrieved data is invalid. Please try saving your settings again.");
                }
              }
            }
          } catch (error) {
            console.error("Error fetching patient settings:", error);
            if (error.message.includes("User not registered")) {
              setError("Please register your account first");
            } else {
              setError("Error loading patient settings. Please try again.");
            }
          }
        }
      } catch (err) {
        console.error("Error loading settings:", err);
        setError("Unable to load patient settings. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [account, checkPatientSettings]);

  const handleDocumentsUpdate = (newDocs) => {
    setDocuments(prevDocs => {
      const existingCIDs = new Set(prevDocs.map(doc => doc.cid));
      const uniqueNewDocs = newDocs.filter(doc => !existingCIDs.has(doc.cid));
      return [...prevDocs, ...uniqueNewDocs];
    });
  };

  if (!account) {
    return (
      <div className={styles.settingsContainer}>
        <div className={styles.settingsLayout}>
          <div className={styles.mainContent}>
            <h1>Patient Settings</h1>
            <p className={styles.connectMessage}>
              Please connect your wallet to access patient settings.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.settingsContainer}>
      {loading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner}></div>
          <p>{loadingMessage || 'Loading...'}</p>
        </div>
      )}
      <div className={styles.settingsLayout}>
        <div className={styles.sidebarContainer}>
          <DocumentSidebar 
            documents={documents}
            patientData={formData}
            onSelectDocument={setSelectedDocument}
            loading={loading}
            error={error}
          />
        </div>
        <div className={styles.mainContent}>
          <h1>Patient Settings</h1>
          {error && (
            <div className={styles.error}>
              <p>{error}</p>
            </div>
          )}
          <PatientSettingsForm 
            onDocumentsUpdate={handleDocumentsUpdate}
            initialDocuments={documents}
            initialFormData={formData}
          />
        </div>
      </div>
    </div>
  );
};

export default Settings;
