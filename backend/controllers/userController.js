import User from '../models/User.js';
import Vessel from '../models/Vessel.js';
import jwt from 'jsonwebtoken';

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

export const registerUser = async (req, res) => {
    const {
        name, email, password, phone, role, district, address,
        boatName, boatLicense, shopName, shopAddress
    } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const newUser = new User({
            name, email, password, phone, role, district, address,
            boatName, boatLicense, shopName, shopAddress
        });
        const savedUser = await newUser.save();

        // Automatically create a vessel record for boat owners
        if (role === 'boat_owner' && boatName) {
            const vessel = new Vessel({
                name: boatName,
                ownerId: savedUser._id,
                licenseNumber: boatLicense || `TEMP-${savedUser._id.toString().slice(-4)}`,
                vesselType: 'multi-day',
                capacity: 0,
                status: 'maintenance' // Default to maintenance until profile is completed
            });
            await vessel.save();
        }

        res.status(201).json({
            message: "User registered successfully",
            user: {
                _id: savedUser._id,
                name,
                email,
                role,
                district,
                address,
                token: generateToken(savedUser._id)
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            res.status(200).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                district: user.district,
                address: user.address,
                profileImage: user.profileImage,
                latitude: user.latitude,
                longitude: user.longitude,
                token: generateToken(user._id)
            });
        } else {
            res.status(401).json({ message: "Invalid email or password" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.name = req.body.name || user.name;
            user.phone = req.body.phone || user.phone;
            user.address = req.body.address || user.address;
            user.profileImage = req.body.profileImage || user.profileImage;
            user.district = req.body.district || user.district;
            user.latitude = req.body.latitude !== undefined ? req.body.latitude : user.latitude;
            user.longitude = req.body.longitude !== undefined ? req.body.longitude : user.longitude;

            if (req.body.password) {
                user.password = req.body.password;
            }

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                district: updatedUser.district,
                address: updatedUser.address,
                profileImage: updatedUser.profileImage,
                latitude: updatedUser.latitude,
                longitude: updatedUser.longitude,
                token: generateToken(updatedUser._id),
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
export const updateCart = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            user.cart = req.body.cart;
            await user.save();
            res.json({ message: 'Cart updated', cart: user.cart });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getCart = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            res.json(user.cart);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
