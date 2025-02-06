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
        <Image 
          src={doctor.image || "/placeholder-doctor.png"} 
          alt={doctor.name} 
          width={100} 
          height={100} 
          className={styles.avatar}
        />
        <div className={styles.info}>
          <h3>{doctor.name}</h3>
          {doctor.verified && (
            <span className={styles.verified}>✓ Verified</span>
          )}
        </div>
      </div>
      <div className={styles.details}>
        <p><strong>Specialty:</strong> {doctor.specialty}</p>
        <p><strong>Rating:</strong> {doctor.rating} ⭐</p>
        <p className={`${styles.availability} ${styles[doctor.availability.toLowerCase()]}`}>
          {doctor.availability}
        </p>
        <p><strong>Bio:</strong> {doctor.bio}</p>
        <p><strong>Languages:</strong> {doctor.languages.join(", ")}</p>
        <p>
          {doctor.acceptingPatients 
            ? "Accepting new patients" 
            : "Not accepting new patients"}
        </p>
      </div>
      <button 
        className={`${styles.connectButton}`} 
        onClick={(e) => {
          e.stopPropagation();
          onConnect(doctor);
        }}
        disabled={!doctor.acceptingPatients}
        aria-label={doctor.acceptingPatients ? 
          `Connect with ${doctor.name}` : 
          `${doctor.name} is not accepting new patients`}
      >
        {doctor.acceptingPatients ? 'Connect Securely' : 'Not Accepting Patients'}
      </button>
    </div>
  );
};

export default DoctorCard;
