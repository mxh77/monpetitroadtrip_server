import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.NODE_ENV === 'production' 
    ? 'https://monpetitroadtrip-server.vercel.app' 
    : 'http://localhost:3000';

// Fonction pour tester la création d'activité via langage naturel
async function testNaturalLanguageActivity() {
    try {
        // Vous devez remplacer ces valeurs par des tokens JWT valides et des IDs existants
        const authToken = 'YOUR_JWT_TOKEN_HERE';
        const roadtripId = 'YOUR_ROADTRIP_ID_HERE';
        const stepId = 'YOUR_STEP_ID_HERE';

        const testPrompts = [
            {
                prompt: "Déjeuner au restaurant Le Procope demain à 12h30",
                userLocation: null
            },
            {
                prompt: "Visite guidée du Louvre de 10h à 12h avec réservation",
                userLocation: { latitude: 48.8566, longitude: 2.3522 } // Paris
            },
            {
                prompt: "Course à pied dans le parc dans 1 heure pendant 45 minutes",
                userLocation: { latitude: 48.8566, longitude: 2.3522 } // Paris - test avec géolocalisation
            },
            {
                prompt: "Shopping aux Champs-Élysées cet après-midi",
                userLocation: null
            },
            {
                prompt: "Spa et détente à l'hôtel en fin de journée pour 2 heures",
                userLocation: null
            },
            {
                prompt: "Concert jazz au New Morning ce soir 21h, prix 35€",
                userLocation: { latitude: 45.7640, longitude: 4.8357 } // Lyon - test avec géolocalisation
            }
        ];

        console.log('🎯 Test de création d\'activités via langage naturel\n');

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

                const response = await fetch(`${BASE_URL}/api/roadtrips/${roadtripId}/steps/${stepId}/activities/natural-language`, {
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
                    console.log('   Nom:', result.activity.name);
                    console.log('   Type:', result.activity.type);
                    console.log('   Adresse:', result.activity.address);
                    console.log('   Début:', result.activity.startDateTime);
                    console.log('   Fin:', result.activity.endDateTime);
                    console.log('   Durée:', result.activity.duration, result.activity.typeDuration);
                    console.log('   Prix:', result.activity.price, result.activity.currency);
                    console.log('   Notes:', result.activity.notes);
                    console.log('   Coordonnées:', `${result.activity.latitude}, ${result.activity.longitude}`);
                    if (result.extractedData.useUserLocation) {
                        console.log('   🌍 Géolocalisation utilisateur utilisée');
                    }
                    if (result.extractedData.useStepLocation) {
                        console.log('   📍 Adresse de l\'étape utilisée');
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
    console.log('3. Créez un roadtrip et une étape, récupérez leurs IDs');
    console.log('4. Modifiez les variables authToken, roadtripId et stepId dans ce fichier');
    console.log('5. Relancez ce test\n');
    
    console.log('Exemples de prompts supportés:');
    console.log('- "Déjeuner au restaurant Le Procope demain à 12h30"');
    console.log('- "Visite guidée du Louvre de 10h à 12h avec réservation"');
    console.log('- "Course à pied dans le parc dans 1 heure pendant 45 minutes"');
    console.log('- "Shopping aux Champs-Élysées cet après-midi"');
    console.log('- "Randonnée en montagne samedi de 8h à 16h"');
    console.log('- "Spa et détente à l\'hôtel en fin de journée"');
    console.log('- "Concert jazz au New Morning ce soir 21h"');
    console.log('- "Cours de cuisine française demain matin"');
}

// Décommenter pour tester (après avoir configuré les tokens)
// testNaturalLanguageActivity();

// Afficher les instructions
testWithRealData();
