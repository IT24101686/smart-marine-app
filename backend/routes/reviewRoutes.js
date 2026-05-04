import express from 'express';
import { createReview, getUserReviews, deleteReview } from '../controllers/reviewController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .post(protect, createReview);

router.route('/:userId')
    .get(getUserReviews);

router.route('/:id')
    .delete(protect, deleteReview);

export default router;
