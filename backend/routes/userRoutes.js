import express from 'express';
import { registerUser, getUsers, loginUser, updateUserProfile, getUserProfile, updateCart, getCart } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/', getUsers);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.post('/cart', protect, updateCart);
router.get('/cart', protect, getCart);

export default router;
console.log(`❌ Unmatched User Route: ${req.method} ${req.url}`);
res.status(404).json({ message: `User sub-route ${req.method} ${req.url} not found` });
});

export default router;
