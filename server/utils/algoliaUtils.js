import { algoliasearch } from 'algoliasearch';
import { genererSyntheseAvis } from './openaiUtils.js';

/**
 * Récupère les avis d'une randonnée via Algolia
 * @param {string} applicationId - L'ID de l'application Algolia
 * @param {string} apiKey - La clé API search-only Algolia
 * @param {string} indexName - Le nom de l'index Algolia
 * @param {string} nomRandonnee - Le nom de la randonnée à rechercher
 * @param {number} [maxAvis=10] - Nombre maximum d'avis à récupérer
 * @returns {Promise<Array>} - Tableau d'avis (objets)
 */
export const getAvisRandonnéeViaAlgolia = async (applicationId, apiKey, indexName, nomRandonnee, maxAvis = 10) => {
    const client = algoliasearch(applicationId, apiKey);
    
    const { results } = await client.search([{
        indexName,
        query: nomRandonnee,
        params: {
            hitsPerPage: maxAvis,
            filters: 'type:review' // À adapter selon la structure de l'index
        }
    }]);
    
    return results[0]?.hits || [];
};

/**
 * Récupère les avis d'une randonnée via Algolia et génère une synthèse IA
 * @param {string} applicationId
 * @param {string} apiKey
 * @param {string} indexName
 * @param {string} nomRandonnee
 * @param {number} [maxAvis=10]
 * @returns {Promise<string>} - Synthèse générée
 */
export const genererSyntheseAvisRandonnéeAlgolia = async (applicationId, apiKey, indexName, nomRandonnee, maxAvis = 10) => {
    const avis = await getAvisRandonnéeViaAlgolia(applicationId, apiKey, indexName, nomRandonnee, maxAvis);
    // On suppose que chaque avis a un champ 'comment' et 'rating'
    const avisArray = avis.map(a => ({
        comment: a.comment || a.text || '',
        rating: a.rating || a.stars || 0
    }));
    return await genererSyntheseAvis(avisArray);
};
