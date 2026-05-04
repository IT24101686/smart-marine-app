import Review from '../models/Review.js';
import User from '../models/User.js';

// @desc    Create a new review
// @route   POST /api/reviews
// @access  Private
export const createReview = async (req, res) => {
    try {
        const { targetUserId, tripId, rating, comment, type } = req.body;

        // Check if review already exists for this trip by this user
        const existingReview = await Review.findOne({ reviewerId: req.user._id, tripId });
        if (existingReview) {
            return res.status(400).json({ message: "You have already reviewed this trip" });
        }

        const review = await Review.create({
            reviewerId: req.user._id,
            targetUserId,
            tripId,
            rating,
            comment,
            type: type || 'trip_rating'
        });

        // Update target user's average rating
        const user = await User.findById(targetUserId);
        if (user) {
            const reviews = await Review.find({ targetUserId });
            const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
            user.rating = totalRating / reviews.length;
            user.totalRatings = reviews.length;
            await user.save();
        }

        res.status(201).json(review);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get reviews for a specific user
// @route   GET /api/reviews/:userId
// @access  Public
export const getUserReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ targetUserId: req.params.userId })
            .populate('reviewerId', 'name profileImage district')
            .sort({ createdAt: -1 });
        res.status(200).json(reviews);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private
export const deleteReview = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ message: "Review not found" });

        if (review.reviewerId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "Not authorized to delete this review" });
        }

        const targetUserId = review.targetUserId;
        await Review.deleteOne({ _id: req.params.id });

        // Recalculate rating
        const user = await User.findById(targetUserId);
        if (user) {
            const reviews = await Review.find({ targetUserId });
            if (reviews.length > 0) {
                const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
                user.rating = totalRating / reviews.length;
                user.totalRatings = reviews.length;
            } else {
                user.rating = 0;
                user.totalRatings = 0;
            }
            await user.save();
        }

        res.status(200).json({ message: "Review deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
