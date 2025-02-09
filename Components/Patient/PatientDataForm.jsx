import React, { useState, useContext } from "react";
import styles from "./PatientDataForm.module.css";
import MedicalFileUpload from "../HIPAA/MedicalFileUpload";
import { ChatAppContect } from "../../Context/ChatAppContext";

// This component collects patient medical information.
// All data will be encrypted before it is stored, so that sensitive data remains private.
const PatientDataForm = ({ onSubmit, initialFormData = {}, onDocumentsUpdate, initialDocuments = [] }) => {
  // Set up local state with all necessary inputs
  const [formData, setFormData] = useState({
    name: initialFormData.name || "",
    email: initialFormData.email || "",
    dob: initialFormData.dob || "",
    address: initialFormData.address || "",
    phone: initialFormData.phone || "",
    medicalConditions: initialFormData.medicalConditions || "",
    allergies: initialFormData.allergies || "",
    currentMedications: initialFormData.currentMedications || "",
    emergencyContact: initialFormData.emergencyContact || "",
    insuranceProvider: initialFormData.insuranceProvider || "",
    policyNumber: initialFormData.policyNumber || ""
  });
  
  // Local state for any documents uploaded via the MedicalFileUpload component
  const [uploadedDocs, setUploadedDocs] = useState(initialDocuments);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Handles input changes for all text fields
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  // Receives the array of documents (their CIDs and metadata) from file uploader
  const handleFileUpload = async (docs) => {
    setUploadedDocs(docs);
    if (onDocumentsUpdate) {
      onDocumentsUpdate(docs);
    }
  };
  
  const [showHIPAAWarning, setShowHIPAAWarning] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState(null);

  // Submit handler – shows HIPAA warning first
  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validate first
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join(". "));
      return;
    }
    // Store the form data temporarily and show warning
    setPendingSubmission({ formData, uploadedDocs });
    setShowHIPAAWarning(true);
  };
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validate form fields
    const validationErrors = [];
    if (!formData.name) validationErrors.push("Name is required");
    if (!formData.email) validationErrors.push("Email is required");
    if (!formData.phone) validationErrors.push("Phone number is required");
    
    if (validationErrors.length > 0) {
      setError(validationErrors.join(", "));
    
  // Actual submission after HIPAA warning acceptance
  const handleConfirmedSubmit = async () => {
    const validationErrors = [];
    if (!formData.name) validationErrors.push("Name is required");
    if (!formData.email) validationErrors.push("Email is required");
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      validationErrors.push("Invalid email format");
    }
    if (formData.phone && !/^\+?[\d\s-]{10,}$/.test(formData.phone)) {
      validationErrors.push("Invalid phone number format");
    }
    if (formData.dob) {
      const dobDate = new Date(formData.dob);
      const today = new Date();
      if (dobDate > today) {
        validationErrors.push("Date of birth cannot be in the future");
      }
    }

    if (validationErrors.length > 0) {
      setError(validationErrors.join(". "));
      return;
    }
    
    // Call the parent's onSubmit with form data and uploaded document metadata
    onSubmit(formData, uploadedDocs);
  };
  
  return (
    <div className={styles.container}>
      <h2>Patient Medical Information</h2>
      <p className={styles.notice}>
        Your information is encrypted on your device before being securely stored.
      </p>
      {error && <p className={styles.error}>{error}</p>}
      {success && <p className={styles.success}>{success}</p>}
      <form onSubmit={handleSubmit} className={styles.form}>
        {loading && (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner}></div>
            <p>Encrypting and saving your information securely...</p>
          </div>
        )}
        <div className={styles.formGroup}>
          <label>
            Full Name<span>*</span>
          </label>
          <input type="text" name="name" value={formData.name} onChange={handleChange} required />
        </div>
        <div className={styles.formGroup}>
          <label>
            Email<span>*</span>
          </label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} required />
        </div>
        <div className={styles.formGroup}>
          <label>Date of Birth</label>
          <input type="date" name="dob" value={formData.dob} onChange={handleChange} />
        </div>
        <div className={styles.formGroup}>
          <label>Address</label>
          <input type="text" name="address" value={formData.address} onChange={handleChange} />
        </div>
        <div className={styles.formGroup}>
          <label>Phone Number</label>
          <input type="text" name="phone" value={formData.phone} onChange={handleChange} />
        </div>
        <div className={styles.formGroup}>
          <label>Medical Conditions</label>
          <textarea name="medicalConditions" value={formData.medicalConditions} onChange={handleChange} />
        </div>
        <div className={styles.formGroup}>
          <label>Allergies</label>
          <textarea name="allergies" value={formData.allergies} onChange={handleChange} />
        </div>
        <div className={styles.formGroup}>
          <label>Current Medications</label>
          <textarea name="currentMedications" value={formData.currentMedications} onChange={handleChange} />
        </div>
        <div className={styles.formGroup}>
          <label>Emergency Contact</label>
          <input
            type="text"
            name="emergencyContact"
            value={formData.emergencyContact}
            onChange={handleChange}
            placeholder="Name, Phone, Relation"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Insurance Provider</label>
          <input type="text" name="insuranceProvider" value={formData.insuranceProvider} onChange={handleChange} />
        </div>
        <div className={styles.formGroup}>
          <label>Policy Number</label>
          <input type="text" name="policyNumber" value={formData.policyNumber} onChange={handleChange} />
        </div>
        <div className={styles.formGroup}>
          <label>Upload Medical Documents</label>
          <MedicalFileUpload onUpload={handleFileUpload} account={account} />
        </div>
        <div className={styles.formGroup}>
          <button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Medical Information"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PatientDataForm;
