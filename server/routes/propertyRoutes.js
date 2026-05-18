import { Router } from 'express';
import {
  registerProperty,
  getProperty,
  getPropertiesByOwner,
  getPropertiesByAadhaar,
  searchProperty,
  transferOwnership,
  verifyProperty,
  rejectProperty,
  getPendingProperties,
  getDisputedProperties,
  resolveDispute,
  raiseDispute,
  getDashboardStats,
  getGovernmentStats,
  getPublicStats,
  generateCertificate,
  uploadDocument,
  getAllDocuments,
  verifyOnBlockchain,
} from '../controllers/propertyController.js';
import { protect, authorize } from '../middleware/auth.js';
import { uploadFields, upload } from '../middleware/upload.js';

const router = Router();
const officialRoles = ['government_official', 'verifier'];

router.get('/search', searchProperty);
router.get('/stats/public', getPublicStats);
router.get('/dashboard/stats', protect, getDashboardStats);
router.get('/government/stats', protect, authorize(...officialRoles), getGovernmentStats);
router.get('/owner/me', protect, getPropertiesByOwner);
router.get('/owner/:aadhaar', protect, getPropertiesByAadhaar);
router.get('/documents/all', protect, getAllDocuments);
router.get('/documents/demo-samples', protect, (req, res) => {
  res.json({
    success: true,
    data: [
      { name: 'land_deed_khurda.pdf', file: 'land_deed_khurda.pdf', propertyId: 'BH-001-KHURDA' },
      { name: 'ownership_proof_khurda.txt', file: 'ownership_proof_khurda.txt', propertyId: 'BH-001-KHURDA' },
    ],
  });
});
router.get('/pending/all', protect, authorize(...officialRoles), getPendingProperties);
router.get('/disputed/all', protect, authorize(...officialRoles), getDisputedProperties);
router.get('/:id/certificate', protect, generateCertificate);
router.get('/:id/blockchain', verifyOnBlockchain);
router.get('/:id', getProperty);

router.post('/register', protect, uploadFields, registerProperty);
router.post('/transfer', protect, transferOwnership);
router.post('/verify/:id', protect, authorize(...officialRoles), verifyProperty);
router.post('/reject/:id', protect, authorize('government_official'), rejectProperty);
router.post('/dispute/:id', protect, raiseDispute);
router.post('/resolve/:id', protect, authorize('government_official'), resolveDispute);
router.post('/documents/upload', protect, upload.single('document'), uploadDocument);

export default router;
