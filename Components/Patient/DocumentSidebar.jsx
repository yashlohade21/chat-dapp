import React from 'react';
import styles from './PatientSettingsForm.module.css';

const DocumentSidebar = ({ documents = [], onSelectDocument, loading, error }) => {
  if (loading) {
    return (
      <div className={styles.sidebar}>
        <h3>Documents</h3>
        <p>Loading...</p>
      </div>
    );
  }

  if (error && !documents.length) {
    return (
      <div className={styles.sidebar}>
        <h3>Documents</h3>
        <p className={styles.error}>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.sidebar}>
      <h3>Documents</h3>
      {documents.length === 0 ? (
        <p>No documents uploaded yet</p>
      ) : (
        <ul className={styles.documentList}>
          {documents.map((doc) => (
            <li 
              key={doc.cid}
              className={styles.documentItem}
              onClick={() => onSelectDocument(doc)}
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
  );
};

export default DocumentSidebar;
