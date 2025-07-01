// Script de test pour l'API de synchronisation d'un step individuel
// Usage: node testSingleStepSync.js <roadtripId> <stepId> <jwtToken>

import fetch from 'node-fetch';

// Configuration
const DEFAULT_CONFIG = {
    serverUrl: 'http://localhost:3000',
    apiBase: '/api'
};

// Utilitaires pour l'affichage coloré
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function colorLog(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

class SingleStepSyncTester {
    constructor(serverUrl, authToken) {
        this.serverUrl = serverUrl;
        this.authToken = authToken;
        this.apiBase = `${serverUrl}${DEFAULT_CONFIG.apiBase}`;
    }

    async makeRequest(method, endpoint, body = null) {
        const url = `${this.apiBase}${endpoint}`;
        const options = {
            method,
            headers: {
                'Authorization': `Bearer ${this.authToken}`,
                'Content-Type': 'application/json'
            }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(url, options);
            const data = await response.json();
            
            return {
                ok: response.ok,
                status: response.status,
                data
            };
        } catch (error) {
            throw new Error(`Request failed: ${error.message}`);
        }
    }

    async getStepDetails(roadtripId, stepId) {
        const result = await this.makeRequest('GET', `/roadtrips/${roadtripId}`);
        if (!result.ok) {
            throw new Error(`Failed to get roadtrip: ${result.data.msg || 'Unknown error'}`);
        }

        const roadtrip = result.data;
        const step = roadtrip.steps.find(s => s._id === stepId);
        
        if (!step) {
            throw new Error(`Step ${stepId} not found in roadtrip ${roadtripId}`);
        }

        return step;
    }

    async syncSingleStep(roadtripId, stepId) {
        const result = await this.makeRequest('PATCH', `/roadtrips/${roadtripId}/steps/${stepId}/sync`);
        
        if (!result.ok) {
            throw new Error(`Failed to sync step: ${result.data.msg || 'Unknown error'} (Status: ${result.status})`);
        }
        
        return result.data;
    }

    formatDateTime(dateTime) {
        if (!dateTime) return 'N/A';
        return new Date(dateTime).toLocaleString('fr-FR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    calculateTimeDifference(before, after) {
        if (!before || !after) return 'N/A';
        const diff = new Date(after).getTime() - new Date(before).getTime();
        const minutes = Math.round(diff / (1000 * 60));
        const hours = Math.floor(Math.abs(minutes) / 60);
        const remainingMinutes = Math.abs(minutes) % 60;
        
        const sign = minutes >= 0 ? '+' : '-';
        return `${sign}${hours}h${remainingMinutes.toString().padStart(2, '0')}m`;
    }

    displayStepAnalysis(step) {
        colorLog('bright', '\n📍 ANALYSE DU STEP AVANT SYNCHRONISATION');
        console.log('='.repeat(60));
        console.log(`Nom: ${step.name}`);
        console.log(`Type: ${step.type}`);
        console.log(`Arrivée actuelle: ${this.formatDateTime(step.arrivalDateTime)}`);
        console.log(`Départ actuel: ${this.formatDateTime(step.departureDateTime)}`);

        // Analyser les accommodations
        if (step.accommodations && step.accommodations.length > 0) {
            const activeAccommodations = step.accommodations.filter(acc => acc.active);
            colorLog('blue', `\n🏨 ACCOMMODATIONS (${activeAccommodations.length} actives sur ${step.accommodations.length}):`);
            
            activeAccommodations.forEach((acc, index) => {
                console.log(`   ${index + 1}. ${acc.name}`);
                console.log(`      Arrivée: ${this.formatDateTime(acc.arrivalDateTime)}`);
                console.log(`      Départ: ${this.formatDateTime(acc.departureDateTime)}`);
            });

            if (step.accommodations.length > activeAccommodations.length) {
                const inactiveCount = step.accommodations.length - activeAccommodations.length;
                colorLog('yellow', `      (${inactiveCount} accommodation(s) inactive(s) ignorée(s))`);
            }
        } else {
            colorLog('yellow', '\n🏨 ACCOMMODATIONS: Aucune');
        }

        // Analyser les activités
        if (step.activities && step.activities.length > 0) {
            const activeActivities = step.activities.filter(act => act.active);
            colorLog('blue', `\n🎯 ACTIVITÉS (${activeActivities.length} actives sur ${step.activities.length}):`);
            
            activeActivities.forEach((act, index) => {
                console.log(`   ${index + 1}. ${act.name}`);
                console.log(`      Début: ${this.formatDateTime(act.startDateTime)}`);
                console.log(`      Fin: ${this.formatDateTime(act.endDateTime)}`);
            });

            if (step.activities.length > activeActivities.length) {
                const inactiveCount = step.activities.length - activeActivities.length;
                colorLog('yellow', `      (${inactiveCount} activité(s) inactive(s) ignorée(s))`);
            }
        } else {
            colorLog('yellow', '\n🎯 ACTIVITÉS: Aucune');
        }
    }

    displaySyncResults(syncResult) {
        colorLog('bright', '\n📊 RÉSULTATS DE LA SYNCHRONISATION');
        console.log('='.repeat(60));
        
        if (syncResult.changed) {
            colorLog('green', `✅ ${syncResult.msg}`);
            
            console.log(`\n📋 Step: ${syncResult.stepName} (${syncResult.stepId})`);
            
            // Afficher les changements d'arrivée
            if (syncResult.changes.arrivalDateTime.changed) {
                console.log('\n🕐 HEURE D\'ARRIVÉE:');
                console.log(`   Avant: ${this.formatDateTime(syncResult.changes.arrivalDateTime.before)}`);
                console.log(`   Après: ${this.formatDateTime(syncResult.changes.arrivalDateTime.after)}`);
                console.log(`   Différence: ${this.calculateTimeDifference(syncResult.changes.arrivalDateTime.before, syncResult.changes.arrivalDateTime.after)}`);
            } else {
                console.log('\n🕐 HEURE D\'ARRIVÉE: Inchangée');
            }

            // Afficher les changements de départ
            if (syncResult.changes.departureDateTime.changed) {
                console.log('\n🕑 HEURE DE DÉPART:');
                console.log(`   Avant: ${this.formatDateTime(syncResult.changes.departureDateTime.before)}`);
                console.log(`   Après: ${this.formatDateTime(syncResult.changes.departureDateTime.after)}`);
                console.log(`   Différence: ${this.calculateTimeDifference(syncResult.changes.departureDateTime.before, syncResult.changes.departureDateTime.after)}`);
            } else {
                console.log('\n🕑 HEURE DE DÉPART: Inchangée');
            }

        } else {
            colorLog('yellow', `⚠️  ${syncResult.msg}`);
            console.log('\nLe step était déjà synchronisé avec ses accommodations et activités.');
        }
    }

    async runTest(roadtripId, stepId) {
        try {
            // Étape 1: Récupérer les détails du step
            colorLog('cyan', '🔍 Étape 1: Récupération des détails du step...');
            const step = await this.getStepDetails(roadtripId, stepId);
            this.displayStepAnalysis(step);

            // Étape 2: Synchroniser le step
            colorLog('cyan', '\n🔄 Étape 2: Synchronisation du step...');
            const syncResult = await this.syncSingleStep(roadtripId, stepId);
            this.displaySyncResults(syncResult);

            // Étape 3: Vérifier le résultat
            colorLog('cyan', '\n🔍 Étape 3: Vérification du résultat...');
            const updatedStep = await this.getStepDetails(roadtripId, stepId);
            
            console.log('\n📍 ÉTAT FINAL DU STEP:');
            console.log(`Arrivée: ${this.formatDateTime(updatedStep.arrivalDateTime)}`);
            console.log(`Départ: ${this.formatDateTime(updatedStep.departureDateTime)}`);

            colorLog('green', '\n🎉 Test terminé avec succès!');

        } catch (error) {
            colorLog('red', `\n❌ Erreur: ${error.message}`);
            
            if (error.message.includes('401')) {
                colorLog('yellow', '💡 Vérifiez que votre token JWT est valide et non expiré.');
            } else if (error.message.includes('404')) {
                colorLog('yellow', '💡 Vérifiez que le roadtripId et stepId existent et sont corrects.');
            } else if (error.message.includes('400')) {
                colorLog('yellow', '💡 Le step n\'appartient pas au roadtrip spécifié.');
            }
        }
    }
}

// Fonction principale
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 3) {
        colorLog('red', '❌ Usage: node testSingleStepSync.js <roadtripId> <stepId> <jwtToken> [serverUrl]');
        console.log('\nExemple:');
        console.log('  node testSingleStepSync.js 64a1b2c3d4e5f6789abcdef9 64a1b2c3d4e5f6789abcdef1 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
        console.log('\nCette API synchronise UNIQUEMENT le step spécifié, contrairement à l\'API asynchrone qui traite tous les steps.');
        process.exit(1);
    }

    const [roadtripId, stepId, jwtToken, serverUrl = DEFAULT_CONFIG.serverUrl] = args;

    colorLog('blue', '🔧 TEST API SYNCHRONISATION STEP INDIVIDUEL');
    console.log('='.repeat(70));
    console.log(`Server: ${serverUrl}`);
    console.log(`Roadtrip: ${roadtripId}`);
    console.log(`Step: ${stepId}`);
    console.log(`Token: ${jwtToken.substring(0, 20)}...`);

    const tester = new SingleStepSyncTester(serverUrl, jwtToken);
    await tester.runTest(roadtripId, stepId);
}

// Gestion des erreurs
process.on('unhandledRejection', (reason, promise) => {
    colorLog('red', `❌ Erreur non gérée: ${reason}`);
    process.exit(1);
});

process.on('SIGINT', () => {
    colorLog('yellow', '\n\n⚠️  Test interrompu par l\'utilisateur');
    process.exit(0);
});

main();
