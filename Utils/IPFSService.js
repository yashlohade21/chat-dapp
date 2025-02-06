const axios = require('axios');
const FormData = require('form-data');

const PINATA_API_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

// Access environment variables
const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY;

export const IPFSService = {
  // Upload file to IPFS through Pinata
  uploadFile: async (file) => {
    try {
      // Validate file
      if (!file || !file.name) {
        throw new Error('Invalid file provided');
      }

      // Check file size (limit to 10MB for example)
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('File size exceeds 10MB limit');
      }

      // Check API keys
      if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
        throw new Error('Pinata API keys not configured');
      }

      const formData = new FormData();
      formData.append('file', file);

      // Add metadata
      const metadata = JSON.stringify({
        name: file.name,
        keyvalues: {
          uploadTime: new Date().toISOString(),
          fileType: file.type,
          fileSize: file.size
        }
      });
      formData.append('pinataMetadata', metadata);

      // Add options for better pinning
      const options = JSON.stringify({
        cidVersion: 1,
        wrapWithDirectory: false
      });
      formData.append('pinataOptions', options);

      const response = await axios.post(PINATA_API_URL, formData, {
        maxBodyLength: 'Infinity',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
        },
        timeout: 30000, // 30 second timeout
        validateStatus: status => status >= 200 && status < 300,
      });

      if (!response.data || !response.data.IpfsHash) {
        throw new Error('Invalid response from Pinata');
      }

      return {
        success: true,
        cid: response.data.IpfsHash,
        url: `${PINATA_GATEWAY}${response.data.IpfsHash}`,
        size: file.size,
        type: file.type,
        name: file.name
      };
    } catch (error) {
      console.error('Error uploading to IPFS:', error);
      let errorMessage = 'Failed to upload file';
      if (error.response) {
        errorMessage = error.response.data?.error?.details || error.response.data?.message || errorMessage;
      } else if (error.message) {
        errorMessage = error.message;
      }
      return {
        success: false,
        error: errorMessage
      };
    }
  },

  // New function: Upload JSON (text) data to IPFS by converting it into a File
  uploadJSON: async (jsonData, fileName = "data.json", retries = 3) => {
    let lastError = null;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const blob = new Blob([jsonData], { type: "application/json" });
        const file = new File([blob], fileName, { type: "application/json" });
        const result = await IPFSService.uploadFile(file);
        if (result.success) {
          return result;
        }
        lastError = new Error(result.error);
      } catch (error) {
        console.error(`Attempt ${attempt + 1} failed:`, error);
        lastError = error;
        if (attempt < retries - 1) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    return {
      success: false,
      error: lastError?.message || 'Failed to upload after multiple attempts'
    };
  },

  // Get file from IPFS with retries
  getFile: async (cid, retries = 3) => {
    let lastError = null;
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios.get(`${PINATA_GATEWAY}${cid}`, {
          timeout: 10000, // 10 second timeout
          validateStatus: status => status >= 200 && status < 300,
        });
        return {
          success: true,
          data: response.data
        };
      } catch (error) {
        console.error(`IPFS fetch attempt ${i + 1} failed:`, error);
        lastError = error;
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }
    return {
      success: false,
      error: lastError?.message || 'Failed to fetch file after multiple attempts'
    };
  },

  // Validate CID format
  isValidCID: (cid) => {
    return typeof cid === 'string' && cid.length > 0 && /^[a-zA-Z0-9]+$/.test(cid);
  }
};
