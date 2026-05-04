import mongoose from 'mongoose';

const payoutSchema = new mongoose.Schema({
    tripId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip',
        required: false
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    payerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    role: {
        type: String,
        enum: ['boat_owner', 'trip_planner', 'crew', 'main_buyer'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'paid', 'completed', 'canceled'],
        default: 'pending'
    },
    type: {
        type: String,
        enum: ['share', 'commission', 'rental', 'salary'],
        required: true
    },
    paidAt: Date,
    completedAt: Date,
    notes: String
}, { timestamps: true });

const Payout = mongoose.model('Payout', payoutSchema);
export default Payout;
