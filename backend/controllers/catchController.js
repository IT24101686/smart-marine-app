import Catch from '../models/Catch.js';
import Trip from '../models/Trip.js';
import Vessel from '../models/Vessel.js';

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
        if (!trip) return res.status(404).json({ message: "Trip not found" });

        trip.status = 'ongoing';
        trip.actualDepartureTime = new Date();
        await trip.save();

        // Update vessel status to in-sea
        const vessel = await Vessel.findById(trip.vesselId);
        if (vessel) {
            vessel.status = 'in-sea';
            await vessel.save();
        }

        res.json({ message: "Trip started successfully", trip });
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
        if (!trip) return res.status(404).json({ message: "Trip not found" });

        trip.status = 'completed';
        trip.returnTime = new Date();
        await trip.save();

        // Update vessel status
        const vessel = await Vessel.findById(trip.vesselId);
        if (vessel) {
            // If it's a rental trip, status remains 'rented'
            // Otherwise it becomes 'available'
            vessel.status = vessel.currentRenter ? 'rented' : 'available';
            await vessel.save();
        }

        res.json({ message: "Trip completed successfully", trip });
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

// @desc    Update a catch
// @route   PUT /api/trips/catch/:catchId
// @access  Private
export const updateCatch = async (req, res) => {
    const { fishType, grade, weight, photos } = req.body;
    try {
        const catchEntry = await Catch.findById(req.params.catchId);
        if (!catchEntry) return res.status(404).json({ message: "Catch not found" });

        catchEntry.fishType = fishType || catchEntry.fishType;
        catchEntry.grade = grade || catchEntry.grade;
        catchEntry.weight = weight != null ? parseFloat(weight) : catchEntry.weight;
        catchEntry.photos = photos || catchEntry.photos;

        const updatedCatch = await catchEntry.save();
        res.json(updatedCatch);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a catch
// @route   DELETE /api/trips/catch/:catchId
// @access  Private
export const deleteCatch = async (req, res) => {
    try {
        const catchEntry = await Catch.findById(req.params.catchId);
        if (!catchEntry) return res.status(404).json({ message: "Catch not found" });

        // Remove catch reference from Trip
        await Trip.findByIdAndUpdate(catchEntry.tripId, {
            $pull: { catches: catchEntry._id }
        });

        await catchEntry.deleteOne();
        res.json({ message: "Catch removed successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
