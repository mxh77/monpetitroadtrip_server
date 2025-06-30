/**
 * Test du paramètre dragSnapInterval dans l'API settings
 * Usage: node testDragSnapInterval.js
 */

const API_BASE_URL = 'http://localhost:5000/api';
const TEST_USER_TOKEN = 'YOUR_TEST_TOKEN_HERE'; // Remplacer par un token valide

async function testDragSnapInterval() {
    console.log('🧪 Test de l\'intégration dragSnapInterval');
    console.log('=====================================\n');

    try {
        // Test 1: GET /settings - Vérifier la valeur par défaut
        console.log('📊 Test 1: GET /settings - Valeur par défaut');
        const getResponse = await fetch(`${API_BASE_URL}/settings`, {
            headers: {
                'Authorization': `Bearer ${TEST_USER_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        if (!getResponse.ok) {
            throw new Error(`GET failed: ${getResponse.status}`);
        }

        const settings = await getResponse.json();
        console.log('✅ Paramètres récupérés:', {
            dragSnapInterval: settings.dragSnapInterval,
            algoliaSearchRadius: settings.algoliaSearchRadius
        });

        if (settings.dragSnapInterval === 15) {
            console.log('✅ Valeur par défaut correcte (15)\n');
        } else {
            console.log(`⚠️ Valeur par défaut inattendue: ${settings.dragSnapInterval}\n`);
        }

        // Test 2: PUT /settings - Valeur valide
        console.log('📊 Test 2: PUT /settings - Valeur valide (30)');
        const putResponse1 = await fetch(`${API_BASE_URL}/settings`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${TEST_USER_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                systemPrompt: settings.systemPrompt,
                algoliaSearchRadius: settings.algoliaSearchRadius,
                dragSnapInterval: 30
            })
        });

        if (!putResponse1.ok) {
            throw new Error(`PUT failed: ${putResponse1.status}`);
        }

        const updatedSettings1 = await putResponse1.json();
        console.log('✅ Paramètres mis à jour:', {
            dragSnapInterval: updatedSettings1.dragSnapInterval
        });

        if (updatedSettings1.dragSnapInterval === 30) {
            console.log('✅ Mise à jour réussie (30)\n');
        } else {
            console.log(`❌ Échec de la mise à jour: ${updatedSettings1.dragSnapInterval}\n`);
        }

        // Test 3: PUT /settings - Valeur invalide
        console.log('📊 Test 3: PUT /settings - Valeur invalide (99)');
        const putResponse2 = await fetch(`${API_BASE_URL}/settings`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${TEST_USER_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                dragSnapInterval: 99
            })
        });

        if (putResponse2.status === 400) {
            const errorResponse = await putResponse2.json();
            console.log('✅ Validation correcte - Erreur 400:', errorResponse.msg);
            console.log('✅ Valeurs valides:', errorResponse.validValues, '\n');
        } else {
            console.log(`❌ Validation manquée - Status: ${putResponse2.status}\n`);
        }

        // Test 4: PUT /settings - Test de rétrocompatibilité
        console.log('📊 Test 4: PUT /settings - Rétrocompatibilité (sans dragSnapInterval)');
        const putResponse3 = await fetch(`${API_BASE_URL}/settings`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${TEST_USER_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                systemPrompt: 'Test de rétrocompatibilité'
            })
        });

        if (!putResponse3.ok) {
            throw new Error(`PUT rétrocompatibilité failed: ${putResponse3.status}`);
        }

        const updatedSettings2 = await putResponse3.json();
        console.log('✅ Rétrocompatibilité:', {
            dragSnapInterval: updatedSettings2.dragSnapInterval,
            systemPrompt: updatedSettings2.systemPrompt
        });

        if (updatedSettings2.dragSnapInterval === 30) {
            console.log('✅ dragSnapInterval préservé lors de la mise à jour partielle\n');
        } else {
            console.log(`❌ dragSnapInterval perdu: ${updatedSettings2.dragSnapInterval}\n`);
        }

        // Test 5: Tester toutes les valeurs valides
        console.log('📊 Test 5: Toutes les valeurs valides');
        const validValues = [5, 10, 15, 30, 60];
        
        for (const value of validValues) {
            const testResponse = await fetch(`${API_BASE_URL}/settings`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${TEST_USER_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    dragSnapInterval: value
                })
            });

            if (testResponse.ok) {
                const result = await testResponse.json();
                console.log(`✅ Valeur ${value}: OK (${result.dragSnapInterval})`);
            } else {
                console.log(`❌ Valeur ${value}: ÉCHEC`);
            }
        }

        console.log('\n🎉 Tests terminés avec succès!');

    } catch (error) {
        console.error('❌ Erreur lors des tests:', error.message);
        console.log('\n💡 Vérifiez que:');
        console.log('- Le serveur est démarré sur le port 5000');
        console.log('- Le token d\'authentification est valide');
        console.log('- L\'utilisateur existe en base de données');
    }
}

// Instructions d'utilisation
if (TEST_USER_TOKEN === 'YOUR_TEST_TOKEN_HERE') {
    console.log('❌ Erreur: Veuillez configurer un token d\'authentification valide');
    console.log('💡 Modifiez la variable TEST_USER_TOKEN dans le fichier');
    console.log('💡 Vous pouvez obtenir un token en vous connectant à l\'application');
    process.exit(1);
}

// Exécuter les tests
testDragSnapInterval();
