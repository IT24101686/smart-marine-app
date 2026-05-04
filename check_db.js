import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Vessel from './backend/models/Vessel.js';
import User from './backend/models/User.js';

dotenv.config({ path: './backend/.env' });

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const vessels = await Vessel.find().populate('ownerId', 'name email role');
        console.log('\n--- ALL VESSELS IN DB ---');
        vessels.forEach(v => {
            console.log(`Boat Name: ${v.name}`);
            console.log(`License: ${v.licenseNumber}`);
            console.log(`Owner Name: ${v.ownerId?.name || 'Unknown'}`);
            console.log(`Owner ID: ${v.ownerId?._id || v.ownerId}`);
            console.log(`Owner Role: ${v.ownerId?.role || 'Unknown'}`);
            console.log('-------------------------');
        });

        const users = await User.find({}, 'name email role');
        console.log('\n--- ALL USERS IN DB ---');
        users.forEach(u => {
            console.log(`Name: ${u.name} | Role: ${u.role} | ID: ${u._id}`);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkData();
