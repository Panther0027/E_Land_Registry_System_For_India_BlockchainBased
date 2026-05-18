/** Demo land records for presentations when MongoDB is empty or unavailable */
export const DEMO_PROPERTIES = [
  {
    propertyId: 'BH-001-KHURDA',
    surveyNumber: 'SN-2024-001',
    ownerName: 'Rajesh Kumar',
    district: 'Khurda',
    state: 'Odisha',
    pincode: '751001',
    area: 2400,
    landType: 'residential',
    status: 'verified',
    ipfsHash: 'QmSampleHash001',
    transactionHash: '0xabc123def456789',
    blockchainVerified: true,
  },
  {
    propertyId: 'BH-002-CUTTACK',
    surveyNumber: 'SN-2024-002',
    ownerName: 'Rajesh Kumar',
    district: 'Cuttack',
    state: 'Odisha',
    pincode: '753001',
    area: 5000,
    landType: 'agricultural',
    status: 'pending',
    ipfsHash: 'QmSampleHash002',
    transactionHash: '0xdef456abc789012',
    blockchainVerified: false,
  },
  {
    propertyId: 'BH-003-BBSR',
    surveyNumber: 'SN-2024-003',
    ownerName: 'Rajesh Kumar',
    district: 'Bhubaneswar',
    state: 'Odisha',
    pincode: '751024',
    area: 1200,
    landType: 'commercial',
    status: 'verified',
    ipfsHash: 'QmSampleHash003',
    transactionHash: '0x789012abc345def',
    blockchainVerified: true,
  },
  {
    propertyId: 'BH-004-PURI',
    surveyNumber: 'SN-2024-004',
    ownerName: 'Rajesh Kumar',
    district: 'Puri',
    state: 'Odisha',
    pincode: '752001',
    area: 3200,
    landType: 'agricultural',
    status: 'disputed',
    ipfsHash: 'QmSampleHash004',
    transactionHash: '0xdispute004hash',
    blockchainVerified: false,
    verificationRemarks: 'Boundary dispute with adjacent plot SN-2024-005',
  },
];

export const DEMO_PUBLIC_STATS = {
  totalProperties: 4,
  verifiedCount: 2,
  totalTransactions: 3,
  statesCovered: 1,
};

export const findDemoProperty = ({ propertyId, surveyNumber }) => {
  if (propertyId) {
    return DEMO_PROPERTIES.find(
      (p) => p.propertyId.toLowerCase() === propertyId.trim().toLowerCase()
    );
  }
  if (surveyNumber) {
    return DEMO_PROPERTIES.find(
      (p) => p.surveyNumber.toLowerCase() === surveyNumber.trim().toLowerCase()
    );
  }
  return null;
};

/** Simulated on-chain view for demo IDs when Sepolia has no tx yet */
export const getDemoBlockchainVerification = (propertyId, contractAddress) => {
  const demo = findDemoProperty({ propertyId });
  if (!demo) return null;

  const baseTime = Math.floor(Date.now() / 1000) - 86400 * 60;
  const maskedOwner = 'aadhaar:sha256:[hashed]';

  const data = {
    propertyId: demo.propertyId,
    ownerAadhaar: maskedOwner,
    location: `${demo.district}, ${demo.state}`,
    area: demo.area,
    ipfsHash: demo.ipfsHash,
    status: demo.status,
    registeredAt: baseTime,
  };

  const history = [
    { ownerAadhaar: maskedOwner, timestamp: baseTime, actionType: 'REGISTERED' },
  ];

  if (demo.status === 'verified' || demo.status === 'disputed' || demo.status === 'transferred') {
    history.push({
      ownerAadhaar: maskedOwner,
      timestamp: baseTime + 86400,
      actionType: 'VERIFIED',
    });
  }
  if (demo.status === 'disputed') {
    history.push({
      ownerAadhaar: maskedOwner,
      timestamp: baseTime + 86400 * 2,
      actionType: 'DISPUTED',
    });
  }

  return {
    verified: true,
    data,
    history,
    demo: true,
    contractAddress: contractAddress || null,
    network: 'sepolia',
    message: 'Demo registry record — run npm run seed:blockchain in server for live Sepolia transactions',
  };
};
