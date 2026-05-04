import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getMyPrices, getBuyerPrices, updateBuyerPrice } from '../controllers/buyerPriceController.js';

const router = express.Router();

router.get('/my', protect, getMyPrices);
router.get('/:buyerId', getBuyerPrices);
router.post('/', protect, updateBuyerPrice);

export default router;
