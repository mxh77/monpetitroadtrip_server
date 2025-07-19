import express from 'express';
import { auth } from '../middleware/auth.js';
import * as coordinatesController from '../controllers/coordinatesController.js';

const router = express.Router();

/**
 * @route POST /api/coordinates/recalculate/all
 * @desc Recalcule les coordonnées de tous les éléments de l'utilisateur (roadtrips, steps, accommodations, activities)
 * @access Private
 */
router.post('/recalculate/all', auth, coordinatesController.recalculateAllCoordinates);

/**
 * @route POST /api/coordinates/recalculate/roadtrip/:roadtripId
 * @desc Recalcule les coordonnées de tous les éléments d'un roadtrip spécifique
 * @access Private
 */
router.post('/recalculate/roadtrip/:roadtripId', auth, coordinatesController.recalculateRoadtripCoordinates);

/**
 * @route POST /api/coordinates/recalculate/:elementType
 * @desc Recalcule les coordonnées d'un type d'élément spécifique (roadtrips, steps, accommodations, activities)
 * @access Private
 */
router.post('/recalculate/:elementType', auth, coordinatesController.recalculateElementTypeCoordinates);

export default router;
