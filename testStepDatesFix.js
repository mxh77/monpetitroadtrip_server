// Script de test pour la correction des dates des steps
// Usage: node testStepDatesFix.js <roadtrip_id> <step_id> <token>

const API_BASE = 'http://localhost:5000/api/roadtrips';

// Paramètres par défaut
const ROADTRIP_ID = process.argv[2] || '67ac491096003c7411aea863';
const STEP_ID = process.argv[3] || '67ac491396003c7411aea90f';
const TOKEN = process.argv[4];

if (!TOKEN) {
    console.log('❌ Token requis');
    console.log('Usage: node testStepDatesFix.js <roadtrip_id> <step_id> <token>');
    process.exit(1);
}

// Fonction pour faire des requêtes HTTP
async function makeRequest(url, options = {}) {
    const fetch = (await import('node-fetch')).default;
    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${TOKEN}`,
            'Content-Type': 'application/json'
        }
    };
    
    return fetch(url, { ...defaultOptions, ...options });
}

// Fonction pour récupérer les détails d'un step
async function getStepDetails(roadtripId, stepId) {
    try {
        const response = await makeRequest(`${API_BASE}/${roadtripId}/steps`);
        const steps = await response.json();
        
        const step = steps.find(s => s._id === stepId);
        if (!step) {
            console.log('❌ Step non trouvé');
            return null;
        }
        
        return {
            name: step.name,
            arrivalDateTime: step.arrivalDateTime,
            departureDateTime: step.departureDateTime,
            accommodations: step.accommodations.map(acc => ({
                name: acc.name,
                arrivalDateTime: acc.arrivalDateTime,
                departureDateTime: acc.departureDateTime,
                nights: acc.nights
            })),
            activities: step.activities.map(act => ({
                name: act.name,
                startDateTime: act.startDateTime,
                endDateTime: act.endDateTime
            }))
        };
    } catch (error) {
        console.error('Erreur lors de la récupération du step:', error.message);
        return null;
    }
}

// Fonction pour corriger les dates d'un step
async function fixStepDates(roadtripId, stepId) {
    try {
        const response = await makeRequest(`${API_BASE}/${roadtripId}/steps/${stepId}/fix-dates`, {
            method: 'PATCH'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.msg || `HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Erreur lors de la correction:', error.message);
        return null;
    }
}

// Fonction pour formater une date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Fonction pour afficher les détails d'un step
function displayStepDetails(step, title = '') {
    if (!step) return;
    
    if (title) console.log(`\n${title}`);
    
    console.log(`📋 Step: ${step.name}`);
    console.log(`   Arrivée: ${formatDate(step.arrivalDateTime)}`);
    console.log(`   Départ: ${formatDate(step.departureDateTime)}`);
    
    if (step.accommodations.length > 0) {
        console.log(`\n🏨 Accommodations (${step.accommodations.length}):`);
        step.accommodations.forEach((acc, index) => {
            console.log(`   ${index + 1}. ${acc.name}`);
            console.log(`      Arrivée: ${formatDate(acc.arrivalDateTime)}`);
            console.log(`      Départ: ${formatDate(acc.departureDateTime)}`);
            console.log(`      Nuits: ${acc.nights}`);
        });
    }
    
    if (step.activities.length > 0) {
        console.log(`\n🎯 Activités (${step.activities.length}):`);
        step.activities.forEach((act, index) => {
            console.log(`   ${index + 1}. ${act.name}`);
            console.log(`      Début: ${formatDate(act.startDateTime)}`);
            console.log(`      Fin: ${formatDate(act.endDateTime)}`);
        });
    }
}

// Fonction principale
async function main() {
    console.log('🧪 Test de correction des dates du step');
    console.log(`Roadtrip ID: ${ROADTRIP_ID}`);
    console.log(`Step ID: ${STEP_ID}`);
    
    // 1. Récupérer l'état actuel
    const stepBefore = await getStepDetails(ROADTRIP_ID, STEP_ID);
    if (!stepBefore) {
        console.log('❌ Impossible de récupérer les détails du step');
        return;
    }
    
    displayStepDetails(stepBefore, '📋 État actuel du step:');
    
    // 2. Déclencher la correction
    console.log('\n🔧 Correction des dates du step...');
    
    const fixResult = await fixStepDates(ROADTRIP_ID, STEP_ID);
    if (!fixResult) {
        console.log('❌ Échec de la correction');
        return;
    }
    
    console.log('\n📊 Résultat de la correction:');
    console.log(`   Accommodations corrigées: ${fixResult.fixes.accommodationsFixed}`);
    console.log(`   Dates du step modifiées: ${fixResult.fixes.stepDatesChanged ? 'Oui' : 'Non'}`);
    
    if (fixResult.fixes.accommodationDetails.length > 0) {
        console.log('\n🏨 Détails des corrections d\'accommodations:');
        fixResult.fixes.accommodationDetails.forEach(acc => {
            console.log(`   - ${acc.name}: ${acc.oldNights} → ${acc.newNights} nuits`);
        });
    }
    
    // 3. Récupérer l'état après correction
    const stepAfter = await getStepDetails(ROADTRIP_ID, STEP_ID);
    if (stepAfter) {
        displayStepDetails(stepAfter, '📋 État après correction:');
    }
    
    console.log('\n✅ Test terminé');
}

// Exécuter le test
main().catch(console.error);
