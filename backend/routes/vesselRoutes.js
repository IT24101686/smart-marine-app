import express from 'express';
import { 
    registerVessel, 
    getMyVessels, 
    updateVessel,
    getAvailableForRentVessels,
    rentVessel,
    deleteVessel,
    recordMaintenance,
    requestVesselRental,
    getRentalRequests,
    respondToRentalRequest
} from '../controllers/vesselController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/rental-requests', protect, getRentalRequests);
router.put('/rental-requests/:id/respond', protect, respondToRentalRequest);
router.get('/available-for-rent', protect, getAvailableForRentVessels);
router.post('/:id/rent', protect, rentVessel);
router.post('/:id/request-rent', protect, requestVesselRental);

router.route('/')
    .post(protect, registerVessel)
    .get(protect, getMyVessels);

router.get('/my-vessels', protect, getMyVessels);

router.route('/:id')
    .put(protect, updateVessel)
    .delete(protect, deleteVessel);

router.put('/:id/status', protect, updateVessel);
router.post('/:id/maintenance', protect, recordMaintenance);

export default router;
