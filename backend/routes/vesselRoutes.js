import express from 'express';
import { 
    registerVessel, 
    getMyVessels, 
    updateVesselStatus,
    getAvailableForRentVessels,
    rentVessel,
    deleteVessel,
    recordMaintenance
} from '../controllers/vesselController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/available-for-rent', protect, getAvailableForRentVessels);
router.post('/:id/rent', protect, rentVessel);

router.route('/')
    .post(protect, registerVessel)
    .get(protect, getMyVessels);

router.get('/my-vessels', protect, getMyVessels);

router.route('/:id')
    .put(protect, updateVesselStatus)
    .delete(protect, deleteVessel);

router.post('/:id/maintenance', protect, recordMaintenance);

export default router;
