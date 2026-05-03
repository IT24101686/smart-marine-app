import express from 'express';
import multer from 'multer';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { supabase } from '../config/supabase.js';

dotenv.config();

const router = express.Router();

// Configure Multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Single image upload with fallback to local
router.post('/', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.jpg`;
        const bucketName = process.env.SUPABASE_BUCKET || 'marine-storage';

        // 1. Try Supabase Upload
        if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
            try {
                const { data, error } = await supabase.storage
                    .from(bucketName)
                    .upload(`uploads/${fileName}`, req.file.buffer, {
                        contentType: req.file.mimetype,
                        upsert: true
                    });

                if (!error) {
                    const { data: { publicUrl } } = supabase.storage
                        .from(bucketName)
                        .getPublicUrl(`uploads/${fileName}`);
                    
                    return res.status(200).json({ 
                        message: 'Upload successful (Supabase)',
                        url: publicUrl 
                    });
                }
                console.warn('Supabase Error, falling back to local:', error.message);
            } catch (supaErr) {
                console.warn('Supabase Exception, falling back to local');
            }
        }

        // 2. Fallback to Local Storage
        const uploadDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const localFilePath = path.join(uploadDir, fileName);
        fs.writeFileSync(localFilePath, req.file.buffer);

        // Get the host from the request to build the full URL
        const protocol = req.protocol;
        const host = req.get('host');
        const localUrl = `${protocol}://${host}/uploads/${fileName}`;

        console.log('Local Upload Successful:', localUrl);

        res.status(200).json({ 
            message: 'Upload successful (Local Fallback)',
            url: localUrl 
        });

    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

export default router;
