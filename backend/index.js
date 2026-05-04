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
import fishPriceRoutes from './routes/fishPriceRoutes.js';
import buyerPriceRoutes from './routes/buyerPriceRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import payoutRoutes from './routes/payoutRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import { seedRates } from './controllers/marketRateController.js';
import dns from "node:dns/promises";
dns.setServers(["1.1.1.1", "8.8.8.8"]);

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request Logging Middleware (For Debugging)
app.use((req, res, next) => {
    console.log(`📡 Incoming Request: ${req.method} ${req.url}`);
    next();
});

// Serve static files
app.use('/uploads', express.static('uploads'));

// Root Route
app.get('/', (req, res) => {
    res.send('Smart Marine API is running...');
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/vessels', vesselRoutes);
app.use('/api/market-rates', marketRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/buyer-prices', buyerPriceRoutes);
app.use('/api/fish-prices', fishPriceRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/reviews', reviewRoutes);





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
