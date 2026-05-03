import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const testAPI = async () => {
    console.log('🚀 Starting API Verification...\n');

    try {
        // 1. Check Public Endpoints
        console.log('--- Checking Public Endpoints ---');
        const usersRes = await axios.get(`${API_URL}/users`);
        console.log('✅ GET /api/users - SUCCESS');

        const ratesRes = await axios.get(`${API_URL}/market-rates`);
        console.log('✅ GET /api/market-rates - SUCCESS');

        // 2. Test Login (Change these to your test credentials)
        console.log('\n--- Checking Authentication ---');
        try {
            // Note: You need a valid user in your local DB for this to pass
            const loginRes = await axios.post(`${API_URL}/users/login`, {
                email: 'test@example.com', 
                password: 'password123'
            });
            console.log('✅ POST /api/users/login - SUCCESS');
            const token = loginRes.data.token;

            const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

            // 3. Check Protected Endpoints
            console.log('\n--- Checking Protected Endpoints ---');
            
            const myTripsRes = await axios.get(`${API_URL}/trips/my-trips`, authHeaders);
            console.log('✅ GET /api/trips/my-trips - SUCCESS');

            const payoutsRes = await axios.get(`${API_URL}/trips/payouts`, authHeaders);
            console.log('✅ GET /api/trips/payouts - SUCCESS');

            const notificationsRes = await axios.get(`${API_URL}/notifications`, authHeaders);
            console.log('✅ GET /api/notifications - SUCCESS');

            // 4. Specifically check the attendance route (PUT)
            if (myTripsRes.data.length > 0) {
                const testTripId = myTripsRes.data[0]._id;
                console.log(`\n--- Testing Attendance on Trip: ${testTripId} ---`);
                try {
                    await axios.put(`${API_URL}/trips/${testTripId}/attendance`, { attendance: [] }, authHeaders);
                    console.log('✅ PUT /api/trips/:id/attendance - SUCCESS');
                } catch (e) {
                    console.log(`❌ PUT /api/trips/:id/attendance - FAILED: ${e.response?.status || e.message}`);
                }
            } else {
                console.log('\n⚠️ Skip Attendance test: No trips found for this user.');
            }

        } catch (authErr) {
            console.log('⚠️ AUTH TEST SKIPPED: Please update test credentials in the script to verify protected routes.');
        }

        console.log('\n✨ Verification Process Completed!');

    } catch (error) {
        console.error('\n❌ CRITICAL ERROR during verification:', error.message);
        console.log('Make sure your backend is running on http://localhost:3000');
    }
};

testAPI();
