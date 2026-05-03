import Trip from '../models/Trip.js';
import User from '../models/User.js';
import Vessel from '../models/Vessel.js';
import Payout from '../models/Payout.js';
import { createNotification } from './notificationController.js';


// @desc    Create a new trip
export const createTrip = async (req, res) => {
    const { 
        vesselId, crew, maxFishermen, minFishermen, departureTime, 
        tripType, rentalAmount, plannedDuration, notes,
        fuelCost, foodCost, baitCost, otherCosts
    } = req.body;

    try {
        const trip = new Trip({
            vesselId,
            plannerId: req.user._id,
            crew,
            maxFishermen,
            minFishermen,
            departureTime,
            tripType,
            rentalAmount,
            plannedDuration,
            notes,
            fuelCost,
            foodCost,
            baitCost,
            otherCosts
        });

        const createdTrip = await trip.save();
        
        // Notify fishermen in the district (Async)
        if (req.user && req.user.district) {
            User.find({ role: 'fisherman', district: req.user.district })
                .then(fishermen => {
                    fishermen.forEach(f => {
                        createNotification(
                            f._id,
                            "New Trip Available!",
                            `A new trip from ${req.user.district} harbor is open for joining.`,
                            'trip',
                            createdTrip._id
                        );
                    });
                })
                .catch(err => console.error("Notification Error:", err));
        }

        res.status(201).json(createdTrip);

    } catch (error) {
        console.error("Trip Creation Error:", error);
        res.status(500).json({ 
            message: error.message,
            details: error.errors // Include validation details if any
        });
    }
};

// @desc    Get trips for the logged in user
export const getMyTrips = async (req, res) => {
    try {
        const trips = await Trip.find({
            $or: [
                { plannerId: req.user._id },
                { crew: { $in: [req.user._id] } }
            ]
        }).populate('vesselId', 'name licenseNumber image');
        res.status(200).json(trips || []);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get available trips for fishermen
export const getAvailableTrips = async (req, res) => {
    const { district } = req.params;
    try {
        const trips = await Trip.find({ status: 'planned' })
            .populate('vesselId', 'name image vesselType')
            .populate('plannerId', 'name district phone');
        res.status(200).json(trips);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all completed trips (Market Feed)
export const getAllCompletedTrips = async (req, res) => {
    try {
        const { district } = req.query;
        let query = { status: { $in: ['completed', 'sold'] } };
        
        if (district) {
            const nearby = getNearbyDistricts(district);
            // We'll filter by planner's district in the populate match
        }

        const trips = await Trip.find(query)
            .populate({
                path: 'vesselId',
                select: 'name licenseNumber image'
            })
            .populate({
                path: 'plannerId',
                select: 'name district phone address'
            });

        // If district is provided, filter the results to only those in nearby districts
        let filteredTrips = trips;
        if (district) {
            const nearby = getNearbyDistricts(district);
            filteredTrips = trips.filter(t => t.plannerId && nearby.includes(t.plannerId.district));
        }

        res.status(200).json(filteredTrips || []);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Buy a trip catch
export const buyTripCatch = async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id).populate('vesselId');
        if (!trip) return res.status(404).json({ message: "Trip not found" });
        
        if (trip.status === 'sold') {
            return res.status(400).json({ message: "Already sold" });
        }

        const totalRevenue = req.body.totalPrice || 0;
        trip.status = 'sold';
        trip.buyerId = req.user._id;
        trip.totalRevenue = totalRevenue;
        
        const updatedTrip = await trip.save();
        
        // --- PERSISTENT PAYOUT GENERATION ---
        const vessel = trip.vesselId;
        const totalCosts = (trip.fuelCost || 0) + (trip.foodCost || 0) + (trip.baitCost || 0) + (trip.otherCosts || 0);
        const combinedRevenue = (trip.totalRevenue || 0) + (trip.gradeCRevenue || 0);
        
        let remainingProfit = Math.max(0, combinedRevenue - totalCosts);
        let ownerEarnings = 0;
        const payoutRecords = [];

        // 1. Check if it's a Rented Vessel
        if (vessel.status === 'rented' || (vessel.isAvailableForRent && vessel.currentRenter)) {
            // Calculate rental fee (For now, assume 1 trip = 1 rental period, or calculate days)
            const days = Math.max(1, Math.ceil((new Date() - new Date(trip.departureTime)) / (1000 * 60 * 60 * 24)));
            const rentalFee = (vessel.rentalPrice || 0) * days;
            
            ownerEarnings = rentalFee;
            remainingProfit = Math.max(0, remainingProfit - rentalFee);

            payoutRecords.push({
                tripId: trip._id,
                userId: vessel.ownerId,
                role: 'boat_owner',
                amount: ownerEarnings,
                type: 'rental_fee'
            });
        } else {
            // Traditional Profit Sharing (Own Boat)
            ownerEarnings = (remainingProfit * (vessel.ownerCommission || 40)) / 100;
            remainingProfit -= ownerEarnings;

            payoutRecords.push({
                tripId: trip._id,
                userId: vessel.ownerId,
                role: 'boat_owner',
                amount: ownerEarnings,
                type: 'share'
            });
        }

        // 2. Distribute Remaining Profit among Planner and Crew
        const plannerComm = vessel.plannerCommission || 10;
        const crewComm = vessel.crewCommission || 50;
        const totalRemRatio = plannerComm + crewComm;
        
        const plannerShare = totalRemRatio > 0 ? (remainingProfit * plannerComm) / totalRemRatio : 0;
        const totalCrewShare = remainingProfit - plannerShare;

        // Add Planner Payout
        payoutRecords.push({
            tripId: trip._id,
            userId: trip.plannerId,
            role: 'trip_planner',
            amount: plannerShare,
            type: 'commission'
        });

        // Add Crew Payouts (Only for those present)
        const attendance = trip.attendance || [];
        const presentCrew = attendance.filter(a => a.isPresent).map(a => a.userId);
        const crewCount = presentCrew.length;

        if (crewCount > 0) {
            const individualCrewShare = totalCrewShare / crewCount;
            presentCrew.forEach(crewId => {
                payoutRecords.push({
                    tripId: trip._id,
                    userId: crewId,
                    role: 'crew',
                    amount: individualCrewShare,
                    type: 'share'
                });
            });
        }

        if (payoutRecords.length > 0) {
            await Payout.insertMany(payoutRecords);
        }

        // ------------------------------------

        // Notify stakeholders
        const stakeholders = [trip.plannerId, vessel?.ownerId, ...trip.crew];
        
        stakeholders.forEach(userId => {
            if (userId) {
                createNotification(
                    userId,
                    "Catch Sold! 💰",
                    `The catch from trip on ${vessel?.name || 'Vessel'} has been sold for LKR ${totalRevenue.toLocaleString()}. Check your earnings.`,
                    'payment',
                    trip._id
                );
            }
        });

        res.status(200).json({ message: "Purchase successful!", trip: updatedTrip });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Sell Grade C stock (Dry fish/Industrial)
export const sellGradeC = async (req, res) => {
    try {
        const { revenue } = req.body;
        const trip = await Trip.findById(req.params.id);
        if (!trip) return res.status(404).json({ message: "Trip not found" });

        trip.isGradeCSold = true;
        trip.gradeCRevenue = revenue || 0;
        
        await trip.save();
        res.status(200).json({ message: "Grade C stock sold successfully", trip });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get trip financial summary
export const getTripFinances = async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id)
            .populate('vesselId')
            .populate('crew', 'name');
            
        if (!trip) return res.status(404).json({ message: "Trip not found" });

        const totalCosts = (trip.fuelCost || 0) + (trip.foodCost || 0) + (trip.baitCost || 0) + (trip.otherCosts || 0);
        // Total Revenue is Primary Revenue + Grade C Revenue
        const combinedRevenue = (trip.totalRevenue || 0) + (trip.gradeCRevenue || 0);
        const netProfit = combinedRevenue - totalCosts;

        const vessel = trip.vesselId;
        const ownerEarnings = (netProfit * (vessel.ownerCommission || 40)) / 100;
        const plannerEarnings = (netProfit * (vessel.plannerCommission || 10)) / 100;
        const totalCrewEarnings = (netProfit * (vessel.crewCommission || 50)) / 100;
        
        const crewCount = trip.crew.length || 1;
        const individualCrewEarnings = totalCrewEarnings / crewCount;

        res.status(200).json({
            totalRevenue: combinedRevenue,
            primaryRevenue: trip.totalRevenue,
            gradeCRevenue: trip.gradeCRevenue,
            totalCosts,
            netProfit,
            breakdown: {
                owner: ownerEarnings,
                planner: plannerEarnings,
                crewTotal: totalCrewEarnings,
                crewIndividual: individualCrewEarnings,
                crewCount
            },
            commissions: {
                owner: vessel.ownerCommission,
                planner: vessel.plannerCommission,
                crew: vessel.crewCommission
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// @desc    Request to join a trip
export const requestToJoinTrip = async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id);
        if (!trip) return res.status(404).json({ message: "Trip not found" });
        if (trip.status !== 'planned') return res.status(400).json({ message: "Not accepting requests" });
        
        // Check if user is already in another active/planned trip
        const activeTrip = await Trip.findOne({
            $or: [
                { crew: { $in: [req.user._id] } },
                { plannerId: req.user._id }
            ],
            status: { $in: ['planned', 'ongoing'] }
        });

        if (activeTrip) {
            return res.status(400).json({ message: "You are already part of an active or planned trip" });
        }

        if (trip.requests.includes(req.user._id) || trip.crew.includes(req.user._id)) {
            return res.status(400).json({ message: "Already requested or joined" });
        }

        trip.requests.push(req.user._id);
        await trip.save();
        res.status(200).json({ message: "Join request sent" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reject fisherman request
export const rejectFisherman = async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id);
        if (!trip) return res.status(404).json({ message: "Trip not found" });

        const userId = req.params.userId;
        trip.requests = trip.requests.filter(id => id.toString() !== userId);
        await trip.save();

        createNotification(
            userId,
            "Request Update",
            `Your request to join the trip on vessel ${trip.vesselId?.name || ''} was not accepted at this time.`,
            'trip',
            trip._id
        );

        res.status(200).json({ message: "Request rejected" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Approve fisherman
export const approveFisherman = async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id);
        if (!trip) return res.status(404).json({ message: "Trip not found" });
        if (trip.crew.length >= trip.maxFishermen) return res.status(400).json({ message: "Crew full" });

        const userId = req.params.userId;
        trip.requests = trip.requests.filter(id => id.toString() !== userId);
        trip.crew.push(userId);
        await trip.save();

        createNotification(
            userId,
            "Trip Approved!",
            `You have been approved to join the trip on vessel ${trip.vesselId?.name || ''}.`,
            'trip',
            trip._id
        );

        res.status(200).json({ message: "Approved" });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get trip details
export const getTripDetails = async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id)
            .populate('vesselId', 'name licenseNumber image')
            .populate('crew', 'name phone profileImage district')
            .populate('requests', 'name phone profileImage district');
        res.status(200).json(trip);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete/Cancel a trip
export const deleteTrip = async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id);
        if (!trip) return res.status(404).json({ message: "Trip not found" });
        if (trip.plannerId.toString() !== req.user._id.toString()) return res.status(401).json({ message: "Not authorized" });
        
        if (trip.status !== 'planned') {
            return res.status(400).json({ message: "Only planned trips can be cancelled" });
        }

        await Trip.deleteOne({ _id: req.params.id });
        res.status(200).json({ message: "Trip cancelled successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Remove a crew member from trip
export const removeCrewMember = async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id);
        if (!trip) return res.status(404).json({ message: "Trip not found" });
        if (trip.plannerId.toString() !== req.user._id.toString()) return res.status(401).json({ message: "Not authorized" });
        
        if (trip.status !== 'planned') {
            return res.status(400).json({ message: "Cannot change crew once trip has started" });
        }

        const userId = req.params.userId;
        trip.crew = trip.crew.filter(id => id.toString() !== userId);
        await trip.save();
        
        res.status(200).json({ message: "Crew member removed" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get trip summary
export const getTripSummary = async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id);
        if (!trip) return res.status(404).json({ message: "Trip not found" });

        const summary = {
            totalWeight: 0,
            supermarketStock: 0,
            customerStock: 0,
            wasteProduct: 0,
            catchBreakdown: {},
            catchBreakdownDetails: {}
        };

        // We need to populate catches to get their grades and weights
        const tripWithCatches = await Trip.findById(req.params.id).populate('catches');

        tripWithCatches.catches.forEach(c => {
            summary.totalWeight += c.weight;
            if (c.grade === 'Grade A') summary.supermarketStock += c.weight;
            else if (c.grade === 'Grade B') summary.customerStock += c.weight;
            else if (c.grade === 'Grade C') summary.wasteProduct += c.weight;

            if (!summary.catchBreakdown[c.fishType]) summary.catchBreakdown[c.fishType] = 0;
            summary.catchBreakdown[c.fishType] += c.weight;

            if (!summary.catchBreakdownDetails[c.fishType]) {
                summary.catchBreakdownDetails[c.fishType] = { gradeA: 0, gradeB: 0, gradeC: 0 };
            }
            if (c.grade === 'Grade A') summary.catchBreakdownDetails[c.fishType].gradeA += c.weight;
            else if (c.grade === 'Grade B') summary.catchBreakdownDetails[c.fishType].gradeB += c.weight;
            else if (c.grade === 'Grade C') summary.catchBreakdownDetails[c.fishType].gradeC += c.weight;
        });

        res.status(200).json(summary);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update custom prices for a trip
export const updateTripPrices = async (req, res) => {
    try {
        const { id } = req.params;
        const { customPrices } = req.body;

        const trip = await Trip.findById(id);
        if (!trip) return res.status(404).json({ message: "Trip not found" });

        // Verify that the person updating is the planner
        if (trip.plannerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Only the trip planner can set prices" });
        }

        trip.customPrices = customPrices;
        await trip.save();

        res.json({ message: "Prices updated successfully", customPrices: trip.customPrices });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Helper to get nearby districts
const getNearbyDistricts = (district) => {
    const map = {
        'Galle': ['Galle', 'Matara', 'Hambantota'],
        'Matara': ['Matara', 'Galle', 'Hambantota'],
        'Hambantota': ['Hambantota', 'Matara', 'Galle'],
        'Colombo': ['Colombo', 'Kalutara', 'Gampaha'],
        'Kalutara': ['Kalutara', 'Colombo', 'Galle'],
        'Gampaha': ['Gampaha', 'Colombo', 'Puttalam'],
        'Puttalam': ['Puttalam', 'Gampaha', 'Mannar'],
        'Trincomalee': ['Trincomalee', 'Mullaitivu', 'Batticaloa'],
        'Batticaloa': ['Batticaloa', 'Trincomalee', 'Ampara'],
        'Ampara': ['Ampara', 'Batticaloa', 'Hambantota'],
        'Jaffna': ['Jaffna', 'Kilinochchi', 'Mannar'],
        'Mannar': ['Mannar', 'Jaffna', 'Puttalam'],
        'Mullaitivu': ['Mullaitivu', 'Trincomalee', 'Jaffna']
    };
    return map[district] || [district];
};

// @desc    Get ongoing catches for a district (Market Feed)
export const getDistrictOngoingCatches = async (req, res) => {
    try {
        const { district } = req.params;
        const nearbyDistricts = getNearbyDistricts(district);

        // Find ongoing trips where the planner/vessel belongs to nearby districts
        const trips = await Trip.find({ status: 'ongoing' })
            .populate({
                path: 'plannerId',
                match: { district: { $in: nearbyDistricts } },
                select: 'name district'
            })
            .populate('vesselId', 'name image vesselType')
            .populate({
                path: 'catches',
                options: { sort: { createdAt: -1 } }
            });

        const filteredTrips = trips.filter(t => t.plannerId !== null);
        res.status(200).json(filteredTrips);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark attendance for a trip
export const markAttendance = async (req, res) => {
    try {
        const { attendance } = req.body;
        const trip = await Trip.findById(req.params.id);
        if (!trip) return res.status(404).json({ message: "Trip not found" });

        trip.attendance = attendance;
        trip.isAttendanceMarked = true;
        await trip.save();

        res.status(200).json({ message: "Attendance marked successfully", trip });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user payouts
export const getUserPayouts = async (req, res) => {
    try {
        const payouts = await Payout.find({ userId: req.user._id }).populate('tripId', 'departureTime');
        res.status(200).json(payouts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
