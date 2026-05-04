import Payout from '../models/Payout.js';
import Notification from '../models/Notification.js';

// @desc    Mark a payout as paid (by payer)
// @route   PUT /api/payouts/:id/pay
// @access  Private
export const markAsPaid = async (req, res) => {
    try {
        const payout = await Payout.findById(req.params.id);

        if (!payout) {
            return res.status(404).json({ message: "Payout record not found" });
        }

        if (payout.payerId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "Not authorized to mark this as paid" });
        }

        if (payout.status !== 'pending') {
            return res.status(400).json({ message: "Payout is already paid or completed" });
        }

        payout.status = 'paid';
        payout.paidAt = new Date();
        await payout.save();

        // Notify receiver
        const notification = new Notification({
            recipient: payout.receiverId,
            sender: req.user._id,
            title: 'Payment Received (Pending Confirmation)',
            message: `A payment of LKR ${payout.amount.toLocaleString()} has been marked as paid. Please confirm once you receive it.`,
            type: 'payment',
            relatedId: payout.tripId || payout._id
        });
        await notification.save();

        res.status(200).json({ message: "Payout marked as paid", payout });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Confirm receipt of payout (by receiver)
// @route   PUT /api/payouts/:id/confirm
// @access  Private
export const confirmReceived = async (req, res) => {
    try {
        const payout = await Payout.findById(req.params.id);

        if (!payout) {
            return res.status(404).json({ message: "Payout record not found" });
        }

        if (payout.receiverId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "Not authorized to confirm this payout" });
        }

        if (payout.status !== 'paid') {
            return res.status(400).json({ message: "Payout must be marked as 'paid' before confirming receipt" });
        }

        payout.status = 'completed';
        payout.completedAt = new Date();
        await payout.save();

        // Notify payer
        const notification = new Notification({
            recipient: payout.payerId,
            sender: req.user._id,
            title: 'Payment Confirmed! ✅',
            message: `The receiver has confirmed receipt of the payment (LKR ${payout.amount.toLocaleString()}).`,
            type: 'payment',
            relatedId: payout.tripId || payout._id
        });
        await notification.save();

        res.status(200).json({ message: "Payout confirmed and completed", payout });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all payouts (with role-based filtering)
// @route   GET /api/payouts
// @access  Private
export const getPayouts = async (req, res) => {
    try {
        const { status, role, tripId } = req.query;
        let query = {};

        // If not admin, show only relevant payouts
        if (req.user.role !== 'admin') {
            query = {
                $or: [
                    { receiverId: req.user._id },
                    { payerId: req.user._id }
                ]
            };
        }

        if (status) query.status = status;
        if (role) query.role = role;
        if (tripId) query.tripId = tripId;

        const payouts = await Payout.find(query)
            .populate('receiverId', 'name role')
            .populate('payerId', 'name role')
            .populate('tripId', 'status departureTime')
            .sort({ createdAt: -1 });

        res.status(200).json(payouts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a manual payout
// @route   POST /api/payouts
// @access  Private
export const createPayout = async (req, res) => {
    const { receiverId, amount, type, notes, tripId, role } = req.body;
    try {
        const payout = new Payout({
            receiverId,
            payerId: req.user._id,
            amount,
            type,
            notes,
            tripId,
            role,
            status: 'pending'
        });

        const savedPayout = await payout.save();
        res.status(201).json(savedPayout);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update payout (e.g. amount or notes)
// @route   PUT /api/payouts/:id
// @access  Private
export const updatePayout = async (req, res) => {
    try {
        const payout = await Payout.findById(req.params.id);
        if (!payout) return res.status(404).json({ message: "Payout not found" });

        if (payout.payerId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "Not authorized" });
        }

        payout.amount = req.body.amount || payout.amount;
        payout.notes = req.body.notes || payout.notes;
        payout.type = req.body.type || payout.type;

        const updatedPayout = await payout.save();
        res.status(200).json(updatedPayout);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a payout
// @route   DELETE /api/payouts/:id
// @access  Private
export const deletePayout = async (req, res) => {
    try {
        const payout = await Payout.findById(req.params.id);
        if (!payout) return res.status(404).json({ message: "Payout not found" });

        if (payout.payerId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "Not authorized" });
        }

        if (payout.status === 'completed') {
            return res.status(400).json({ message: "Cannot delete a completed payout" });
        }

        await payout.deleteOne();
        res.status(200).json({ message: "Payout deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
