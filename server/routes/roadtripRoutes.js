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
 * /{idRoadtrip}/steps/natural-language:
 *   post:
 *     summary: Créer une étape via un prompt en langage naturel
 *     description: Utilise l'intelligence artificielle pour analyser un prompt en français et créer automatiquement une étape avec nom, adresse, dates et heures. Peut utiliser la géolocalisation de l'utilisateur si aucune adresse spécifique n'est mentionnée.
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
 *             required:
 *               - prompt
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: Description en langage naturel de l'étape à créer
 *                 example: "Visite du Louvre demain à 10h et repartir à 16h avec réservation des billets"
 *               userLatitude:
 *                 type: number
 *                 description: Latitude de la position actuelle de l'utilisateur (optionnel)
 *                 example: 48.8566
 *               userLongitude:
 *                 type: number
 *                 description: Longitude de la position actuelle de l'utilisateur (optionnel)
 *                 example: 2.3522
 *     responses:
 *       200:
 *         description: Étape créée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 step:
 *                   $ref: '#/components/schemas/Step'
 *                 extractedData:
 *                   type: object
 *                   description: Données extraites du prompt par l'IA
 *                   properties:
 *                     name:
 *                       type: string
 *                     address:
 *                       type: string
 *                     arrivalDateTime:
 *                       type: string
 *                       format: date-time
 *                     departureDateTime:
 *                       type: string
 *                       format: date-time
 *                     type:
 *                       type: string
 *                       enum: [Stage, Stop]
 *                     notes:
 *                       type: string
 *                     useUserLocation:
 *                       type: boolean
 *                       description: Indique si la géolocalisation de l'utilisateur a été utilisée
 *       400:
 *         description: Prompt manquant ou erreur d'analyse
 *       401:
 *         description: Non autorisé
 *       404:
 *         description: Roadtrip non trouvé
 *       500:
 *         description: Erreur serveur
 */
// Route protégée pour créer un step via un prompt en langage naturel
router.post('/:idRoadtrip/steps/natural-language', auth, stepController.createStepFromNaturalLanguage);

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

/**
 * @swagger
 * /{idRoadtrip}/steps/{idStep}/activities/natural-language:
 *   post:
 *     summary: Créer une activité via un prompt en langage naturel
 *     description: Utilise l'intelligence artificielle pour analyser un prompt en français et créer automatiquement une activité avec nom, adresse, dates, heures et type. Peut utiliser la géolocalisation de l'utilisateur ou l'adresse de l'étape si aucune adresse spécifique n'est mentionnée.
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
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: Description de l'activité en langage naturel
 *                 example: "Déjeuner au restaurant Le Procope demain à 12h30"
 *               userLatitude:
 *                 type: number
 *                 description: Latitude de l'utilisateur (optionnel)
 *                 example: 48.8566
 *               userLongitude:
 *                 type: number
 *                 description: Longitude de l'utilisateur (optionnel)
 *                 example: 2.3522
 *           examples:
 *             visite:
 *               summary: Visite touristique
 *               value:
 *                 prompt: "Visite guidée du Louvre demain de 10h à 12h avec réservation"
 *             restaurant:
 *               summary: Repas au restaurant
 *               value:
 *                 prompt: "Déjeuner au restaurant Le Procope demain à 12h30"
 *                 userLatitude: 48.8566
 *                 userLongitude: 2.3522
 *             activite_locale:
 *               summary: Activité près de l'utilisateur
 *               value:
 *                 prompt: "Course à pied dans le parc dans 1 heure"
 *                 userLatitude: 48.8566
 *                 userLongitude: 2.3522
 *     responses:
 *       200:
 *         description: Activité créée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 activity:
 *                   type: object
 *                   description: L'activité créée
 *                 extractedData:
 *                   type: object
 *                   description: Les données extraites par l'IA
 *       400:
 *         description: Requête invalide ou prompt manquant
 *       401:
 *         description: Non autorisé
 *       404:
 *         description: Roadtrip ou étape non trouvé
 *       500:
 *         description: Erreur interne du serveur
 */
// Route protégée pour créer une activité via un prompt en langage naturel
router.post('/:idRoadtrip/steps/:idStep/activities/natural-language', auth, activityController.createActivityFromNaturalLanguage);

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
/**
 * @swagger
 * /{idRoadtrip}/refresh-travel-times:
 *   patch:
 *     summary: Recalculer les temps de trajet (synchrone)
 *     description: Recalcule les temps de trajet entre toutes les étapes du roadtrip de manière synchrone
 *     tags: [Roadtrips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idRoadtrip
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du roadtrip
 *     responses:
 *       200:
 *         description: Temps de trajet recalculés avec succès
 *       401:
 *         description: Non autorisé
 *       404:
 *         description: Roadtrip non trouvé
 *       500:
 *         description: Erreur serveur
 */
// Route protégée pour réactualiser les temps de trajet entre chaque étape (synchrone)
router.patch('/:idRoadtrip/refresh-travel-times', auth, roadtripController.refreshTravelTimesForRoadtrip);

/**
 * @swagger
 * /{idRoadtrip}/refresh-travel-times/async:
 *   patch:
 *     summary: Lancer le recalcul asynchrone des temps de trajet
 *     description: Lance un job asynchrone pour recalculer tous les temps de trajet du roadtrip. Utile pour corriger les erreurs et obtenir des statistiques complètes.
 *     tags: [Roadtrips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idRoadtrip
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du roadtrip
 *     responses:
 *       202:
 *         description: Job de calcul démarré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                 jobId:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [pending, running, completed, failed]
 *                 progress:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     completed:
 *                       type: number
 *                     percentage:
 *                       type: number
 *                 estimatedDuration:
 *                   type: string
 *       409:
 *         description: Un calcul est déjà en cours
 *       401:
 *         description: Non autorisé
 *       404:
 *         description: Roadtrip non trouvé
 *       500:
 *         description: Erreur serveur
 */
// Route protégée pour lancer le recalcul asynchrone des temps de trajet
router.patch('/:idRoadtrip/refresh-travel-times/async', auth, roadtripController.startTravelTimeCalculationJob);

/**
 * @swagger
 * /{idRoadtrip}/travel-time-jobs/{jobId}/status:
 *   get:
 *     summary: Vérifier le statut d'un job de calcul
 *     description: Retourne le statut et les résultats d'un job de calcul des temps de trajet
 *     tags: [Roadtrips]
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
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du job
 *     responses:
 *       200:
 *         description: Statut du job récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 jobId:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [pending, running, completed, failed]
 *                 progress:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     completed:
 *                       type: number
 *                     percentage:
 *                       type: number
 *                 startedAt:
 *                   type: string
 *                   format: date-time
 *                 completedAt:
 *                   type: string
 *                   format: date-time
 *                 results:
 *                   type: object
 *                   properties:
 *                     stepsProcessed:
 *                       type: number
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalDistance:
 *                           type: number
 *                           description: Distance totale en km
 *                         totalTravelTime:
 *                           type: number
 *                           description: Temps de trajet total en minutes
 *                         inconsistentSteps:
 *                           type: number
 *                           description: Nombre d'étapes avec des incohérences temporelles
 *       401:
 *         description: Non autorisé
 *       404:
 *         description: Job non trouvé
 *       500:
 *         description: Erreur serveur
 */
// Route protégée pour vérifier le statut d'un job de calcul
router.get('/:idRoadtrip/travel-time-jobs/:jobId/status', auth, roadtripController.getTravelTimeJobStatus);

// Route protégée pour lister les jobs de calcul d'un roadtrip
router.get('/:idRoadtrip/travel-time-jobs', auth, roadtripController.getTravelTimeJobs);


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