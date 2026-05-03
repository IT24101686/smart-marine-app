import express from 'express';
import { getMarketRates, updateMarketRate } from '../controllers/marketRateController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(getMarketRates)
    .post(protect, updateMarketRate);

export default router;
