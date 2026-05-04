import mongoose from 'mongoose';

const vesselSchema = new mongoose.Schema({
    name: { type: String, required: true },
    ownerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    image: { type: String, default: '' },
    licenseNumber: { type: String, required: true, unique: true },
    vesselType: { 
        type: String, 
        enum: ['one-day', 'multi-day', 'other'], 
        default: 'one-day' 
    },
    capacity: { type: Number },
    isAvailableForRent: { type: Boolean, default: false },
    rentalPrice: { type: Number },
    rentalPriceType: { 
        type: String, 
        enum: ['per-day', 'per-trip', 'none'], 
        default: 'none' 
    },
    status: { 
        type: String, 
        enum: ['available', 'in-sea', 'rented', 'maintenance', 'service-due'], 
        default: 'available' 
    },
    photos: [{ type: String }],
    currentRenter: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        default: null 
    },
    rentStartDate: { type: Date },
    ownerCommission: { type: Number, default: 40 }, // % to Owner
    plannerCommission: { type: Number, default: 10 }, // % to Planner
    crewCommission: { type: Number, default: 50 }, // % to be shared among crew
    lastMaintenanceDate: { type: Date },
    nextMaintenanceDate: { type: Date },
    maintenanceNotes: { type: String }
}, { timestamps: true });

const Vessel = mongoose.model('Vessel', vesselSchema);
export default Vessel;
