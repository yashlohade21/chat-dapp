import React, { useState } from "react";
import styles from "./HIPAACompliance.module.css";
import DoctorCard from "../DoctorCard/DoctorCard";

const HealthcareProviderDirectory = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const specialties = [
    'All Specialties',
    'Primary Care',
    'Cardiology',
    'Neurology',
    'Pediatrics',
    'Oncology',
    'Orthopedics',
    'Dermatology',
    'Psychiatry',
    'Endocrinology',
    'Ophthalmology'
  ];

  const mockProviders = [
    {
      id: 1,
      name: 'Dr. Sarah Johnson',
      specialty: 'Primary Care',
      verified: true,
      rating: 4.8,
      availability: 'Available',
      bio: 'Experienced in family medicine and preventative care with over 15 years of practice.',
      languages: ['English', 'Spanish'],
      acceptingPatients: true,
      image: '/doctor1.jpg'
    },
    {
      id: 2,
      name: 'Dr. Michael Chen',
      specialty: 'Cardiology',
      verified: true,
      rating: 4.9,
      availability: 'Busy',
      bio: 'Board-certified cardiologist specializing in preventive cardiology and heart disease management.',
      languages: ['English', 'Mandarin'],
      acceptingPatients: false,
      image: '/doctor2.jpg'
    },
    {
      id: 3,
      name: 'Dr. Emily Davis',
      specialty: 'Neurology',
      verified: true,
      rating: 4.7,
      availability: 'Available',
      bio: 'Specialist in treating neurological disorders with a focus on innovative therapies.',
      languages: ['English'],
      acceptingPatients: true,
      image: '/doctor3.jpg'
    },
    {
      id: 4,
      name: 'Dr. Robert Miller',
      specialty: 'Pediatrics',
      verified: true,
      rating: 4.5,
      availability: 'Available',
      bio: 'Caring pediatrician with expertise in childhood development and preventive care.',
      languages: ['English', 'French'],
      acceptingPatients: true,
      image: '/doctor4.jpg'
    },
    {
      id: 5,
      name: 'Dr. Anna Lee',
      specialty: 'Dermatology',
      verified: true,
      rating: 4.9,
      availability: 'Busy',
      bio: 'Expert in medical and cosmetic dermatology with a holistic approach to skin care.',
      languages: ['English', 'Korean'],
      acceptingPatients: false,
      image: '/doctor5.jpg'
    },
    {
      id: 6,
      name: 'Dr. James Wilson',
      specialty: 'Orthopedics',
      verified: true,
      rating: 4.8,
      availability: 'Available',
      bio: 'Specializing in sports medicine and joint replacement surgery.',
      languages: ['English'],
      acceptingPatients: true,
      image: '/doctor6.jpg'
    },
    {
      id: 7,
      name: 'Dr. Maria Rodriguez',
      specialty: 'Psychiatry',
      verified: true,
      rating: 4.9,
      availability: 'Available',
      bio: 'Experienced in treating anxiety, depression, and other mental health conditions.',
      languages: ['English', 'Spanish'],
      acceptingPatients: true,
      image: '/doctor7.jpg'
    },
    {
      id: 8,
      name: 'Dr. David Kim',
      specialty: 'Endocrinology',
      verified: true,
      rating: 4.7,
      availability: 'Busy',
      bio: 'Expert in diabetes management and thyroid disorders.',
      languages: ['English', 'Korean'],
      acceptingPatients: true,
      image: '/doctor8.jpg'
    },
    {
      id: 9,
      name: 'Dr. Lisa Patel',
      specialty: 'Ophthalmology',
      verified: true,
      rating: 4.8,
      availability: 'Available',
      bio: 'Specializing in LASIK surgery and treatment of retinal diseases.',
      languages: ['English', 'Hindi', 'Gujarati'],
      acceptingPatients: true,
      image: '/doctor9.jpg'
    },
    {
      id: 10,
      name: 'Dr. Thomas Anderson',
      specialty: 'Oncology',
      verified: true,
      rating: 4.9,
      availability: 'Available',
      bio: 'Dedicated to providing comprehensive cancer care with the latest treatments.',
      languages: ['English', 'German'],
      acceptingPatients: true,
      image: '/doctor10.jpg'
    }
  ];

  const handleProviderSelect = (provider) => {
    setSelectedProvider(provider);
  };

  const handleConnect = async (provider) => {
    setIsConnecting(true);
    try {
      // Simulate connection process (replace with real logic)
      await new Promise(resolve => setTimeout(resolve, 1500));
      alert(`Connection request sent to ${provider.name}`);
    } catch (error) {
      alert('Failed to connect. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  // Filter providers based on search term and selected specialty
  const filteredProviders = mockProviders.filter(provider => {
    const matchesSearch = provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         provider.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         provider.languages.some(lang => lang.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSpecialty = selectedSpecialty === 'all' || 
                            provider.specialty.toLowerCase() === selectedSpecialty.toLowerCase();
    return matchesSearch && matchesSpecialty;
  });

  if (loading) {
    return (
      <div className={styles.directoryContainer}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Loading healthcare providers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.directoryContainer}>
        <div className={styles.errorState}>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.directoryContainer}>
      <div className={styles.directoryHeader}>
        <h2>Find Your Healthcare Provider</h2>
        <p className={styles.subtitle}>Connect with verified healthcare professionals</p>
      </div>
      
      <div className={styles.searchFilters}>
        <div className={styles.searchInputWrapper}>
          <input
            type="text"
            placeholder="Search by name, specialty, or language..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          {searchTerm && (
            <button 
              className={styles.clearSearch}
              onClick={() => setSearchTerm('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
        
        <select
          value={selectedSpecialty}
          onChange={(e) => setSelectedSpecialty(e.target.value)}
          className={styles.specialtySelect}
          aria-label="Filter by specialty"
        >
          {specialties.map((specialty, index) => (
            <option key={index} value={specialty.toLowerCase()}>
              {specialty}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.providerStats}>
        <p>Showing {filteredProviders.length} providers</p>
        <p>{mockProviders.filter(p => p.acceptingPatients).length} accepting new patients</p>
      </div>

      <div className={styles.providerGrid}>
        {filteredProviders.map(provider => (
          <DoctorCard 
            key={provider.id}
            doctor={{
              ...provider,
              selected: selectedProvider?.id === provider.id
            }}
            onSelect={handleProviderSelect}
            onConnect={handleConnect}
          />
        ))}
      </div>

      {filteredProviders.length === 0 && (
        <div className={styles.noResults}>
          <p>No providers found matching your criteria.</p>
          <button 
            onClick={() => {
              setSearchTerm('');
              setSelectedSpecialty('all');
            }}
            className={styles.clearFiltersButton}
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default HealthcareProviderDirectory;
