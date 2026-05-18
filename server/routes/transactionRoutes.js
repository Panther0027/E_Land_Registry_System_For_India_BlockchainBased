import { Router } from 'express';
import {
  getTransactionsByProperty,
  getUserTransactions,
} from '../controllers/transactionController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.get('/user/me', protect, getUserTransactions);
router.get('/:propertyId', getTransactionsByProperty);

export default router;
