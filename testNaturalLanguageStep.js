import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.NODE_ENV === 'production' 
    ? 'https://monpetitroadtrip-server.vercel.app' 
    : 'http://localhost:3000';

// Fonction pour tester la création d'étape via langage naturel
async function testNaturalLanguageStep() {
    try {
        // Vous devez remplacer ces valeurs par un token JWT valide et un ID de roadtrip existant
        const authToken = 'YOUR_JWT_TOKEN_HERE';
        const roadtripId = 'YOUR_ROADTRIP_ID_HERE';

        const testPrompts = [
            {
                prompt: "Je veux visiter le Louvre demain à 10h et repartir à 16h",
                userLocation: null
            },
            {
                prompt: "Arrêt rapide à la boulangerie Paul, rue de Rivoli, Paris à 8h30",
                userLocation: { latitude: 48.8566, longitude: 2.3522 } // Paris
            },
            {
                prompt: "Pause déjeuner dans le coin dans 1 heure",
                userLocation: { latitude: 48.8566, longitude: 2.3522 } // Paris - test avec géolocalisation
            },
            {
                prompt: "Visite de la Tour Eiffel le 2 juillet 2025 de 14h à 17h avec pique-nique",
                userLocation: null
            },
            {
                prompt: "Arrêt toilettes maintenant",
                userLocation: { latitude: 45.7640, longitude: 4.8357 } // Lyon - test avec géolocalisation
            }
        ];

        console.log('🚀 Test de création d\'étapes via langage naturel\n');

        for (let i = 0; i < testPrompts.length; i++) {
            const test = testPrompts[i];
            console.log(`📝 Test ${i + 1}: "${test.prompt}"`);
            if (test.userLocation) {
                console.log(`📍 Avec géolocalisation: ${test.userLocation.latitude}, ${test.userLocation.longitude}`);
            }

            try {
                const requestBody = { prompt: test.prompt };
                if (test.userLocation) {
                    requestBody.userLatitude = test.userLocation.latitude;
                    requestBody.userLongitude = test.userLocation.longitude;
                }

                const response = await fetch(`${BASE_URL}/api/roadtrips/${roadtripId}/steps/natural-language`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify(requestBody)
                });

                const result = await response.json();

                if (response.ok) {
                    console.log('✅ Succès:');
                    console.log('   Nom:', result.step.name);
                    console.log('   Adresse:', result.step.address);
                    console.log('   Type:', result.step.type);
                    console.log('   Arrivée:', result.step.arrivalDateTime);
                    console.log('   Départ:', result.step.departureDateTime);
                    console.log('   Notes:', result.step.notes);
                    console.log('   Coordonnées:', `${result.step.latitude}, ${result.step.longitude}`);
                    if (result.extractedData.useUserLocation) {
                        console.log('   🌍 Géolocalisation utilisateur utilisée');
                    }
                    console.log('   Données extraites:', JSON.stringify(result.extractedData, null, 2));
                } else {
                    console.log('❌ Erreur:', result.msg || result.error);
                }
            } catch (error) {
                console.log('❌ Erreur réseau:', error.message);
            }

            console.log('\n' + '─'.repeat(50) + '\n');
        }

    } catch (error) {
        console.error('Erreur lors du test:', error);
    }
}

// Fonction pour tester avec des données réelles
async function testWithRealData() {
    console.log('⚠️  Pour tester cette fonctionnalité:');
    console.log('1. Démarrez le serveur avec: npm start');
    console.log('2. Connectez-vous et récupérez un token JWT');
    console.log('3. Créez un roadtrip et récupérez son ID');
    console.log('4. Modifiez les variables authToken et roadtripId dans ce fichier');
    console.log('5. Relancez ce test\n');
    
    console.log('Exemples de prompts supportés:');
    console.log('- "Visite du Louvre demain à 10h"');
    console.log('- "Nuit à l\'hôtel Ritz, Paris, arrivée ce soir 19h"');
    console.log('- "Arrêt rapide station-service A6 dans 2 heures"');
    console.log('- "Déjeuner chez Paul rue de Rivoli à 12h30"');
    console.log('- "Visite château de Versailles samedi de 9h à 17h"');
}

// Décommenter pour tester (après avoir configuré les tokens)
// testNaturalLanguageStep();

// Afficher les instructions
testWithRealData();
