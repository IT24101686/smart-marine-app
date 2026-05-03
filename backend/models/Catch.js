import mongoose from 'mongoose';

const catchSchema = new mongoose.Schema({
    tripId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip',
        required: true
    },
    fishType: {
        type: String,
        required: true
    },
    grade: {
        type: String,
        enum: ['Grade A', 'Grade B', 'Grade C'],
        required: true
    },
    weight: {
        type: Number, // In Kilograms
        required: true
    },
    photos: [{
        type: String // Supabase URLs
    }],
    loggedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

const Catch = mongoose.model('Catch', catchSchema);
export default Catch;
