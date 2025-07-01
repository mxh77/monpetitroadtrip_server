// Script de test pour l'API asynchrone de synchronisation des steps
// Usage: node testStepSyncAsync.js

console.log('=== Test API Asynchrone - Synchronisation des Steps ===\n');

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

// Test 1: Lancer la synchronisation asynchrone
async function startAsyncSynchronization() {
    console.log('🔄 Lancement de la synchronisation asynchrone...');
    
    try {
        const response = await makeRequest(`${API_BASE}/${ROADTRIP_ID}/sync-steps/async`, {
            method: 'PATCH'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            console.log('✅ Job de synchronisation démarré avec succès:');
            console.log(`   - Job ID: ${result.jobId}`);
            console.log(`   - Status: ${result.status}`);
            console.log(`   - Steps à traiter: ${result.progress.total}`);
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

// Test 2: Surveiller le progrès de synchronisation
async function monitorSyncProgress(jobId) {
    console.log(`\n📊 Surveillance du job de synchronisation ${jobId}...`);
    
    let isCompleted = false;
    let attempts = 0;
    const maxAttempts = 20; // Maximum 3 minutes (20 * 9s)
    
    while (!isCompleted && attempts < maxAttempts) {
        try {
            const response = await makeRequest(`${API_BASE}/${ROADTRIP_ID}/sync-jobs/${jobId}/status`);
            const status = await response.json();
            
            if (response.ok) {
                console.log(`   Status: ${status.status} - ${status.progress.percentage}% (${status.progress.completed}/${status.progress.total})`);
                
                if (status.status === 'completed') {
                    isCompleted = true;
                    console.log('\n✅ Synchronisation terminée !');
                    console.log('📊 Résumé des résultats:');
                    console.log(`   - Steps traités: ${status.results.stepsProcessed}`);
                    console.log(`   - Steps synchronisés: ${status.results.summary.synchronizedSteps}`);
                    console.log(`   - Steps inchangés: ${status.results.summary.unchangedSteps}`);
                    console.log(`   - Total: ${status.results.summary.totalSteps}`);
                    
                    if (status.results.errors && status.results.errors.length > 0) {
                        console.log(`   - Erreurs rencontrées: ${status.results.errors.length}`);
                    }

                    // Afficher les détails des changements
                    if (status.results.summary.details) {
                        console.log('\n📋 Détails des changements:');
                        status.results.summary.details.forEach((detail, index) => {
                            if (detail.changed) {
                                console.log(`   ${index + 1}. ${detail.stepName}:`);
                                console.log(`      Avant: ${detail.before.arrivalDateTime || 'N/A'} -> ${detail.before.departureDateTime || 'N/A'}`);
                                console.log(`      Après: ${detail.after.arrivalDateTime || 'N/A'} -> ${detail.after.departureDateTime || 'N/A'}`);
                            }
                        });
                    }
                    
                } else if (status.status === 'failed') {
                    isCompleted = true;
                    console.log('❌ Synchronisation échouée:', status.errorMessage);
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
            // Attendre 9 secondes avant la prochaine vérification
            await new Promise(resolve => setTimeout(resolve, 9000));
        }
    }
    
    if (attempts >= maxAttempts) {
        console.log('⏰ Timeout - Le job prend plus de temps que prévu');
    }
}

// Test 3: Lancer synchronisation + calcul des temps de trajet
async function startSyncAndTravelTimeCalculation() {
    console.log('\n🔄 Test: Synchronisation + Calcul des temps de trajet...');
    
    try {
        const response = await makeRequest(`${API_BASE}/${ROADTRIP_ID}/refresh-travel-times/async`, {
            method: 'PATCH'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            console.log('✅ Job combiné démarré avec succès:');
            console.log(`   - Job ID: ${result.jobId}`);
            console.log(`   - Status: ${result.status}`);
            console.log(`   - Étapes à traiter: ${result.progress.total}`);
            console.log(`   - Durée estimée: ${result.estimatedDuration}`);
            
            // Surveiller ce job aussi
            await monitorTravelTimeProgress(result.jobId);
        } else {
            console.log('❌ Erreur:', result.msg);
        }
    } catch (error) {
        console.error('❌ Erreur de requête:', error.message);
    }
}

// Fonction pour surveiller le calcul des temps de trajet
async function monitorTravelTimeProgress(jobId) {
    console.log(`\n📊 Surveillance du job temps de trajet ${jobId}...`);
    
    let isCompleted = false;
    let attempts = 0;
    const maxAttempts = 30;
    
    while (!isCompleted && attempts < maxAttempts) {
        try {
            const response = await makeRequest(`${API_BASE}/${ROADTRIP_ID}/travel-time-jobs/${jobId}/status`);
            const status = await response.json();
            
            if (response.ok) {
                console.log(`   Status: ${status.status} - ${status.progress.percentage}% (${status.progress.completed}/${status.progress.total})`);
                
                if (status.status === 'completed') {
                    isCompleted = true;
                    console.log('\n✅ Calcul terminé !');
                    console.log('📊 Résumé:');
                    console.log(`   - Distance totale: ${status.results.summary.totalDistance} km`);
                    console.log(`   - Temps total: ${status.results.summary.totalTravelTime} minutes`);
                    console.log(`   - Incohérences: ${status.results.summary.inconsistentSteps}`);
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
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
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
    
    // Test 1: Synchronisation seule
    console.log('=== Test 1: Synchronisation des steps ===');
    const syncJobId = await startAsyncSynchronization();
    
    if (syncJobId) {
        await monitorSyncProgress(syncJobId);
    }
    
    // Attendre un peu avant le test suivant
    console.log('\n⏳ Attente de 5 secondes avant le test combiné...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test 2: Synchronisation + Calcul des temps de trajet
    console.log('\n=== Test 2: Synchronisation + Calcul temps de trajet ===');
    await startSyncAndTravelTimeCalculation();
}

// Instructions si exécuté directement
if (typeof window === 'undefined') {
    console.log('📋 Instructions:');
    console.log('1. Remplacez ROADTRIP_ID par un ID de roadtrip valide');
    console.log('2. Remplacez AUTH_TOKEN par votre token JWT');
    console.log('3. Assurez-vous que le serveur est démarré sur le port 3000');
    console.log('4. Exécutez: node testStepSyncAsync.js\n');
    
    // Exporter les fonctions pour pouvoir les utiliser
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { startAsyncSynchronization, monitorSyncProgress, runTest };
    }
}

// Exemples de commandes curl
console.log('\n=== Exemples de commandes curl ===');
console.log('1. Lancer la synchronisation:');
console.log(`curl -X PATCH "${API_BASE}/YOUR_ROADTRIP_ID/sync-steps/async" \\`);
console.log('  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\');
console.log('  -H "Content-Type: application/json"');

console.log('\n2. Vérifier le statut:');
console.log(`curl -X GET "${API_BASE}/YOUR_ROADTRIP_ID/sync-jobs/JOB_ID/status" \\`);
console.log('  -H "Authorization: Bearer YOUR_JWT_TOKEN"');

console.log('\n3. Lister les jobs:');
console.log(`curl -X GET "${API_BASE}/YOUR_ROADTRIP_ID/sync-jobs" \\`);
console.log('  -H "Authorization: Bearer YOUR_JWT_TOKEN"');
