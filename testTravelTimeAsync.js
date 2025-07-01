// Script de test pour l'API asynchrone de calcul des temps de trajet
// Usage: node testTravelTimeAsync.js

console.log('=== Test API Asynchrone - Calcul des temps de trajet ===\n');

// Configuration
const API_BASE = 'http://localhost:3000/api/roadtrips';
const ROADTRIP_ID = 'YOUR_ROADTRIP_ID'; // À remplacer
const AUTH_TOKEN = 'YOUR_JWT_TOKEN'; // À remplacer

// Fonction utilitaire pour faire des requêtes
async function makeRequest(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json',
            ...options.headers
        }
    };
    
    return fetch(url, { ...defaultOptions, ...options });
}

// Test 1: Lancer le calcul asynchrone
async function startAsyncCalculation() {
    console.log('🚀 Lancement du calcul asynchrone...');
    
    try {
        const response = await makeRequest(`${API_BASE}/${ROADTRIP_ID}/refresh-travel-times/async`, {
            method: 'PATCH'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            console.log('✅ Job démarré avec succès:');
            console.log(`   - Job ID: ${result.jobId}`);
            console.log(`   - Status: ${result.status}`);
            console.log(`   - Étapes à traiter: ${result.progress.total}`);
            console.log(`   - Durée estimée: ${result.estimatedDuration}`);
            return result.jobId;
        } else {
            console.log('❌ Erreur:', result.msg);
            return null;
        }
    } catch (error) {
        console.error('❌ Erreur de requête:', error.message);
        return null;
    }
}

// Test 2: Surveiller le progrès
async function monitorProgress(jobId) {
    console.log(`\n📊 Surveillance du job ${jobId}...`);
    
    let isCompleted = false;
    let attempts = 0;
    const maxAttempts = 30; // Maximum 5 minutes (30 * 10s)
    
    while (!isCompleted && attempts < maxAttempts) {
        try {
            const response = await makeRequest(`${API_BASE}/${ROADTRIP_ID}/travel-time-jobs/${jobId}/status`);
            const status = await response.json();
            
            if (response.ok) {
                console.log(`   Status: ${status.status} - ${status.progress.percentage}% (${status.progress.completed}/${status.progress.total})`);
                
                if (status.status === 'completed') {
                    isCompleted = true;
                    console.log('\n✅ Calcul terminé !');
                    console.log('📊 Résumé des résultats:');
                    console.log(`   - Étapes traitées: ${status.results.stepsProcessed}`);
                    console.log(`   - Distance totale: ${status.results.summary.totalDistance} km`);
                    console.log(`   - Temps de trajet total: ${status.results.summary.totalTravelTime} minutes`);
                    console.log(`   - Étapes avec incohérences: ${status.results.summary.inconsistentSteps}`);
                    
                    if (status.results.errors && status.results.errors.length > 0) {
                        console.log(`   - Erreurs rencontrées: ${status.results.errors.length}`);
                    }
                    
                } else if (status.status === 'failed') {
                    isCompleted = true;
                    console.log('❌ Calcul échoué:', status.errorMessage);
                }
                
            } else {
                console.log('❌ Erreur lors de la vérification du statut');
                break;
            }
            
        } catch (error) {
            console.error('❌ Erreur de requête:', error.message);
            break;
        }
        
        attempts++;
        
        if (!isCompleted) {
            // Attendre 10 secondes avant la prochaine vérification
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
    }
    
    if (attempts >= maxAttempts) {
        console.log('⏰ Timeout - Le job prend plus de temps que prévu');
    }
}

// Test principal
async function runTest() {
    console.log('Configuration:');
    console.log(`- API Base: ${API_BASE}`);
    console.log(`- Roadtrip ID: ${ROADTRIP_ID}`);
    console.log(`- Token: ${AUTH_TOKEN ? 'Configuré' : 'NON CONFIGURÉ'}\n`);
    
    if (!AUTH_TOKEN || AUTH_TOKEN === 'YOUR_JWT_TOKEN') {
        console.log('❌ Veuillez configurer AUTH_TOKEN dans le script');
        return;
    }
    
    if (!ROADTRIP_ID || ROADTRIP_ID === 'YOUR_ROADTRIP_ID') {
        console.log('❌ Veuillez configurer ROADTRIP_ID dans le script');
        return;
    }
    
    // Lancer le calcul
    const jobId = await startAsyncCalculation();
    
    if (jobId) {
        // Surveiller le progrès
        await monitorProgress(jobId);
    }
}

// Instructions si exécuté directement
if (typeof window === 'undefined') {
    console.log('📋 Instructions:');
    console.log('1. Remplacez ROADTRIP_ID par un ID de roadtrip valide');
    console.log('2. Remplacez AUTH_TOKEN par votre token JWT');
    console.log('3. Assurez-vous que le serveur est démarré sur le port 3000');
    console.log('4. Exécutez: node testTravelTimeAsync.js\n');
    
    // Exporter les fonctions pour pouvoir les utiliser
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { startAsyncCalculation, monitorProgress, runTest };
    }
}

// Exemples de commandes curl
console.log('\n=== Exemples de commandes curl ===');
console.log('1. Lancer le calcul asynchrone:');
console.log(`curl -X PATCH "${API_BASE}/YOUR_ROADTRIP_ID/refresh-travel-times/async" \\`);
console.log('  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\');
console.log('  -H "Content-Type: application/json"');

console.log('\n2. Vérifier le statut:');
console.log(`curl -X GET "${API_BASE}/YOUR_ROADTRIP_ID/travel-time-jobs/JOB_ID/status" \\`);
console.log('  -H "Authorization: Bearer YOUR_JWT_TOKEN"');
