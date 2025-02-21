import axios from 'axios';

const PINATA_API_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
const PINATA_PIN_JSON_URL = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/'
];

const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY;

export const IPFSService = {
  uploadFile: async (file) => {
    try {
      // Debug logs for API keys
      console.log('Checking Pinata configuration...');
      if (!PINATA_API_KEY) {
        console.error('PINATA_API_KEY is missing');
      }
      if (!PINATA_SECRET_KEY) {
        console.error('PINATA_SECRET_KEY is missing');
      }

      if (!file || !file.name) {
        throw new Error('Invalid file provided');
      }

      const MAX_FILE_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('File size exceeds 10MB limit');
      }

      if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
        throw new Error('Pinata API keys not configured. Please check your environment variables.');
      }

      const formData = new FormData();
      formData.append('file', file);

      const metadata = JSON.stringify({
        name: file.name,
        keyvalues: {
          uploadTime: new Date().toISOString(),
          fileType: file.type,
          fileSize: file.size
        }
      });
      formData.append('pinataMetadata', metadata);

      const options = JSON.stringify({
        cidVersion: 1,
        wrapWithDirectory: false
      });
      formData.append('pinataOptions', options);

      console.log('Preparing to upload to Pinata...', {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      });

      // Log the request configuration
      console.log('Request configuration:', {
        url: PINATA_API_URL,
        headers: {
          'Content-Type': 'multipart/form-data',
          'pinata_api_key': 'CONFIGURED',
          'pinata_secret_api_key': 'CONFIGURED'
        }
      });

      const response = await axios.post(PINATA_API_URL, formData, {
        maxBodyLength: Infinity,
        headers: {
          'Content-Type': 'multipart/form-data',
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
        },
        timeout: 30000,
      });

      console.log('Pinata upload successful:', {
        IpfsHash: response.data.IpfsHash,
        PinSize: response.data.PinSize,
        Timestamp: response.data.Timestamp
      });

      const ipfsUrl = `${IPFS_GATEWAYS[0]}${response.data.IpfsHash}`;
      console.log('Generated IPFS URL:', ipfsUrl);

      return {
        success: true,
        cid: response.data.IpfsHash,
        url: ipfsUrl,
        size: file.size,
        type: file.type,
        name: file.name
      };
    } catch (error) {
      console.error('Detailed upload error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });

      let errorMessage = 'Failed to upload file';
      if (error.response) {
        errorMessage = error.response.data?.error?.details || error.response.data?.message || errorMessage;
        console.error('Pinata error details:', error.response.data);
      } else if (error.message) {
        errorMessage = error.message;
      }
      return {
        success: false,
        error: errorMessage
      };
    }
  },

  getFile: async (cid, retries = 3) => {
    let lastError = null;
    
    for (const gateway of IPFS_GATEWAYS) {
      for (let i = 0; i < retries; i++) {
        try {
          const response = await axios.get(`${gateway}${cid}`, {
            timeout: 15000,
            responseType: 'arraybuffer',
            headers: {
              'Accept': '*/*'
            },
            proxy: process.env.NODE_ENV === 'development' ? {
              protocol: 'http',
              host: 'localhost',
              port: 3000
            } : undefined
          });
          
          if (!response.data || response.data.length === 0) {
            throw new Error('Empty response from IPFS');
          }
          
          const base64Data = Buffer.from(response.data).toString('base64');
          
          return {
            success: true,
            data: base64Data
          };
        } catch (error) {
          console.error(`IPFS fetch attempt ${i + 1} failed for gateway ${gateway}:`, error);
          lastError = error;
          if (i < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
          }
        }
      }
    }
    
    return {
      success: false,
      error: lastError?.message || 'Failed to fetch file after trying all gateways'
    };
  },

  isValidCID: (cid) => {
    return typeof cid === 'string' && cid.length > 0 && /^[a-zA-Z0-9]+$/.test(cid);
  },

  uploadJSON: async (jsonData, fileName) => {
    try {
      if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
        throw new Error('Pinata API keys not configured');
      }
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

  getJSON: async (cid, retries = 3, delay = 1000) => {
    let lastError = null;
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios.get(`${PINATA_GATEWAY}${cid}`, {
          timeout: 10000,
          responseType: 'text',
        });
        
        return {
          success: true,
          data: response.data,
        };
      } catch (error) {
        console.error(`IPFS JSON fetch attempt ${i + 1} failed:`, error);
        lastError = error;
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
      }
    }
    return {
      success: false,
      error: lastError?.message || 'Failed to fetch JSON after multiple attempts',
    };
  }
};
