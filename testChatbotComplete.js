// Test complet du chatbot avec authentification et données réelles
import axios from 'axios';
import WebSocket from 'ws';
import { generateTestToken, createTestRoadtrip } from './testAuthToken.js';

// Configuration
const API_BASE = 'http://localhost:3000/api';
const WS_BASE = 'ws://localhost:3000/websocket';

// Fonction pour tester l'API REST
async function testChatbotAPI(token, roadtripId) {
    console.log('=== Test de l\'API REST Chatbot ===\n');
    
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    
    try {
        // Test 1: Envoyer un message au chatbot
        console.log('1. Test d\'envoi de message au chatbot...');
        const messageResponse = await axios.post(
            `${API_BASE}/roadtrips/${roadtripId}/chat/message`,
            {
                message: "Ajoute une étape à Marseille du 20 au 22 juillet",
                context: {
                    previousMessages: []
                }
            },
            { headers }
        );
        
        console.log('✅ Message envoyé avec succès');
        console.log('📋 Réponse:', messageResponse.data);
        
        const jobId = messageResponse.data.jobId;
        console.log('🔄 Job ID:', jobId);
        console.log('');
        
        // Test 2: Vérifier le statut du job
        console.log('2. Test de vérification du statut du job...');
        const statusResponse = await axios.get(
            `${API_BASE}/roadtrips/${roadtripId}/chat/job/${jobId}/status`,
            { headers }
        );
        
        console.log('✅ Statut récupéré avec succès');
        console.log('📋 Statut:', statusResponse.data);
        console.log('');
        
        // Test 3: Récupérer l'historique des conversations
        console.log('3. Test de récupération de l\'historique...');
        const historyResponse = await axios.get(
            `${API_BASE}/roadtrips/${roadtripId}/chat/history`,
            { headers }
        );
        
        console.log('✅ Historique récupéré avec succès');
        console.log('📋 Historique:', historyResponse.data);
        console.log('');
        
        // Test 4: Récupérer les notifications
        console.log('4. Test de récupération des notifications...');
        const notificationsResponse = await axios.get(
            `${API_BASE}/roadtrips/${roadtripId}/chat/notifications`,
            { headers }
        );
        
        console.log('✅ Notifications récupérées avec succès');
        console.log('📋 Notifications:', notificationsResponse.data);
        console.log('');
        
        return { success: true, jobId };
        
    } catch (error) {
        console.error('❌ Erreur lors du test de l\'API:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

// Fonction pour tester le WebSocket
async function testWebSocket(token, roadtripId) {
    console.log('=== Test du WebSocket ===\n');
    
    return new Promise((resolve, reject) => {
        const wsUrl = token ? `${WS_BASE}?token=${token}` : WS_BASE;
        console.log('🔗 Connexion à:', wsUrl);
        
        const ws = new WebSocket(wsUrl);
        let connected = false;
        let subscribed = false;
        let receivedNotifications = [];
        
        // Timeout pour les tests
        const timeout = setTimeout(() => {
            if (!connected) {
                console.log('❌ Timeout: connexion WebSocket échouée');
                ws.close();
                resolve({ success: false, error: 'Timeout de connexion' });
            }
        }, 5000);
        
        ws.on('open', () => {
            console.log('✅ WebSocket connecté');
            connected = true;
            clearTimeout(timeout);
            
            // S'abonner aux notifications du roadtrip
            ws.send(JSON.stringify({
                type: 'subscribe_roadtrip',
                roadtripId: roadtripId
            }));
            
            console.log('📡 Abonnement aux notifications envoyé');
        });
        
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                console.log('📩 Message WebSocket reçu:', message);
                
                if (message.type === 'subscription_confirmed') {
                    subscribed = true;
                    console.log('✅ Abonnement confirmé');
                    
                    // Envoyer un ping pour tester la connexion
                    ws.send(JSON.stringify({ type: 'ping' }));
                    console.log('🏓 Ping envoyé');
                }
                
                if (message.type === 'pong') {
                    console.log('🏓 Pong reçu');
                }
                
                if (message.type === 'notification') {
                    receivedNotifications.push(message);
                    console.log('🔔 Notification reçue:', message);
                }
                
                // Fermer après avoir testé les fonctionnalités de base
                if (subscribed && message.type === 'pong') {
                    setTimeout(() => {
                        ws.close();
                        resolve({
                            success: true,
                            connected: true,
                            subscribed: true,
                            notifications: receivedNotifications
                        });
                    }, 1000);
                }
                
            } catch (error) {
                console.error('❌ Erreur lors du parsing du message:', error);
            }
        });
        
        ws.on('error', (error) => {
            console.error('❌ Erreur WebSocket:', error);
            resolve({ success: false, error: error.message });
        });
        
        ws.on('close', () => {
            console.log('🔌 WebSocket fermé');
            if (!subscribed) {
                resolve({ success: false, error: 'Connexion fermée avant abonnement' });
            }
        });
    });
}

// Fonction pour tester plusieurs messages
async function testMultipleMessages(token, roadtripId) {
    console.log('=== Test de messages multiples ===\n');
    
    const messages = [
        "Ajoute une étape à Nice du 23 au 25 juillet",
        "Ajoute un hébergement Hôtel Negresco à Nice",
        "Ajoute une activité balade sur la Promenade des Anglais",
        "Ajoute une tâche réserver une table au restaurant",
        "Aide"
    ];
    
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    
    const results = [];
    
    for (let i = 0; i < messages.length; i++) {
        try {
            console.log(`${i + 1}. Test: "${messages[i]}"`);
            
            const response = await axios.post(
                `${API_BASE}/roadtrips/${roadtripId}/chat/message`,
                {
                    message: messages[i],
                    context: {
                        previousMessages: results.slice(-3) // Garder les 3 derniers messages pour le contexte
                    }
                },
                { headers }
            );
            
            console.log('✅ Message traité');
            console.log('📋 Réponse:', response.data.reply);
            console.log('🔄 Job ID:', response.data.jobId);
            
            results.push({
                message: messages[i],
                reply: response.data.reply,
                jobId: response.data.jobId
            });
            
            // Attendre un peu entre les messages
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            console.error(`❌ Erreur pour le message "${messages[i]}":`, error.response?.data || error.message);
            results.push({
                message: messages[i],
                error: error.response?.data || error.message
            });
        }
        
        console.log('');
    }
    
    return results;
}

// Fonction principale de test
async function runCompleteTests() {
    console.log('=== Tests complets du chatbot ===\n');
    
    try {
        // Générer un token et des données de test
        console.log('1. Génération du token et des données de test...');
        const token = generateTestToken();
        const roadtripId = 'roadtrip_test_123'; // ID fixe pour les tests
        
        console.log('✅ Token généré');
        console.log('🗺️ Roadtrip ID:', roadtripId);
        console.log('');
        
        // Tester l'API REST
        const apiResult = await testChatbotAPI(token, roadtripId);
        
        // Tester le WebSocket
        const wsResult = await testWebSocket(token, roadtripId);
        
        // Tester plusieurs messages
        const multipleMessagesResult = await testMultipleMessages(token, roadtripId);
        
        // Résumé des résultats
        console.log('=== Résumé des tests ===');
        console.log('🔧 API REST:', apiResult.success ? '✅ Succès' : '❌ Échec');
        console.log('🔗 WebSocket:', wsResult.success ? '✅ Succès' : '❌ Échec');
        console.log('💬 Messages multiples:', multipleMessagesResult.length, 'messages testés');
        console.log('');
        
        // Afficher les informations pour les tests manuels
        console.log('=== Informations pour les tests manuels ===');
        console.log('🔑 Token JWT:', token);
        console.log('🗺️ Roadtrip ID:', roadtripId);
        console.log('🌐 Interface de test: http://localhost:3000/test_chatbot.html');
        console.log('');
        
        return {
            api: apiResult,
            websocket: wsResult,
            multipleMessages: multipleMessagesResult,
            token: token,
            roadtripId: roadtripId
        };
        
    } catch (error) {
        console.error('❌ Erreur lors des tests:', error);
        throw error;
    }
}

// Exporter les fonctions
export {
    testChatbotAPI,
    testWebSocket,
    testMultipleMessages,
    runCompleteTests
};

// Exécuter les tests si le script est appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
    runCompleteTests().catch(console.error);
}
