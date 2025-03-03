import React from 'react';
import styles from './PatientSettingsForm.module.css';

const DocumentSidebar = ({ documents = [], patientData = {}, onSelectDocument, loading, error }) => {
  if (loading) {
    return (
      <div className={styles.sidebar}>
        <h3 className={styles.sidebarTitle}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          Patient Information
        </h3>
        <p className={styles.loadingText}>Loading patient data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.sidebar}>
        <h3 className={styles.sidebarTitle}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          Patient Information
        </h3>
        <p className={styles.error}>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.sidebar}>
      <div className={styles.patientInfo}>
        <h3 className={styles.sidebarTitle}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          Patient Information
        </h3>
        {patientData && patientData.name ? (
          <div className={styles.infoSection}>
            <p><strong>Name:</strong> <span className={styles.infoText}>{patientData.name}</span></p>
            <p><strong>Email:</strong> <span className={styles.infoText}>{patientData.email}</span></p>
            {patientData.phone && (
              <p><strong>Phone:</strong> <span className={styles.infoText}>{patientData.phone}</span></p>
            )}
            {patientData.dob && (
              <p><strong>DOB:</strong> <span className={styles.infoText}>{patientData.dob}</span></p>
            )}
            {patientData.medicalConditions && (
              <p><strong>Medical Conditions:</strong> <span className={styles.infoText}>{patientData.medicalConditions}</span></p>
            )}
          </div>
        ) : (
          <p className={styles.noDataText}>No patient data available</p>
        )}
      </div>

      <div className={styles.documentsSection}>
        <h3 className={styles.sidebarTitle}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          Documents
        </h3>
        {documents.length === 0 ? (
          <p className={styles.noDataText}>No documents uploaded yet</p>
        ) : (
          <ul className={styles.documentList}>
            {documents.map((doc) => (
              <li 
                key={doc.cid}
                className={styles.documentItem}
                onClick={() => onSelectDocument?.(doc)}
              >
                <span className={styles.documentName}>{doc.name}</span>
                <span className={styles.documentSize}>
                  {(doc.size / 1024).toFixed(1)} KB
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default DocumentSidebar;
