import mongoose from 'mongoose';

const tripSchema = new mongoose.Schema({
    vesselId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vessel',
        required: true
    },
    plannerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    crew: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    requests: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    maxFishermen: { type: Number, required: true },
    minFishermen: { type: Number, default: 1 },
    departureTime: { type: Date, required: true },
    returnTime: { type: Date },
    tripType: {
        type: String,
        enum: ['direct', 'rental'],
        default: 'direct'
    },
    rentalAmount: { type: Number },
    plannedDuration: { type: String }, // e.g., "3 days", "1 week"
    status: {
        type: String,
        enum: ['planned', 'pending', 'ongoing', 'completed', 'sold', 'rescheduled'],
        default: 'planned'
    },
    buyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    catches: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Catch'
    }],
    notes: { type: String },
    fuelCost: { type: Number, default: 0 },
    foodCost: { type: Number, default: 0 },
    baitCost: { type: Number, default: 0 },
    otherCosts: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    gradeCRevenue: { type: Number, default: 0 },
    isGradeCSold: { type: Boolean, default: false },
    customPrices: [{
        fishType: String,
        priceA: Number,
        priceB: Number
    }],
    attendance: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        isPresent: { type: Boolean, default: false },
        markedAt: { type: Date, default: Date.now }
    }],
    isAttendanceMarked: { type: Boolean, default: false },
    crewRatings: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        rating: { type: Number, min: 1, max: 5 },
        comment: String,
        ratedAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true });




const Trip = mongoose.model('Trip', tripSchema);
export default Trip;
