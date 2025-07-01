/**
 * Script de test pour l'API de génération de récit de step avec photos
 * Ce script peut être utilisé pour tester l'endpoint /api/steps/{idStep}/story/with-photos
 */

import axios from 'axios';

// Configuration
const BASE_URL = 'http://localhost:3000'; // Ajustez selon votre configuration
const STEP_ID = 'YOUR_STEP_ID_HERE'; // Remplacez par un ID de step valide avec des photos
const AUTH_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Remplacez par un token JWT valide

async function testStepStoryWithPhotos() {
    try {
        console.log('🚀 Test de génération de récit de step avec photos...');
        console.log(`📍 URL: ${BASE_URL}/api/steps/${STEP_ID}/story/with-photos`);
        
        const response = await axios.get(`${BASE_URL}/api/steps/${STEP_ID}/story/with-photos`, {
            headers: {
                'Authorization': `Bearer ${AUTH_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Succès! Récit généré avec photos:');
        console.log('📖 Récit:', response.data.story);
        console.log('🤖 Modèle utilisé:', response.data.model);
        console.log('📸 Photos analysées:', response.data.photosAnalyzed);
        console.log('📊 Données utilisées:', response.data.dataUsed);
        console.log('🔗 Sources des photos:', response.data.photosSources);
        console.log('🕐 Généré à:', response.data.generatedAt);
        
    } catch (error) {
        console.error('❌ Erreur lors du test:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            console.log('🔐 Vérifiez votre token d\'authentification');
        } else if (error.response?.status === 404) {
            console.log('📍 Vérifiez l\'ID du step');
        } else if (error.response?.status === 400) {
            console.log('📸 Ce step ne contient aucune photo à analyser');
        } else if (error.response?.status === 503) {
            console.log('🤖 Service IA temporairement indisponible');
        }
    }
}

async function testCompareStoryWithAndWithoutPhotos() {
    try {
        console.log('\n🔄 Comparaison récit avec et sans photos...');
        
        // Test sans photos forcées
        console.log('📝 Génération standard...');
        const standardResponse = await axios.get(`${BASE_URL}/api/steps/${STEP_ID}/story`, {
            headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
        });
        
        // Test avec photos forcées
        console.log('📸 Génération avec photos...');
        const photosResponse = await axios.get(`${BASE_URL}/api/steps/${STEP_ID}/story/with-photos`, {
            headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
        });
        
        console.log('\n📊 Comparaison des résultats:');
        console.log('Standard:');
        console.log(`  - Modèle: ${standardResponse.data.model || 'gpt-4o-mini'}`);
        console.log(`  - Photos analysées: ${standardResponse.data.photosAnalyzed || 0}`);
        console.log(`  - Longueur du récit: ${standardResponse.data.story.length} caractères`);
        
        console.log('Avec photos:');
        console.log(`  - Modèle: ${photosResponse.data.model}`);
        console.log(`  - Photos analysées: ${photosResponse.data.photosAnalyzed}`);
        console.log(`  - Longueur du récit: ${photosResponse.data.story.length} caractères`);
        console.log(`  - Sources: ${photosResponse.data.photosSources.map(p => p.type).join(', ')}`);
        
    } catch (error) {
        console.error('❌ Erreur lors de la comparaison:', error.response?.data || error.message);
    }
}

// Instructions d'utilisation
console.log(`
📝 Instructions pour utiliser ce script de test:

1. Démarrez votre serveur: npm start
2. Remplacez STEP_ID par un ID de step valide qui contient des photos
3. Remplacez AUTH_TOKEN par un token JWT valide d'un utilisateur authentifié
4. Exécutez: node testStepStoryWithPhotos.js

💡 Pour obtenir un token JWT:
   - Connectez-vous via l'API /api/auth/login
   - Utilisez le token retourné dans la réponse

💡 Pour obtenir un ID de step avec photos:
   - Utilisez l'API /api/roadtrips/{idRoadtrip}/steps pour lister les steps
   - Choisissez un step qui a des accommodations/activités avec des photos
   - Vérifiez qu'il y a des photos avec /api/accommodations/{id}/photos ou /api/activities/{id}/photos

🔍 Fonctionnalités testées:
   - Génération de récit avec analyse de photos (GPT-4 Vision)
   - Validation de la présence de photos
   - Comparaison avec/sans photos
   - Gestion des erreurs
`);

// Décommentez la ligne suivante pour exécuter le test
// testStepStoryWithPhotos();

// Décommentez la ligne suivante pour exécuter la comparaison
// testCompareStoryWithAndWithoutPhotos();
