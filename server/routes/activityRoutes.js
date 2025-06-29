import express from 'express';
import multer from 'multer';
import { auth } from '../middleware/auth.js';
import * as activityController from '../controllers/activityController.js';

const router = express.Router();

// Configuration de multer pour gérer les uploads de fichiers
const multerStorage = multer.memoryStorage();
const upload = multer({ 
    storage: multerStorage,
    limits: {
        fileSize: 20 * 1024 * 1024, // 20MB par fichier (augmenté pour les photos haute résolution)
        files: 10 // Maximum 10 fichiers
    },
    fileFilter: (req, file, cb) => {
        // Autoriser les images et documents
        const allowedMimes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif',
            'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Type de fichier non autorisé: ${file.mimetype}`), false);
        }
    }
});

/********METHOD PUT ********/
//route pour modifier une activité avec une vignette, des photos ou des documents
router.put('/:idActivity', auth, upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'photos', maxCount: 10 },
    { name: 'documents', maxCount: 10 }
]), activityController.updateActivity);

/********METHOD PATCH********/
// Route protégée pour modifier les dates d'une activité
router.patch('/:idActivity/dates', auth, activityController.updateActivityDates);

// Route protégée pour ajouter un fichier à l'activité
router.patch('/:idActivity/documents', auth, upload.fields([
    { name: 'documents', maxCount: 10 }
]), activityController.addDocumentsToActivity);

// Route protégée pour ajouter des photos à l'activité
router.patch('/:idActivity/photos', auth, upload.fields([
    { name: 'photos', maxCount: 10 }
]), activityController.addPhotosToActivity);

// Associer une activité à un résultat de recherche Algolia
router.post('/:idActivity/link/algolia', auth, activityController.linkActivityToAlgoliaResult);

/********METHOD GET********/
// Route protégée pour obtenir les informations d'une activité
router.get('/:idActivity', auth, activityController.getActivityById);

//Route protégée pour obtenir les documents d'un activité
router.get('/:idActivity/documents', auth, activityController.getDocumentsFromActivity); 

//Route protégée pour obtenir les photos d'une activité
router.get('/:idActivity/photos', auth, activityController.getPhotosFromActivity);

// Recherche automatique de randonnées Algolia pour une activité
router.get('/:idActivity/search/algolia', auth, activityController.searchAlgoliaHikesForActivity);

/********METHOD DELETE ********/
// Route protégée pour supprimer un activité
router.delete('/:idActivity', auth, activityController.deleteActivity);

// Route protégée pour supprimer un document d'un activité
router.delete('/:idActivity/documents/:idDocument', auth, activityController.deleteDocumentFromActivity);

// Route protégée pour supprimer une photo d'une activité
router.delete('/:idActivity/photos/:idPhoto', auth, activityController.deletePhotoFromActivity);


export default router;