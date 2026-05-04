import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    buyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    tripId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip'
    },
    items: [{
        inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory' },
        fishType: String,
        weight: Number,
        price: Number,
        grade: { type: String, enum: ['Grade A', 'Grade B'] }
    }],
    totalPrice: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'paid', 'delivered', 'cancelled'],
        default: 'pending'
    },
    deliveryAddress: {
        type: String
    }
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);
export default Order;
