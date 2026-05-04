import Inventory from '../models/Inventory.js';
import User from '../models/User.js';
import { getNearbyDistricts } from '../utils/districtUtils.js';

// @desc    Get all available inventory for the retail market (nearby 3 districts)
// @route   GET /api/inventory/market
export const getMarketInventory = async (req, res) => {
    try {
        const { district } = req.query;
        let query = { weight: { $gt: 0 } };

        if (district) {
            const nearby = getNearbyDistricts(district);
            // Search by inventory district (if populated) OR find sellers in nearby districts
            query.district = { $in: nearby };
        }

        const inventory = await Inventory.find(query)
            .populate('sellerId', 'name district phone address profileImage shopName latitude longitude')
            .populate('tripId', 'vesselId departureTime returnTime')
            .sort({ createdAt: -1 });

        res.status(200).json(inventory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get inventory for the current logged-in seller
// @route   GET /api/inventory/my
export const getMyInventory = async (req, res) => {
    try {
        const inventory = await Inventory.find({ sellerId: req.user._id })
            .populate('tripId', 'vesselId departureTime returnTime')
            .sort({ createdAt: -1 });
        res.status(200).json(inventory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update inventory (e.g., manual stock adjustment)
// @route   PUT /api/inventory/:id
export const updateInventory = async (req, res) => {
    const { weight, price } = req.body;
    try {
        const item = await Inventory.findById(req.params.id);
        if (!item) return res.status(404).json({ message: "Inventory item not found" });

        if (item.sellerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized" });
        }

        if (weight !== undefined) item.weight = weight;
        if (price !== undefined) item.price = price;

        await item.save();
        res.status(200).json(item);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
