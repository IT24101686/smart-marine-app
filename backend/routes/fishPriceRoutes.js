import express from 'express';
import {
    getTripFishTypes,
    saveTripFishPrices,
    getTripFishPrices,
    getLatestBuyingPrices
} from '../controllers/fishPriceController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/fish-prices/latest/by-fish-type  → aggregate latest pricePerKg per fish type from TripFishPrice
router.get('/latest/by-fish-type', protect, getLatestBuyingPrices);

// GET /api/fish-prices/:tripId/fish-types  → get distinct fish types from trip catches
router.get('/:tripId/fish-types', protect, getTripFishTypes);

// POST /api/fish-prices/:tripId            → save per-kg prices
router.post('/:tripId', protect, saveTripFishPrices);

// GET /api/fish-prices/:tripId             → get saved prices for a trip
router.get('/:tripId', protect, getTripFishPrices);

export default router;
