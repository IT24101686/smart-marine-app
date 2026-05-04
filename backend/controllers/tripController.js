import Trip from '../models/Trip.js';
import User from '../models/User.js';
import Vessel from '../models/Vessel.js';
import Payout from '../models/Payout.js';
import TripFishPrice from '../models/TripFishPrice.js';
import Inventory from '../models/Inventory.js';
import Catch from '../models/Catch.js';
import MarketRate from '../models/MarketRate.js';
import { createNotification } from './notificationController.js';
import { getNearbyDistricts } from '../utils/districtUtils.js';


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

// @desc    Get available trips for fishermen (filtered by district proximity)
export const getAvailableTrips = async (req, res) => {
    const { district } = req.params;
    try {
        const nearby = getNearbyDistricts(district);

        // Find planned trips where the planner is in the nearby districts
        const trips = await Trip.find({ status: 'planned' })
            .populate({
                path: 'vesselId',
                select: 'name image vesselType'
            })
            .populate({
                path: 'plannerId',
                match: { district: { $in: nearby } },
                select: 'name district phone'
            });

        // Filter out trips where plannerId didn't match the nearby districts
        let filteredTrips = trips.filter(t => t.plannerId !== null);

        // Sort: Exact district match first, then neighbors
        filteredTrips.sort((a, b) => {
            if (a.plannerId.district === district && b.plannerId.district !== district) return -1;
            if (a.plannerId.district !== district && b.plannerId.district === district) return 1;
            return 0;
        });

        res.status(200).json(filteredTrips);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all completed trips (Market Feed) — with catches & fish prices embedded
export const getAllCompletedTrips = async (req, res) => {
    try {
        const { district } = req.query;

        // Build the base query
        let query = { status: { $in: ['completed', 'sold'] } };

        const trips = await Trip.find(query)
            .populate({ path: 'vesselId', select: 'name licenseNumber image vesselType' })
            .populate({ path: 'plannerId', select: 'name district phone address' })
            .populate({ path: 'buyerId', select: 'name district phone address' })
            .populate({ path: 'catches', select: 'fishType grade weight photos' });

        // Apply 3-district proximity filter
        let filteredTrips = trips;
        if (district) {
            const nearby = getNearbyDistricts(district); // always 3 districts incl. own
            filteredTrips = trips.filter(t => t.plannerId && nearby.includes(t.plannerId.district));
        }

        // Embed TripFishPrice for each trip (single bulk fetch for performance)
        const tripIds = filteredTrips.map(t => t._id);
        const fishPriceDocs = await TripFishPrice.find({ tripId: { $in: tripIds } });
        const priceMap = {};
        fishPriceDocs.forEach(doc => { priceMap[doc.tripId.toString()] = doc.prices; });

        // Build catch summary inline (no separate /summary call needed)
        const enriched = filteredTrips.map(trip => {
            const prices = priceMap[trip._id.toString()] || [];

            let gradeAWeight = 0, gradeBWeight = 0, gradeCWeight = 0, totalWeight = 0;
            const catchBreakdown = {};
            const catchBreakdownDetails = {};

            (trip.catches || []).forEach(c => {
                totalWeight += c.weight || 0;
                if (c.grade === 'Grade A') gradeAWeight += c.weight || 0;
                else if (c.grade === 'Grade B') gradeBWeight += c.weight || 0;
                else if (c.grade === 'Grade C') gradeCWeight += c.weight || 0;

                if (!catchBreakdown[c.fishType]) catchBreakdown[c.fishType] = 0;
                catchBreakdown[c.fishType] += c.weight || 0;

                if (!catchBreakdownDetails[c.fishType]) {
                    catchBreakdownDetails[c.fishType] = { gradeA: 0, gradeB: 0, gradeC: 0 };
                }
                if (c.grade === 'Grade A') catchBreakdownDetails[c.fishType].gradeA += c.weight || 0;
                else if (c.grade === 'Grade B') catchBreakdownDetails[c.fishType].gradeB += c.weight || 0;
                else if (c.grade === 'Grade C') catchBreakdownDetails[c.fishType].gradeC += c.weight || 0;
            });

            // Estimate total value using TripFishPrice (pricePerKg × sellable kg)
            let estimatedValue = 0;
            prices.forEach(p => {
                const details = catchBreakdownDetails[p.fishType];
                if (details) {
                    const sellableKg = (details.gradeA || 0) + (details.gradeB || 0);
                    estimatedValue += sellableKg * (p.pricePerKg || 0);
                }
            });

            return {
                ...trip.toObject(),
                fishPrices: prices,
                catchSummary: {
                    totalWeight,
                    gradeAWeight,
                    gradeBWeight,
                    gradeCWeight,
                    catchCount: (trip.catches || []).length,
                    catchBreakdown,
                    catchBreakdownDetails
                },
                estimatedValue
            };
        }).filter(t => t.status === 'completed' || t.catchSummary.totalWeight > 0);

        res.status(200).json(enriched);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Buy a trip catch
export const buyTripCatch = async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id)
            .populate('vesselId')
            .populate('crew', '_id')
            .populate('catches');

        if (!trip) return res.status(404).json({ message: "Trip not found" });
        if (trip.status === 'sold') return res.status(400).json({ message: "Already sold" });

        const totalRevenue = req.body.totalPrice || 0;
        trip.status = 'sold';
        trip.buyerId = req.user._id;
        trip.totalRevenue = totalRevenue;

        const updatedTrip = await trip.save();

        // --- INVENTORY POPULATION ---
        // Transfer Grade A and B catches to the buyer's inventory
        for (const catchDoc of (trip.catches || [])) {
            if (catchDoc.grade === 'Grade C') continue;
            if (catchDoc.weight <= 0) continue;

            // Fetch Market Rate for this fish type to set a default retail price
            const marketRate = await MarketRate.findOne({ fishType: catchDoc.fishType });
            let retailPrice = 0;
            if (marketRate) {
                retailPrice = catchDoc.grade === 'Grade A' ? marketRate.retailPriceA : marketRate.retailPriceB;
            }

            await Inventory.create({
                sellerId: req.user._id,
                fishType: catchDoc.fishType,
                grade: catchDoc.grade,
                weight: catchDoc.weight,
                originalCatchId: catchDoc._id,
                tripId: trip._id,
                price: retailPrice, // Default price from market rates
                district: req.user.district, // Store buyer's district for easy filtering
                photos: catchDoc.photos || []
            });
            console.log(`📦 Stocked ${catchDoc.weight}kg of ${catchDoc.fishType} to buyer's inventory at LKR ${retailPrice}/kg.`);
        }

        // --- PAYOUT GENERATION ---
        const vessel = trip.vesselId; // may be null if vessel was deleted
        const vesselName = vessel?.name || 'Vessel';

        const ownerCommission = vessel?.ownerCommission ?? 40;
        const plannerCommission = vessel?.plannerCommission ?? 10;
        const crewCommission = vessel?.crewCommission ?? 50;

        const totalCosts = (trip.fuelCost || 0) + (trip.foodCost || 0) + (trip.baitCost || 0) + (trip.otherCosts || 0);
        const combinedRevenue = (trip.totalRevenue || 0) + (trip.gradeCRevenue || 0);

        let remainingProfit = Math.max(0, combinedRevenue - totalCosts);
        let ownerEarnings = 0;
        const payoutRecords = [];

        if (vessel) {
            // 1. Owner share
            const isRented = vessel.status === 'rented' || (vessel.isAvailableForRent && vessel.currentRenter);

            if (isRented) {
                const days = Math.max(1, Math.ceil((new Date() - new Date(trip.departureTime)) / (1000 * 60 * 60 * 24)));
                const rentalFee = (vessel.rentalPrice || 0) * days;
                ownerEarnings = rentalFee;
                remainingProfit = Math.max(0, remainingProfit - rentalFee);

                if (vessel.ownerId) {
                    payoutRecords.push({
                        tripId: trip._id,
                        userId: vessel.ownerId,
                        role: 'boat_owner',
                        amount: ownerEarnings,
                        type: 'rental'          // ✅ matches Payout enum
                    });
                }
            } else {
                ownerEarnings = (remainingProfit * ownerCommission) / 100;
                remainingProfit -= ownerEarnings;

                if (vessel.ownerId) {
                    payoutRecords.push({
                        tripId: trip._id,
                        userId: vessel.ownerId,
                        role: 'boat_owner',
                        amount: ownerEarnings,
                        type: 'share'
                    });
                }
            }
        }

        // 2. Planner + Crew split from remainingProfit
        const totalRemRatio = plannerCommission + crewCommission;
        const plannerShare = totalRemRatio > 0 ? (remainingProfit * plannerCommission) / totalRemRatio : 0;
        const totalCrewShare = remainingProfit - plannerShare;

        if (trip.plannerId) {
            payoutRecords.push({
                tripId: trip._id,
                userId: trip.plannerId,
                role: 'trip_planner',
                amount: plannerShare,
                type: 'commission'
            });
        }

        // Crew payouts — prefer attendance list, fall back to full crew
        const attendance = trip.attendance || [];
        const presentCrew = attendance.filter(a => a.isPresent).map(a => a.userId);
        const crewList = presentCrew.length > 0 ? presentCrew : (trip.crew || []).map(c => c._id || c);
        const crewCount = crewList.length;

        if (crewCount > 0) {
            const perCrew = totalCrewShare / crewCount;
            crewList.forEach(crewId => {
                payoutRecords.push({
                    tripId: trip._id,
                    userId: crewId,
                    role: 'crew',
                    amount: perCrew,
                    type: 'share'
                });
            });
        }

        if (payoutRecords.length > 0) {
            await Payout.insertMany(payoutRecords);
        }

        // Notifications
        const stakeholders = [
            trip.plannerId,
            vessel?.ownerId,
            ...(trip.crew || []).map(c => c._id || c)
        ].filter(Boolean);

        stakeholders.forEach(userId => {
            createNotification(
                userId,
                "Catch Sold! 💰",
                `The catch from trip on ${vesselName} has been sold for LKR ${totalRevenue.toLocaleString()}. Check your earnings.`,
                'payment',
                trip._id
            );
        });

        res.status(200).json({ message: "Purchase successful!", trip: updatedTrip });

    } catch (error) {
        console.error('buyTripCatch error:', error);
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

        const vessel = trip.vesselId;
        const ownerPct = vessel?.ownerCommission ?? 40;
        const plannerPct = vessel?.plannerCommission ?? 10;
        const crewPct = vessel?.crewCommission ?? 50;

        const totalCosts = (trip.fuelCost || 0) + (trip.foodCost || 0) + (trip.baitCost || 0) + (trip.otherCosts || 0);

        // Actual revenue only set once a buyer purchases
        const actualRevenue = (trip.totalRevenue || 0) + (trip.gradeCRevenue || 0);

        // Fetch per-kg prices set by planner when trip ended
        const fishPriceDoc = await TripFishPrice.findOne({ tripId: trip._id });

        // Build estimated revenue from fishPrices × weight-per-grade
        let estimatedRevenue = 0;
        if (fishPriceDoc && fishPriceDoc.prices.length > 0) {
            // We need catches to get weight per fish type
            const tripWithCatches = await Trip.findById(trip._id).populate('catches');
            fishPriceDoc.prices.forEach(priceEntry => {
                const pricePerKg = priceEntry.pricePerKg || 0;
                // Sum all catches of this fish type (Grade A + Grade B — Grade C is sold separately)
                const totalKg = tripWithCatches.catches
                    .filter(c => c.fishType === priceEntry.fishType && c.grade !== 'Grade C')
                    .reduce((sum, c) => sum + (c.weight || 0), 0);
                estimatedRevenue += totalKg * pricePerKg;
            });
            estimatedRevenue += (trip.gradeCRevenue || 0); // add Grade C revenue if already sold
        }

        const isSold = trip.status === 'sold';
        const displayRevenue = isSold ? actualRevenue : (estimatedRevenue || actualRevenue);
        const netProfit = displayRevenue - totalCosts;

        const ownerEarnings = Math.max(0, netProfit * ownerPct / 100);
        const plannerEarnings = Math.max(0, netProfit * plannerPct / 100);
        const totalCrewEarnings = Math.max(0, netProfit * crewPct / 100);
        const crewCount = trip.crew.length || 1;
        const individualCrewEarnings = totalCrewEarnings / crewCount;

        res.status(200).json({
            totalRevenue: displayRevenue,
            actualRevenue,
            estimatedRevenue,
            gradeCRevenue: trip.gradeCRevenue || 0,
            totalCosts,
            netProfit,
            isSold,
            fishPrices: fishPriceDoc ? fishPriceDoc.prices : [],
            breakdown: {
                owner: ownerEarnings,
                planner: plannerEarnings,
                crewTotal: totalCrewEarnings,
                crewIndividual: individualCrewEarnings,
                crewCount
            },
            commissions: {
                owner: ownerPct,
                planner: plannerPct,
                crew: crewPct
            },
            costs: {
                fuel: trip.fuelCost || 0,
                food: trip.foodCost || 0,
                bait: trip.baitCost || 0,
                other: trip.otherCosts || 0
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
            .populate('vesselId', 'name licenseNumber image vesselType')
            .populate('crew', 'name phone profileImage district')
            .populate('requests', 'name phone profileImage district')
            .populate('catches');
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

// @desc    Get trip summary (catch breakdown + trip meta)
export const getTripSummary = async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id)
            .populate('crew', 'name phone district')
            .populate('catches');

        if (!trip) return res.status(404).json({ message: "Trip not found" });

        const summary = {
            status: trip.status,
            totalWeight: 0,
            catchCount: trip.catches.length,
            supermarketStock: 0,   // Grade A
            customerStock: 0,   // Grade B
            wasteProduct: 0,   // Grade C
            catchBreakdown: {},
            catchBreakdownDetails: {},
            crew: trip.crew,
            crewRatings: trip.crewRatings || []
        };

        trip.catches.forEach(c => {
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

// @desc    Rate crew members for a trip
export const rateCrew = async (req, res) => {
    const { id } = req.params;
    const { ratings } = req.body; // Array of { userId, rating, comment }

    try {
        const trip = await Trip.findById(id);
        if (!trip) return res.status(404).json({ message: 'Trip not found' });

        trip.crewRatings = ratings;
        await trip.save();

        // Update each user's average rating
        for (const r of ratings) {
            const user = await User.findById(r.userId);
            if (user) {
                // Calculate new average: (old_avg * old_count + new_rating) / (old_count + 1)
                const currentTotalScore = (user.rating || 0) * (user.totalRatings || 0);
                const newTotalRatings = (user.totalRatings || 0) + 1;
                const newAverageRating = (currentTotalScore + r.rating) / newTotalRatings;

                user.totalRatings = newTotalRatings;
                user.rating = newAverageRating;
                await user.save();

                // Notify fisherman about the new rating
                createNotification(
                    user._id,
                    "New Performance Rating! ⭐",
                    `You received a ${r.rating}-star rating for your work on trip #${id.slice(-6)}.`,
                    'trip',
                    id
                );
            }
        }

        res.json({ message: 'Ratings submitted successfully', trip });
    } catch (error) {
        console.error("Rate Crew Error:", error);
        res.status(500).json({ message: error.message });
    }
};

