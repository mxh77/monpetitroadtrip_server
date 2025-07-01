// Exemple d'utilisation de l'API asynchrone de calcul des temps de trajet
// Pour une application cliente (frontend)

class TravelTimeCalculator {
    constructor(baseUrl, authToken) {
        this.baseUrl = baseUrl;
        this.authToken = authToken;
    }

    // Méthode pour lancer le calcul asynchrone
    async startCalculation(roadtripId) {
        try {
            const response = await fetch(`${this.baseUrl}/roadtrips/${roadtripId}/refresh-travel-times/async`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 409) {
                const result = await response.json();
                console.log('Un calcul est déjà en cours:', result.jobId);
                return result.jobId;
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('✅ Calcul démarré:', result);
            return result.jobId;

        } catch (error) {
            console.error('❌ Erreur lors du lancement:', error);
            throw error;
        }
    }

    // Méthode pour surveiller le progrès
    async monitorProgress(roadtripId, jobId, onProgress, onComplete, onError) {
        const checkStatus = async () => {
            try {
                const response = await fetch(`${this.baseUrl}/roadtrips/${roadtripId}/travel-time-jobs/${jobId}/status`, {
                    headers: {
                        'Authorization': `Bearer ${this.authToken}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const status = await response.json();

                // Appeler le callback de progrès
                if (onProgress) {
                    onProgress(status);
                }

                if (status.status === 'completed') {
                    if (onComplete) {
                        onComplete(status.results);
                    }
                } else if (status.status === 'failed') {
                    if (onError) {
                        onError(new Error(status.errorMessage));
                    }
                } else if (status.status === 'running' || status.status === 'pending') {
                    // Continuer la surveillance
                    setTimeout(checkStatus, 2000); // Vérifier toutes les 2 secondes
                }

            } catch (error) {
                if (onError) {
                    onError(error);
                }
            }
        };

        checkStatus();
    }

    // Méthode pour obtenir l'historique
    async getJobHistory(roadtripId) {
        try {
            const response = await fetch(`${this.baseUrl}/roadtrips/${roadtripId}/travel-time-jobs`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();

        } catch (error) {
            console.error('❌ Erreur lors de la récupération de l\'historique:', error);
            throw error;
        }
    }

    // Méthode complète pour calculer et attendre le résultat
    async calculateAndWait(roadtripId) {
        return new Promise(async (resolve, reject) => {
            try {
                // Lancer le calcul
                const jobId = await this.startCalculation(roadtripId);

                // Surveiller le progrès
                this.monitorProgress(
                    roadtripId,
                    jobId,
                    // onProgress
                    (status) => {
                        console.log(`Progrès: ${status.progress.percentage}% (${status.progress.completed}/${status.progress.total})`);
                    },
                    // onComplete
                    (results) => {
                        console.log('✅ Calcul terminé:', results);
                        resolve(results);
                    },
                    // onError
                    (error) => {
                        console.error('❌ Erreur:', error);
                        reject(error);
                    }
                );

            } catch (error) {
                reject(error);
            }
        });
    }
}

// Exemple d'utilisation
async function example() {
    const calculator = new TravelTimeCalculator('http://localhost:3000/api', 'YOUR_JWT_TOKEN');
    const roadtripId = 'YOUR_ROADTRIP_ID';

    try {
        // Option 1: Calcul avec attente du résultat
        const results = await calculator.calculateAndWait(roadtripId);
        console.log('Résumé final:', results.summary);

        // Option 2: Calcul avec gestion manuelle du progrès
        /*
        const jobId = await calculator.startCalculation(roadtripId);
        
        calculator.monitorProgress(
            roadtripId,
            jobId,
            (status) => {
                // Mettre à jour une barre de progression
                updateProgressBar(status.progress.percentage);
            },
            (results) => {
                // Afficher les résultats finaux
                showResults(results.summary);
            },
            (error) => {
                // Gérer l'erreur
                showError(error.message);
            }
        );
        */

        // Option 3: Consulter l'historique
        const history = await calculator.getJobHistory(roadtripId);
        console.log('Historique des calculs:', history.jobs);

    } catch (error) {
        console.error('Erreur:', error);
    }
}

// Export pour utilisation en module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TravelTimeCalculator;
}

// Exemple d'intégration React Hook
/*
function useTravelTimeCalculation() {
    const [job, setJob] = useState(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [error, setError] = useState(null);

    const startCalculation = async (roadtripId) => {
        setIsCalculating(true);
        setError(null);

        const calculator = new TravelTimeCalculator('/api', authToken);

        try {
            const jobId = await calculator.startCalculation(roadtripId);

            calculator.monitorProgress(
                roadtripId,
                jobId,
                (status) => setJob(status),
                (results) => {
                    setJob(prev => ({ ...prev, results }));
                    setIsCalculating(false);
                },
                (err) => {
                    setError(err.message);
                    setIsCalculating(false);
                }
            );

        } catch (err) {
            setError(err.message);
            setIsCalculating(false);
        }
    };

    return {
        job,
        isCalculating,
        error,
        startCalculation,
        progress: job?.progress?.percentage || 0
    };
}
*/
