import mongoose from 'mongoose';

const rentalRequestSchema = new mongoose.Schema({
    vesselId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vessel',
        required: true
    },
    renterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rentalPrice: {
        type: Number,
        required: true
    },
    rentalPriceType: {
        type: String,
        required: true
    },
    rentalPaymentTerm: {
        type: String,
        enum: ['upfront', 'after-trip'],
        default: 'after-trip'
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'canceled', 'completed'],
        default: 'pending'
    },
    requestedAt: {
        type: Date,
        default: Date.now
    },
    respondedAt: {
        type: Date
    },
    notes: {
        type: String
    }
}, { timestamps: true });

const RentalRequest = mongoose.model('RentalRequest', rentalRequestSchema);
export default RentalRequest;
