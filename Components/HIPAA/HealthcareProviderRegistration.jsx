import React, { useState, useContext } from 'react';
import styles from './HIPAACompliance.module.css';
import { ChatAppContect } from '../../Context/ChatAppContext';

const HealthcareProviderRegistration = ({ onRegister }) => {
  const [providerName, setProviderName] = useState('');
  const { registerAsHealthcareProvider } = useContext(ChatAppContect);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!providerName) {
      return alert('Please enter your provider name');
    }
    const success = await registerAsHealthcareProvider({ providerName });
    if (success) {
      alert('Successfully registered as healthcare provider');
      if (onRegister) {
        onRegister({ providerName });
      }
      setProviderName('');
    } else {
      alert('Registration failed. Please try again.');
    }
  };

  return (
    <div className={styles.registrationContainer}>
      <h3>Healthcare Provider Registration</h3>
      <form onSubmit={handleSubmit}>
        <input 
          type="text"
          placeholder="Enter Provider Name"
          value={providerName}
          onChange={(e) => setProviderName(e.target.value)}
          className={styles.searchInput}
        />
        <button type="submit" className={styles.uploadButton}>Register</button>
      </form>
    </div>
  );
};

export default HealthcareProviderRegistration;
