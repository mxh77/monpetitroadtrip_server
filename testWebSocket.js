import WebSocket from 'ws';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Test rapide du WebSocket
 */
async function testWebSocket() {
    console.log('🔧 Test WebSocket');
    console.log('================');
    
    const ws = new WebSocket('ws://localhost:3000/websocket');
    
    ws.on('open', function() {
        console.log('✅ WebSocket connecté');
        
        // Envoyer un ping
        ws.send(JSON.stringify({
            type: 'ping',
            timestamp: Date.now()
        }));
        
        console.log('📤 Ping envoyé');
    });
    
    ws.on('message', function(data) {
        console.log('📥 Message reçu:', data.toString());
        
        try {
            const parsed = JSON.parse(data);
            console.log('📥 Données parsées:', parsed);
        } catch (e) {
            console.log('⚠️ Impossible de parser le JSON');
        }
    });
    
    ws.on('close', function(code, reason) {
        console.log(`❌ WebSocket fermé: ${code} - ${reason}`);
    });
    
    ws.on('error', function(error) {
        console.error('❌ Erreur WebSocket:', error);
    });
    
    // Fermer après 5 secondes
    setTimeout(() => {
        ws.close();
        console.log('🔌 Test terminé');
        process.exit(0);
    }, 5000);
}

// Lancer le test
testWebSocket();
