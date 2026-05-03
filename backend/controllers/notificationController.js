import Notification from '../models/Notification.js';

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
export const getMyNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user._id })
            .sort({ createdAt: -1 })
            .limit(50);
        res.status(200).json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);
        if (notification) {
            notification.isRead = true;
            await notification.save();
            res.status(200).json({ message: "Marked as read" });
        } else {
            res.status(404).json({ message: "Notification not found" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Helper function to create notification (not an endpoint)
export const createNotification = async (recipient, title, message, type, relatedId, sender = null) => {
    try {
        const notification = new Notification({
            recipient,
            sender,
            title,
            message,
            type,
            relatedId
        });
        await notification.save();
        return notification;
    } catch (error) {
        console.error("Error creating notification:", error);
    }
};
