// Exemple d'utilisation Frontend pour l'API de synchronisation des steps
// Ce fichier démontre comment intégrer la synchronisation dans une application React/Vue/vanilla JS

class StepSynchronizationAPI {
    constructor(apiBaseUrl, authToken) {
        this.apiBaseUrl = apiBaseUrl;
        this.authToken = authToken;
    }

    // Méthode pour lancer une synchronisation
    async startSynchronization(roadtripId) {
        const response = await fetch(`${this.apiBaseUrl}/roadtrips/${roadtripId}/sync-steps/async`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${this.authToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.msg || `HTTP ${response.status}`);
        }

        return await response.json();
    }

    // Méthode pour vérifier le statut d'un job
    async getJobStatus(roadtripId, jobId) {
        const response = await fetch(`${this.apiBaseUrl}/roadtrips/${roadtripId}/sync-jobs/${jobId}/status`, {
            headers: {
                'Authorization': `Bearer ${this.authToken}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.msg || `HTTP ${response.status}`);
        }

        return await response.json();
    }

    // Méthode pour récupérer l'historique des jobs
    async getJobHistory(roadtripId) {
        const response = await fetch(`${this.apiBaseUrl}/roadtrips/${roadtripId}/sync-jobs`, {
            headers: {
                'Authorization': `Bearer ${this.authToken}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.msg || `HTTP ${response.status}`);
        }

        return await response.json();
    }

    // Méthode pour surveiller un job avec callback de progrès
    async monitorJob(roadtripId, jobId, onProgress, onComplete, onError) {
        const checkStatus = async () => {
            try {
                const status = await this.getJobStatus(roadtripId, jobId);
                
                if (onProgress) {
                    onProgress(status);
                }

                if (status.status === 'completed') {
                    if (onComplete) {
                        onComplete(status);
                    }
                } else if (status.status === 'failed') {
                    if (onError) {
                        onError(new Error(status.errorMessage || 'Job failed'));
                    }
                } else if (status.status === 'running' || status.status === 'pending') {
                    // Continuer la surveillance
                    setTimeout(checkStatus, 2000);
                }
            } catch (error) {
                if (onError) {
                    onError(error);
                }
            }
        };

        checkStatus();
    }
}

// Exemple d'utilisation avec Vanilla JavaScript
class StepSyncUI {
    constructor(apiBaseUrl, authToken, roadtripId) {
        this.api = new StepSynchronizationAPI(apiBaseUrl, authToken);
        this.roadtripId = roadtripId;
        this.currentJobId = null;
    }

    // Créer l'interface utilisateur
    createUI() {
        const container = document.createElement('div');
        container.innerHTML = `
            <div class="step-sync-panel" style="
                padding: 20px;
                border: 1px solid #ddd;
                border-radius: 8px;
                margin: 10px 0;
                background: #f9f9f9;
            ">
                <h3>🔄 Synchronisation des Steps</h3>
                <p>Synchronisez les heures des steps avec leurs accommodations et activités.</p>
                
                <button id="start-sync-btn" style="
                    background: #007bff;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-right: 10px;
                ">
                    Lancer la synchronisation
                </button>
                
                <button id="view-history-btn" style="
                    background: #6c757d;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 4px;
                    cursor: pointer;
                ">
                    Voir l'historique
                </button>
                
                <div id="sync-status" style="margin-top: 15px;"></div>
                <div id="sync-progress" style="margin-top: 10px;"></div>
                <div id="sync-results" style="margin-top: 15px;"></div>
            </div>
        `;

        // Ajouter les event listeners
        const startBtn = container.querySelector('#start-sync-btn');
        const historyBtn = container.querySelector('#view-history-btn');

        startBtn.addEventListener('click', () => this.startSynchronization());
        historyBtn.addEventListener('click', () => this.showHistory());

        return container;
    }

    // Lancer la synchronisation
    async startSynchronization() {
        const statusDiv = document.getElementById('sync-status');
        const progressDiv = document.getElementById('sync-progress');
        const resultsDiv = document.getElementById('sync-results');
        const startBtn = document.getElementById('start-sync-btn');

        try {
            startBtn.disabled = true;
            statusDiv.innerHTML = '<p>🔄 Lancement de la synchronisation...</p>';
            progressDiv.innerHTML = '';
            resultsDiv.innerHTML = '';

            const job = await this.api.startSynchronization(this.roadtripId);
            this.currentJobId = job.jobId;

            statusDiv.innerHTML = `
                <p>✅ Job créé avec succès</p>
                <p><strong>Job ID:</strong> ${job.jobId}</p>
                <p><strong>Steps à traiter:</strong> ${job.progress.total}</p>
                <p><strong>Durée estimée:</strong> ${job.estimatedDuration}</p>
            `;

            // Surveiller le progrès
            this.api.monitorJob(
                this.roadtripId,
                job.jobId,
                (status) => this.updateProgress(status),
                (status) => this.onSyncComplete(status),
                (error) => this.onSyncError(error)
            );

        } catch (error) {
            statusDiv.innerHTML = `<p style="color: red;">❌ Erreur: ${error.message}</p>`;
            startBtn.disabled = false;

            if (error.message.includes('en cours')) {
                statusDiv.innerHTML += '<p>💡 Une synchronisation est déjà en cours. Attendez qu\'elle se termine.</p>';
            }
        }
    }

    // Mettre à jour le progrès
    updateProgress(status) {
        const progressDiv = document.getElementById('sync-progress');
        const percentage = status.progress.percentage || 0;

        progressDiv.innerHTML = `
            <div style="margin: 10px 0;">
                <div style="
                    background: #e9ecef;
                    border-radius: 4px;
                    height: 20px;
                    position: relative;
                    overflow: hidden;
                ">
                    <div style="
                        background: #007bff;
                        height: 100%;
                        width: ${percentage}%;
                        transition: width 0.3s ease;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: 12px;
                    ">
                        ${percentage}%
                    </div>
                </div>
                <p><strong>Status:</strong> ${status.status} (${status.progress.completed}/${status.progress.total})</p>
            </div>
        `;
    }

    // Synchronisation terminée
    onSyncComplete(status) {
        const startBtn = document.getElementById('start-sync-btn');
        const resultsDiv = document.getElementById('sync-results');

        startBtn.disabled = false;

        if (status.results && status.results.summary) {
            const summary = status.results.summary;
            resultsDiv.innerHTML = `
                <div style="
                    background: #d4edda;
                    border: 1px solid #c3e6cb;
                    color: #155724;
                    padding: 15px;
                    border-radius: 4px;
                    margin-top: 10px;
                ">
                    <h4>✅ Synchronisation terminée avec succès!</h4>
                    <ul>
                        <li><strong>Total steps:</strong> ${summary.totalSteps}</li>
                        <li><strong>Steps synchronisés:</strong> ${summary.synchronizedSteps}</li>
                        <li><strong>Steps inchangés:</strong> ${summary.unchangedSteps}</li>
                    </ul>
                    ${this.formatSyncDetails(summary.details)}
                </div>
            `;
        }

        // Actualiser l'affichage du roadtrip si nécessaire
        this.refreshRoadtripData();
    }

    // Erreur de synchronisation
    onSyncError(error) {
        const startBtn = document.getElementById('start-sync-btn');
        const resultsDiv = document.getElementById('sync-results');

        startBtn.disabled = false;
        resultsDiv.innerHTML = `
            <div style="
                background: #f8d7da;
                border: 1px solid #f5c6cb;
                color: #721c24;
                padding: 15px;
                border-radius: 4px;
                margin-top: 10px;
            ">
                <h4>❌ Erreur lors de la synchronisation</h4>
                <p>${error.message}</p>
            </div>
        `;
    }

    // Formater les détails de synchronisation
    formatSyncDetails(details) {
        if (!details || details.length === 0) {
            return '';
        }

        const changedSteps = details.filter(d => d.changed);
        if (changedSteps.length === 0) {
            return '<p><em>Aucune modification effectuée.</em></p>';
        }

        return `
            <details style="margin-top: 10px;">
                <summary style="cursor: pointer; font-weight: bold;">
                    Détails des modifications (${changedSteps.length} steps modifiés)
                </summary>
                <ul style="margin-top: 10px;">
                    ${changedSteps.map(detail => `
                        <li>
                            <strong>${detail.stepName}:</strong><br>
                            <small>
                                Avant: ${this.formatDateTime(detail.before?.arrivalDateTime)} → ${this.formatDateTime(detail.before?.departureDateTime)}<br>
                                Après: ${this.formatDateTime(detail.after?.arrivalDateTime)} → ${this.formatDateTime(detail.after?.departureDateTime)}
                            </small>
                        </li>
                    `).join('')}
                </ul>
            </details>
        `;
    }

    // Afficher l'historique
    async showHistory() {
        try {
            const history = await this.api.getJobHistory(this.roadtripId);
            
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            `;

            modal.innerHTML = `
                <div style="
                    background: white;
                    padding: 30px;
                    border-radius: 8px;
                    max-width: 600px;
                    max-height: 80vh;
                    overflow-y: auto;
                    position: relative;
                ">
                    <button style="
                        position: absolute;
                        top: 10px;
                        right: 15px;
                        background: none;
                        border: none;
                        font-size: 20px;
                        cursor: pointer;
                    " onclick="this.parentElement.parentElement.remove()">×</button>
                    
                    <h3>📚 Historique des synchronisations</h3>
                    
                    ${history.jobs.length === 0 ? 
                        '<p>Aucune synchronisation effectuée.</p>' :
                        `<div>${history.jobs.map(job => `
                            <div style="
                                border: 1px solid #ddd;
                                padding: 15px;
                                margin: 10px 0;
                                border-radius: 4px;
                                background: ${job.status === 'completed' ? '#f8f9fa' : job.status === 'failed' ? '#fff5f5' : '#fff'};
                            ">
                                <p><strong>Job ID:</strong> ${job.jobId}</p>
                                <p><strong>Status:</strong> 
                                    <span style="color: ${job.status === 'completed' ? 'green' : job.status === 'failed' ? 'red' : 'orange'};">
                                        ${job.status}
                                    </span>
                                </p>
                                <p><strong>Créé:</strong> ${this.formatDateTime(job.createdAt)}</p>
                                ${job.completedAt ? `<p><strong>Terminé:</strong> ${this.formatDateTime(job.completedAt)}</p>` : ''}
                                ${job.results ? `
                                    <p><strong>Résultats:</strong> 
                                        ${job.results.synchronizedSteps} steps synchronisés, 
                                        ${job.results.unchangedSteps} inchangés
                                    </p>
                                ` : ''}
                                ${job.errorMessage ? `<p style="color: red;"><strong>Erreur:</strong> ${job.errorMessage}</p>` : ''}
                            </div>
                        `).join('')}</div>`
                    }
                </div>
            `;

            document.body.appendChild(modal);
        } catch (error) {
            alert(`Erreur lors de la récupération de l'historique: ${error.message}`);
        }
    }

    // Actualiser les données du roadtrip
    refreshRoadtripData() {
        // Cette méthode peut être surchargée pour actualiser l'interface
        // après une synchronisation réussie
        console.log('Données du roadtrip actualisées');
        
        // Exemple: déclencher un événement personnalisé
        window.dispatchEvent(new CustomEvent('stepsSynchronized', {
            detail: { roadtripId: this.roadtripId }
        }));
    }

    // Formater une date/heure
    formatDateTime(dateTime) {
        if (!dateTime) return 'N/A';
        return new Date(dateTime).toLocaleString('fr-FR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Exemple d'utilisation avec React Hook
function useStepSynchronization(apiBaseUrl, authToken, roadtripId) {
    const [syncStatus, setSyncStatus] = React.useState(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [progress, setProgress] = React.useState({ percentage: 0 });
    const [results, setResults] = React.useState(null);
    const [error, setError] = React.useState(null);

    const api = React.useMemo(() => 
        new StepSynchronizationAPI(apiBaseUrl, authToken), 
        [apiBaseUrl, authToken]
    );

    const startSynchronization = React.useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            setResults(null);
            setProgress({ percentage: 0 });

            const job = await api.startSynchronization(roadtripId);
            setSyncStatus(job);

            // Surveiller le progrès
            api.monitorJob(
                roadtripId,
                job.jobId,
                (status) => {
                    setProgress(status.progress);
                    setSyncStatus(status);
                },
                (status) => {
                    setResults(status.results);
                    setIsLoading(false);
                },
                (error) => {
                    setError(error);
                    setIsLoading(false);
                }
            );

        } catch (err) {
            setError(err);
            setIsLoading(false);
        }
    }, [api, roadtripId]);

    return {
        startSynchronization,
        syncStatus,
        isLoading,
        progress,
        results,
        error,
        api
    };
}

// Composant React exemple
function StepSyncComponent({ apiBaseUrl, authToken, roadtripId }) {
    const {
        startSynchronization,
        syncStatus,
        isLoading,
        progress,
        results,
        error
    } = useStepSynchronization(apiBaseUrl, authToken, roadtripId);

    return (
        <div className="step-sync-component">
            <h3>🔄 Synchronisation des Steps</h3>
            
            <button 
                onClick={startSynchronization} 
                disabled={isLoading}
                className="btn btn-primary"
            >
                {isLoading ? 'Synchronisation en cours...' : 'Lancer la synchronisation'}
            </button>

            {isLoading && (
                <div className="progress-container">
                    <div className="progress-bar">
                        <div 
                            className="progress-fill" 
                            style={{ width: `${progress.percentage}%` }}
                        />
                    </div>
                    <p>Progression: {progress.percentage}% ({progress.completed}/{progress.total})</p>
                </div>
            )}

            {error && (
                <div className="alert alert-danger">
                    <strong>Erreur:</strong> {error.message}
                </div>
            )}

            {results && results.summary && (
                <div className="alert alert-success">
                    <h4>✅ Synchronisation terminée!</h4>
                    <ul>
                        <li>Total steps: {results.summary.totalSteps}</li>
                        <li>Steps synchronisés: {results.summary.synchronizedSteps}</li>
                        <li>Steps inchangés: {results.summary.unchangedSteps}</li>
                    </ul>
                </div>
            )}
        </div>
    );
}

// Export pour utilisation en module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        StepSynchronizationAPI,
        StepSyncUI,
        useStepSynchronization,
        StepSyncComponent
    };
}
