# Implementation Plan: Simplify File Handling by Removing Encryption

## Overview
This implementation plan focuses on simplifying the file handling in the De-Chat application by removing the complex encryption/decryption process for files uploaded in the settings section. Instead, files will be directly uploaded to IPFS, and users will receive a hash key to retrieve their files.

## Components to Modify

### 1. MedicalFileUpload.jsx

The upload component needs to be simplified to remove encryption steps:

```javascript
// Current flow:
upload → encrypt → IPFS → store metadata with encryption keys

// New flow:
upload → IPFS → store metadata with hash key
```

Key changes:
- Remove encryption-related code in `handleUpload`
- Remove password generation and storage
- Simplify the metadata stored for each file
- Update success message to show IPFS hash instead of encryption key

Pseudocode for modified `handleUpload`:
```javascript
const handleUpload = async () => {
  if (!files.length || !account) {
    setError(files.length ? 'Please connect your wallet' : 'Please select files');
    return;
  }

  setUploading(true);
  setProgress(0);
  setError('');

  try {
    const uploadedFilesArray = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress((i / files.length) * 50);
      
      // Upload directly to IPFS without encryption
      const result = await IPFSService.uploadFile(file);
      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      // Store file metadata (without encryption details)
      const fileMetadata = {
        cid: result.cid,
        name: file.name,
        type: file.type,
        size: file.size,
        timestamp: Date.now(),
        owner: account
      };

      // Store in local storage
      const secureStorage = JSON.parse(localStorage.getItem('fileStorage') || '{}');
      secureStorage[result.cid] = fileMetadata;
      localStorage.setItem('fileStorage', JSON.stringify(secureStorage));

      uploadedFilesArray.push(fileMetadata);
      setProgress(50 + (i / files.length) * 50);
    }

    setUploadedFiles(prev => {
      const userFiles = prev.filter(file => file.owner === account);
      return [...userFiles, ...uploadedFilesArray];
    });

    if (onUpload) {
      await onUpload(uploadedFilesArray);
    }

    setFiles([]);
    setProgress(100);
    
    // Update success message to show IPFS hash
    const hashKey = uploadedFilesArray.map(file => file.cid).join(', ');
    alert(`File(s) uploaded successfully!\nIPFS Hash Key: ${hashKey}\nUse this key to access your files.`);
  } catch (err) {
    console.error('Upload error:', err);
    setError('Error uploading files: ' + (err.message || 'Unknown error'));
  } finally {
    setUploading(false);
  }
};
```

### 2. PatientSettingsForm.jsx

This component needs to be updated to handle the simplified file retrieval:

Key changes:
- Simplify the document preview functionality
- Update the "decrypt" button to become a "view" button
- Remove decryption key input and validation
- Update how files are retrieved and displayed

Pseudocode for modified `handleDocumentClick` and related functions:

```javascript
const handleDocumentClick = (doc) => {
  setSelectedDoc(doc);
  // No need to reset decryption-related state
};

const handleViewDocument = async () => {
  if (!selectedDoc) {
    setError('Please select a document');
    return;
  }

  setViewing(true);
  setError('');
  
  try {
    const response = await IPFSService.getFile(selectedDoc.cid);
    
    if (!response.success) {
      throw new Error(`Failed to fetch file from IPFS: ${response.error}`);
    }
    
    // Convert to viewable format based on file type
    const viewableData = `data:${selectedDoc.type};base64,${response.data}`;
    setViewContent(viewableData);
    setSuccess('Document retrieved successfully!');
  } catch (error) {
    console.error('Retrieval error:', error);
    setError(error.message || 'Failed to retrieve document');
  } finally {
    setViewing(false);
  }
};
```

Update the document preview UI:
```jsx
{selectedDoc && (
  <div className={styles.documentPreviewOverlay}>
    <div className={styles.documentPreviewContent}>
      <div className={styles.documentPreviewHeader}>
        <h3>{selectedDoc.name}</h3>
        <button className={styles.closeButton} onClick={closeDocumentPreview}>
          <svg>...</svg>
        </button>
      </div>
      <div className={styles.documentPreviewBody}>
        <div className={styles.documentDetails}>
          <p><strong>Type:</strong> {selectedDoc.type}</p>
          <p><strong>Size:</strong> {(selectedDoc.size / 1024).toFixed(1)} KB</p>
          <p><strong>Uploaded:</strong> {selectedDoc.timestamp ? new Date(selectedDoc.timestamp).toLocaleString() : 'Unknown'}</p>
          <p><strong>IPFS Hash:</strong> <span className={styles.cid}>{selectedDoc.cid}</span></p>
        </div>
        
        {!viewContent ? (
          <div className={styles.viewSection}>
            <button 
              className={styles.viewDocumentButton}
              onClick={handleViewDocument}
              disabled={viewing}
            >
              {viewing ? (
                <>
                  <div className={styles.buttonSpinner}></div>
                  Loading...
                </>
              ) : (
                <>
                  <svg>...</svg>
                  View Document
                </>
              )}
            </button>
          </div>
        ) : (
          <div className={styles.previewContent}>
            <h4>Document Preview</h4>
            {renderDocumentPreview()}
          </div>
        )}
      </div>
    </div>
  </div>
)}
```

### 3. IPFSService.js

This service needs minor updates to simplify the upload/download process:

```javascript
// Keep most of the existing code, but ensure getFile returns data in a usable format
getFile: async (cid, retries = 3) => {
  let lastError = null;
  
  for (const gateway of IPFS_GATEWAYS) {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`Attempting to fetch from gateway: ${gateway}, attempt ${i + 1}`);
        
        const response = await axios.get(`${gateway}${cid}`, {
          timeout: 15000,
          responseType: 'arraybuffer',
          headers: {
            'Accept': '*/*'
          }
        });
        
        if (!response.data || response.data.length === 0) {
          throw new Error('Empty response from IPFS');
        }
        
        // Convert ArrayBuffer to base64
        const base64Data = Buffer.from(response.data).toString('base64');
        
        return {
          success: true,
          data: base64Data,
          gateway: gateway,
          size: response.data.length
        };
      } catch (error) {
        // Error handling code (keep existing code)
      }
    }
  }
  
  return {
    success: false,
    error: lastError?.message || 'Failed to fetch file after trying all gateways',
    size: 0
  };
}
```

### 4. LocalStorage Structure

Update how files are stored in localStorage:

```javascript
// Before: Complex structure with encryption keys
const secureStorage = {
  [cid]: {
    cid: "Qm...",
    passphraseHash: "...",
    salt: "...",
    prefix: "...",
    name: "file.pdf",
    type: "application/pdf",
    size: 123456,
    timestamp: 1626955000000,
    owner: "0x..."
  }
};

// After: Simplified structure
const fileStorage = {
  [cid]: {
    cid: "Qm...",
    name: "file.pdf",
    type: "application/pdf",
    size: 123456,
    timestamp: 1626955000000,
    owner: "0x..."
  }
};
```

### 5. Update References to Encryption/Decryption

- Remove imports of `encryptFileWithPassphrase` and `decryptFileWithPassphrase` where not needed
- Remove any UI elements related to encryption keys
- Update variable names from `secureFileStorage` to `fileStorage` for clarity

## Implementation Steps

1. Update IPFSService.js to ensure correct file handling
2. Modify MedicalFileUpload.jsx to remove encryption steps
3. Update PatientSettingsForm.jsx to simplify document viewing
4. Test file upload and retrieval end-to-end
5. Update any UI elements referencing encryption/decryption

## Important Considerations

- Maintain proper error handling throughout the process
- Ensure file type detection still works correctly
- Update any success/error messages to reflect the new simplified process
- Update the UI to clarify that files are stored directly on IPFS
