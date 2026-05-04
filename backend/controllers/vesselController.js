import Vessel from '../models/Vessel.js';
import RentalRequest from '../models/RentalRequest.js';
import Notification from '../models/Notification.js';
import Payout from '../models/Payout.js';
import mongoose from 'mongoose';

// @desc    Register a new vessel
// @route   POST /api/vessels
// @access  Private
export const registerVessel = async (req, res) => {
    console.log(`📝 Registering new vessel for user: ${req.user?._id}`);
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
        rentalPriceType,
        rentalPaymentTerm
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
            rentalPriceType: rentalPriceType || 'per-day',
            rentalPaymentTerm: rentalPaymentTerm || 'after-trip'
        });

        const createdVessel = await vessel.save();
        console.log(`✅ Vessel created: ${createdVessel.name} (ID: ${createdVessel._id})`);
        res.status(201).json(createdVessel);
    } catch (error) {
        console.error("❌ Vessel Registration Error:", error);
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
        console.log(`🔍 Fetching vessels for user: ${req.user?._id}`);
        const vessels = await Vessel.find({ 
            $or: [
                { ownerId: req.user._id },
                { currentRenter: req.user._id, status: 'rented' }
            ]
        });
        console.log(`📊 Found ${vessels.length} vessels for this user.`);

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
            if (status) vessel.status = status;

            const updatedVessel = await vessel.save();
            res.status(200).json(updatedVessel);
        } else {
            res.status(404).json({ message: "Vessel not found" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update vessel details
// @route   PUT /api/vessels/:id
// @access  Private
export const updateVessel = async (req, res) => {
    try {
        const vessel = await Vessel.findById(req.params.id);

        if (!vessel) {
            return res.status(404).json({ message: "Vessel not found" });
        }

        if (vessel.ownerId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "Not authorized to update this vessel" });
        }

        // Update basic info
        vessel.name = req.body.name || vessel.name;
        vessel.licenseNumber = req.body.licenseNumber || vessel.licenseNumber;
        vessel.vesselType = req.body.vesselType || vessel.vesselType;
        vessel.capacity = req.body.capacity || vessel.capacity;
        vessel.image = req.body.image || vessel.image;
        vessel.photos = req.body.photos || vessel.photos;
        
        // Update commissions
        vessel.ownerCommission = req.body.ownerCommission || vessel.ownerCommission;
        vessel.plannerCommission = req.body.plannerCommission || vessel.plannerCommission;
        vessel.crewCommission = req.body.crewCommission || vessel.crewCommission;
        
        // Update rental settings
        if (req.body.isAvailableForRent !== undefined) {
            vessel.isAvailableForRent = req.body.isAvailableForRent;
        }
        vessel.rentalPrice = req.body.rentalPrice !== undefined ? req.body.rentalPrice : vessel.rentalPrice;
        vessel.rentalPriceType = req.body.rentalPriceType || vessel.rentalPriceType;
        vessel.rentalPaymentTerm = req.body.rentalPaymentTerm || vessel.rentalPaymentTerm;
        
        // Update status if provided
        if (req.body.status) {
            vessel.status = req.body.status;
        }

        const updatedVessel = await vessel.save();
        res.status(200).json(updatedVessel);

    } catch (error) {
        console.error("Vessel Update Error:", error);
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
            status: { $ne: 'rented' }
        }).populate('ownerId', 'name phone');
        
        res.status(200).json(vessels);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Request to rent a vessel
// @route   POST /api/vessels/:id/request-rent
// @access  Private
export const requestVesselRental = async (req, res) => {
    try {
        const vessel = await Vessel.findById(req.params.id);

        if (!vessel) {
            return res.status(404).json({ message: "Vessel not found" });
        }

        if (vessel.status === 'rented' || !vessel.isAvailableForRent) {
            return res.status(400).json({ message: "Vessel is not available for rent at the moment" });
        }

        // Check if user already has a pending request for this vessel
        const existingRequest = await RentalRequest.findOne({
            vesselId: vessel._id,
            renterId: req.user._id,
            status: 'pending'
        });

        if (existingRequest) {
            return res.status(400).json({ message: "You already have a pending rental request for this boat. Please wait for the owner's response." });
        }

        const rentalRequest = new RentalRequest({
            vesselId: vessel._id,
            renterId: req.user._id,
            ownerId: vessel.ownerId,
            rentalPrice: vessel.rentalPrice,
            rentalPriceType: vessel.rentalPriceType,
            rentalPaymentTerm: vessel.rentalPaymentTerm,
            notes: req.body.notes
        });

        await rentalRequest.save();

        // Create notification for owner
        const notification = new Notification({
            recipient: vessel.ownerId,
            sender: req.user._id,
            title: 'New Rental Request',
            message: `${req.user.name} wants to rent your vessel: ${vessel.name}`,
            type: 'system',
            relatedId: rentalRequest._id
        });
        await notification.save();

        res.status(201).json({ message: "Rental request sent successfully", rentalRequest });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get rental requests for owner or renter
// @route   GET /api/vessels/rental-requests
// @access  Private
export const getRentalRequests = async (req, res) => {
    try {
        const query = req.user.role === 'boat_owner' 
            ? { ownerId: req.user._id } 
            : { renterId: req.user._id };

        const requests = await RentalRequest.find(query)
            .populate('vesselId', 'name licenseNumber image')
            .populate('renterId', 'name phone email district')
            .populate('ownerId', 'name phone email')
            .sort({ createdAt: -1 });

        res.status(200).json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Respond to rental request (Approve/Reject)
// @route   PUT /api/vessels/rental-requests/:id/respond
// @access  Private
export const respondToRentalRequest = async (req, res) => {
    const { status } = req.body; // 'approved' or 'rejected'

    try {
        const rentalRequest = await RentalRequest.findById(req.params.id);

        if (!rentalRequest) {
            return res.status(404).json({ message: "Request not found" });
        }

        if (rentalRequest.ownerId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "Not authorized to respond to this request" });
        }

        rentalRequest.status = status;
        await rentalRequest.save();

        if (status === 'approved') {
            const vessel = await Vessel.findById(rentalRequest.vesselId);
            vessel.status = 'rented';
            vessel.currentRenter = rentalRequest.renterId;
            vessel.rentalPrice = rentalRequest.rentalPrice;
            vessel.rentalPaymentTerm = rentalRequest.rentalPaymentTerm;
            await vessel.save();

            // Logic for upfront payment: Create payout immediately
            if (vessel.rentalPaymentTerm === 'upfront') {
                const rentalPayout = new Payout({
                    payerId: rentalRequest.renterId,
                    receiverId: rentalRequest.ownerId,
                    role: 'boat_owner',
                    amount: rentalRequest.rentalPrice,
                    type: 'rental',
                    status: 'pending'
                });
                await rentalPayout.save();
            }
        }

        // Notification for renter
        const notification = new Notification({
            recipient: rentalRequest.renterId,
            sender: req.user._id,
            title: `Rental Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
            message: `Your request for vessel ${rentalRequest.vesselId.name} has been ${status}.`,
            type: 'system',
            relatedId: rentalRequest._id
        });
        await notification.save();

        res.status(200).json({ message: `Request ${status}ed successfully` });
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

            await vessel.deleteOne();
            res.status(200).json({ message: "Vessel removed" });
        } else {
            res.status(404).json({ message: "Vessel not found" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const rentVessel = async (req, res) => {
    // Placeholder for direct rent logic if needed
    res.status(501).json({ message: "Direct rent not implemented, use request-rent" });
};
