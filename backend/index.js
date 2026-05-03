import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import userRoutes from './routes/userRoutes.js';
import tripRoutes from './routes/tripRoutes.js';
import vesselRoutes from './routes/vesselRoutes.js';
import marketRoutes from './routes/marketRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import { seedRates } from './controllers/marketRateController.js';
import dns from "node:dns/promises";
dns.setServers(["1.1.1.1", "8.8.8.8"]);

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/vessels', vesselRoutes);
app.use('/api/market-rates', marketRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);





// Database Connection
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log(' MongoDB Connected');
        seedRates();
        app.listen(PORT, '0.0.0.0', () => console.log(` Server running on port ${PORT}`));
    })

    .catch((err) => {
        console.error('MongoDB Connection Error:', err.message);
    });
