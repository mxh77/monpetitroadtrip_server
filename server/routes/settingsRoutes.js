import express from 'express';
import { auth } from '../middleware/auth.js';
import { getSettings, updateSettings } from '../controllers/settingsController.js';

const router = express.Router();

// GET /api/settings - Récupérer les paramètres globaux
router.get('/', auth, getSettings);

// PUT /api/settings - Mettre à jour les paramètres globaux
router.put('/', auth, updateSettings);

export default router;
