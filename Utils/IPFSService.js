import axios from 'axios';

const PINATA_API_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
const PINATA_PIN_JSON_URL = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
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

      // Check file size (limit to 10MB)
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

      // Add metadata using browser-safe JSON
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
        maxBodyLength: Infinity,
        headers: {
          'Content-Type': 'multipart/form-data',
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
        },
        timeout: 30000, // 30 second timeout
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

  // Get file from IPFS with retries
  getFile: async (cid, retries = 3) => {
    let lastError = null;
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios.get(`${PINATA_GATEWAY}${cid}`, {
          timeout: 10000, // 10 second timeout
          responseType: 'arraybuffer', // Use arraybuffer for binary data
        });
        
        // Convert arraybuffer to base64
        const base64Data = btoa(
          new Uint8Array(response.data)
            .reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        
        return {
          success: true,
          data: base64Data
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
  },

  // New: Upload JSON to IPFS (Pinata)
  uploadJSON: async (jsonData, fileName) => {
    try {
      if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
        throw new Error('Pinata API keys not configured');
      }
      // Wrap the encrypted patient data string in an object so it’s valid JSON.
      const contentObject = { data: jsonData };
      
      const metadata = {
        name: fileName,
        keyvalues: {
          uploadTime: new Date().toISOString(),
        },
      };
      
      const options = {
        cidVersion: 1,
      };
      
      const body = {
        pinataContent: contentObject,
        pinataMetadata: metadata,
        pinataOptions: options,
      };
      
      const response = await axios.post(PINATA_PIN_JSON_URL, body, {
        headers: {
          'Content-Type': 'application/json',
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
        },
        timeout: 30000,
      });
      
      if (!response.data || !response.data.IpfsHash) {
        throw new Error('Invalid response from Pinata JSON upload');
      }
      
      return {
        success: true,
        cid: response.data.IpfsHash,
        url: `${PINATA_GATEWAY}${response.data.IpfsHash}`,
      };
    } catch (error) {
      console.error('Error uploading JSON to IPFS:', error);
      let errorMessage = 'Failed to upload JSON';
      if (error.response) {
        errorMessage = error.response.data?.error?.details || error.response.data?.message || errorMessage;
      } else if (error.message) {
        errorMessage = error.message;
      }
      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  // New: Get JSON from IPFS – for retrieving patient data
  getJSON: async (cid, retries = 3) => {
    let lastError = null;
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios.get(`${PINATA_GATEWAY}${cid}`, {
          timeout: 10000, // 10 second timeout
          responseType: 'text', // Get as text since it is a JSON file
        });
        
        return {
          success: true,
          data: response.data,
        };
      } catch (error) {
        console.error(`IPFS JSON fetch attempt ${i + 1} failed:`, error);
        lastError = error;
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }
    return {
      success: false,
      error: lastError?.message || 'Failed to fetch JSON after multiple attempts',
    };
  }
};
