import express from 'express';
import { auth } from '../middleware/auth.js';
import * as roadtripController from '../controllers/roadtripController.js';
import * as stepController from '../controllers/stepController.js';
import * as accommodationController from '../controllers/accommodationController.js';
import * as activityController from '../controllers/activityController.js';
import multer from 'multer';

const router = express.Router();

// Configuration de multer pour gérer les uploads de fichiers
const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage });

/***************************/
/********METHOD POST********/
/***************************/
/**
 * @swagger
 * /:
 *   post:
 *     summary: Créer un nouveau roadtrip
 *     tags: [Roadtrips]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               startLocation:
 *                 type: string
 *               startDateTime:
 *                 type: string
 *                 format: date-time
 *               endLocation:
 *                 type: string
 *               endDateTime:
 *                 type: string
 *                 format: date-time
 *               currency:
 *                 type: string
 *               notes:
 *                 type: string
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Roadtrip créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoadtripResponse'
 *       400:
 *         description: Requête invalide
 *       401:
 *         description: Non autorisé
 *       500:
 *         description: Erreur interne du serveur
 */
// Route protégée pour créer un roadtrip
router.post('/', auth, upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'photos', maxCount: 10 },
    { name: 'documents', maxCount: 10 }
]), roadtripController.createRoadtrip);

/**
 * @swagger
 * /{idRoadtrip}/steps:
 *   post:
 *     summary: Créer une nouvelle étape pour un roadtrip
 *     tags: [Steps]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idRoadtrip
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du roadtrip
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               location:
 *                 type: string
 *     responses:
 *       201:
 *         description: Étape créée avec succès
 *       400:
 *         description: Requête invalide
 *       401:
 *         description: Non autorisé
 *       500:
 *         description: Erreur interne du serveur
 */
// Route protégée pour créer un step pour un roadtrip
router.post('/:idRoadtrip/steps', auth, stepController.createStepForRoadtrip);

/**
 * @swagger
 * /{idRoadtrip}/steps/{idStep}/accommodations:
 *   post:
 *     summary: Créer un nouvel hébergement pour une étape de roadtrip
 *     tags: [Accommodations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idRoadtrip
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du roadtrip
 *       - in: path
 *         name: idStep
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'étape
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Hébergement créé avec succès
 *       400:
 *         description: Requête invalide
 *       401:
 *         description: Non autorisé
 *       500:
 *         description: Erreur interne du serveur
 */
// Route protégée pour créer un hébergement lié à une étape de roadtrip
router.post('/:idRoadtrip/steps/:idStep/accommodations', auth, upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'photos', maxCount: 10 },
    { name: 'documents', maxCount: 10 }
]), accommodationController.createAccommodationForStep);

/**
 * @swagger
 * /{idRoadtrip}/steps/{idStep}/activities:
 *   post:
 *     summary: Créer une nouvelle activité pour une étape de roadtrip
 *     tags: [Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idRoadtrip
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du roadtrip
 *       - in: path
 *         name: idStep
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'étape
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Activité créée avec succès
 *       400:
 *         description: Requête invalide
 *       401:
 *         description: Non autorisé
 *       500:
 *         description: Erreur interne du serveur
 */
// Route protégée pour créer une activité liée à une étape de roadtrip
router.post('/:idRoadtrip/steps/:idStep/activities', auth, upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'photos', maxCount: 10 },
    { name: 'documents', maxCount: 10 }
]), activityController.createActivityForStep);

/***************************/
/********METHOD PUT*********/
/***************************/
// Route pour mettre à jour un roadtrip avec une vignette, des photos ou des documents
router.put('/:idRoadtrip', auth, upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'photos', maxCount: 10 },
    { name: 'documents', maxCount: 10 }
]), roadtripController.updateRoadtrip);

/***************************/
/********METHOD PATCH********/
/***************************/
// Route protégée pour réactualiser les temps de trajet entre chaque étape
router.patch('/:idRoadtrip/refresh-travel-times', auth, roadtripController.refreshTravelTimesForRoadtrip);


/***************************/
/********METHOD GET*********/
/***************************/
// Route protégée pour obtenir les roadtrips de l'utilisateur
router.get('/', auth, roadtripController.getUserRoadtrips);

// Route protégée pour obtenir un roadtrip spécifique
router.get('/:idRoadtrip', auth, roadtripController.getRoadtripById);

// Route protégée pour obtenir les étapes d'un roadtrip spécifique
router.get('/:idRoadtrip/steps', auth, stepController.getStepsByRoadtrip);


/***************************/
/********METHOD DELETE******/
/***************************/
// Route protégée pour supprimer un roadtrip
router.delete('/:idRoadtrip', auth, roadtripController.deleteRoadtrip);

// Route protégée pour supprimer un fichier spécifique
router.delete('/:idRoadtrip/files/:fileId', auth, roadtripController.deleteFile);

export default router;