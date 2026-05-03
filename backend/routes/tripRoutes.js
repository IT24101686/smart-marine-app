import express from 'express';
import { 
    createTrip, 
    // getAvailableFishermen, 
    getMyTrips,
    getAvailableTrips,
    requestToJoinTrip,
    approveFisherman,
    getTripDetails,
    getTripSummary,
    buyTripCatch,
    getAllCompletedTrips,
    getTripFinances,
    sellGradeC,
    deleteTrip,
    removeCrewMember,
    rejectFisherman,
    updateTripPrices,
    markAttendance,
    getUserPayouts,
    getDistrictOngoingCatches
} from '../controllers/tripController.js';

import { 
    logCatch, 
    startTrip, 
    completeTrip, 
    rescheduleTrip 
} from '../controllers/catchController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .post(protect, createTrip)
    .get(protect, getMyTrips);

router.get('/my-trips', protect, getMyTrips);
router.get('/payouts', protect, getUserPayouts);
router.get('/market/all', protect, getAllCompletedTrips);

// router.get('/fishermen/:district', protect, getAvailableFishermen);
router.get('/available/:district', protect, getAvailableTrips);
router.get('/ongoing/:district', protect, getDistrictOngoingCatches);

router.route('/:id')
    .get(protect, getTripDetails)
    .delete(protect, deleteTrip);

router.get('/:id/summary', protect, getTripSummary);
router.get('/:id/finances', protect, getTripFinances);
router.post('/:id/buy', protect, buyTripCatch);
router.post('/:id/sell-grade-c', protect, sellGradeC);

router.post('/:id/join', protect, requestToJoinTrip);
router.post('/:id/catch', protect, logCatch);
router.put('/:id/approve/:userId', protect, approveFisherman);
router.put('/:id/reject/:userId', protect, rejectFisherman);
router.delete('/:id/crew/:userId', protect, removeCrewMember);

router.put('/:id/start', protect, startTrip);
router.put('/:id/complete', protect, completeTrip);
router.put('/:id/prices', protect, updateTripPrices);
router.put('/:id/attendance', protect, markAttendance);
router.put('/:id/reschedule', protect, rescheduleTrip);

export default router;
