import mongoose from 'mongoose';

// Stores the per-kg selling price set by the planner for each fish type
// before they end/complete a trip. One document per trip.
const tripFishPriceSchema = new mongoose.Schema({
    tripId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip',
        required: true,
        unique: true   // Only one price sheet per trip
    },
    setBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    prices: [
        {
            fishType: {
                type: String,
                required: true
            },
            pricePerKg: {
                type: Number,
                required: true,
                min: 0
            }
        }
    ]
}, { timestamps: true });

const TripFishPrice = mongoose.model('TripFishPrice', tripFishPriceSchema);
export default TripFishPrice;
