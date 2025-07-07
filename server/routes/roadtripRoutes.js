import express from 'express';
import { auth } from '../middleware/auth.js';
import * as roadtripController from '../controllers/roadtripController.js';
import * as stepController from '../controllers/stepController.js';
import * as accommodationController from '../controllers/accommodationController.js';
import * as activityController from '../controllers/activityController.js';
import * as aiRoadtripController from '../controllers/aiRoadtripController.js';
import multer from 'multer';

const router = express.Router();

// Configuration de multer pour gérer les uploads de fichiers
const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage });

// IMPORTANT : Documentation Swagger disponible dans roadtripRoutes.swagger.js
// Organisation par MODULES FONCTIONNELS pour une logique métier claire

/***************************/
/*****GESTION ROADTRIP******/
/***************************/

// Génération d'un roadtrip complet via l'IA
router.post('/ai', auth, aiRoadtripController.generateRoadtripWithAI);

// Créer un nouveau roadtrip avec fichiers (thumbnail, photos, documents)
router.post('/', auth, upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'photos', maxCount: 10 },
    { name: 'documents', maxCount: 10 }
]), roadtripController.createRoadtrip);

// Obtenir les roadtrips de l'utilisateur
router.get('/', auth, roadtripController.getUserRoadtrips);

// Obtenir un roadtrip spécifique
router.get('/:idRoadtrip', auth, roadtripController.getRoadtripById);

// Mettre à jour un roadtrip avec fichiers (thumbnail, photos, documents)
router.put('/:idRoadtrip', auth, upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'photos', maxCount: 10 },
    { name: 'documents', maxCount: 10 }
]), roadtripController.updateRoadtrip);

// Supprimer un roadtrip
router.delete('/:idRoadtrip', auth, roadtripController.deleteRoadtrip);

// Supprimer un fichier spécifique
router.delete('/:idRoadtrip/files/:fileId', auth, roadtripController.deleteFile);

/***************************/
/*******GESTION STEPS*******/
/***************************/

// Créer une nouvelle étape pour un roadtrip
router.post('/:idRoadtrip/steps', auth, stepController.createStepForRoadtrip);

// Créer une étape via un prompt en langage naturel (IA)
router.post('/:idRoadtrip/steps/natural-language', auth, stepController.createStepFromNaturalLanguage);

// Obtenir les étapes d'un roadtrip spécifique
router.get('/:idRoadtrip/steps', auth, stepController.getStepsByRoadtrip);

// Synchroniser les heures d'un step spécifique
router.patch('/:idRoadtrip/steps/:idStep/sync', auth, roadtripController.syncSingleStep);

// Recalculer et corriger les dates d'un step spécifique (nouveau)
router.patch('/:idRoadtrip/steps/:idStep/fix-dates', auth, roadtripController.fixStepDates);

/***************************/
/****GESTION ACCOMMODATIONS*/
/***************************/

// Créer un hébergement pour une étape avec fichiers (thumbnail, photos, documents)
router.post('/:idRoadtrip/steps/:idStep/accommodations', auth, upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'photos', maxCount: 10 },
    { name: 'documents', maxCount: 10 }
]), accommodationController.createAccommodationForStep);

/***************************/
/****GESTION ACTIVITIES*****/
/***************************/

// Créer une activité pour une étape avec fichiers (thumbnail, photos, documents)
router.post('/:idRoadtrip/steps/:idStep/activities', auth, upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'photos', maxCount: 10 },
    { name: 'documents', maxCount: 10 }
]), activityController.createActivityForStep);

// Créer une activité via un prompt en langage naturel (IA)
router.post('/:idRoadtrip/steps/:idStep/activities/natural-language', auth, activityController.createActivityFromNaturalLanguage);

/***************************/
/***TEMPS DE TRAJET & SYNC*/
/***************************/

// Recalculer les temps de trajet (synchrone)
router.patch('/:idRoadtrip/travel-time/refresh', auth, roadtripController.refreshTravelTimesForRoadtrip);

// Lancer le recalcul asynchrone des temps de trajet
router.patch('/:idRoadtrip/travel-time/refresh/async', auth, roadtripController.startTravelTimeCalculationJob);

// Vérifier le statut d'un job de calcul des temps de trajet
router.get('/:idRoadtrip/travel-time/jobs/:jobId/status', auth, roadtripController.getTravelTimeJobStatus);

// Lister les jobs de calcul d'un roadtrip
router.get('/:idRoadtrip/travel-time/jobs', auth, roadtripController.getTravelTimeJobs);

// Lancer la synchronisation asynchrone des heures des steps
router.patch('/:idRoadtrip/steps/sync/async', auth, roadtripController.startStepSynchronizationJob);

// Vérifier le statut d'un job de synchronisation des steps
router.get('/:idRoadtrip/steps/sync/jobs/:jobId/status', auth, roadtripController.getStepSyncJobStatus);

// Lister les jobs de synchronisation d'un roadtrip
router.get('/:idRoadtrip/steps/sync/jobs', auth, roadtripController.getStepSyncJobs);

export default router;