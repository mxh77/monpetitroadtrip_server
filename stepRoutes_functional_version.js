import express from 'express';
import multer from 'multer';
import { auth } from '../middleware/auth.js';
import * as stepController from '../controllers/stepController.js';

const router = express.Router();

// Configuration de multer pour gérer les uploads de fichiers
const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage });

// ORGANISATION PAR MODULES FONCTIONNELS (Version Alternative)
// Ce fichier présente les routes groupées par fonctionnalité métier

/***************************/
/*******GESTION STEP********/
/***************************/

// Obtenir les informations d'un step
router.get('/:idStep', auth, stepController.getStepById);

// Mettre à jour un step avec fichiers (thumbnail, photos, documents)
router.put('/:idStep', auth, upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'photos', maxCount: 10 },
    { name: 'documents', maxCount: 10 }
]), stepController.updateStep);

// Supprimer un step
router.delete('/:idStep', auth, stepController.deleteStep);

/***************************/
/******RÉCITS & STORIES*****/
/***************************/

// Générer le récit chronologique d'un step
router.get('/:idStep/story', auth, stepController.generateStepStory);

// Générer le récit avec photos (force l'analyse des images)
router.get('/:idStep/story/with-photos', auth, stepController.generateStepStoryWithPhotos);

// Lancer la génération asynchrone du récit d'un step
router.post('/:idStep/story/async', auth, stepController.generateStepStoryAsync);

// Consulter le statut d'un job de génération de récit
router.get('/:idStep/story/:jobId/status', auth, stepController.getStepStoryJobStatus);

// Régénérer explicitement le récit d'un step
router.patch('/:idStep/story/regenerate', auth, stepController.regenerateStepStory);

/***************************/
/****RANDONNÉES & TRAILS****/
/***************************/

// Obtenir les randonnées d'un step via Algolia
router.get('/:idStep/hikes-algolia', auth, stepController.getHikesFromAlgolia);

// Obtenir les suggestions de randonnées pour un step
router.get('/:idStep/hikes-suggestion', auth, stepController.getHikeSuggestions);

// Générer une synthèse des avis pour un trail
router.get('/trails/:idTrail/reviews/summary', auth, stepController.generateReviewSummary);

/***************************/
/****TEMPS DE TRAJET*******/
/***************************/

// Calculer le temps de trajet d'un step par rapport au step précédent
router.patch('/:idStep/refresh-travel-time', auth, stepController.refreshTravelTimeForStepWrapper);

export default router;
