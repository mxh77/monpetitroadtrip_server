import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const BASE_URL = 'http://localhost:3000';

async function testAuthentication() {
    console.log('🔐 Test d\'authentification');
    console.log('===========================');
    
    try {
        // Test 1: Vérifier que le serveur répond
        console.log('\n📡 Test 1: Vérification du serveur');
        const healthResponse = await fetch(`${BASE_URL}/auth/status`);
        console.log('Status:', healthResponse.status);
        console.log('Headers:', Object.fromEntries(healthResponse.headers));
        
        if (healthResponse.ok) {
            const healthText = await healthResponse.text();
            console.log('✅ Serveur accessible');
            console.log('Réponse:', healthText.substring(0, 200));
        } else {
            console.log('❌ Serveur non accessible');
            const errorText = await healthResponse.text();
            console.log('Erreur:', errorText.substring(0, 500));
        }
        
        // Test 2: Tentative de connexion (si vous avez des credentials)
        console.log('\n🔑 Test 2: Tentative de connexion');
        const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'test@example.com',
                password: 'password123'
            })
        });
        
        console.log('Status:', loginResponse.status);
        const loginText = await loginResponse.text();
        console.log('Réponse:', loginText.substring(0, 500));
        
        // Test 3: Vérifier les routes disponibles
        console.log('\n📋 Test 3: Vérification des routes');
        const routes = [
            '/auth/login',
            '/auth/register',
            '/auth/status'
        ];
        
        for (const route of routes) {
            try {
                const response = await fetch(`${BASE_URL}${route}`);
                console.log(`${route}: ${response.status}`);
            } catch (error) {
                console.log(`${route}: ERROR - ${error.message}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Erreur durant les tests:', error);
    }
}

// Lancer les tests
if (import.meta.url === `file://${process.argv[1]}`) {
    testAuthentication();
}
