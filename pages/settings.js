import React, { useState, useEffect, useContext } from 'react';
import PatientSettingsForm from '../Components/Patient/PatientSettingsForm';
import DocumentSidebar from '../Components/Patient/DocumentSidebar';
import styles from '../Components/Patient/PatientSettingsForm.module.css';
import { ChatAppContect } from '../Context/ChatAppContext';
import { connectingWithContract } from '../Utils/apiFeature';
import { CryptoService } from '../Utils/CryptoService';
import { IPFSService } from '../Utils/IPFSService';

const Settings = () => {
  const { account } = useContext(ChatAppContect);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [documents, setDocuments] = useState([]);
  // formData will contain the decrypted patient data (if any)
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
        
        // Verify contract has required functions
        if (typeof contract.getPatientSettings !== 'function' || 
            typeof contract.hasPatientSettings !== 'function') {
          setError("Patient settings feature is not available in your current contract version.");
          setLoading(false);
          return;
        }
        
        const hasSettings = await contract.hasPatientSettings(account);
        if (!hasSettings) {
          // No saved settings – show empty form
          setLoading(false);
          return;
        }
        
        setLoadingMessage('Fetching patient settings...');
        let settings;
        try {
          settings = await contract.getPatientSettings(account);
        } catch (error) {
          if (error.message.includes("User not registered")) {
            setError("Please register your account first");
            setLoading(false);
            return;
          }
          throw error;
        }
        if (settings && settings.patientDataCID) {
          setLoadingMessage('Retrieving encrypted data from IPFS...');
          const ipfsResult = await IPFSService.getFile(settings.patientDataCID);
          if (ipfsResult.success) {
            // Replace the hard-coded encryption key with your key management logic
            const encryptionKey = "YOUR_ENCRYPTION_KEY";
            const decryptedData = CryptoService.decryptMessage(ipfsResult.data, encryptionKey);
            let parsedData;
            try {
              parsedData = JSON.parse(decryptedData);
              // Validate required fields exist
              if (!parsedData.name || !parsedData.email) {
                throw new Error("Retrieved data is missing required fields");
              }
              setFormData(parsedData);
            } catch (parseError) {
              console.error("Error parsing decrypted data:", parseError);
              setError("Retrieved data is invalid. Please try saving your settings again.");
              return;
            }
            if (settings.documentCIDs && settings.documentCIDs.length > 0) {
              const docs = settings.documentCIDs.map(cid => ({
                cid,
                url: `https://gateway.pinata.cloud/ipfs/${cid}`,
                name: `Document ${cid.substring(0, 8)}...`,
                timestamp: Date.now(),
                size: 0,
                type: 'application/octet-stream'
              }));
              setDocuments(docs);
            }
          } else {
            const errorMsg = ipfsResult.error || "Unknown error";
            console.error("IPFS fetch failed:", errorMsg);
            setError(`Failed to fetch patient data: ${errorMsg}`);
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
  }, [account]);

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
          )}              <PatientSettingsForm 
                onDocumentsUpdate={handleDocumentsUpdate}
                initialDocuments={documents}
                initialFormData={formData}  /* If formData is empty, the form displays empty fields */
              />
        </div>
      </div>
    </div>
  );
};

export default Settings;
