import openai from './index.js';
import { getAvisRandonnéeViaAlgolia } from '../algoliaUtils.js';

/**
 * Génère une synthèse des avis utilisateurs
 * @param {Array} avisArray - Tableau d'objets contenant des avis et notes
 * @returns {Promise<string>} - Synthèse générée
 */
export const genererSyntheseAvis = async (avisArray) => {
    const avisText = avisArray.map((avis, i) =>
        `Avis ${i + 1} (${avis.rating}/5) : ${avis.comment}`
    ).join('\n');

    const prompt = `Voici une liste d'avis d'utilisateurs sur un lieu touristique. Fais une synthèse concise, claire, et neutre de ces avis en français :
  
  ${avisText}
  
  Synthèse :`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
          });

        return response.choices[0].message.content;

    } catch (error) {
        console.error('Error in OpenAI API call:', error.response?.data || error.message);
        throw new Error('Failed to generate summary from OpenAI');
    }
};

/**
 * Récupère les avis d'une randonnée via Algolia (infos .env) et génère une synthèse IA
 * @param {string} nomRandonnee - Le nom de la randonnée à rechercher
 * @param {string} indexName - Le nom de l'index Algolia à utiliser
 * @param {number} [maxAvis=10] - Nombre maximum d'avis à récupérer
 * @returns {Promise<string>} - Synthèse générée
 */
export const genererSyntheseAvisRandonnée = async (nomRandonnee, indexName, maxAvis = 10) => {
    const applicationId = process.env.ALGOLIA_APP_ID;
    const apiKey = process.env.ALGOLIA_API_KEY;
    const avis = await getAvisRandonnéeViaAlgolia(applicationId, apiKey, indexName, nomRandonnee, maxAvis);
    const avisArray = avis.map(a => ({
        comment: a.comment || a.text || '',
        rating: a.rating || a.stars || 0
    }));
    return await genererSyntheseAvis(avisArray);
};
