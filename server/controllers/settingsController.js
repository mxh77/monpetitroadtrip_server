// Contrôleur pour la gestion des paramètres globaux (exemple simple, stockage mémoire)
import UserSetting from '../models/UserSetting.js';

export const getSettings = async (req, res) => {
    try {
        let settings = await UserSetting.findOne({ userId: req.user.id });
        if (!settings) {
            settings = await UserSetting.create({ userId: req.user.id });
        }
        res.json(settings);
    } catch (error) {
        res.status(500).json({ msg: 'Erreur lors de la récupération des paramètres', error: error.message });
    }
};

export const updateSettings = async (req, res) => {
    try {
        const update = {};
        if (typeof req.body.systemPrompt === 'string') update.systemPrompt = req.body.systemPrompt;
        if (typeof req.body.algoliaSearchRadius === 'number') {
            // Validation du rayon (entre 1km et 200km)
            const radius = req.body.algoliaSearchRadius;
            if (radius >= 1000 && radius <= 200000) {
                update.algoliaSearchRadius = radius;
            } else {
                return res.status(400).json({ 
                    msg: 'Le rayon de recherche doit être entre 1000m (1km) et 200000m (200km)',
                    currentValue: radius 
                });
            }
        }
        if (typeof req.body.dragSnapInterval === 'number') {
            // Validation du pas de déplacement (valeurs autorisées: 5, 10, 15, 30, 60)
            const VALID_DRAG_SNAP_INTERVALS = [5, 10, 15, 30, 60];
            const dragSnapInterval = req.body.dragSnapInterval;
            if (VALID_DRAG_SNAP_INTERVALS.includes(dragSnapInterval)) {
                update.dragSnapInterval = dragSnapInterval;
            } else {
                return res.status(400).json({ 
                    msg: 'dragSnapInterval doit être l\'une des valeurs: 5, 10, 15, 30, 60',
                    currentValue: dragSnapInterval,
                    validValues: VALID_DRAG_SNAP_INTERVALS
                });
            }
        }
        if (typeof req.body.enablePhotosInStories === 'boolean') {
            // Activation/désactivation de l'analyse des photos dans les récits
            update.enablePhotosInStories = req.body.enablePhotosInStories;
        }
        // Ajoute d'autres champs ici si besoin
        const settings = await UserSetting.findOneAndUpdate(
            { userId: req.user.id },
            { $set: update },
            { new: true, upsert: true }
        );
        res.json(settings);
    } catch (error) {
        res.status(500).json({ msg: 'Erreur lors de la mise à jour des paramètres', error: error.message });
    }
};
