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
