import mongoose from 'mongoose';

const buyerPriceSchema = new mongoose.Schema({
    buyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    fishType: {
        type: String,
        required: true
    },
    retailPriceA: {
        type: Number,
        default: 0
    },
    retailPriceB: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Each buyer can only have one set of prices per fish type
buyerPriceSchema.index({ buyerId: 1, fishType: 1 }, { unique: true });

const BuyerPrice = mongoose.model('BuyerPrice', buyerPriceSchema);
export default BuyerPrice;
