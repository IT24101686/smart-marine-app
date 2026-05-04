import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['boat_owner', 'trip_planner', 'fisherman', 'seller', 'customer', 'admin', 'main_buyer'], 
        default: 'customer' 
    },
    district: { type: String, required: true },
    address: { type: String, required: true },
    boatName: { type: String },
    boatLicense: { type: String },
    shopName: { type: String },
    shopAddress: { type: String },
    isVerified: { type: Boolean, default: false },
    profileImage: { type: String, default: "" },
    latitude: { type: Number },
    longitude: { type: Number },
    cart: [{
        tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
        fishType: String,
        weight: Number,
        price: Number,
        buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        buyerName: String,
        image: String,
        availableStock: Number
    }],
    rating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
