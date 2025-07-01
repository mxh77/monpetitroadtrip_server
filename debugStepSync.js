// Script de diagnostic pour le problème de synchronisation des heures
// Usage: node debugStepSync.js <roadtripId> <stepId> <jwtToken>

import fetch from 'node-fetch';

// Configuration
const DEFAULT_CONFIG = {
    serverUrl: 'http://localhost:3000',
    apiBase: '/api'
};

class StepSyncDebugger {
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

        const response = await fetch(url, options);
        const data = await response.json();
        
        return {
            ok: response.ok,
            status: response.status,
            data
        };
    }

    async getStepDetails(roadtripId, stepId) {
        // Récupérer les détails du roadtrip avec populate
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

    async analyzeStep(roadtripId, stepId) {
        console.log('🔍 ANALYSE DU STEP');
        console.log('='.repeat(50));

        try {
            const step = await this.getStepDetails(roadtripId, stepId);
            
            console.log(`📍 Step: ${step.name}`);
            console.log(`   Type: ${step.type}`);
            console.log(`   Current arrivalDateTime: ${step.arrivalDateTime}`);
            console.log(`   Current departureDateTime: ${step.departureDateTime}`);
            console.log();

            // Analyser les accommodations
            if (step.accommodations && step.accommodations.length > 0) {
                console.log('🏨 ACCOMMODATIONS:');
                step.accommodations.forEach((acc, index) => {
                    console.log(`   ${index + 1}. ${acc.name} (Active: ${acc.active})`);
                    console.log(`      - Arrival: ${acc.arrivalDateTime}`);
                    console.log(`      - Departure: ${acc.departureDateTime}`);
                    
                    if (acc.arrivalDateTime) {
                        const arrivalDate = new Date(acc.arrivalDateTime);
                        console.log(`      - Arrival parsed: ${arrivalDate}`);
                        console.log(`      - Valid: ${!isNaN(arrivalDate)}`);
                    }
                    
                    if (acc.departureDateTime) {
                        const departureDate = new Date(acc.departureDateTime);
                        console.log(`      - Departure parsed: ${departureDate}`);
                        console.log(`      - Valid: ${!isNaN(departureDate)}`);
                    }
                    console.log();
                });
            } else {
                console.log('🏨 ACCOMMODATIONS: Aucune');
                console.log();
            }

            // Analyser les activités
            if (step.activities && step.activities.length > 0) {
                console.log('🎯 ACTIVITIES:');
                step.activities.forEach((act, index) => {
                    console.log(`   ${index + 1}. ${act.name} (Active: ${act.active})`);
                    console.log(`      - Start: ${act.startDateTime}`);
                    console.log(`      - End: ${act.endDateTime}`);
                    
                    if (act.startDateTime) {
                        const startDate = new Date(act.startDateTime);
                        console.log(`      - Start parsed: ${startDate}`);
                        console.log(`      - Valid: ${!isNaN(startDate)}`);
                    }
                    
                    if (act.endDateTime) {
                        const endDate = new Date(act.endDateTime);
                        console.log(`      - End parsed: ${endDate}`);
                        console.log(`      - Valid: ${!isNaN(endDate)}`);
                    }
                    console.log();
                });
            } else {
                console.log('🎯 ACTIVITIES: Aucune');
                console.log();
            }

            // Calculer les dates attendues
            console.log('🧮 CALCUL ATTENDU:');
            const { expectedArrival, expectedDeparture } = this.calculateExpectedDates(step);
            console.log(`   Expected arrivalDateTime: ${expectedArrival}`);
            console.log(`   Expected departureDateTime: ${expectedDeparture}`);
            console.log();

            // Comparaison
            console.log('⚖️  COMPARAISON:');
            const currentArrival = new Date(step.arrivalDateTime);
            const currentDeparture = new Date(step.departureDateTime);
            
            if (expectedArrival) {
                const isArrivalCorrect = currentArrival.getTime() === expectedArrival.getTime();
                console.log(`   Arrival correct: ${isArrivalCorrect ? '✅' : '❌'}`);
                if (!isArrivalCorrect) {
                    console.log(`      Current: ${currentArrival}`);
                    console.log(`      Expected: ${expectedArrival}`);
                    console.log(`      Difference: ${(currentArrival.getTime() - expectedArrival.getTime()) / (1000 * 60 * 60)} hours`);
                }
            }

            if (expectedDeparture) {
                const isDepartureCorrect = currentDeparture.getTime() === expectedDeparture.getTime();
                console.log(`   Departure correct: ${isDepartureCorrect ? '✅' : '❌'}`);
                if (!isDepartureCorrect) {
                    console.log(`      Current: ${currentDeparture}`);
                    console.log(`      Expected: ${expectedDeparture}`);
                    console.log(`      Difference: ${(currentDeparture.getTime() - expectedDeparture.getTime()) / (1000 * 60 * 60)} hours`);
                }
            }

        } catch (error) {
            console.error('❌ Erreur lors de l\'analyse:', error.message);
        }
    }

    calculateExpectedDates(step) {
        let expectedArrival = null;
        let expectedDeparture = null;

        // Traiter les accommodations actives
        if (step.accommodations) {
            step.accommodations
                .filter(acc => acc.active)
                .forEach(acc => {
                    if (acc.arrivalDateTime) {
                        const arrivalDate = new Date(acc.arrivalDateTime);
                        if (!isNaN(arrivalDate)) {
                            expectedArrival = expectedArrival === null || arrivalDate < expectedArrival 
                                ? arrivalDate 
                                : expectedArrival;
                        }
                    }
                    
                    if (acc.departureDateTime) {
                        const departureDate = new Date(acc.departureDateTime);
                        if (!isNaN(departureDate)) {
                            expectedDeparture = expectedDeparture === null || departureDate > expectedDeparture 
                                ? departureDate 
                                : expectedDeparture;
                        }
                    }
                });
        }

        // Traiter les activités actives
        if (step.activities) {
            step.activities
                .filter(act => act.active)
                .forEach(act => {
                    if (act.startDateTime) {
                        const startDate = new Date(act.startDateTime);
                        if (!isNaN(startDate)) {
                            expectedArrival = expectedArrival === null || startDate < expectedArrival 
                                ? startDate 
                                : expectedArrival;
                        }
                    }
                    
                    if (act.endDateTime) {
                        const endDate = new Date(act.endDateTime);
                        if (!isNaN(endDate)) {
                            expectedDeparture = expectedDeparture === null || endDate > expectedDeparture 
                                ? endDate 
                                : expectedDeparture;
                        }
                    }
                });
        }

        return { expectedArrival, expectedDeparture };
    }

    async testSynchronization(roadtripId, stepId) {
        console.log('\n🔄 TEST DE SYNCHRONISATION');
        console.log('='.repeat(50));

        try {
            // Lancer la synchronisation pour ce roadtrip
            const syncResult = await this.makeRequest('PATCH', `/roadtrips/${roadtripId}/sync-steps/async`);
            
            if (!syncResult.ok) {
                if (syncResult.status === 409) {
                    console.log('⚠️  Une synchronisation est déjà en cours. Attendez qu\'elle se termine.');
                    return;
                } else {
                    throw new Error(`Failed to start sync: ${syncResult.data.msg || 'Unknown error'}`);
                }
            }

            const job = syncResult.data;
            console.log(`✅ Job de synchronisation créé: ${job.jobId}`);
            
            // Attendre que la synchronisation se termine
            await this.waitForSync(roadtripId, job.jobId);
            
            // Réanalyser le step
            console.log('\n📊 ANALYSE APRÈS SYNCHRONISATION:');
            console.log('='.repeat(50));
            await this.analyzeStep(roadtripId, stepId);

        } catch (error) {
            console.error('❌ Erreur lors du test de synchronisation:', error.message);
        }
    }

    async waitForSync(roadtripId, jobId) {
        const maxAttempts = 30;
        let attempt = 0;

        while (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            attempt++;

            const statusResult = await this.makeRequest('GET', `/roadtrips/${roadtripId}/sync-jobs/${jobId}/status`);
            
            if (statusResult.ok) {
                const status = statusResult.data;
                process.stdout.write(`\r🕐 Progression: ${status.progress.percentage}% (${status.progress.completed}/${status.progress.total})`);

                if (status.status === 'completed') {
                    process.stdout.write('\n✅ Synchronisation terminée!\n');
                    return status;
                } else if (status.status === 'failed') {
                    process.stdout.write('\n❌ Synchronisation échouée!\n');
                    throw new Error(status.errorMessage || 'Sync failed');
                }
            } else {
                throw new Error('Failed to get sync status');
            }
        }

        throw new Error('Timeout waiting for sync completion');
    }
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 3) {
        console.log('❌ Usage: node debugStepSync.js <roadtripId> <stepId> <jwtToken> [serverUrl]');
        console.log('\nExemple:');
        console.log('  node debugStepSync.js 64a1b2c3d4e5f6789abcdef9 64a1b2c3d4e5f6789abcdef1 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
        process.exit(1);
    }

    const [roadtripId, stepId, jwtToken, serverUrl = DEFAULT_CONFIG.serverUrl] = args;

    console.log('🐛 DEBUG SYNCHRONISATION DES STEPS');
    console.log('='.repeat(60));
    console.log(`Server: ${serverUrl}`);
    console.log(`Roadtrip: ${roadtripId}`);
    console.log(`Step: ${stepId}`);
    console.log(`Token: ${jwtToken.substring(0, 20)}...`);
    console.log();

    const stepDebugger = new StepSyncDebugger(serverUrl, jwtToken);

    // Analyser l'état actuel
    await stepDebugger.analyzeStep(roadtripId, stepId);
    
    // Demander si l'utilisateur veut tester la synchronisation
    console.log('\n💡 Voulez-vous tester la synchronisation? (CTRL+C pour annuler, ENTER pour continuer)');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', async (key) => {
        if (key[0] === 3) { // CTRL+C
            console.log('\nTest annulé.');
            process.exit(0);
        } else if (key[0] === 13) { // ENTER
            process.stdin.setRawMode(false);
            process.stdin.pause();
            await stepDebugger.testSynchronization(roadtripId, stepId);
            process.exit(0);
        }
    });
}

// Gestion des erreurs
process.on('unhandledRejection', (reason, promise) => {
    console.error(`❌ Erreur non gérée: ${reason}`);
    process.exit(1);
});

process.on('SIGINT', () => {
    console.log('\n\n⚠️  Analyse interrompue par l\'utilisateur');
    process.exit(0);
});

main();
