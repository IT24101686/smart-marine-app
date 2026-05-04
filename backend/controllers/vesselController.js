import Vessel from '../models/Vessel.js';

// @desc    Register a new vessel
// @route   POST /api/vessels
// @access  Private
export const registerVessel = async (req, res) => {
    const { 
        name, 
        licenseNumber, 
        vesselType, 
        capacity, 
        image,
        photos,
        ownerCommission,
        plannerCommission,
        crewCommission,
        isAvailableForRent,
        rentalPrice,
        rentalPriceType
    } = req.body;

    try {
        const vesselExists = await Vessel.findOne({ licenseNumber });
        if (vesselExists) {
            return res.status(400).json({ message: "Vessel with this license already exists" });
        }

        const vessel = new Vessel({
            name,
            ownerId: req.user._id,
            licenseNumber,
            vesselType,
            capacity,
            image: image || (photos && photos.length > 0 ? photos[0] : ''),
            photos: photos || (image ? [image] : []),
            ownerCommission,
            plannerCommission,
            crewCommission,
            isAvailableForRent: String(isAvailableForRent) === 'true',
            rentalPrice: rentalPrice || 0,
            rentalPriceType: rentalPriceType || 'none'
        });


        const createdVessel = await vessel.save();
        res.status(201).json(createdVessel);
    } catch (error) {
        console.error("Vessel Registration Error:", error);
        res.status(400).json({ 
            message: error.message,
            details: error.errors
        });
    }
};

// @desc    Get logged in user's vessels
// @route   GET /api/vessels/my-vessels
// @access  Private
export const getMyVessels = async (req, res) => {
    try {
        const vessels = await Vessel.find({ 
            $or: [
                { ownerId: req.user._id },
                { currentRenter: req.user._id, status: 'rented' }
            ]
        });

        // Auto-check for due maintenance
        const today = new Date();
        const updatedVessels = vessels.map(v => {
            const vObj = v.toObject();
            if (vObj.nextMaintenanceDate && new Date(vObj.nextMaintenanceDate) <= today && vObj.status === 'available') {
                vObj.status = 'service-due';
            }
            return vObj;
        });

        res.status(200).json(updatedVessels);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Record maintenance for a vessel
export const recordMaintenance = async (req, res) => {
    const { lastMaintenanceDate, nextMaintenanceDate, notes, status } = req.body;

    try {
        const vessel = await Vessel.findById(req.params.id);

        if (vessel) {
            if (vessel.ownerId.toString() !== req.user._id.toString()) {
                return res.status(401).json({ message: "Not authorized" });
            }

            vessel.lastMaintenanceDate = lastMaintenanceDate || new Date();
            vessel.nextMaintenanceDate = nextMaintenanceDate;
            vessel.maintenanceNotes = notes;
            vessel.status = status || 'available';

            const updatedVessel = await vessel.save();
            res.status(200).json(updatedVessel);
        } else {
            res.status(404).json({ message: "Vessel not found" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update vessel status
// @route   PUT /api/vessels/:id/status
// @access  Private
export const updateVesselStatus = async (req, res) => {
    const { status, isAvailableForRent } = req.body;

    try {
        const vessel = await Vessel.findById(req.params.id);

        if (vessel) {
            if (vessel.ownerId.toString() !== req.user._id.toString()) {
                return res.status(401).json({ message: "Not authorized to update this vessel" });
            }

            if (status !== undefined) vessel.status = status;
            if (isAvailableForRent !== undefined) vessel.isAvailableForRent = isAvailableForRent;
            
            const updatedVessel = await vessel.save();
            res.status(200).json(updatedVessel);

        } else {
            res.status(404).json({ message: "Vessel not found" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all vessels available for rent
// @route   GET /api/vessels/available-for-rent
// @access  Private
export const getAvailableForRentVessels = async (req, res) => {
    try {
        const vessels = await Vessel.find({ 
            isAvailableForRent: true,
            status: 'available'
        }).populate('ownerId', 'name phone');
        
        res.status(200).json(vessels);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Rent a vessel
// @route   POST /api/vessels/:id/rent
// @access  Private
export const rentVessel = async (req, res) => {
    try {
        const vessel = await Vessel.findById(req.params.id);

        if (vessel) {
            if (vessel.status !== 'available' || !vessel.isAvailableForRent) {
                return res.status(400).json({ message: "Vessel is not available for rent" });
            }

            vessel.status = 'rented';
            vessel.currentRenter = req.user._id;
            vessel.rentStartDate = new Date();

            const updatedVessel = await vessel.save();
            res.status(200).json(updatedVessel);
        } else {
            res.status(404).json({ message: "Vessel not found" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a vessel
export const deleteVessel = async (req, res) => {
    try {
        const vessel = await Vessel.findById(req.params.id);
        if (vessel) {
            if (vessel.ownerId.toString() !== req.user._id.toString()) {
                return res.status(401).json({ message: "Not authorized" });
            }
            if (vessel.status !== 'available') {
                return res.status(400).json({ message: "Cannot delete vessel while in use" });
            }
            await Vessel.deleteOne({ _id: req.params.id });
            res.status(200).json({ message: "Vessel removed" });
        } else {
            res.status(404).json({ message: "Vessel not found" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

