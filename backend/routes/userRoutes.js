import express from 'express';
import { registerUser, getUsers, loginUser, updateUserProfile } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/', getUsers);
router.put('/profile', protect, updateUserProfile);

export default router;
