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
      // Validate file
      if (!file || !file.name || !file.size) {
        throw new Error('Invalid file provided');
      }

      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('File size exceeds 50MB limit');
      }

      if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
        throw new Error('Pinata API keys not configured. Please check your environment variables.');
      }

      // Prepare FormData
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

      console.log('Uploading file to IPFS:', file.name);

      // Upload to IPFS
      const response = await axios.post(PINATA_API_URL, formData, {
        maxBodyLength: Infinity,
        headers: {
          'Content-Type': 'multipart/form-data',
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
        },
        timeout: 30000, // 30 seconds timeout
      });

      if (!response.data || !response.data.IpfsHash) {
        throw new Error('Invalid response from Pinata');
      }

      console.log('File uploaded successfully:', response.data.IpfsHash);

      return {
        success: true,
        cid: response.data.IpfsHash,
        url: `${IPFS_GATEWAYS[0]}${response.data.IpfsHash}`,
        size: file.size,
        type: file.type,
        name: file.name
      };
    } catch (error) {
      console.error('Error uploading to IPFS:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload file'
      };
    }
  },

  getFile: async (cid, retries = 3) => {
    let lastError = null;

    for (const gateway of IPFS_GATEWAYS) {
      for (let i = 0; i < retries; i++) {
        try {
          console.log(`Fetching file from gateway: ${gateway}, attempt ${i + 1}`);

          const response = await axios.get(`${gateway}${cid}`, {
            timeout: 15000, // 15 seconds timeout
            responseType: 'arraybuffer',
            headers: {
              'Accept': '*/*'
            }
          });

          if (!response.data || response.data.length === 0) {
            throw new Error('Empty response from IPFS');
          }

          console.log('File fetched successfully:', response.data.length, 'bytes');

          // Convert ArrayBuffer to base64
          const base64Data = Buffer.from(response.data).toString('base64');

          return {
            success: true,
            data: base64Data,
            gateway: gateway,
            size: response.data.length
          };
        } catch (error) {
          console.error(`Fetch attempt ${i + 1} failed for gateway ${gateway}:`, error);
          lastError = error;

          // Add delay between retries
          if (i < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
          }
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Failed to fetch file after trying all gateways',
      size: 0
    };
  }
};