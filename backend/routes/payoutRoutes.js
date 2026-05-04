import express from 'express';
import { 
    markAsPaid, 
    confirmReceived,
    getPayouts,
    createPayout,
    updatePayout,
    deletePayout
} from '../controllers/payoutController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getPayouts);
router.post('/', protect, createPayout);
router.put('/:id', protect, updatePayout);
router.delete('/:id', protect, deletePayout);
router.put('/:id/pay', protect, markAsPaid);
router.put('/:id/confirm', protect, confirmReceived);

export default router;
