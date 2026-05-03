import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const checkUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart-marine');
        const users = await User.find({}, 'email role name');
        console.log('--- Current Users in Database ---');
        users.forEach(u => {
            console.log(`Name: ${u.name} | Email: ${u.email} | Role: ${u.role}`);
        });
        console.log('---------------------------------');
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkUsers();
