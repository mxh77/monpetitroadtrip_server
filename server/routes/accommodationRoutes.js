import express from 'express';
import multer from 'multer';
import { auth } from '../middleware/auth.js';
import * as accommodationController from '../controllers/accommodationController.js';

const router = express.Router();

// Configuration de multer pour gérer les uploads de fichiers
const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage });

/********METHOD PUT ********/
//route pour modifier un hébergement avec une vignette, des photos ou des documents
router.put('/:idAccommodation', auth, upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'photos', maxCount: 10 },
    { name: 'documents', maxCount: 10 }
]), accommodationController.updateAccommodation);

/********METHOD PATCH********/
// Route protégée pour ajouter un fichier à l'accommodation
router.patch('/:idAccommodation/documents', auth, upload.fields([
    { name: 'documents', maxCount: 10 }
]), accommodationController.addDocumentsToAccommodation);

/********METHOD GET********/
// Route protégée pour obtenir les informations d'un hébergement
router.get('/:idAccommodation', auth, accommodationController.getAccommodationById);

//Route protégée pour obtenir les documents d'un hébergement
router.get('/:idAccommodation/documents', auth, accommodationController.getDocumentsFromAccommodation); 

/********METHOD DELETE ********/
// Route protégée pour supprimer un hébergement
router.delete('/:idAccommodation', auth, accommodationController.deleteAccommodation);

// Route protégée pour supprimer un document d'un hébergement
router.delete('/:idAccommodation/documents/:idDocument', auth, accommodationController.deleteDocumentFromAccommodation);

export default router;