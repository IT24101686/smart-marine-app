import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
    sellerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    fishType: {
        type: String,
        required: true
    },
    grade: {
        type: String,
        enum: ['Grade A', 'Grade B'],
        required: true
    },
    weight: {
        type: Number,
        required: true,
        default: 0
    },
    originalCatchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Catch'
    },
    tripId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip'
    },
    price: {
        type: Number,
        default: 0
    },
    district: {
        type: String
    },
    photos: [String],
    lastRestockedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Index for faster lookups in the market feed
inventorySchema.index({ sellerId: 1, fishType: 1, grade: 1 });

const Inventory = mongoose.model('Inventory', inventorySchema);
export default Inventory;
