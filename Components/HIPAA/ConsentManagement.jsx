import React, { useState, useContext } from 'react';
import styles from './HIPAACompliance.module.css';
import { ChatAppContect } from '../../Context/ChatAppContext';

const ConsentManagement = () => {
  const { grantConsent, revokeConsent } = useContext(ChatAppContect);
  const [providerAddress, setProviderAddress] = useState('');
  const [feedback, setFeedback] = useState('');

  const handleGrantConsent = async () => {
    if (!providerAddress) return alert('Please provide the provider address');
    const success = await grantConsent(providerAddress);
    setFeedback(success ? 'Consent granted successfully.' : 'Failed to grant consent.');
  };

  const handleRevokeConsent = async () => {
    if (!providerAddress) return alert('Please provide the provider address');
    const success = await revokeConsent(providerAddress);
    setFeedback(success ? 'Consent revoked successfully.' : 'Failed to revoke consent.');
  };

  return (
    <div className={styles.consentManagementContainer}>
      <h3>Consent Management</h3>
      <input 
        type="text"
        placeholder="Enter Healthcare Provider Address"
        value={providerAddress}
        onChange={(e) => setProviderAddress(e.target.value)}
        className={styles.searchInput}
      />
      <div style={{ marginTop: '1rem' }}>
        <button onClick={handleGrantConsent} className={styles.uploadButton} style={{ marginRight: '0.5rem' }}>
          Grant Consent
        </button>
        <button onClick={handleRevokeConsent} className={styles.uploadButton}>
          Revoke Consent
        </button>
      </div>
      {feedback && <p>{feedback}</p>}
    </div>
  );
};

export default ConsentManagement;
