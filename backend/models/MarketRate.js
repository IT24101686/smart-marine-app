import mongoose from 'mongoose';

const marketRateSchema = new mongoose.Schema({
    fishType: {
        type: String,
        required: true,
        unique: true
    },
    gradeAPrice: { type: Number, default: 1500 }, // Buying Price
    gradeBPrice: { type: Number, default: 1000 }, // Buying Price
    retailPriceA: { type: Number, default: 1800 }, // Selling Price
    retailPriceB: { type: Number, default: 1300 }, // Selling Price
    gradeCPrice: { type: Number, default: 200 },
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const MarketRate = mongoose.model('MarketRate', marketRateSchema);
export default MarketRate;
