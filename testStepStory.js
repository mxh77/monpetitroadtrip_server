/**
 * Script de test pour l'API de génération de récit de step
 * Ce script peut être utilisé pour tester l'endpoint /api/steps/{idStep}/story
 */

import axios from 'axios';

// Configuration
const BASE_URL = 'http://localhost:3000'; // Ajustez selon votre configuration
const STEP_ID = 'YOUR_STEP_ID_HERE'; // Remplacez par un ID de step valide
const AUTH_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Remplacez par un token JWT valide

async function testStepStoryGeneration() {
    try {
        console.log('🚀 Test de génération de récit de step...');
        console.log(`📍 URL: ${BASE_URL}/api/steps/${STEP_ID}/story`);
        
        const response = await axios.get(`${BASE_URL}/api/steps/${STEP_ID}/story`, {
            headers: {
                'Authorization': `Bearer ${AUTH_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Succès! Récit généré:');
        console.log('📖 Récit:', response.data.story);
        console.log('� Prompt utilisé:', response.data.prompt);
        console.log('�📊 Données utilisées:', response.data.dataUsed);
        console.log('🕐 Généré à:', response.data.generatedAt);
        
    } catch (error) {
        console.error('❌ Erreur lors du test:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            console.log('🔐 Vérifiez votre token d\'authentification');
        } else if (error.response?.status === 404) {
            console.log('📍 Vérifiez l\'ID du step');
        } else if (error.response?.status === 503) {
            console.log('🤖 Service IA temporairement indisponible');
        }
    }
}

// Instructions d'utilisation
console.log(`
📝 Instructions pour utiliser ce script de test:

1. Démarrez votre serveur: npm start
2. Remplacez STEP_ID par un ID de step valide de votre base de données
3. Remplacez AUTH_TOKEN par un token JWT valide d'un utilisateur authentifié
4. Exécutez: node testStepStory.js

💡 Pour obtenir un token JWT:
   - Connectez-vous via l'API /api/auth/login
   - Utilisez le token retourné dans la réponse

💡 Pour obtenir un ID de step:
   - Utilisez l'API /api/roadtrips/{idRoadtrip}/steps pour lister les steps
   - Choisissez un step avec des accommodations/activités pour un récit plus riche
`);

// Décommentez la ligne suivante pour exécuter le test
// testStepStoryGeneration();
