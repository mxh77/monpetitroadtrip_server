/**
 * Exemples d'utilisation de l'API de recalcul des coordonnées
 * Ce fichier montre comment utiliser les différents endpoints dans votre frontend
 */

const API_BASE_URL = 'http://localhost:3000';

/**
 * Classe utilitaire pour l'API de recalcul des coordonnées
 */
class CoordinatesAPI {
    constructor(token) {
        this.token = token;
        this.headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }

    /**
     * Effectue une requête POST vers l'API
     */
    async makeRequest(endpoint) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: this.headers
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`Erreur lors de la requête vers ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * Recalcule les coordonnées de tous les éléments de l'utilisateur
     */
    async recalculateAllCoordinates() {
        console.log('🔄 Démarrage du recalcul de tous les éléments...');
        const result = await this.makeRequest('/coordinates/recalculate/all');
        console.log('✅ Recalcul terminé:', result.results.summary);
        return result;
    }

    /**
     * Recalcule les coordonnées d'un type d'élément spécifique
     * @param {string} elementType - 'roadtrips', 'steps', 'accommodations', ou 'activities'
     */
    async recalculateByType(elementType) {
        console.log(`🔄 Démarrage du recalcul pour ${elementType}...`);
        const result = await this.makeRequest(`/coordinates/recalculate/${elementType}`);
        console.log(`✅ Recalcul terminé pour ${elementType}:`, result.results.summary);
        return result;
    }

    /**
     * Recalcule les coordonnées de tous les éléments d'un roadtrip spécifique
     * @param {string} roadtripId - L'ID du roadtrip
     */
    async recalculateRoadtrip(roadtripId) {
        console.log(`🔄 Démarrage du recalcul pour le roadtrip ${roadtripId}...`);
        const result = await this.makeRequest(`/coordinates/recalculate/roadtrip/${roadtripId}`);
        console.log(`✅ Recalcul terminé pour le roadtrip ${roadtripId}:`, result.results.summary);
        return result;
    }
}

/**
 * Exemples d'utilisation
 */
async function exempleUtilisation() {
    // Remplacez par votre token JWT valide
    const token = 'YOUR_JWT_TOKEN_HERE';
    const api = new CoordinatesAPI(token);

    try {
        // Exemple 1: Recalculer toutes les coordonnées
        console.log('=== Exemple 1: Recalcul global ===');
        const resultGlobal = await api.recalculateAllCoordinates();
        
        // Analyser les résultats
        console.log('Résultats détaillés:');
        console.log(`- Roadtrips traités: ${resultGlobal.results.roadtrips.length}`);
        console.log(`- Steps traités: ${resultGlobal.results.steps.length}`);
        console.log(`- Accommodations traitées: ${resultGlobal.results.accommodations.length}`);
        console.log(`- Activités traitées: ${resultGlobal.results.activities.length}`);
        
        console.log('\n=== Exemple 2: Recalcul par type ===');
        
        // Exemple 2: Recalculer seulement les accommodations
        const resultAccommodations = await api.recalculateByType('accommodations');
        console.log('Accommodations avec coordonnées mises à jour:');
        resultAccommodations.results.elements
            .filter(elem => elem.success)
            .forEach(elem => {
                console.log(`- ${elem.id}: ${elem.oldCoordinates.latitude},${elem.oldCoordinates.longitude} → ${elem.newCoordinates.latitude},${elem.newCoordinates.longitude}`);
            });

        // Exemple 3: Recalculer un roadtrip spécifique
        // const roadtripId = 'YOUR_ROADTRIP_ID_HERE';
        // const resultRoadtrip = await api.recalculateRoadtrip(roadtripId);

    } catch (error) {
        console.error('Erreur lors des exemples:', error);
    }
}

/**
 * Fonction utilitaire pour afficher les résultats de manière formatée
 */
function displayResults(results) {
    console.log('\n📊 Résumé du traitement:');
    console.log(`Total: ${results.summary.total}`);
    console.log(`Succès: ${results.summary.success}`);
    console.log(`Erreurs: ${results.summary.errors}`);
    console.log(`Ignorés (pas d'adresse): ${results.summary.skipped}`);
    
    if (results.summary.errors > 0) {
        console.log('\n❌ Éléments en erreur:');
        // Afficher tous les éléments en erreur selon le type de résultat
        ['roadtrips', 'steps', 'accommodations', 'activities', 'elements'].forEach(type => {
            if (results[type]) {
                results[type]
                    .filter(elem => !elem.success && elem.message !== 'Aucune adresse définie')
                    .forEach(elem => {
                        console.log(`- ${elem.type} ${elem.id}: ${elem.message}`);
                    });
            }
        });
    }
    
    if (results.summary.success > 0) {
        console.log('\n✅ Coordonnées mises à jour avec succès:');
        ['roadtrips', 'steps', 'accommodations', 'activities', 'elements'].forEach(type => {
            if (results[type]) {
                results[type]
                    .filter(elem => elem.success)
                    .forEach(elem => {
                        console.log(`- ${elem.type} ${elem.id}: ${elem.newCoordinates.latitude}, ${elem.newCoordinates.longitude}`);
                    });
            }
        });
    }
}

/**
 * Intégration dans une interface utilisateur
 */
function setupUIIntegration() {
    // Exemple d'intégration dans une page HTML
    
    // Bouton pour recalculer toutes les coordonnées
    const recalculateAllBtn = document.getElementById('recalculate-all-btn');
    if (recalculateAllBtn) {
        recalculateAllBtn.addEventListener('click', async () => {
            try {
                recalculateAllBtn.disabled = true;
                recalculateAllBtn.textContent = 'Recalcul en cours...';
                
                const token = localStorage.getItem('jwt_token'); // ou votre méthode de stockage du token
                const api = new CoordinatesAPI(token);
                
                const results = await api.recalculateAllCoordinates();
                
                // Afficher une notification de succès
                showNotification(`Recalcul terminé: ${results.results.summary.success} éléments mis à jour`, 'success');
                
                // Optionnel: rafraîchir les données affichées
                await refreshDisplayedData();
                
            } catch (error) {
                showNotification(`Erreur lors du recalcul: ${error.message}`, 'error');
            } finally {
                recalculateAllBtn.disabled = false;
                recalculateAllBtn.textContent = 'Recalculer toutes les coordonnées';
            }
        });
    }
}

/**
 * Fonction utilitaire pour afficher des notifications
 */
function showNotification(message, type = 'info') {
    // Implémentation de notification selon votre framework UI
    console.log(`[${type.toUpperCase()}] ${message}`);
}

/**
 * Fonction pour rafraîchir les données affichées (à adapter selon votre app)
 */
async function refreshDisplayedData() {
    // Implémenter selon votre logique de rafraîchissement
    console.log('Rafraîchissement des données...');
}

// Export pour utilisation en module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CoordinatesAPI, displayResults };
}

// Pour utilisation directe dans le navigateur
if (typeof window !== 'undefined') {
    window.CoordinatesAPI = CoordinatesAPI;
    window.displayResults = displayResults;
    
    // Setup automatique si la page est chargée
    document.addEventListener('DOMContentLoaded', setupUIIntegration);
}

// Décommenter pour exécuter les exemples
// exempleUtilisation();
