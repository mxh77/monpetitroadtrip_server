/**
 * Script de test pour la nouvelle route de statut des jobs
 * Usage: node testStepStoryJobRoute.js
 */

const API_BASE_URL = 'http://localhost:3001/api';

// Exemple de test avec des IDs fictifs (remplacez par de vrais IDs)
const TEST_DATA = {
    stepId: '64a1b2c3d4e5f6789012345', // Remplacez par un vrai step ID
    jobId: '64a1b2c3d4e5f6789012346',  // Remplacez par un vrai job ID
    authToken: 'your-jwt-token-here'    // Remplacez par un vrai token
};

/**
 * Test de la nouvelle route de statut de job
 */
const testJobStatusRoute = async (stepId, jobId, authToken) => {
    console.log('\n🧪 Test de la route de statut de job');
    console.log('=====================================');
    
    const newUrl = `${API_BASE_URL}/steps/${stepId}/story/${jobId}/status`;
    
    console.log(`📋 Nouvelle URL testée: ${newUrl}`);
    console.log(`📋 Step ID: ${stepId}`);
    console.log(`📋 Job ID: ${jobId}`);
    
    try {
        const response = await fetch(newUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`📊 Status HTTP: ${response.status}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Réponse réussie:');
            console.log(JSON.stringify(data, null, 2));
            
            // Vérifier la structure de la réponse
            const expectedFields = ['jobId', 'stepId', 'stepName', 'status', 'createdAt', 'updatedAt'];
            const missingFields = expectedFields.filter(field => !(field in data));
            
            if (missingFields.length === 0) {
                console.log('✅ Structure de réponse conforme');
            } else {
                console.log(`⚠️  Champs manquants: ${missingFields.join(', ')}`);
            }
            
        } else {
            const errorData = await response.text();
            console.log('❌ Erreur:');
            console.log(errorData);
        }
        
    } catch (error) {
        console.log('❌ Erreur de connexion:', error.message);
    }
};

/**
 * Test avec des IDs invalides pour valider la gestion d'erreur
 */
const testErrorHandling = async () => {
    console.log('\n🛡️  Test de gestion d\'erreur');
    console.log('==============================');
    
    const testCases = [
        {
            name: 'Step ID invalide',
            stepId: 'invalid-step-id',
            jobId: '64a1b2c3d4e5f6789012346',
            expectedStatus: 400
        },
        {
            name: 'Job ID invalide',
            stepId: '64a1b2c3d4e5f6789012345',
            jobId: 'invalid-job-id',
            expectedStatus: 400
        },
        {
            name: 'Job inexistant',
            stepId: '64a1b2c3d4e5f6789012345',
            jobId: '64a1b2c3d4e5f6789999999',
            expectedStatus: 404
        }
    ];
    
    for (const testCase of testCases) {
        console.log(`\n📋 Test: ${testCase.name}`);
        
        const url = `${API_BASE_URL}/steps/${testCase.stepId}/story/${testCase.jobId}/status`;
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${TEST_DATA.authToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log(`   Status: ${response.status} (attendu: ${testCase.expectedStatus})`);
            
            if (response.status === testCase.expectedStatus) {
                console.log('   ✅ Gestion d\'erreur correcte');
            } else {
                console.log('   ⚠️  Gestion d\'erreur inattendue');
            }
            
        } catch (error) {
            console.log(`   ❌ Erreur: ${error.message}`);
        }
    }
};

/**
 * Génère des exemples d'utilisation de la nouvelle route
 */
const generateUsageExamples = () => {
    console.log('\n📚 EXEMPLES D\'UTILISATION');
    console.log('==========================');
    
    console.log('1. JavaScript/Fetch:');
    console.log(`
const checkJobStatus = async (stepId, jobId) => {
    const response = await fetch(\`/api/steps/\${stepId}/story/\${jobId}/status\`, {
        headers: { 'Authorization': \`Bearer \${token}\` }
    });
    return response.json();
};`);
    
    console.log('\n2. Axios:');
    console.log(`
const jobStatus = await axios.get(\`/api/steps/\${stepId}/story/\${jobId}/status\`, {
    headers: { 'Authorization': \`Bearer \${token}\` }
});`);
    
    console.log('\n3. cURL:');
    console.log(`
curl -H "Authorization: Bearer YOUR_TOKEN" \\
     http://localhost:3001/api/steps/STEP_ID/story/JOB_ID/status`);
    
    console.log('\n4. Structure de réponse:');
    console.log(`
{
  "jobId": "64a1b2c3d4e5f6789012346",
  "stepId": "64a1b2c3d4e5f6789012345", 
  "stepName": "Visite du Louvre",
  "status": "done",
  "result": {
    "stepId": "64a1b2c3d4e5f6789012345",
    "stepName": "Visite du Louvre",
    "story": "Nous arrivons au Louvre...",
    "generatedAt": "2025-07-02T10:30:00Z",
    // ... autres champs
  },
  "error": null,
  "createdAt": "2025-07-02T10:29:00Z",
  "updatedAt": "2025-07-02T10:30:00Z"
}`);
};

/**
 * Comparaison ancienne vs nouvelle route
 */
const showRouteComparison = () => {
    console.log('\n🔄 COMPARAISON DES ROUTES');
    console.log('==========================');
    
    console.log('❌ Ancienne route:');
    console.log('   GET /api/steps/:idStep/story/status/:jobId');
    console.log('   Moins logique hiérarchiquement');
    
    console.log('\n✅ Nouvelle route:');
    console.log('   GET /api/steps/:idStep/story/:jobId/status');
    console.log('   Plus cohérente: step → story → job → status');
    console.log('   Meilleure sécurité: vérifie la cohérence step/job');
    
    console.log('\n🔒 Améliorations sécurité:');
    console.log('   ✅ Vérification que le step appartient à l\'utilisateur');
    console.log('   ✅ Vérification que le job appartient au step');
    console.log('   ✅ Messages d\'erreur détaillés');
    console.log('   ✅ Réponse enrichie avec métadonnées');
};

/**
 * Fonction principale
 */
const main = async () => {
    console.log('🧪 TEST DE LA NOUVELLE ROUTE DE STATUT DE JOB');
    console.log('===============================================');
    
    const command = process.argv[2];
    
    switch (command) {
        case 'test':
            if (TEST_DATA.authToken === 'your-jwt-token-here') {
                console.log('⚠️  Veuillez configurer un vrai token dans TEST_DATA');
                console.log('   Modifiez le fichier et remplacez "your-jwt-token-here"');
                break;
            }
            await testJobStatusRoute(TEST_DATA.stepId, TEST_DATA.jobId, TEST_DATA.authToken);
            break;
            
        case 'errors':
            await testErrorHandling();
            break;
            
        case 'examples':
            generateUsageExamples();
            break;
            
        case 'compare':
            showRouteComparison();
            break;
            
        default:
            console.log('📋 Commandes disponibles:');
            console.log('   test     - Tester la nouvelle route (nécessite des IDs valides)');
            console.log('   errors   - Tester la gestion d\'erreur');
            console.log('   examples - Afficher des exemples d\'utilisation');
            console.log('   compare  - Comparer ancienne vs nouvelle route');
            console.log('');
            console.log('📋 Exemples:');
            console.log('   node testStepStoryJobRoute.js examples');
            console.log('   node testStepStoryJobRoute.js compare');
            console.log('   node testStepStoryJobRoute.js test');
            
            // Afficher par défaut la comparaison et les exemples
            showRouteComparison();
            generateUsageExamples();
    }
};

// Lancer le script
main().catch(console.error);
