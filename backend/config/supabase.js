import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)?.trim();

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase URL or Key is missing in .env file');
} else {
    console.log('✅ Supabase config loaded:', supabaseUrl);
}

export const supabase = createClient(supabaseUrl, supabaseKey);

