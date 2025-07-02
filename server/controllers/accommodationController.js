import Accommodation from '../models/Accommodation.js';
import Step from '../models/Step.js';
import Roadtrip from '../models/Roadtrip.js';
import File from '../models/File.js';
import { getCoordinates } from '../utils/googleMapsUtils.js';
import { uploadToGCS, deleteFromGCS } from '../utils/fileUtils.js';
import { updateStepDatesAndTravelTime } from '../utils/travelTimeUtils.js';
import { calculateNights } from '../utils/dateUtils.js';

// Méthode pour créer un nouvel hébergement pour une étape donnée
export const createAccommodationForStep = async (req, res) => {
    try {
        const roadtrip = await Roadtrip.findById(req.params.idRoadtrip);
        const step = await Step.findById(req.params.idStep);

        console.log("Roadtrip: ", roadtrip);
        console.log("Step", step);

        if (!roadtrip) {
            return res.status(404).json({ msg: 'Roadtrip not found' });
        }

        if (!step) {
            return res.status(404).json({ msg: 'Step not found' });
        }

        // Vérifier si l'utilisateur est le propriétaire du roadtrip et de l'étape
        if (roadtrip.userId.toString() !== req.user.id || step.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        // Vérifier si le type de l'étape est 'Stop' et retourner une erreur si des accommodations existent
        if (step.type === 'Stop') {
            return res.status(400).json({ msg: "Erreur lors de la création du Step : un step de type 'Stop' ne peut pas avoir d'hébergements" });
        }

        // Extraire les données JSON du champ 'data' si elles existent
        let data = {};
        if (req.body.data) {
            try {
                data = JSON.parse(req.body.data);
            } catch (error) {
                return res.status(400).json({ msg: 'Invalid JSON in data field' });
            }
        } else {
            // Si 'data' n'est pas présent, utiliser les champs individuels
            data = req.body;
        }

        console.log("Created Data: ", data);

        // Obtenir les coordonnées géographiques à partir de l'adresse
        let coordinates = {};
        if (data.address) {
            try {
                coordinates = await getCoordinates(data.address);
            } catch (error) {
                console.error('Error getting coordinates:', error);
            }
        }

        // Calculer automatiquement le nombre de nuits si les dates sont fournies
        let calculatedNights = data.nights || 0;
        if (data.arrivalDateTime && data.departureDateTime) {
            calculatedNights = calculateNights(data.arrivalDateTime, data.departureDateTime);
            console.log(`🏨 Calcul automatique des nuits: ${calculatedNights} nuits entre ${data.arrivalDateTime} et ${data.departureDateTime}`);
        }

        const accommodation = new Accommodation({
            active: data.active,
            name: data.name,
            address: data.address,
            latitude: coordinates.lat,
            longitude: coordinates.lng,
            website: data.website,
            phone: data.phone,
            email: data.email,
            arrivalDateTime: data.arrivalDateTime,
            departureDateTime: data.departureDateTime,
            confirmationDateTime: data.confirmationDateTime,
            reservationNumber: data.reservationNumber,
            nights: calculatedNights,
            price: data.price,
            currency: data.currency,
            notes: data.notes,
            stepId: req.params.idStep,
            userId: req.user.id
        });

        // Télécharger les nouveaux fichiers
        if (req.files) {
            if (req.files.thumbnail) {
                console.log('Uploading thumbnail...');
                const url = await uploadToGCS(req.files.thumbnail[0], accommodation._id);
                const file = new File({ url, type: 'thumbnail' });
                await file.save();
                accommodation.thumbnail = file._id;
            }
            if (req.files.photos && req.files.photos.length > 0) {
                console.log('Uploading photos...');
                const photos = await Promise.all(req.files.photos.map(async (photo) => {
                    const url = await uploadToGCS(photo, accommodation._id);
                    const file = new File({ url, type: 'photo' });
                    await file.save();
                    return file._id;
                }));
                accommodation.photos.push(...photos);
                console.log('Updated accommodation photos:', accommodation.photos);
            }
            if (req.files.documents && req.files.documents.length > 0) {
                console.log('Uploading documents...');
                const documents = await Promise.all(req.files.documents.map(async (document) => {
                    const url = await uploadToGCS(document, accommodation._id);
                    const file = new File({ url, type: 'document' });
                    await file.save();
                    return file._id;
                }));
                accommodation.documents.push(...documents);
                console.log('Updated accommodation documents:', accommodation.documents);
            }
        }

        // Ajouter l'hébergement à la liste des hébergements de l'étape
        step.accommodations.push(accommodation._id);
        await step.save();

        await accommodation.save();

        // Réactualiser le temps de trajet pour l'étape mise à jour
        await updateStepDatesAndTravelTime(accommodation.stepId);

        res.status(201).json(accommodation);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Méthode pour mettre à jour un hébergement
export const updateAccommodation = async (req, res) => {
    try {
        const accommodation = await Accommodation.findById(req.params.idAccommodation);

        if (!accommodation) {
            return res.status(404).json({ msg: 'Accommodation not found' });
        }

        // Vérifier si l'utilisateur est le propriétaire de l'hébergement
        if (accommodation.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        // Extraire les données JSON du champ 'data' si elles existent
        let data = {};
        if (req.body.data) {
            try {
                data = JSON.parse(req.body.data);
            } catch (error) {
                return res.status(400).json({ msg: 'Invalid JSON in data field' });
            }
        } else {
            // Si 'data' n'est pas présent, utiliser les champs individuels
            data = req.body;
        }

        console.log("Updated Data: ", data);

        // Obtenir les coordonnées géographiques à partir de l'adresse
        let coordinates = {};
        if (data.address) {
            try {
                coordinates = await getCoordinates(data.address);
                accommodation.latitude = coordinates.lat;
                accommodation.longitude = coordinates.lng;
            } catch (error) {
                console.error('Error getting coordinates:', error);
            }
        }

        // Mettre à jour les champs de l'hébergement
        if (data.active !== undefined) {
            accommodation.active = data.active;
        }
        accommodation.name = data.name || accommodation.name; //Obligatoire
        accommodation.address = data.address || accommodation.address; //Obligatoire
        accommodation.website = data.website || accommodation.website;
        accommodation.phone = data.phone || accommodation.phone;
        accommodation.email = data.email || accommodation.email;
        accommodation.arrivalDateTime = data.arrivalDateTime || accommodation.arrivalDateTime; //Obligatoire
        accommodation.departureDateTime = data.departureDateTime || accommodation.departureDateTime; //Obligatoire
        accommodation.confirmationDateTime = data.confirmationDateTime || accommodation.confirmationDateTime;
        accommodation.reservationNumber = data.reservationNumber || accommodation.reservationNumber;
        
        // Calculer automatiquement le nombre de nuits si les dates sont modifiées
        if (data.arrivalDateTime || data.departureDateTime) {
            const calculatedNights = calculateNights(accommodation.arrivalDateTime, accommodation.departureDateTime);
            console.log(`🏨 Recalcul automatique des nuits: ${calculatedNights} nuits entre ${accommodation.arrivalDateTime} et ${accommodation.departureDateTime}`);
            accommodation.nights = calculatedNights;
        } else {
            accommodation.nights = data.nights || accommodation.nights;
        }
        
        accommodation.price = data.price || accommodation.price;
        accommodation.currency = data.currency || accommodation.currency;
        accommodation.notes = data.notes || accommodation.notes;

        console.log("Accommodation: ", accommodation);

        // Gérer les suppressions différées
        if (data.existingFiles) {
            console.log('Processing existing files:', data.existingFiles);
            const existingFiles = data.existingFiles;
            for (const file of existingFiles) {
                console.log('Processing file:', file);
                if (file.isDeleted) {
                    console.log('Deleting file:', file.fileId);
                    const fileId = new mongoose.Types.ObjectId(file.fileId);
                    const fileToDelete = await File.findById(fileId);
                    if (fileToDelete) {
                        console.log('File found, deleting from GCS and database:', fileToDelete.url);
                        await deleteFromGCS(fileToDelete.url);
                        await fileToDelete.deleteOne();
                        accommodation.photos = accommodation.photos.filter(f => f.toString() !== fileId.toString());
                        accommodation.documents = accommodation.documents.filter(f => f.toString() !== fileId.toString());
                        if (accommodation.thumbnail && accommodation.thumbnail.toString() === fileId.toString()) {
                            accommodation.thumbnail = null;
                        }
                    } else {
                        console.log('File not found:', file.fileId);
                    }
                }
            }
        }

        // Télécharger les nouveaux fichiers
        if (req.files) {
            if (req.files.thumbnail) {
                console.log('Uploading thumbnail...');
                // Supprimer l'ancienne image thumbnail si elle existe
                if (accommodation.thumbnail) {
                    const oldThumbnail = await File.findById(accommodation.thumbnail);
                    if (oldThumbnail) {
                        await deleteFromGCS(oldThumbnail.url);
                        await oldThumbnail.deleteOne();
                    }
                }
                const url = await uploadToGCS(req.files.thumbnail[0], accommodation._id);
                const file = new File({ url, type: 'thumbnail' });
                await file.save();
                accommodation.thumbnail = file._id;
            }
            if (req.files.photos && req.files.photos.length > 0) {
                console.log('Uploading photos...');
                const photos = await Promise.all(req.files.photos.map(async (photo) => {
                    const url = await uploadToGCS(photo, accommodation._id);
                    const file = new File({ url, type: 'photo' });
                    await file.save();
                    return file._id;
                }));
                accommodation.photos.push(...photos);
                console.log('Updated accommodation photos:', accommodation.photos);
            }
            if (req.files.documents && req.files.documents.length > 0) {
                console.log('Uploading documents...');
                const documents = await Promise.all(req.files.documents.map(async (document) => {
                    const url = await uploadToGCS(document, accommodation._id);
                    const file = new File({ url, type: 'document' });
                    await file.save();
                    return file._id;
                }));
                accommodation.documents.push(...documents);
                console.log('Updated accommodation documents:', accommodation.documents);
            }
        }

        console.log("Accommodation after update: ", accommodation);

        await accommodation.save();

        // Réactualiser le temps de trajet pour l'étape mise à jour
        await updateStepDatesAndTravelTime(accommodation.stepId);

        res.json(accommodation);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Méthode pour obtenir les informations d'un hébergement
export const getAccommodationById = async (req, res) => {
    try {
        const accommodation = await Accommodation.findById(req.params.idAccommodation)
            .populate('documents')
            .populate('photos')
            .populate('thumbnail');

        if (!accommodation) {
            return res.status(404).json({ msg: 'Hébergement non trouvé !' });
        }

        // Vérifier si l'utilisateur est le propriétaire de l'hébergement
        if (accommodation.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        res.json(accommodation);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Méthode pour supprimer un hébergement
export const deleteAccommodation = async (req, res) => {
    try {
        const accommodation = await Accommodation.findById(req.params.idAccommodation);

        // Vérifier si l'hébergement existe
        if (!accommodation) {
            return res.status(404).json({ msg: 'Hébergement non trouvé !' });
        }

        // Vérifier si l'utilisateur est le propriétaire de l'hébergement
        if (accommodation.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        // Supprimer l'hébergement de la liste des hébergements de l'étape
        if (accommodation.stepId) {
            const step = await Step.findById(accommodation.stepId);
            step.accommodations = step.accommodations.filter(accommodationId => accommodationId.toString() !== req.params.idAccommodation);
            await step.save();
        }

        // Supprimer les fichiers de Google Cloud Storage
        if (accommodation.thumbnail) {
            const thumbnailFile = await File.findById(accommodation.thumbnail);
            if (thumbnailFile) {
                await deleteFromGCS(thumbnailFile.url);
                await thumbnailFile.deleteOne();
            }
        }

        if (accommodation.photos && accommodation.photos.length > 0) {
            await Promise.all(accommodation.photos.map(async (photoId) => {
                const photoFile = await File.findById(photoId);
                if (photoFile) {
                    await deleteFromGCS(photoFile.url);
                    await photoFile.deleteOne();
                }
            })
            );
        }

        if (accommodation.documents && accommodation.documents.length > 0) {
            await Promise.all(accommodation.documents.map(async (documentId) => {
                const documentFile = await File.findById(documentId);
                if (documentFile) {
                    await deleteFromGCS(documentFile.url);
                    await documentFile.deleteOne();
                }
            })
            );
        }

        // Supprimer l'hébergement
        await Accommodation.deleteOne({ _id: req.params.idAccommodation });

        // Réactualiser le temps de trajet pour l'étape mise à jour
        await updateStepDatesAndTravelTime(accommodation.stepId);

        res.json({ msg: 'Accommodation removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Méthode pour obtenir les documents d'un hébergement
export const getDocumentsFromAccommodation = async (req, res) => {
    try {
        const accommodation = await Accommodation.findById(req.params.idAccommodation).populate('documents');

        if (!accommodation) {
            return res.status(404).json({ msg: 'Accommodation not found' });
        }

        // Vérifier si l'utilisateur est le propriétaire de l'hébergement
        if (accommodation.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        res.json(accommodation.documents);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Méthode pour ajouter des documents à un hébergement
export const addDocumentsToAccommodation = async (req, res) => {
    try {
        const accommodation = await Accommodation.findById(req.params.idAccommodation);

        if (!accommodation) {
            return res.status(404).json({ msg: 'Accommodation not found' });
        }

        // Vérifier si l'utilisateur est le propriétaire de l'hébergement
        if (accommodation.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        if (req.files && req.files.documents && req.files.documents.length > 0) {
            console.log('Uploading documents...');
            const documents = await Promise.all(req.files.documents.map(async (document) => {
                const name = document.originalname;
                const url = await uploadToGCS(document, accommodation._id);
                const file = new File({ name, url, type: 'document' });
                await file.save();
                return file._id;
            }));
            accommodation.documents.push(...documents);
            console.log('Updated accommodation documents:', accommodation.documents);
        }

        await accommodation.save();

        // Peupler les documents dans l'hébergement avant de renvoyer la réponse
        await accommodation.populate({
            path: 'documents',
            model: 'File'
        });

        res.json(accommodation);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Méthode pour supprimer un document d'un hébergement
export const deleteDocumentFromAccommodation = async (req, res) => {
    try {
        const accommodation = await Accommodation.findById(req.params.idAccommodation);

        if (!accommodation) {
            return res.status(404).json({ msg: 'Accommodation not found' });
        }

        // Vérifier si l'utilisateur est le propriétaire de l'hébergement
        if (accommodation.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        const documentId = req.params.idDocument;

        // Supprimer le document de Google Cloud Storage
        const documentFile = await File.findById(documentId);
        if (documentFile) {
            await deleteFromGCS(documentFile.url);
            await documentFile.deleteOne();
        }

        // Supprimer le document de la liste des documents de l'hébergement
        accommodation.documents = accommodation.documents.filter(document => document.toString() !== documentId);
        await accommodation.save();

        // Peupler les documents dans l'hébergement avant de renvoyer la réponse
        await accommodation.populate({
            path: 'documents',
            model: 'File'
        });

        res.json(accommodation);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Méthode pour obtenir les photos d'un hébergement
export const getPhotosFromAccommodation = async (req, res) => {
    try {
        const accommodation = await Accommodation.findById(req.params.idAccommodation).populate('photos');

        if (!accommodation) {
            return res.status(404).json({ msg: 'Accommodation not found' });
        }

        // Vérifier si l'utilisateur est le propriétaire de l'hébergement
        if (accommodation.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        res.json(accommodation.photos);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Méthode pour ajouter des photos à un hébergement
export const addPhotosToAccommodation = async (req, res) => {
    try {
        const accommodation = await Accommodation.findById(req.params.idAccommodation);

        if (!accommodation) {
            return res.status(404).json({ msg: 'Accommodation not found' });
        }

        // Vérifier si l'utilisateur est le propriétaire de l'hébergement
        if (accommodation.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        if (req.files && req.files.photos && req.files.photos.length > 0) {
            console.log('Uploading photos...');
            const photos = await Promise.all(req.files.photos.map(async (photo) => {
                const name = photo.originalname;
                const url = await uploadToGCS(photo, accommodation._id);
                const file = new File({ name, url, type: 'photo' });
                await file.save();
                return file._id;
            }));
            accommodation.photos.push(...photos);
            console.log('Updated accommodation photos:', accommodation.photos);
        }

        await accommodation.save();

        // Peupler les photos dans l'hébergement avant de renvoyer la réponse
        await accommodation.populate({
            path: 'photos',
            model: 'File'
        });

        res.status(201).json(accommodation.photos);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Méthode pour supprimer une photo d'un hébergement
export const deletePhotoFromAccommodation = async (req, res) => {
    try {
        const accommodation = await Accommodation.findById(req.params.idAccommodation);

        if (!accommodation) {
            return res.status(404).json({ msg: 'Accommodation not found' });
        }

        // Vérifier si l'utilisateur est le propriétaire de l'hébergement
        if (accommodation.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        const photoId = req.params.idPhoto;

        // Supprimer la photo de Google Cloud Storage
        const photoFile = await File.findById(photoId);
        if (photoFile) {
            await deleteFromGCS(photoFile.url);
            await photoFile.deleteOne();
        }

        // Supprimer la photo de la liste des photos de l'hébergement
        accommodation.photos = accommodation.photos.filter(photo => photo.toString() !== photoId.toString());
        await accommodation.save();

        // Peupler les photos dans l'hébergement avant de renvoyer la réponse
        await accommodation.populate({
            path: 'photos',
            model: 'File'
        });

        res.json(accommodation);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};
