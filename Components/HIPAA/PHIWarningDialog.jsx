import React from 'react';
import styles from './HIPAACompliance.module.css';

const PHIWarningDialog = ({ isOpen, onClose, onProceed, detectedPHI }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.dialogOverlay}>
      <div className={styles.dialogContent}>
        <h3>⚠️ PHI Detection Warning</h3>
        <div className={styles.warningContent}>
          <p>Potential Protected Health Information (PHI) detected in your message:</p>
          <ul>
            {detectedPHI.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
          <div className={styles.warningInfo}>
            <p>Please confirm that you:</p>
            <ul>
              <li>Have necessary authorization to share this information</li>
              <li>Are sending to an authorized recipient</li>
              <li>Are aware this will be logged in the audit trail</li>
            </ul>
          </div>
        </div>
        <div className={styles.dialogButtons}>
          <button 
            className={styles.cancelButton} 
            onClick={onClose}
          >
            Edit Message
          </button>
          <button 
            className={styles.proceedButton} 
            onClick={onProceed}
          >
            Proceed Securely
          </button>
        </div>
      </div>
    </div>
  );
};

export default PHIWarningDialog;
