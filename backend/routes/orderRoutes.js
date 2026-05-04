import express from 'express';
import { createOrder, getMyOrders, getReceivedOrders, updateOrderStatus, payOrder, cancelOrder } from '../controllers/orderController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, createOrder);
router.get('/my', protect, getMyOrders);
router.get('/received', protect, getReceivedOrders);
router.put('/:id/status', protect, updateOrderStatus);
router.put('/:id/pay', protect, payOrder);
router.put('/:id/cancel', protect, cancelOrder);

export default router;
