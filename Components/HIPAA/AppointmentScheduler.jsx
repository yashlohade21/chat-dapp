import React, { useState } from 'react';
import styles from './HIPAACompliance.module.css';

const AppointmentScheduler = ({ doctor, onClose, onSchedule }) => {
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [appointmentType, setAppointmentType] = useState('in-person');
  const [appointmentReason, setAppointmentReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Generate available time slots
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 17; hour++) {
      const hourFormatted = hour % 12 === 0 ? 12 : hour % 12;
      const ampm = hour < 12 ? 'AM' : 'PM';
      slots.push(`${hourFormatted}:00 ${ampm}`);
      slots.push(`${hourFormatted}:30 ${ampm}`);
    }
    return slots;
  };

  // Generate next 14 days for appointment selection
  const generateAvailableDates = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Skip weekends
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        dates.push({
          value: date.toISOString().split('T')[0],
          label: date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
          })
        });
      }
    }
    return dates;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSuccess(true);
      
      if (onSchedule) {
        onSchedule({
          doctor,
          date: appointmentDate,
          time: appointmentTime,
          type: appointmentType,
          reason: appointmentReason
        });
      }
    } catch (error) {
      console.error('Error scheduling appointment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className={styles.appointmentSuccess}>
        <div className={styles.successIcon}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <h2>Appointment Scheduled!</h2>
        <p>Your appointment with {doctor.name} has been scheduled for:</p>
        <div className={styles.appointmentDetails}>
          <p><strong>Date:</strong> {new Date(appointmentDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <p><strong>Time:</strong> {appointmentTime}</p>
          <p><strong>Type:</strong> {appointmentType === 'in-person' ? 'In-Person Visit' : 'Virtual Consultation'}</p>
        </div>
        <p className={styles.confirmationNote}>A confirmation has been sent to your registered email address.</p>
        <button className={styles.closeButton} onClick={onClose}>Close</button>
      </div>
    );
  }

  return (
    <div className={styles.appointmentScheduler}>
      <div className={styles.appointmentHeader}>
        <h2>Schedule an Appointment</h2>
        <div className={styles.doctorInfo}>
          <div className={styles.doctorAvatar}>
            <img src={doctor.image || "/placeholder-doctor.png"} alt={doctor.name} />
          </div>
          <div>
            <h3>{doctor.name}</h3>
            <p>{doctor.specialty}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={styles.appointmentForm}>
        <div className={styles.formGroup}>
          <label>Select Date</label>
          <div className={styles.dateSelector}>
            {generateAvailableDates().map(date => (
              <button
                key={date.value}
                type="button"
                className={`${styles.dateOption} ${appointmentDate === date.value ? styles.selected : ''}`}
                onClick={() => setAppointmentDate(date.value)}
              >
                {date.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>Select Time</label>
          <select 
            value={appointmentTime} 
            onChange={(e) => setAppointmentTime(e.target.value)}
            required
            className={styles.timeSelect}
          >
            <option value="">Select a time</option>
            {generateTimeSlots().map(time => (
              <option key={time} value={time}>{time}</option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label>Appointment Type</label>
          <div className={styles.appointmentTypeOptions}>
            <label className={`${styles.typeOption} ${appointmentType === 'in-person' ? styles.selected : ''}`}>
              <input
                type="radio"
                name="appointmentType"
                value="in-person"
                checked={appointmentType === 'in-person'}
                onChange={() => setAppointmentType('in-person')}
              />
              <div className={styles.typeIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                  <path d="M9 12h6"></path>
                  <path d="M9 16h6"></path>
                </svg>
              </div>
              <span>In-Person Visit</span>
            </label>
            
            <label className={`${styles.typeOption} ${appointmentType === 'virtual' ? styles.selected : ''}`}>
              <input
                type="radio"
                name="appointmentType"
                value="virtual"
                checked={appointmentType === 'virtual'}
                onChange={() => setAppointmentType('virtual')}
              />
              <div className={styles.typeIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
              </div>
              <span>Virtual Consultation</span>
            </label>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>Reason for Visit</label>
          <textarea
            value={appointmentReason}
            onChange={(e) => setAppointmentReason(e.target.value)}
            placeholder="Briefly describe your symptoms or reason for the appointment"
            rows={3}
            className={styles.reasonTextarea}
          ></textarea>
        </div>

        <div className={styles.formActions}>
          <button type="button" className={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button 
            type="submit" 
            className={styles.scheduleButton}
            disabled={isSubmitting || !appointmentDate || !appointmentTime}
          >
            {isSubmitting ? (
              <>
                <div className={styles.buttonSpinner}></div>
                Scheduling...
              </>
            ) : (
              'Schedule Appointment'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AppointmentScheduler;
