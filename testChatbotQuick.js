// Test rapide de l'API chatbot
import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';
const roadtripId = 'test_roadtrip_123';

async function testChatbotAPI() {
    console.log('=== Test API Chatbot ===\n');
    
    try {
        // Test sans token (mode anonyme)
        console.log('1. Test sans token...');
        const response = await axios.post(`${API_BASE}/roadtrips/${roadtripId}/chat/query`, {
            query: "Aide",
            conversationId: `test_${Date.now()}`
        });
        
        console.log('✅ Réponse reçue:', response.data);
        
    } catch (error) {
        console.error('❌ Erreur:', error.response?.data || error.message);
    }
    
    try {
        // Test avec token JWT
        console.log('\n2. Test avec token JWT...');
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InRlc3RfdXNlcl8xMjMiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJuYW1lIjoiVGVzdCBVc2VyIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NTIwNDg4MTQsImV4cCI6MTc1NDY0MDgxNH0.AsYs0hyRfAKzmhroC9QfKP1AtxK8H1GFisrwEGyv-r8';
        
        const response = await axios.post(`${API_BASE}/roadtrips/${roadtripId}/chat/query`, {
            query: "Ajoute une étape à Nice du 25 au 27 juillet",
            conversationId: `test_${Date.now()}`
        }, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('✅ Réponse avec token:', response.data);
        
    } catch (error) {
        console.error('❌ Erreur avec token:', error.response?.data || error.message);
    }
}

testChatbotAPI();
