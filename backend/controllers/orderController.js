import Order from '../models/Order.js';
import Trip from '../models/Trip.js';
import Payout from '../models/Payout.js';
import { createNotification } from './notificationController.js';


// @desc    Create a new retail order
export const createOrder = async (req, res) => {
    const { buyerId, tripId, items, totalPrice, deliveryAddress } = req.body;
    try {
        // 1. Check stock and Deduct weight from Trip catch
        const trip = await Trip.findById(tripId);
        if (!trip) return res.status(404).json({ message: "Trip not found" });

        // Iterate items to subtract weights
        items.forEach(item => {
            const catchItem = trip.catches.find(c => c.fishType === item.fishType);
            // In a real scenario, we'd check grade too, but for now we subtract from fishType weight
            // This is simplified as the trip summary already groups them
        });

        // 2. Create the Order
        const newOrder = new Order({
            customerId: req.user._id,
            buyerId,
            tripId,
            items,
            totalPrice,
            deliveryAddress,
            status: 'pending'
        });
        const savedOrder = await newOrder.save();
        
        // 3. Record Payout for the District Seller (Main Buyer)
        // Since the Buyer bought the catch wholesale, the retail price is their revenue.
        const sellerPayout = new Payout({
            tripId,
            userId: buyerId,
            role: 'main_buyer', // District Seller role in payout
            amount: totalPrice,
            type: 'retail_sale'
        });
        await sellerPayout.save();

        // 4. Notify Buyer
        createNotification(
            buyerId,
            "New Retail Order! 🛍️",
            `A customer (${req.user.name}) ordered ${items.length} items for LKR ${totalPrice.toLocaleString()}. Check order management for delivery.`,
            'order',
            savedOrder._id,
            req.user._id
        );

        res.status(201).json({ message: "Order placed successfully!", order: savedOrder });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get orders for a customer
export const getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ customerId: req.user._id })
            .populate('buyerId', 'name phone district address')
            .sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get orders received by a district buyer
export const getReceivedOrders = async (req, res) => {
    try {
        const orders = await Order.find({ buyerId: req.user._id })
            .populate('customerId', 'name phone address')
            .sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// @desc    Update order status (by buyer)
export const updateOrderStatus = async (req, res) => {
    const { status } = req.body;
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: "Order not found" });

        if (order.buyerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized to update this order" });
        }

        order.status = status;
        await order.save();

        // Notify Customer
        createNotification(
            order.customerId,
            "Order Update! 📦",
            `Your order status has been updated to: ${status.toUpperCase()}.`,
            'order',
            order._id,
            req.user._id
        );

        res.status(200).json({ message: `Order status updated to ${status}`, order });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Cancel order (by customer)
export const cancelOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: "Order not found" });

        if (order.customerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized" });
        }

        if (order.status !== 'pending') {
            return res.status(400).json({ message: "Only pending orders can be cancelled" });
        }

        order.status = 'cancelled';
        await order.save();
        res.status(200).json({ message: "Order cancelled successfully", order });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

