import React, { useState } from "react";
import HealthcareProviderRegistration from "../Components/HIPAA/HealthcareProviderRegistration";
import ConsentManagement from "../Components/HIPAA/ConsentManagement";
import AuditInformation from "../Components/HIPAA/AuditInformation";
import HealthcareProviderDirectory from "../Components/HIPAA/HealthcareProviderDirectory";
import MedicalFileUpload from "../Components/HIPAA/MedicalFileUpload";
import PHIWarningDialog from "../Components/HIPAA/PHIWarningDialog";

const HIPAACompliance = () => {
  const [showPHIWarning, setShowPHIWarning] = useState(false);
  const [detectedPHI, setDetectedPHI] = useState([]);

  const handleFileUpload = async (files) => {
    // Implement secure file upload logic
    console.log("Uploading files:", files);
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <h1>HIPAA Compliance Features</h1>
      
      <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: '1fr 1fr', marginBottom: '2rem' }}>
        <HealthcareProviderRegistration onRegister={(data) => console.log("Registered Provider:", data)} />
        <ConsentManagement />
      </div>
      
      <AuditInformation />
      
      <div style={{ marginTop: '2rem' }}>
        <HealthcareProviderDirectory />
      </div>
      
      <div style={{ marginTop: '2rem' }}>
        <MedicalFileUpload onUpload={handleFileUpload} />
      </div>
      
      <PHIWarningDialog
        isOpen={showPHIWarning}
        onClose={() => setShowPHIWarning(false)}
        onProceed={() => {
          // Implement secure message sending logic
          setShowPHIWarning(false);
        }}
        detectedPHI={detectedPHI}
      />
    </div>
  );
};

export default HIPAACompliance;
