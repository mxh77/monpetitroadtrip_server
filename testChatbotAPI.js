import fetch from 'node-fetch';
import WebSocket from 'ws';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Test complet de l'API Chatbot
 */
async function testChatbotAPI() {
    console.log('🤖 Test API Chatbot Complet');
    console.log('============================');
    
    // Configuration de test
    const BASE_URL = 'http://localhost:3000';
    const ROADTRIP_ID = '6578f1a2bcf86cd799439015'; // ID de test
    const TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjY1NzhmMWEyYmNmODZjZDc5OTQzOTAxMiIsImlhdCI6MTcwNDg5MjgwMCwiZXhwIjoxNzA0OTc5MjAwfQ.example'; // Token de test
    
    try {
        // Test 1: Connexion WebSocket
        console.log('\n📡 Test 1: Connexion WebSocket');
        const ws = new WebSocket(`ws://localhost:3000/websocket`);
        
        ws.on('open', function() {
            console.log('✅ WebSocket connecté');
            
            // S'abonner aux notifications
            ws.send(JSON.stringify({
                type: 'subscribe_roadtrip',
                roadtripId: ROADTRIP_ID
            }));
        });
        
        ws.on('message', function(data) {
            const message = JSON.parse(data);
            console.log('📥 WebSocket:', message.type);
            
            if (message.type === 'notification') {
                console.log('🔔 Notification reçue:', message.data.title);
            }
        });
        
        // Attendre un peu pour la connexion
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Test 2: Envoi d'une requête simple
        console.log('\n💬 Test 2: Requête simple');
        const response1 = await fetch(`${BASE_URL}/api/roadtrips/${ROADTRIP_ID}/chat/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`
            },
            body: JSON.stringify({
                query: 'aide',
                conversationId: 'test_conv_' + Date.now()
            })
        });
        
        if (response1.ok) {
            try {
                const result1 = await response1.json();
                console.log('✅ Réponse:', result1.success ? 'Succès' : 'Échec');
                console.log('📋 Message:', result1.message);
                console.log('🎯 Intent:', result1.intent);
            } catch (jsonError) {
                console.log('❌ Erreur parsing JSON:', jsonError.message);
                const text = await response1.text();
                console.log('❌ Réponse reçue:', text.substring(0, 200) + '...');
            }
        } else {
            console.log('❌ Erreur HTTP:', response1.status);
            const error = await response1.text();
            console.log('❌ Détails:', error.substring(0, 500) + '...');
        }
        
        // Test 3: Requête plus complexe
        console.log('\n🏙️ Test 3: Ajouter une étape');
        const response2 = await fetch(`${BASE_URL}/api/roadtrips/${ROADTRIP_ID}/chat/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`
            },
            body: JSON.stringify({
                query: 'Ajoute une étape à Paris du 15 au 17 juillet',
                conversationId: 'test_conv_' + Date.now()
            })
        });
        
        if (response2.ok) {
            const result2 = await response2.json();
            console.log('✅ Réponse:', result2.success ? 'Succès' : 'Échec');
            console.log('📋 Message:', result2.message);
            console.log('🎯 Intent:', result2.intent);
            console.log('🆔 Job ID:', result2.jobId);
            
            // Suivre le statut du job
            if (result2.jobId) {
                console.log('\n⏳ Test 4: Suivi du job');
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const statusResponse = await fetch(`${BASE_URL}/api/roadtrips/${ROADTRIP_ID}/chat/jobs/${result2.jobId}/status`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${TOKEN}`
                    }
                });
                
                if (statusResponse.ok) {
                    const statusResult = await statusResponse.json();
                    console.log('✅ Statut job:', statusResult.status);
                    console.log('📄 Résultat:', statusResult.result?.message || 'En cours...');
                } else {
                    console.log('❌ Erreur statut job:', statusResponse.status);
                }
            }
        } else {
            console.log('❌ Erreur HTTP:', response2.status);
            const error = await response2.text();
            console.log('❌ Détails:', error);
        }
        
        // Test 5: Récupérer les conversations
        console.log('\n📚 Test 5: Historique des conversations');
        const conversationsResponse = await fetch(`${BASE_URL}/api/roadtrips/${ROADTRIP_ID}/chat/conversations`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${TOKEN}`
            }
        });
        
        if (conversationsResponse.ok) {
            const conversations = await conversationsResponse.json();
            console.log('✅ Conversations:', conversations.success ? 'Récupérées' : 'Échec');
            console.log('📊 Nombre:', conversations.conversations?.length || 0);
        } else {
            console.log('❌ Erreur conversations:', conversationsResponse.status);
        }
        
        // Test 6: Récupérer les notifications
        console.log('\n🔔 Test 6: Notifications');
        const notificationsResponse = await fetch(`${BASE_URL}/api/roadtrips/${ROADTRIP_ID}/notifications`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${TOKEN}`
            }
        });
        
        if (notificationsResponse.ok) {
            const notifications = await notificationsResponse.json();
            console.log('✅ Notifications:', notifications.success ? 'Récupérées' : 'Échec');
            console.log('📊 Nombre:', notifications.notifications?.length || 0);
        } else {
            console.log('❌ Erreur notifications:', notificationsResponse.status);
        }
        
        // Fermer le WebSocket
        ws.close();
        
        console.log('\n🎉 Tests terminés !');
        console.log('ℹ️ Note: Les erreurs d\'authentification sont normales avec un token de test');
        
    } catch (error) {
        console.error('❌ Erreur durant les tests:', error);
    }
}

// Lancer les tests
testChatbotAPI();
