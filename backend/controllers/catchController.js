import Catch from '../models/Catch.js';
import Trip from '../models/Trip.js';

// @desc    Log a new catch during an ongoing trip
// @route   POST /api/trips/:id/catch
// @access  Private
export const logCatch = async (req, res) => {
    const { fishType, grade, weight, photos } = req.body;
    const tripId = req.params.id;

    try {
        const trip = await Trip.findById(tripId);
        if (!trip) return res.status(404).json({ message: "Trip not found" });

        if (trip.status !== 'ongoing') {
            return res.status(400).json({ message: "Can only log catch for ongoing trips" });
        }

        const newCatch = new Catch({
            tripId,
            fishType,
            grade,
            weight,
            photos,
            loggedBy: req.user._id
        });

        const createdCatch = await newCatch.save();

        // Add catch reference to trip
        trip.catches.push(createdCatch._id);
        await trip.save();

        res.status(201).json(createdCatch);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Start a trip
// @route   PUT /api/trips/:id/start
// @access  Private
export const startTrip = async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id);
        if (trip) {
            trip.status = 'ongoing';
            const updatedTrip = await trip.save();
            res.json(updatedTrip);
        } else {
            res.status(404).json({ message: "Trip not found" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Complete a trip
// @route   PUT /api/trips/:id/complete
// @access  Private
export const completeTrip = async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id);
        if (trip) {
            trip.status = 'completed';
            const updatedTrip = await trip.save();
            res.json(updatedTrip);
        } else {
            res.status(404).json({ message: "Trip not found" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reschedule a trip
// @route   PUT /api/trips/:id/reschedule
// @access  Private
export const rescheduleTrip = async (req, res) => {
    const { newDate } = req.body;
    try {
        const trip = await Trip.findById(req.params.id);
        if (trip) {
            trip.departureTime = newDate;
            trip.status = 'rescheduled';
            const updatedTrip = await trip.save();
            res.json(updatedTrip);
        } else {
            res.status(404).json({ message: "Trip not found" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
