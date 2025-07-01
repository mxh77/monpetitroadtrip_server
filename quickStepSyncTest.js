// Script utilitaire pour tester rapidement la synchronisation des steps
// Usage: node quickStepSyncTest.js <roadtripId> <jwtToken>

import fetch from 'node-fetch';

// Configuration par défaut
const DEFAULT_CONFIG = {
    serverUrl: 'http://localhost:3000',
    timeout: 60000, // 1 minute
    pollInterval: 2000 // 2 secondes
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

// Classe pour gérer les tests de synchronisation
class StepSyncTester {
    constructor(serverUrl, authToken) {
        this.serverUrl = serverUrl;
        this.authToken = authToken;
        this.apiBase = `${serverUrl}/api/roadtrips`;
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

    async getRoadtripInfo(roadtripId) {
        const result = await this.makeRequest('GET', `/${roadtripId}`);
        if (!result.ok) {
            throw new Error(`Failed to get roadtrip: ${result.data.msg || 'Unknown error'}`);
        }
        return result.data;
    }

    async startSynchronization(roadtripId) {
        const result = await this.makeRequest('PATCH', `/${roadtripId}/sync-steps/async`);
        
        if (result.status === 409) {
            throw new Error('Une synchronisation est déjà en cours pour ce roadtrip');
        }
        
        if (!result.ok) {
            throw new Error(`Failed to start sync: ${result.data.msg || 'Unknown error'}`);
        }
        
        return result.data;
    }

    async getJobStatus(roadtripId, jobId) {
        const result = await this.makeRequest('GET', `/${roadtripId}/sync-jobs/${jobId}/status`);
        if (!result.ok) {
            throw new Error(`Failed to get job status: ${result.data.msg || 'Unknown error'}`);
        }
        return result.data;
    }

    async waitForCompletion(roadtripId, jobId, timeout = DEFAULT_CONFIG.timeout) {
        const startTime = Date.now();
        const pollInterval = DEFAULT_CONFIG.pollInterval;

        return new Promise((resolve, reject) => {
            const checkStatus = async () => {
                try {
                    if (Date.now() - startTime > timeout) {
                        reject(new Error('Timeout: Job did not complete within the specified time'));
                        return;
                    }

                    const status = await this.getJobStatus(roadtripId, jobId);
                    
                    // Afficher le progrès
                    const percentage = status.progress?.percentage || 0;
                    const progressBar = '█'.repeat(Math.floor(percentage / 5)) + '░'.repeat(20 - Math.floor(percentage / 5));
                    process.stdout.write(`\r${colors.cyan}Progress: [${progressBar}] ${percentage}%${colors.reset}`);

                    if (status.status === 'completed') {
                        process.stdout.write('\n');
                        resolve(status);
                    } else if (status.status === 'failed') {
                        process.stdout.write('\n');
                        reject(new Error(`Job failed: ${status.errorMessage || 'Unknown error'}`));
                    } else {
                        setTimeout(checkStatus, pollInterval);
                    }
                } catch (error) {
                    process.stdout.write('\n');
                    reject(error);
                }
            };

            checkStatus();
        });
    }

    async getJobHistory(roadtripId) {
        const result = await this.makeRequest('GET', `/${roadtripId}/sync-jobs`);
        if (!result.ok) {
            throw new Error(`Failed to get job history: ${result.data.msg || 'Unknown error'}`);
        }
        return result.data;
    }

    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        }
        return `${seconds}s`;
    }

    displayResults(results) {
        if (!results.results || !results.results.summary) {
            colorLog('yellow', '⚠️  Résultats détaillés non disponibles');
            return;
        }

        const summary = results.results.summary;
        
        colorLog('bright', '\n📊 Résultats de la synchronisation:');
        console.log(`   └─ Total steps: ${summary.totalSteps}`);
        console.log(`   └─ Steps synchronisés: ${summary.synchronizedSteps}`);
        console.log(`   └─ Steps inchangés: ${summary.unchangedSteps}`);

        if (summary.details && summary.details.length > 0) {
            colorLog('bright', '\n📝 Détails des modifications:');
            summary.details.forEach(detail => {
                if (detail.changed) {
                    console.log(`   🔄 ${detail.stepName}:`);
                    if (detail.before && detail.after) {
                        console.log(`      Avant: ${new Date(detail.before.arrivalDateTime).toLocaleString()} → ${new Date(detail.before.departureDateTime).toLocaleString()}`);
                        console.log(`      Après: ${new Date(detail.after.arrivalDateTime).toLocaleString()} → ${new Date(detail.after.departureDateTime).toLocaleString()}`);
                    }
                } else {
                    console.log(`   ✓ ${detail.stepName}: Inchangé`);
                }
            });
        }
    }
}

// Fonction principale
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        colorLog('red', '❌ Usage: node quickStepSyncTest.js <roadtripId> <jwtToken> [serverUrl]');
        console.log('\nExemple:');
        console.log('  node quickStepSyncTest.js 64a1b2c3d4e5f6789abcdef9 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
        process.exit(1);
    }

    const [roadtripId, jwtToken, serverUrl = DEFAULT_CONFIG.serverUrl] = args;

    colorLog('blue', '🚀 Quick Step Synchronization Test');
    console.log(`   Server: ${serverUrl}`);
    console.log(`   Roadtrip: ${roadtripId}`);
    console.log(`   Token: ${jwtToken.substring(0, 20)}...`);

    const tester = new StepSyncTester(serverUrl, jwtToken);

    try {
        // Étape 1: Vérifier le roadtrip
        colorLog('yellow', '\n📋 Étape 1: Vérification du roadtrip...');
        const roadtrip = await tester.getRoadtripInfo(roadtripId);
        colorLog('green', `✅ Roadtrip "${roadtrip.name}" trouvé`);
        console.log(`   └─ Nombre de steps: ${roadtrip.steps?.length || 0}`);

        // Étape 2: Lancer la synchronisation
        colorLog('yellow', '\n🔄 Étape 2: Lancement de la synchronisation...');
        const startTime = Date.now();
        const job = await tester.startSynchronization(roadtripId);
        colorLog('green', `✅ Job créé: ${job.jobId}`);
        console.log(`   └─ Status: ${job.status}`);
        console.log(`   └─ Steps à traiter: ${job.progress.total}`);
        console.log(`   └─ Durée estimée: ${job.estimatedDuration}`);

        // Étape 3: Attendre la completion
        colorLog('yellow', '\n⏳ Étape 3: Surveillance du progrès...');
        const results = await tester.waitForCompletion(roadtripId, job.jobId);
        const totalTime = Date.now() - startTime;
        
        colorLog('green', `\n✅ Synchronisation terminée en ${tester.formatDuration(totalTime)}`);

        // Afficher les résultats
        tester.displayResults(results);

        // Étape 4: Vérifier l'historique
        colorLog('yellow', '\n📚 Étape 4: Vérification de l\'historique...');
        const history = await tester.getJobHistory(roadtripId);
        colorLog('green', `✅ Historique récupéré: ${history.jobs.length} jobs`);
        
        if (history.jobs.length > 0) {
            console.log('   Derniers jobs:');
            history.jobs.slice(0, 3).forEach((job, index) => {
                const date = new Date(job.createdAt).toLocaleString();
                const duration = job.completedAt ? 
                    tester.formatDuration(new Date(job.completedAt) - new Date(job.startedAt)) : 
                    'N/A';
                console.log(`   ${index + 1}. ${job.status} - ${date} (${duration})`);
            });
        }

        // Résumé final
        colorLog('green', '\n🎉 Test terminé avec succès!');
        
        // Suggestions
        colorLog('bright', '\n💡 Prochaines étapes suggérées:');
        console.log('1. Tester le calcul des temps de trajet avec synchronisation:');
        console.log(`   curl -X PATCH -H "Authorization: Bearer ${jwtToken}" ${serverUrl}/api/roadtrips/${roadtripId}/refresh-travel-times/async`);
        console.log('2. Vérifier les données dans l\'interface web');
        console.log('3. Tester avec des modifications d\'accommodations/activités');

    } catch (error) {
        colorLog('red', `\n❌ Erreur: ${error.message}`);
        
        if (error.message.includes('déjà en cours')) {
            colorLog('yellow', '\n💡 Une synchronisation est déjà en cours. Attendez qu\'elle se termine ou vérifiez son statut:');
            console.log(`   curl -H "Authorization: Bearer ${jwtToken}" ${serverUrl}/api/roadtrips/${roadtripId}/sync-jobs`);
        }
        
        process.exit(1);
    }
}

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
    colorLog('red', `❌ Erreur non gérée: ${reason}`);
    process.exit(1);
});

process.on('SIGINT', () => {
    colorLog('yellow', '\n\n⚠️  Test interrompu par l\'utilisateur');
    process.exit(0);
});

// Lancer le test
main();
