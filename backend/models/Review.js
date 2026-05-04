import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
    reviewerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    targetUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    tripId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['crew_rating', 'trip_rating'], // crew_rating is planner -> fisherman, trip_rating is fisherman -> trip/planner
        required: true
    }
}, { timestamps: true });

const Review = mongoose.model('Review', reviewSchema);
export default Review;
