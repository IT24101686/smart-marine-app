import express from 'express';
import {
    getMarketInventory,
    getMyInventory,
    updateInventory
} from '../controllers/inventoryController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/market', getMarketInventory);
router.get('/my', protect, getMyInventory);
router.put('/:id', protect, updateInventory);

export default router;
