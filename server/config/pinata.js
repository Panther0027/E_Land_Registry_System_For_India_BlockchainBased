import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const PINATA_API_URL = 'https://api.pinata.cloud';

export const uploadToIPFS = async (filePath, fileName) => {
  const apiKey = process.env.PINATA_API_KEY;
  const secretKey = process.env.PINATA_SECRET_KEY;

  if (!apiKey || !secretKey) {
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
      pinata_api_key: apiKey,
      pinata_secret_api_key: secretKey,
    },
  });

  return response.data.IpfsHash;
};

export const uploadJSONToIPFS = async (jsonData) => {
  const apiKey = process.env.PINATA_API_KEY;
  const secretKey = process.env.PINATA_SECRET_KEY;

  if (!apiKey || !secretKey) {
    return `QmMockJSON${Date.now()}`;
  }

  const response = await axios.post(
    `${PINATA_API_URL}/pinning/pinJSONToIPFS`,
    jsonData,
    {
      headers: {
        'Content-Type': 'application/json',
        pinata_api_key: apiKey,
        pinata_secret_api_key: secretKey,
      },
    }
  );

  return response.data.IpfsHash;
};

export const getIPFSUrl = (hash) => `https://gateway.pinata.cloud/ipfs/${hash}`;
