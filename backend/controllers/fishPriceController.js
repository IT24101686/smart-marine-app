import TripFishPrice from '../models/TripFishPrice.js';
import Trip from '../models/Trip.js';
import Catch from '../models/Catch.js';

// @desc    Get distinct fish types caught in a specific trip
// @route   GET /api/fish-prices/:tripId/fish-types
// @access  Private
export const getTripFishTypes = async (req, res) => {
    try {
        const { tripId } = req.params;

        // Get all catches for this trip and extract distinct fish types
        const catches = await Catch.find({ tripId }).select('fishType weight grade');

        if (!catches || catches.length === 0) {
            return res.status(200).json({ fishTypes: [], catches: [] });
        }

        // Build a summary: unique fish types with total weight per type
        const fishSummary = {};
        catches.forEach(c => {
            if (!fishSummary[c.fishType]) {
                fishSummary[c.fishType] = { totalWeight: 0, grades: [] };
            }
            fishSummary[c.fishType].totalWeight += c.weight;
            if (!fishSummary[c.fishType].grades.includes(c.grade)) {
                fishSummary[c.fishType].grades.push(c.grade);
            }
        });

        const fishTypes = Object.entries(fishSummary).map(([fishType, info]) => ({
            fishType,
            totalWeight: info.totalWeight,
            grades: info.grades
        }));

        res.status(200).json({ fishTypes });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Save per-kg prices for all fish types in a trip
// @route   POST /api/fish-prices/:tripId
// @access  Private
export const saveTripFishPrices = async (req, res) => {
    try {
        const { tripId } = req.params;
        const { prices } = req.body; // [{ fishType, pricePerKg }]

        if (!prices || !Array.isArray(prices) || prices.length === 0) {
            return res.status(400).json({ message: 'Prices array is required' });
        }

        // Validate trip exists
        const trip = await Trip.findById(tripId);
        if (!trip) return res.status(404).json({ message: 'Trip not found' });

        // Upsert — replace if already exists for this trip
        const fishPriceDoc = await TripFishPrice.findOneAndUpdate(
            { tripId },
            {
                tripId,
                setBy: req.user._id,
                prices
            },
            { new: true, upsert: true }
        );

        res.status(201).json({ message: 'Fish prices saved successfully', data: fishPriceDoc });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get saved fish prices for a trip
// @route   GET /api/fish-prices/:tripId
// @access  Private
export const getTripFishPrices = async (req, res) => {
    try {
        const { tripId } = req.params;
        const doc = await TripFishPrice.findOne({ tripId });
        if (!doc) return res.status(404).json({ message: 'No prices set for this trip yet' });
        res.status(200).json(doc);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get latest buying price per fish type across ALL trips (for Buyer Hub modal)
// @route   GET /api/fish-prices/latest/by-fish-type
// @access  Private
export const getLatestBuyingPrices = async (req, res) => {
    try {
        // Unwind the prices array, sort by createdAt desc, group by fishType keeping the first (latest) price
        const result = await TripFishPrice.aggregate([
            { $sort: { createdAt: -1 } },
            { $unwind: '$prices' },
            {
                $group: {
                    _id: '$prices.fishType',
                    pricePerKg: { $first: '$prices.pricePerKg' },
                    lastUpdated: { $first: '$createdAt' },
                    tripId:      { $first: '$tripId' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const formatted = result.map(r => ({
            fishType:    r._id,
            pricePerKg:  r.pricePerKg,
            lastUpdated: r.lastUpdated,
            tripId:      r.tripId
        }));

        res.status(200).json(formatted);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
