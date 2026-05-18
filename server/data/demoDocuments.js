import { getIPFSUrl } from '../config/pinata.js';
import { DEMO_PROPERTIES } from './demoProperties.js';

const now = Date.now();

/** Sample documents bundled for demo / offline mode */
export const DEMO_SAMPLE_DOCUMENTS = [
  {
    name: 'land_deed_khurda.pdf',
    type: 'deed',
    ipfsHash: 'QmDemoDeed001KhurdaLandRegistryBhumi',
    uploadedAt: new Date(now - 86400000 * 30),
    propertyId: 'BH-001-KHURDA',
    location: 'Khurda, Odisha',
    demo: true,
  },
  {
    name: 'ownership_proof_khurda.jpg',
    type: 'ownership_proof',
    ipfsHash: 'QmDemoProof001KhurdaOwnership',
    uploadedAt: new Date(now - 86400000 * 28),
    propertyId: 'BH-001-KHURDA',
    location: 'Khurda, Odisha',
    demo: true,
  },
  {
    name: 'agricultural_deed_cuttack.pdf',
    type: 'deed',
    ipfsHash: 'QmDemoDeed002CuttackAgri',
    uploadedAt: new Date(now - 86400000 * 14),
    propertyId: 'BH-002-CUTTACK',
    location: 'Cuttack, Odisha',
    demo: true,
  },
  {
    name: 'commercial_lease_bbsr.pdf',
    type: 'deed',
    ipfsHash: 'QmDemoDeed003BbsrCommercial',
    uploadedAt: new Date(now - 86400000 * 7),
    propertyId: 'BH-003-BBSR',
    location: 'Bhubaneswar, Odisha',
    demo: true,
  },
];

const userUploads = new Map();

export const isDemoUser = (user) =>
  String(user?.id || user?._id || '').startsWith('demo:');

export const getDemoPropertiesForUser = () =>
  DEMO_PROPERTIES.map((p) => ({
    ...p,
    _id: `demo-prop-${p.propertyId}`,
    ownerName: p.ownerName,
    documents: DEMO_SAMPLE_DOCUMENTS.filter((d) => d.propertyId === p.propertyId),
  }));

export const getDemoDocumentsForUser = (userId) => {
  const uploads = userUploads.get(userId) || [];
  const samples = DEMO_SAMPLE_DOCUMENTS.map((d) => ({
    ...d,
    ipfsUrl: getIPFSUrl(d.ipfsHash),
    uploadedAt: d.uploadedAt,
  }));
  return [...samples, ...uploads];
};

export const addDemoDocumentUpload = (userId, doc) => {
  const list = userUploads.get(userId) || [];
  const entry = {
    ...doc,
    ipfsUrl: getIPFSUrl(doc.ipfsHash),
    uploadedAt: new Date(),
    demo: true,
  };
  list.push(entry);
  userUploads.set(userId, list);
  return entry;
};
