import React, { useEffect, useContext } from 'react';
import styles from './HIPAACompliance.module.css';
import { ChatAppContect } from '../../Context/ChatAppContext';

const AuditInformation = () => {
  const { auditLogs, getAuditLogs } = useContext(ChatAppContect);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        await getAuditLogs();
      } catch (error) {
        console.error("Error fetching audit logs:", error);
      }
    };
    fetchLogs();
  }, [getAuditLogs]);

  return (
    <div className={styles.auditContainer}>
      <h3>Audit Information</h3>
      {auditLogs && auditLogs.length > 0 ? (
        auditLogs.map((log, index) => (
          <div key={index} className={styles.auditItem}>
            <p><strong>Action:</strong> {log.action}</p>
            <p><strong>Actor:</strong> {log.actor}</p>
            <p><strong>Subject:</strong> {log.subject}</p>
            <p><strong>Timestamp:</strong> {new Date(log.timestamp * 1000).toLocaleString()}</p>
            <p><strong>Data Hash:</strong> {log.dataHash}</p>
          </div>
        ))
      ) : (
        <p>Audit logs are not available in the current version. Please check back later.</p>
      )}
    </div>
  );
};

export default AuditInformation;
