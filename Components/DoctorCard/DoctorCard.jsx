import React from "react";
import Image from "next/image";
import styles from "./DoctorCard.module.css";

const DoctorCard = ({ doctor, onConnect, onSelect }) => {
  return (
    <div 
      className={`${styles.card} ${doctor.selected ? styles.selected : ""}`}
      onClick={() => onSelect(doctor)}
      onKeyPress={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onSelect(doctor);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Select ${doctor.name}, ${doctor.specialty}`}
    >
      <div className={styles.header}>
        <div className={styles.avatarContainer}>
          <Image 
            src={doctor.image || "/placeholder-doctor.png"} 
            alt={doctor.name} 
            width={100} 
            height={100} 
            className={styles.avatar}
          />
          {doctor.verified && (
            <span className={styles.verifiedBadge} title="Verified Provider">✓</span>
          )}
        </div>
        <div className={styles.info}>
          <h3>{doctor.name}</h3>
          <p className={styles.specialty}>{doctor.specialty}</p>
          <div className={styles.rating}>
            <span className={styles.stars}>
              {Array(5).fill(0).map((_, i) => (
                <span key={i} className={i < Math.floor(doctor.rating) ? styles.starFilled : styles.star}>
                  ★
                </span>
              ))}
            </span>
            <span className={styles.ratingValue}>{doctor.rating}</span>
          </div>
        </div>
      </div>
      <div className={styles.details}>
        <p className={`${styles.availability} ${styles[doctor.availability.toLowerCase()]}`}>
          {doctor.availability === 'Available' ? (
            <>
              <span className={styles.statusDot}></span>
              Available Now
            </>
          ) : (
            <>
              <span className={styles.statusDot}></span>
              Currently Busy
            </>
          )}
        </p>
        <p className={styles.bio}>{doctor.bio}</p>
        <div className={styles.tags}>
          {doctor.languages.map((lang, index) => (
            <span key={index} className={styles.tag}>
              {lang}
            </span>
          ))}
          <span className={`${styles.tag} ${styles.acceptingTag} ${doctor.acceptingPatients ? styles.accepting : styles.notAccepting}`}>
            {doctor.acceptingPatients ? 'Accepting Patients' : 'Not Accepting Patients'}
          </span>
        </div>
      </div>
      <button 
        className={`${styles.connectButton} ${!doctor.acceptingPatients ? styles.disabledButton : ''}`} 
        onClick={(e) => {
          e.stopPropagation();
          onConnect(doctor);
        }}
        disabled={!doctor.acceptingPatients}
        aria-label={doctor.acceptingPatients ? 
          `Connect with ${doctor.name}` : 
          `${doctor.name} is not accepting new patients`}
      >
        {doctor.acceptingPatients ? (
          <>
            <svg className={styles.calendarIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Schedule Appointment
          </>
        ) : 'Not Accepting Patients'}
      </button>
    </div>
  );
};

export default DoctorCard;
