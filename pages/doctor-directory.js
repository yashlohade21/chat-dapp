import React, { useState, useEffect, useContext } from 'react';
import { ChatAppContect } from '../Context/ChatAppContext';
import HealthcareProviderDirectory from '../Components/HIPAA/HealthcareProviderDirectory';
import styles from '../Components/HIPAA/HIPAACompliance.module.css';

const DoctorDirectory = () => {
  const { account } = useContext(ChatAppContect);

  if (!account) {
    return (
      <div className={styles.container}>
        <h1>Doctor Directory</h1>
        <p className={styles.connectMessage}>
          Please connect your wallet to view the doctor directory.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1>Doctor Directory</h1>
      <p className={styles.subtitle}>
        Connect with healthcare providers securely on our decentralized platform
      </p>
      <HealthcareProviderDirectory />
    </div>
  );
};

export default DoctorDirectory;
