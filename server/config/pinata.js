import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import os from 'os';
import path from 'path';

const PINATA_API_URL = 'https://api.pinata.cloud';

const getPinataHeaders = () => {
  const jwt = process.env.PINATA_JWT?.trim();
  if (jwt) {
    return { Authorization: `Bearer ${jwt}` };
  }

  const apiKey = process.env.PINATA_API_KEY;
  const secretKey = process.env.PINATA_SECRET_KEY;
  if (apiKey && secretKey) {
    return {
      pinata_api_key: apiKey,
      pinata_secret_api_key: secretKey,
    };
  }

  return null;
};

const pinataHeaders = getPinataHeaders();

export const uploadToIPFS = async (filePath, fileName) => {
  if (!pinataHeaders) {
    console.warn('Pinata not configured. Using mock IPFS hash.');
    return `QmMock${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
  }

  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath), fileName);

  const metadata = JSON.stringify({
    name: fileName,
    keyvalues: { app: 'bhumi-land-registry' },
  });
  formData.append('pinataMetadata', metadata);

  const response = await axios.post(`${PINATA_API_URL}/pinning/pinFileToIPFS`, formData, {
    maxBodyLength: Infinity,
    headers: {
      ...formData.getHeaders(),
      ...pinataHeaders,
    },
  });

  return response.data.IpfsHash;
};

export const uploadJSONToIPFS = async (jsonData, name = 'data.json') => {
  if (!pinataHeaders) {
    console.warn('Pinata not configured. Using mock IPFS hash for JSON payload.');
    return `QmMockJSON${Date.now()}`;
  }

  const payload = {
    pinataContent: jsonData,
    pinataMetadata: {
      name,
      keyvalues: { app: 'bhumi-land-registry' },
    },
  };

  try {
    const response = await axios.post(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, payload, {
      headers: {
        'Content-Type': 'application/json',
        ...pinataHeaders,
      },
    });
    return response.data.IpfsHash;
  } catch (error) {
    console.warn('Pinata JSON pin failed, falling back to file upload:', error.message);

    const tempFilePath = path.join(os.tmpdir(), `${name.replace(/\W+/g, '_')}-${Date.now()}.json`);
    fs.writeFileSync(tempFilePath, JSON.stringify(jsonData, null, 2), 'utf8');

    try {
      return await uploadToIPFS(tempFilePath, name);
    } finally {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupErr) {
        console.warn('Unable to delete temporary JSON file:', cleanupErr.message);
      }
    }
  }
};

export const getIPFSUrl = (hash) => `https://cloudflare-ipfs.com/ipfs/${hash}`;
