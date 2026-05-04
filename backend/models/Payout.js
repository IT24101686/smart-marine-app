import mongoose from 'mongoose';

const payoutSchema = new mongoose.Schema({
    tripId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip',
        required: true
    },
    userId: {
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
        enum: ['pending', 'paid'],
        default: 'pending'
    },
    paidAt: Date,
    type: {
        type: String,
        enum: ['share', 'commission', 'rental', 'retail_sale', 'logistics'],
        required: true
    }
}, { timestamps: true });

const Payout = mongoose.model('Payout', payoutSchema);
export default Payout;
