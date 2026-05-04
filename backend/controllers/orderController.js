import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Trip from '../models/Trip.js';
import Catch from '../models/Catch.js';
import Payout from '../models/Payout.js';
import Inventory from '../models/Inventory.js';
import { createNotification } from './notificationController.js';


// @desc    Create a new retail order (Deducts from District Buyer's Inventory)
export const createOrder = async (req, res) => {
    const { buyerId, tripId, items, totalPrice, deliveryAddress } = req.body;
    console.log("📦 Creating Order from Inventory:", { buyerId, tripId, itemsCount: items?.length, totalPrice });

    try {
        // Iterate items to subtract weights from District Buyer's inventory
        for (const item of items) {
            console.log(`🐟 Processing inventory deduction for ${item.fishType} (${item.grade}): ${item.weight}kg`);

            // Find matching inventory items for this buyer, fishType and grade
            // We use FIFO (First-In-First-Out) if multiple batches exist
            const inventoryBatches = await Inventory.find({
                sellerId: buyerId,
                fishType: item.fishType,
                grade: item.grade,
                weight: { $gt: 0 }
            }).sort({ createdAt: 1 });

            if (inventoryBatches.length === 0) {
                return res.status(400).json({ message: `Insufficient stock for ${item.fishType} (${item.grade})` });
            }

            let weightToDeduct = item.weight;
            for (const batch of inventoryBatches) {
                if (weightToDeduct <= 0) break;

                const deductAmount = Math.min(batch.weight, weightToDeduct);
                batch.weight -= deductAmount;
                weightToDeduct -= deductAmount;
                await batch.save();
            }

            if (weightToDeduct > 0) {
                return res.status(400).json({ message: `Not enough stock for ${item.fishType}. Missing: ${weightToDeduct}kg` });
            }
        }

        // Create the Order
        const newOrder = new Order({
            customerId: req.user._id,
            buyerId,
            tripId, // Link to the specific trip this catch came from
            items,
            totalPrice,
            deliveryAddress,
            status: 'pending' // Orders start as pending for buyer approval
        });
        const savedOrder = await newOrder.save();

        // Notify Buyer
        createNotification(
            buyerId,
            "New Retail Order! 🛍️",
            `A customer (${req.user.name}) ordered ${items.length} items for LKR ${totalPrice.toLocaleString()}. Please approve or reject.`,
            'order',
            savedOrder._id,
            req.user._id
        );

        res.status(201).json({ message: "Order placed successfully! Waiting for buyer approval.", order: savedOrder });
    } catch (error) {
        console.error("Order Creation Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get orders for a customer
export const getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ customerId: req.user._id })
            .populate('buyerId', 'name phone district address latitude longitude shopName')
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
            .populate('customerId', 'name phone address latitude longitude')
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

        // Handle Rejection: Restore inventory weight
        if (status === 'cancelled' || status === 'rejected') {
            console.log(`🔄 Restoring inventory for rejected order ${order._id}`);
            for (const item of order.items) {
                // Find the first available inventory record for this fish/grade to add back the weight
                // (Or ideally, we'd track exactly which batch it came from, but for now we restore to the newest batch)
                let inventoryItem = await Inventory.findOne({
                    sellerId: order.buyerId,
                    fishType: item.fishType,
                    grade: item.grade
                }).sort({ createdAt: -1 });

                if (inventoryItem) {
                    inventoryItem.weight += item.weight;
                    await inventoryItem.save();
                }
            }
        }

        order.status = status;
        await order.save();

        // Notify Customer
        createNotification(
            order.customerId,
            status === 'confirmed' ? "Order Accepted! ✅" : "Order Update! 📦",
            status === 'confirmed'
                ? `Your order from ${req.user.name} has been accepted and is being prepared.`
                : `Your order status has been updated to: ${status.toUpperCase()}.`,
            'order',
            order._id,
            req.user._id
        );

        res.status(200).json({ message: `Order status updated to ${status}`, order });

    } catch (error) {
        console.error("Update Order Status Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Pay for an order (Customer)
export const payOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: "Order not found" });

        if (order.status !== 'confirmed') {
            return res.status(400).json({ message: "Order must be approved by buyer before payment" });
        }

        order.status = 'paid';
        await order.save();

        // Now record the payout for the District Buyer after payment is successful
        const sellerPayout = new Payout({
            tripId: order.tripId,
            userId: order.buyerId,
            role: 'main_buyer',
            amount: order.totalPrice,
            type: 'retail_sale',
            status: 'paid',
            paidAt: new Date()
        });
        await sellerPayout.save();

        // Notify Buyer
        createNotification(
            order.buyerId,
            "Payment Received! 💰",
            `Customer ${req.user.name} has paid LKR ${order.totalPrice.toLocaleString()} for order #${order._id.toString().slice(-6)}.`,
            'order',
            order._id,
            req.user._id
        );

        res.status(200).json({ message: "Payment successful!", order });
    } catch (error) {
        console.error("Pay Order Error:", error);
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

        // Allow cancellation if pending or processing
        if (order.status !== 'pending' && order.status !== 'processing') {
            return res.status(400).json({ message: "Cannot cancel order at this stage" });
        }

        // Restore inventory weight on customer cancellation
        console.log(`🔄 Restoring inventory for customer cancelled order ${order._id}`);
        for (const item of order.items) {
            let inventoryItem = await Inventory.findOne({
                sellerId: order.buyerId,
                fishType: item.fishType,
                grade: item.grade
            }).sort({ createdAt: -1 });

            if (inventoryItem) {
                inventoryItem.weight += item.weight;
                await inventoryItem.save();
            }
        }

        order.status = 'cancelled';
        await order.save();
        res.status(200).json({ message: "Order cancelled successfully", order });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update order items (by buyer to adjust weights)
// @route   PUT /api/orders/:id/items
// @access  Private
export const updateOrderItems = async (req, res) => {
    const { items } = req.body; // [{ fishType, grade, weight, price }]
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: "Order not found" });

        if (order.buyerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized" });
        }

        if (order.status !== 'pending' && order.status !== 'processing') {
            return res.status(400).json({ message: "Can only edit pending orders" });
        }

        // Adjust Inventory for each changed item
        for (const newItem of items) {
            const oldItem = order.items.find(i => i.fishType === newItem.fishType && i.grade === newItem.grade);
            if (!oldItem) continue;

            const weightDiff = newItem.weight - oldItem.weight;

            if (weightDiff > 0) {
                // Need more stock
                const inventoryBatches = await Inventory.find({
                    sellerId: order.buyerId,
                    fishType: newItem.fishType,
                    grade: newItem.grade,
                    weight: { $gt: 0 }
                }).sort({ createdAt: 1 });

                let toDeduct = weightDiff;
                for (const batch of inventoryBatches) {
                    if (toDeduct <= 0) break;
                    const deduct = Math.min(batch.weight, toDeduct);
                    batch.weight -= deduct;
                    toDeduct -= deduct;
                    await batch.save();
                }
                if (toDeduct > 0) {
                    return res.status(400).json({ message: `Not enough additional stock for ${newItem.fishType}` });
                }
            } else if (weightDiff < 0) {
                // Restore stock
                const restoreAmount = Math.abs(weightDiff);
                let inventoryItem = await Inventory.findOne({
                    sellerId: order.buyerId,
                    fishType: newItem.fishType,
                    grade: newItem.grade
                }).sort({ createdAt: -1 });

                if (inventoryItem) {
                    inventoryItem.weight += restoreAmount;
                    await inventoryItem.save();
                }
            }
        }

        // Calculate new total
        const newTotal = items.reduce((sum, it) => sum + (it.weight * it.price), 0);

        order.items = items;
        order.totalPrice = newTotal;
        await order.save();

        res.status(200).json({ message: "Order updated successfully", order });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

