import Roadtrip from '../models/Roadtrip.js';
import Step from '../models/Step.js';
import Accommodation from '../models/Accommodation.js';
import Activity from '../models/Activity.js';
import { getCoordinates } from '../utils/googleMapsUtils.js';

/**
 * Recalcule les coordonnées d'un élément spécifique s'il a une adresse
 * @param {Object} element - L'élément à traiter
 * @param {string} elementType - Le type d'élément ('roadtrip', 'step', 'accommodation', 'activity')
 * @returns {Object} Résultat de la recalculation
 */
async function recalculateElementCoordinates(element, elementType) {
    const result = {
        id: element._id,
        type: elementType,
        success: false,
        message: '',
        oldCoordinates: null,
        newCoordinates: null
    };

    try {
        // Vérifier si l'élément a une adresse
        if (!element.address || element.address.trim() === '') {
            result.message = 'Aucune adresse définie';
            return result;
        }

        // Sauvegarder les anciennes coordonnées
        result.oldCoordinates = {
            latitude: element.latitude || 0,
            longitude: element.longitude || 0
        };

        // Obtenir les nouvelles coordonnées
        const coordinates = await getCoordinates(element.address, 'object');
        
        if (!coordinates || (!coordinates.lat && !coordinates.lng)) {
            result.message = 'Impossible d\'obtenir les coordonnées pour cette adresse';
            return result;
        }

        // Mettre à jour les coordonnées dans l'élément
        element.latitude = coordinates.lat;
        element.longitude = coordinates.lng;
        
        // Sauvegarder les modifications
        await element.save();

        result.success = true;
        result.newCoordinates = {
            latitude: coordinates.lat,
            longitude: coordinates.lng
        };
        result.message = 'Coordonnées mises à jour avec succès';

    } catch (error) {
        result.message = `Erreur lors de la recalculation: ${error.message}`;
        console.error(`Erreur recalcul coordonnées ${elementType} ${element._id}:`, error);
    }

    return result;
}

/**
 * Route pour recalculer les coordonnées de tous les éléments d'un utilisateur
 */
export const recalculateAllCoordinates = async (req, res) => {
    try {
        const userId = req.user.id;
        const results = {
            roadtrips: [],
            steps: [],
            accommodations: [],
            activities: [],
            summary: {
                total: 0,
                success: 0,
                errors: 0,
                skipped: 0
            }
        };

        console.log(`🔄 Début du recalcul des coordonnées pour l'utilisateur ${userId}`);

        // 1. Traitement des roadtrips
        console.log('📍 Traitement des roadtrips...');
        const roadtrips = await Roadtrip.find({ userId });
        for (const roadtrip of roadtrips) {
            const result = await recalculateElementCoordinates(roadtrip, 'roadtrip');
            results.roadtrips.push(result);
            results.summary.total++;
            if (result.success) results.summary.success++;
            else if (result.message === 'Aucune adresse définie') results.summary.skipped++;
            else results.summary.errors++;
        }

        // 2. Traitement des steps
        console.log('📍 Traitement des steps...');
        const steps = await Step.find({ userId });
        for (const step of steps) {
            const result = await recalculateElementCoordinates(step, 'step');
            results.steps.push(result);
            results.summary.total++;
            if (result.success) results.summary.success++;
            else if (result.message === 'Aucune adresse définie') results.summary.skipped++;
            else results.summary.errors++;
        }

        // 3. Traitement des accommodations
        console.log('📍 Traitement des accommodations...');
        const accommodations = await Accommodation.find({ userId });
        for (const accommodation of accommodations) {
            const result = await recalculateElementCoordinates(accommodation, 'accommodation');
            results.accommodations.push(result);
            results.summary.total++;
            if (result.success) results.summary.success++;
            else if (result.message === 'Aucune adresse définie') results.summary.skipped++;
            else results.summary.errors++;
        }

        // 4. Traitement des activities
        console.log('📍 Traitement des activities...');
        const activities = await Activity.find({ userId });
        for (const activity of activities) {
            const result = await recalculateElementCoordinates(activity, 'activity');
            results.activities.push(result);
            results.summary.total++;
            if (result.success) results.summary.success++;
            else if (result.message === 'Aucune adresse définie') results.summary.skipped++;
            else results.summary.errors++;
        }

        console.log(`✅ Recalcul terminé: ${results.summary.success} succès, ${results.summary.errors} erreurs, ${results.summary.skipped} ignorés sur ${results.summary.total} éléments`);

        res.json({
            message: 'Recalcul des coordonnées terminé',
            results,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Erreur lors du recalcul global des coordonnées:', error);
        res.status(500).json({
            message: 'Erreur serveur lors du recalcul des coordonnées',
            error: error.message
        });
    }
};

/**
 * Route pour recalculer les coordonnées des éléments d'un roadtrip spécifique
 */
export const recalculateRoadtripCoordinates = async (req, res) => {
    try {
        const userId = req.user.id;
        const { roadtripId } = req.params;

        const results = {
            roadtrip: null,
            steps: [],
            accommodations: [],
            activities: [],
            summary: {
                total: 0,
                success: 0,
                errors: 0,
                skipped: 0
            }
        };

        console.log(`🔄 Début du recalcul des coordonnées pour le roadtrip ${roadtripId}`);

        // Vérifier que le roadtrip appartient à l'utilisateur
        const roadtrip = await Roadtrip.findOne({ _id: roadtripId, userId });
        if (!roadtrip) {
            return res.status(404).json({ message: 'Roadtrip non trouvé' });
        }

        // 1. Traitement du roadtrip
        const roadtripResult = await recalculateElementCoordinates(roadtrip, 'roadtrip');
        results.roadtrip = roadtripResult;
        results.summary.total++;
        if (roadtripResult.success) results.summary.success++;
        else if (roadtripResult.message === 'Aucune adresse définie') results.summary.skipped++;
        else results.summary.errors++;

        // 2. Traitement des steps du roadtrip
        const steps = await Step.find({ roadtripId, userId });
        for (const step of steps) {
            const result = await recalculateElementCoordinates(step, 'step');
            results.steps.push(result);
            results.summary.total++;
            if (result.success) results.summary.success++;
            else if (result.message === 'Aucune adresse définie') results.summary.skipped++;
            else results.summary.errors++;
        }

        // 3. Traitement des accommodations des steps
        const stepIds = steps.map(step => step._id);
        const accommodations = await Accommodation.find({ stepId: { $in: stepIds }, userId });
        for (const accommodation of accommodations) {
            const result = await recalculateElementCoordinates(accommodation, 'accommodation');
            results.accommodations.push(result);
            results.summary.total++;
            if (result.success) results.summary.success++;
            else if (result.message === 'Aucune adresse définie') results.summary.skipped++;
            else results.summary.errors++;
        }

        // 4. Traitement des activities des steps
        const activities = await Activity.find({ stepId: { $in: stepIds }, userId });
        for (const activity of activities) {
            const result = await recalculateElementCoordinates(activity, 'activity');
            results.activities.push(result);
            results.summary.total++;
            if (result.success) results.summary.success++;
            else if (result.message === 'Aucune adresse définie') results.summary.skipped++;
            else results.summary.errors++;
        }

        console.log(`✅ Recalcul terminé pour le roadtrip ${roadtripId}: ${results.summary.success} succès, ${results.summary.errors} erreurs, ${results.summary.skipped} ignorés sur ${results.summary.total} éléments`);

        res.json({
            message: `Recalcul des coordonnées terminé pour le roadtrip ${roadtripId}`,
            results,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Erreur lors du recalcul des coordonnées du roadtrip:', error);
        res.status(500).json({
            message: 'Erreur serveur lors du recalcul des coordonnées du roadtrip',
            error: error.message
        });
    }
};

/**
 * Route pour recalculer les coordonnées d'un type d'élément spécifique
 */
export const recalculateElementTypeCoordinates = async (req, res) => {
    try {
        const userId = req.user.id;
        const { elementType } = req.params;

        const validTypes = ['roadtrips', 'steps', 'accommodations', 'activities'];
        if (!validTypes.includes(elementType)) {
            return res.status(400).json({ 
                message: 'Type d\'élément invalide', 
                validTypes 
            });
        }

        const results = {
            elementType,
            elements: [],
            summary: {
                total: 0,
                success: 0,
                errors: 0,
                skipped: 0
            }
        };

        console.log(`🔄 Début du recalcul des coordonnées pour le type: ${elementType}`);

        // Sélectionner le modèle approprié
        let Model;
        let modelName;
        switch (elementType) {
            case 'roadtrips':
                Model = Roadtrip;
                modelName = 'roadtrip';
                break;
            case 'steps':
                Model = Step;
                modelName = 'step';
                break;
            case 'accommodations':
                Model = Accommodation;
                modelName = 'accommodation';
                break;
            case 'activities':
                Model = Activity;
                modelName = 'activity';
                break;
        }

        // Récupérer et traiter les éléments
        const elements = await Model.find({ userId });
        for (const element of elements) {
            const result = await recalculateElementCoordinates(element, modelName);
            results.elements.push(result);
            results.summary.total++;
            if (result.success) results.summary.success++;
            else if (result.message === 'Aucune adresse définie') results.summary.skipped++;
            else results.summary.errors++;
        }

        console.log(`✅ Recalcul terminé pour ${elementType}: ${results.summary.success} succès, ${results.summary.errors} erreurs, ${results.summary.skipped} ignorés sur ${results.summary.total} éléments`);

        res.json({
            message: `Recalcul des coordonnées terminé pour ${elementType}`,
            results,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error(`Erreur lors du recalcul des coordonnées pour ${elementType}:`, error);
        res.status(500).json({
            message: `Erreur serveur lors du recalcul des coordonnées pour ${elementType}`,
            error: error.message
        });
    }
};
