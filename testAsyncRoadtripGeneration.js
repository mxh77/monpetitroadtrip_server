import axios from 'axios';

// Test the async AI roadtrip generation
async function testAsyncRoadtripGeneration() {
    try {
        const response = await axios.post('http://localhost:3000/api/roadtrips/ai/async', {
            startLocation: "Paris, France",
            endLocation: "Nice, France",
            startDate: "2025-08-01",
            endDate: "2025-08-15",
            description: "Vacances d'été en famille, on veut profiter des plages et voir quelques sites culturels",
            travelers: "2 adultes et 2 enfants (8 et 12 ans)"
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE' // Replace with a valid JWT token
            }
        });
        
        console.log('Response:', response.data);
    } catch (error) {
        console.error('Error response:', error.response?.data || error.message);
    }
}

testAsyncRoadtripGeneration();
