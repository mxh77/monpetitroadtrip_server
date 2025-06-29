import UserSetting from '../models/UserSetting.js';

/**
 * Récupère les paramètres utilisateur, avec création automatique si inexistants
 * @param {string} userId - L'ID de l'utilisateur
 * @returns {Promise<Object>} - Les paramètres utilisateur
 */
export async function getUserSettings(userId) {
    try {
        let settings = await UserSetting.findOne({ userId });
        if (!settings) {
            settings = await UserSetting.create({ userId });
        }
        return settings;
    } catch (error) {
        console.error('Erreur lors de la récupération des paramètres utilisateur:', error);
        // Retourner des paramètres par défaut en cas d'erreur
        return { algoliaSearchRadius: 50000 };
    }
}

/**
 * Récupère le rayon de recherche Algolia configuré par l'utilisateur
 * @param {string} userId - L'ID de l'utilisateur
 * @returns {Promise<number>} - Le rayon en mètres (défaut: 50000m = 50km)
 */
export async function getUserAlgoliaRadius(userId) {
    const settings = await getUserSettings(userId);
    return settings.algoliaSearchRadius || 50000;
}
