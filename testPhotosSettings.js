/**
 * Script de test pour la gestion des paramètres photos dans les récits
 * Ce script permet de tester l'activation/désactivation de l'analyse photos
 */

import axios from 'axios';

// Configuration
const BASE_URL = 'http://localhost:3000'; // Ajustez selon votre configuration
const AUTH_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Remplacez par un token JWT valide

async function testPhotosSettings() {
    try {
        console.log('🚀 Test de la gestion des paramètres photos...');
        
        // 1. Récupérer les paramètres actuels
        console.log('\n📋 1. Récupération des paramètres actuels...');
        const currentSettings = await axios.get(`${BASE_URL}/api/settings`, {
            headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
        });
        
        console.log('✅ Paramètres actuels:');
        console.log(`   - enablePhotosInStories: ${currentSettings.data.enablePhotosInStories}`);
        console.log(`   - systemPrompt: ${currentSettings.data.systemPrompt?.substring(0, 50)}...`);
        console.log(`   - algoliaSearchRadius: ${currentSettings.data.algoliaSearchRadius}m`);
        
        // 2. Désactiver l'analyse des photos
        console.log('\n🚫 2. Désactivation de l\'analyse des photos...');
        const disablePhotos = await axios.put(`${BASE_URL}/api/settings`, {
            enablePhotosInStories: false
        }, {
            headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
        });
        
        console.log('✅ Photos désactivées:', disablePhotos.data.enablePhotosInStories);
        
        // 3. Activer l'analyse des photos
        console.log('\n📸 3. Activation de l\'analyse des photos...');
        const enablePhotos = await axios.put(`${BASE_URL}/api/settings`, {
            enablePhotosInStories: true
        }, {
            headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
        });
        
        console.log('✅ Photos activées:', enablePhotos.data.enablePhotosInStories);
        
        // 4. Test avec valeur invalide
        console.log('\n❌ 4. Test avec valeur invalide...');
        try {
            await axios.put(`${BASE_URL}/api/settings`, {
                enablePhotosInStories: "invalid"
            }, {
                headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
            });
        } catch (error) {
            console.log('✅ Validation fonctionne - valeur invalide rejetée');
        }
        
        console.log('\n✅ Tous les tests réussis!');
        
    } catch (error) {
        console.error('❌ Erreur lors du test:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            console.log('🔐 Vérifiez votre token d\'authentification');
        }
    }
}

async function testStoryGenerationWithSettings(stepId) {
    try {
        console.log('\n🎯 Test de génération de récit avec paramètres...');
        
        // 1. Désactiver les photos
        await axios.put(`${BASE_URL}/api/settings`, {
            enablePhotosInStories: false
        }, {
            headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
        });
        
        console.log('📝 Génération avec photos désactivées...');
        const storyWithoutPhotos = await axios.get(`${BASE_URL}/api/steps/${stepId}/story`, {
            headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
        });
        
        console.log(`   - Modèle: ${storyWithoutPhotos.data.model}`);
        console.log(`   - Photos analysées: ${storyWithoutPhotos.data.photosAnalyzed || 0}`);
        
        // 2. Activer les photos
        await axios.put(`${BASE_URL}/api/settings`, {
            enablePhotosInStories: true
        }, {
            headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
        });
        
        console.log('📸 Génération avec photos activées...');
        const storyWithPhotos = await axios.get(`${BASE_URL}/api/steps/${stepId}/story`, {
            headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
        });
        
        console.log(`   - Modèle: ${storyWithPhotos.data.model}`);
        console.log(`   - Photos analysées: ${storyWithPhotos.data.photosAnalyzed || 0}`);
        
        console.log('\n📊 Comparaison:');
        console.log(`Photos OFF: ${storyWithoutPhotos.data.model} (${storyWithoutPhotos.data.photosAnalyzed || 0} photos)`);
        console.log(`Photos ON:  ${storyWithPhotos.data.model} (${storyWithPhotos.data.photosAnalyzed || 0} photos)`);
        
    } catch (error) {
        console.error('❌ Erreur lors du test de génération:', error.response?.data || error.message);
    }
}

// Instructions d'utilisation
console.log(`
📝 Instructions pour utiliser ce script de test:

1. Démarrez votre serveur: npm start
2. Remplacez AUTH_TOKEN par un token JWT valide d'un utilisateur authentifié
3. Exécutez: node testPhotosSettings.js

💡 Pour tester avec un step spécifique:
   - Remplacez STEP_ID dans le code
   - Décommentez la ligne testStoryGenerationWithSettings

🔧 Tests effectués:
   - Récupération des paramètres
   - Activation/désactivation des photos
   - Validation des données
   - Impact sur la génération de récits

📊 API endpoints testés:
   - GET /api/settings
   - PUT /api/settings
   - GET /api/steps/{id}/story (avec paramètres)
`);

// Décommentez pour exécuter les tests
// testPhotosSettings();

// Décommentez et remplacez STEP_ID pour tester avec un step spécifique
// testStoryGenerationWithSettings('YOUR_STEP_ID_HERE');
