import Roadtrip from '../models/Roadtrip.js';
import Step from '../models/Step.js';
import Accommodation from '../models/Accommodation.js';
import Activity from '../models/Activity.js';
import File from '../models/File.js';
import UserSetting from '../models/UserSetting.js';
import mongoose from 'mongoose';
import { getCoordinates, getAddressFromCoordinates } from '../utils/googleMapsUtils.js';
import { uploadToGCS, deleteFromGCS } from '../utils/fileUtils.js';
import { updateStepDatesAndTravelTime, refreshTravelTimeForStep } from '../utils/travelTimeUtils.js';
import { fetchTrailsFromAlgolia } from '../utils/scrapingUtils.js';
import { fetchTrailsFromAlgoliaAPI, fetchTrailDetails } from '../utils/hikeUtils.js';
import { genererSyntheseAvis } from '../utils/openAI/syntheseAvis.js';
import { genererRecitStep, genererRecitStepAvecPhotos } from '../utils/openAI/recitStep.js';
import { analyserPromptEtape } from '../utils/openAI/analyserPrompt.js';
import StepStoryJob from '../models/StepStoryJob.js';
import { getUserAlgoliaRadius } from '../utils/userSettingsUtils.js';

// Méthode pour créer un nouveau step pour un roadtrip donné
export const createStepForRoadtrip = async (req, res) => {
    try {
        const roadtrip = await Roadtrip.findById(req.params.idRoadtrip);

        if (!roadtrip) {
            return res.status(404).json({ msg: 'Roadtrip not found' });
        }

        // Vérifier si l'utilisateur est le propriétaire du roadtrip
        if (roadtrip.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        // Obtenir les coordonnées géographiques à partir de l'adresse
        let coordinates = {};
        if (req.body.address) {
            try {
                coordinates = await getCoordinates(req.body.address);
            } catch (error) {
                console.error('Error getting coordinates:', error);
            }
        }

        const newStep = new Step({
            type: req.body.type, // Type par défaut si non fourni
            name: req.body.name, // Nom par défaut si non fourni
            address: req.body.address, // Adresse par défaut si non fournie
            latitude: coordinates.lat,
            longitude: coordinates.lng,
            nights: req.body.nights, // Nombre de nuits par défaut si non fourni
            arrivalDateTime: req.body.arrivalDateTime, // Date et heure d'arrivée
            departureDateTime: req.body.departureDateTime, // Date et heure de départ
            notes: req.body.notes, // Notes par défaut si non fournies
            accommodations: req.body.accommodations, // Hébergements par défaut si non fournis
            activities: req.body.activities, // Activités par défaut si non fournies
            stops: req.body.stops,
            roadtripId: req.params.idRoadtrip,
            userId: req.user.id
        });

        const step = await newStep.save();

        // Réactualiser le temps de trajet pour l'étape mise à jour
        await updateStepDatesAndTravelTime(step._id);

        // Ajouter l'ID de la nouvelle étape au tableau steps du roadtrip
        roadtrip.steps.push(step);
        await roadtrip.save();

        res.json(step);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Méthode pour mettre à jour un step
export const updateStep = async (req, res) => {
    console.log('updateStep');
    try {
        const step = await Step.findById(req.params.idStep);

        if (!step) {
            return res.status(404).json({ msg: 'step not found' });
        }

        // Vérifier si l'utilisateur est le propriétaire du roadtrip de l'étape 
        const roadtrip = await Roadtrip.findById(step.roadtripId);

        if (!roadtrip) {
            return res.status(404).json({ msg: 'Roadtrip not found' });
        }
        // Vérifier si l'utilisateur est le propriétaire du roadtrip
        if (roadtrip.userId.toString() !== req.user.id) {
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
        }

        // Fusionner les données JSON et les champs directs
        const updateData = { ...data, ...req.body };

        // Mettre à jour les champs de l'étape
        if (updateData.name) step.name = updateData.name;
        if ('address' in updateData) {
            if (updateData.address) {
                step.address = updateData.address;
                // Obtenir les coordonnées géographiques à partir de l'adresse
                try {
                    const coordinates = await getCoordinates(updateData.address);
                    step.latitude = coordinates.lat;
                    step.longitude = coordinates.lng;
                } catch (error) {
                    console.error('Error getting coordinates:', error);
                }
            } else {
                step.address = '';
                step.latitude = null;
                step.longitude = null;
            }
        }
        if ('arrivalDateTime' in updateData) step.arrivalDateTime = updateData.arrivalDateTime;
        if ('departureDateTime' in updateData) step.departureDateTime = updateData.departureDateTime;
        if ('nights' in updateData) step.nights = updateData.nights;
        if ('notes' in updateData) step.notes = updateData.notes;


        // Mettre à jour les hébergements si type = 'stage'
        if (updateData.type === 'Stage') {
            if (Array.isArray(updateData.accommodations)) {
                for (const accommodation of updateData.accommodations) {
                    if (accommodation._id) {
                        // Obtenir les coordonnées géographiques à partir de l'adresse de l'hébergement
                        if (accommodation.address) {
                            try {
                                const coordinates = await getCoordinates(accommodation.address);
                                accommodation.latitude = coordinates.lat;
                                accommodation.longitude = coordinates.lng;
                            } catch (error) {
                                console.error('Error getting coordinates for accommodation:', error);
                            }
                        }
                        // Mettre à jour l'hébergement existant
                        await Accommodation.findByIdAndUpdate(accommodation._id, accommodation, { new: true, runValidators: true });
                    } else {
                        // Ajouter un nouvel hébergement
                        const newAccommodation = new Accommodation(accommodation);
                        newAccommodation.stepId = step._id;
                        newAccommodation.userId = req.user.id; // Assurez-vous que l'utilisateur est défini
                        await newAccommodation.save();
                        step.accommodations.push(newAccommodation._id);
                    }
                }
            }
        }
        // Mettre à jour les activités si type = 'stage'
        if (updateData.type === 'Stage') {
            if (Array.isArray(updateData.activities)) {
                for (const activity of updateData.activities) {
                    if (activity._id) {
                        // Obtenir les coordonnées géographiques à partir de l'adresse de l'activité
                        if (activity.address) {
                            try {
                                const coordinates = await getCoordinates(activity.address);
                                activity.latitude = coordinates.lat;
                                activity.longitude = coordinates.lng;
                            } catch (error) {
                                console.error('Error getting coordinates for activity:', error);
                            }
                        }
                        // Mettre à jour l'activité existante   
                        await Activity.findByIdAndUpdate(activity._id, activity, { new: true, runValidators: true });
                    } else {
                        // Ajouter une nouvelle activité
                        const newActivity = new Activity(activity);
                        newActivity.stepId = step._id;
                        newActivity.userId = req.user.id; // Assurez-vous que l'utilisateur est défini
                        await newActivity.save();
                        step.activities.push(newActivity._id);
                    }
                }
            }
        }

        // Gérer les suppressions différées
        if (updateData.existingFiles) {
            console.log('Processing existing files:', updateData.existingFiles);
            const existingFiles = updateData.existingFiles;
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
                        step.photos = step.photos.filter(f => f.toString() !== fileId.toString());
                        step.documents = step.documents.filter(f => f.toString() !== fileId.toString());
                        if (step.thumbnail && step.thumbnail.toString() === fileId.toString()) {
                            step.thumbnail = null;
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
                if (step.thumbnail) {
                    const oldThumbnail = await File.findById(step.thumbnail);
                    if (oldThumbnail) {
                        await deleteFromGCS(oldThumbnail.url);
                        await oldThumbnail.deleteOne();
                    }
                }
                const url = await uploadToGCS(req.files.thumbnail[0], step._id);
                const file = new File({ url, type: 'thumbnail' });
                await file.save();
                step.thumbnail = file._id;
            }
            if (req.files.photos && req.files.photos.length > 0) {
                console.log('Uploading photos...');
                const photos = await Promise.all(req.files.photos.map(async (photo) => {
                    const url = await uploadToGCS(photo, step._id);
                    const file = new File({ url, type: 'photo' });
                    await file.save();
                    return file._id;
                }));
                step.photos.push(...photos);
                console.log('Updated step photos:', step.photos);
            }
            if (req.files.documents && req.files.documents.length > 0) {
                console.log('Uploading documents...');
                const documents = await Promise.all(req.files.documents.map(async (document) => {
                    const url = await uploadToGCS(document, step._id);
                    const file = new File({ url, type: 'document' });
                    await file.save();
                    return file._id;
                }));
                step.documents.push(...documents);
                console.log('Updated step documents:', step.documents);
            }
        }

        const stepUpdated = await step.save();

        // Réactualiser le temps de trajet pour l'étape mise à jour
        await updateStepDatesAndTravelTime(stepUpdated._id);

        // Récupérer les accommodations et activities associés
        const populatedStep = await Step.findById(stepUpdated._id)
            .populate({
                path: 'accommodations',
                populate: [
                    { path: 'photos', model: 'File' },
                    { path: 'documents', model: 'File' },
                    { path: 'thumbnail', model: 'File' }
                ]
            })
            .populate({
                path: 'activities',
                populate: [
                    { path: 'photos', model: 'File' },
                    { path: 'documents', model: 'File' },
                    { path: 'thumbnail', model: 'File' }
                ]
            })
            .populate('photos')
            .populate('documents')
            .populate('thumbnail');

        res.json(populatedStep);


    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};


// Méthode pour obtenir les informations de toutes les étapes d'un roadtrip
export const getStepsByRoadtrip = async (req, res) => {
    try {
        const roadtrip = await Roadtrip.findById(req.params.idRoadtrip);

        if (!roadtrip) {
            return res.status(404).json({ msg: 'Roadtrip not found' });
        }

        // Vérifier si l'utilisateur est le propriétaire du roadtrip
        if (roadtrip.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        //récupérer les steps du roadtrip
        const steps = await Step.find({ roadtripId: req.params.idRoadtrip })
            .populate({
                path: 'accommodations',
                populate: [
                    { path: 'photos', model: 'File' },
                    { path: 'documents', model: 'File' },
                    { path: 'thumbnail', model: 'File' }
                ]
            })
            .populate({
                path: 'activities',
                populate: [
                    { path: 'photos', model: 'File' },
                    { path: 'documents', model: 'File' },
                    { path: 'thumbnail', model: 'File' }
                ]
            })
            .populate('photos')
            .populate('documents')
            .populate('thumbnail');

        res.json(steps);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Méthode pour obtenir les informations d'un step
export const getStepById = async (req, res) => {
    try {
        const step = await Step.findById(req.params.idStep)
            .populate({
                path: 'accommodations',
                populate: [
                    { path: 'photos', model: 'File' },
                    { path: 'documents', model: 'File' },
                    { path: 'thumbnail', model: 'File' }
                ]
            })
            .populate({
                path: 'activities',
                populate: [
                    { path: 'photos', model: 'File' },
                    { path: 'documents', model: 'File' },
                    { path: 'thumbnail', model: 'File' }
                ]
            })
            .populate('photos')
            .populate('documents')
            .populate('thumbnail');
        console.log("ID Step en paramètre : " + req.params.idStep);

        if (!step) {
            return res.status(404).json({ msg: 'Step not found' });
        }

        // Vérifier si l'utilisateur est le propriétaire du roadtrip de l'étape 
        const roadtrip = await Roadtrip.findById(step.roadtripId);

        if (!roadtrip) {
            return res.status(404).json({ msg: 'Roadtrip not found' });
        }

        // Vérifier si l'utilisateur est le propriétaire du roadtrip
        if (roadtrip.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        res.json(step);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Méthode pour obtenir les randonnées d'un step
export const getHikesFromAlgolia = async (req, res) => {
    try {
        const { idStep } = req.params;

        // Récupérer le step par son ID
        const step = await Step.findById(idStep);

        if (!step) {
            return res.status(404).json({ msg: 'Step not found' });
        }

        // Vérifier que le step appartient à l'utilisateur connecté
        // Il faut remonter jusqu'au roadtrip pour vérifier l'userId
        const roadtrip = await Roadtrip.findById(step.roadtripId);
        if (!roadtrip || roadtrip.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        if (!step.address) {
            return res.status(400).json({ msg: 'Step address is required to fetch hikes' });
        }

        // Récupérer le rayon de recherche personnalisé de l'utilisateur
        const radiusMeters = await getUserAlgoliaRadius(req.user.id);

        // Obtenir les coordonnées de l'adresse
        const coordinatesString = await getCoordinates(step.address);

        if (!coordinatesString) {
            return res.status(400).json({ msg: 'Unable to fetch coordinates for the given address' });
        }

        // Convertir la chaîne de coordonnées en objet { lat, lng }
        const [lat, lng] = coordinatesString.split(' ').map(Number);
        const coordinates = { lat, lng };

        console.log('Parsed Coordinates:', coordinates);
        console.log(`Using user search radius: ${radiusMeters/1000}km`);

        // Scraper les randonnées avec le rayon personnalisé
        const hikes = await fetchTrailsFromAlgolia(coordinates, radiusMeters);

        res.json({
            step: {
                id: step._id,
                name: step.name,
                address: step.address,
                coordinates,
            },
            searchParams: {
                radiusKm: radiusMeters / 1000,
                radiusMeters: radiusMeters
            },
            hikes,
        });
    } catch (error) {
        console.error('Error fetching hikes for step:', error);
        res.status(500).send('Server error');
    }
};

export const getHikeSuggestions = async (req, res) => {
    try {
        const { idStep } = req.params;

        // Récupérer le step par son ID
        const step = await Step.findById(idStep);

        if (!step) {
            return res.status(404).json({ msg: 'Step not found' });
        }

        // Vérifier que le step appartient à l'utilisateur connecté
        const roadtrip = await Roadtrip.findById(step.roadtripId);
        if (!roadtrip || roadtrip.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        if (!step.address) {
            return res.status(400).json({ msg: 'Step address is required to fetch hikes' });
        }

        // Récupérer le rayon de recherche personnalisé de l'utilisateur
        const radiusMeters = await getUserAlgoliaRadius(req.user.id);

        // Obtenir les coordonnées de l'adresse
        const coordinatesString = await getCoordinates(step.address);

        if (!coordinatesString) {
            return res.status(400).json({ msg: 'Unable to fetch coordinates for the given address' });
        }

        // Convertir la chaîne de coordonnées en objet { lat, lng }
        const [lat, lng] = coordinatesString.split(' ').map(Number);
        const coordinates = { lat, lng };

        console.log('Parsed Coordinates:', coordinates);
        console.log(`Using user search radius: ${radiusMeters/1000}km`);

        // Étape 1 : Récupérer les trails depuis l'API Algolia avec le rayon personnalisé
        console.log('Fetching trails from Algolia...');
        const trails = await fetchTrailsFromAlgoliaAPI(coordinates, radiusMeters);
        // console.log('Trails fetched:', trails);

        // Étape 2 : Récupérer les détails et avis pour chaque trail
        const detailedTrails = await Promise.all(
            trails.map(async (trail) => {
                try {

                    const trailDetails = await fetchTrailDetails(trail.ID);

                    //Pause aléatoire entre 1 et 3s
                    const randomDelay = Math.floor(Math.random() * 2000) + 1000;
                    await new Promise((resolve) => setTimeout(resolve, randomDelay));

                    // const reviews = await fetchTrailReviews(trail.ID);
                    const reviews = null

                    return {
                        id: trail.ID,
                        thumbnail: trailDetails.defaultPhotoUrl, // URL de la photo du trail
                        name: trail.name,
                        popularity: parseFloat(trail.popularity.toFixed(2)), // Arrondi à 2 décimales
                        length: Math.ceil(trail.length), // Arrondi au mètre supérieur
                        elevationGain: Math.ceil(trail.elevation_gain), // Arrondi au mètre supérieur
                        avgRating: trail.avg_rating,
                        durationMinutes: trail.duration_minutes,
                        routeType: trailDetails.routeType, // Inclure le type de route
                        description: trail.description,
                        location: trail._geoloc,
                        reviews
                    };
                } catch (error) {
                    console.error(`Error fetching details for trail ID ${trail.ID}:`, error);
                    return null;
                }
            })
        );

        console.log('Trail details:', detailedTrails);

        // Filtrer les trails valides
        const validTrails = detailedTrails.filter((trail) => trail !== null);

        res.json({
            step: {
                id: step._id,
                name: step.name,
                address: step.address,
                coordinates
            },
            hikes: validTrails
        });
    } catch (error) {
        console.error('Error fetching hike suggestions:', error);
        res.status(500).send('Server error');
    }
};

export const generateReviewSummary = async (req, res) => {
    try {
        const { idTrail } = req.params;
        const { maxReviews } = req.query; // Nombre maximum d'avis à prendre en compte (optionnel)

        // Récupérer les avis du trail
        const reviews = await fetchTrailReviews(idTrail, maxReviews || 5);

        if (!reviews || reviews.length === 0) {
            return res.status(404).json({ msg: 'No reviews found for this trail' });
        }

        // Générer une synthèse des avis
        const reviewSummary = await genererSyntheseAvis(reviews);

        res.json({
            trailId: idTrail,
            reviewSummary,
            reviewsCount: reviews.length,
        });
    } catch (error) {
        console.error('Error generating review summary:', error);
        res.status(500).json({ msg: 'Failed to generate review summary' });
    }
};

//Méthode pour supprimer une étape
export const deleteStep = async (req, res) => {
    try {
        const step = await Step.findById(req.params.idStep);

        if (!step) {
            return res.status(404).json({ msg: 'Step not found' });
        }

        // Vérifier si l'utilisateur est le propriétaire du roadtrip de l'étape 
        const roadtrip = await Roadtrip.findById(step.roadtripId);

        if (!roadtrip) {
            return res.status(404).json({ msg: 'Roadtrip not found' });
        }

        // Vérifier si l'utilisateur est le propriétaire du roadtrip
        if (roadtrip.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        // Supprimer le step de la liste des étapes du roadtrip
        roadtrip.steps = roadtrip.steps.filter(stepId => stepId.toString() !== req.params.idStep);
        await roadtrip.save();

        //Supprimer les fichiers associés
        if (step.thumbnail) {
            const thumbnail = await File.findById(step.thumbnail);
            if (thumbnail) {
                await deleteFromGCS(thumbnail.url);
                await thumbnail.deleteOne();
            }
        }

        if (step.photos && step.photos.length > 0) {
            for (const photoId of step.photos) {
                const photo = await File.findById(photoId);
                if (photo) {
                    await deleteFromGCS(photo.url);
                    await photo.deleteOne();
                }
            }
        }

        if (step.documents && step.documents.length > 0) {
            for (const documentId of step.documents) {
                const document = await File.findById(documentId);
                if (document) {
                    await deleteFromGCS(document.url);
                    await document.deleteOne();
                }
            }
        }

        // Supprimer les hébergements associés
        if (step.accommodations && step.accommodations.length > 0) {
            for (const accommodationId of step.accommodations) {
                const accommodation = await Accommodation.findById(accommodationId);
                if (accommodation) {
                    await accommodation.deleteOne();
                }
            }
        }

        // Supprimer les activités associées    
        if (step.activities && step.activities.length > 0) {
            for (const activityId of step.activities) {
                const activity = await Activity.findById(activityId);
                if (activity) {
                    await activity.deleteOne();
                }
            }
        }

        // Supprimer le step
        await Step.deleteOne({ _id: req.params.idStep });

        res.json({ msg: 'Step removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Wrapper pour appeler refreshTravelTimeForStep avec req et res
export const refreshTravelTimeForStepWrapper = async (req, res) => {
    console.log('Refreshing travel time for step:', req.params.idStep);

    try {
        const step = await Step.findById(req.params.idStep);

        if (!step) {
            return res.status(404).json({ msg: 'step not found' });
        }

        // Vérifier si l'utilisateur est le propriétaire du roadtrip de l'étape
        const roadtrip = await Roadtrip.findById(step.roadtripId);

        if (!roadtrip) {
            return res.status(404).json({ msg: 'Roadtrip not found' });
        }

        // Vérifier si l'utilisateur est le propriétaire du roadtrip
        if (roadtrip.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        const updatedStep = await refreshTravelTimeForStep(step);
        res.json(updatedStep);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Méthode pour générer le récit chronologique d'un step
export const generateStepStory = async (req, res) => {
    try {
        const { idStep } = req.params;

        // Récupérer le step
        const step = await Step.findById(idStep);

        if (!step) {
            return res.status(404).json({ msg: 'Step not found' });
        }

        // Vérifier si l'utilisateur est autorisé à accéder à ce step
        if (step.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        // Récupérer toutes les accommodations liées à ce step
        console.log('Searching accommodations with stepId:', idStep);
        const accommodations = await Accommodation.find({ 
            stepId: new mongoose.Types.ObjectId(idStep), 
            active: true 
        });

        // Récupérer toutes les activités liées à ce step
        console.log('Searching activities with stepId:', idStep);
        
        // D'abord, récupérons toutes les activités pour debug
        const allActivities = await Activity.find({ stepId: new mongoose.Types.ObjectId(idStep) });
        console.log(`Debug - Total activities for step ${idStep}:`, allActivities.length);
        console.log('Activities details:', allActivities.map(act => ({ 
            id: act._id, 
            name: act.name, 
            active: act.active, 
            activeType: typeof act.active 
        })));

        // Filtrer les activités actives côté JavaScript pour avoir plus de contrôle
        const activities = allActivities.filter(act => {
            // Gérer différents types de valeurs pour 'active'
            if (act.active === true || act.active === 'true' || act.active === 1) {
                return true;
            }
            // Si active n'est pas défini, considérer comme actif par défaut
            if (act.active === undefined || act.active === null) {
                return true;
            }
            return false;
        });

        console.log('Activities after filtering:', activities.length);

        console.log(`Step ${idStep}: Found ${accommodations.length} accommodations and ${activities.length} activities`);
        console.log('Activities found:', activities.map(act => ({ id: act._id, name: act.name, startDateTime: act.startDateTime })));

        // Tri côté JavaScript pour gérer les valeurs nulles
        accommodations.sort((a, b) => {
            const dateA = a.arrivalDateTime ? new Date(a.arrivalDateTime) : new Date(0);
            const dateB = b.arrivalDateTime ? new Date(b.arrivalDateTime) : new Date(0);
            return dateA - dateB;
        });

        activities.sort((a, b) => {
            const dateA = a.startDateTime ? new Date(a.startDateTime) : new Date(0);
            const dateB = b.startDateTime ? new Date(b.startDateTime) : new Date(0);
            return dateA - dateB;
        });

        // Préparer les données pour le LLM
        const stepData = {
            step: {
                name: step.name,
                type: step.type,
                address: step.address,
                arrivalDateTime: step.arrivalDateTime,
                departureDateTime: step.departureDateTime,
                distancePreviousStep: step.distancePreviousStep,
                travelTimePreviousStep: step.travelTimePreviousStep,
                notes: step.notes
            },
            accommodations: accommodations.map(acc => ({
                name: acc.name,
                address: acc.address,
                arrivalDateTime: acc.arrivalDateTime,
                departureDateTime: acc.departureDateTime,
                nights: acc.nights,
                price: acc.price,
                currency: acc.currency,
                reservationNumber: acc.reservationNumber,
                confirmationDateTime: acc.confirmationDateTime,
                notes: acc.notes
            })),
            activities: activities.map(act => ({
                name: act.name,
                type: act.type,
                address: act.address,
                startDateTime: act.startDateTime,
                endDateTime: act.endDateTime,
                duration: act.duration,
                typeDuration: act.typeDuration,
                price: act.price,
                currency: act.currency,
                reservationNumber: act.reservationNumber,
                trailDistance: act.trailDistance,
                trailElevation: act.trailElevation,
                trailType: act.trailType,
                notes: act.notes
            }))
        };

        // Si un récit existe déjà, le retourner sans regénération
        if (step.story && step.story.length > 0) {
            return res.json({
                stepId: idStep,
                stepName: step.name,
                story: step.story,
                generatedAt: step.updatedAt || step.createdAt,
                fromCache: true
            });
        }

        // Récupérer le systemPrompt personnalisé et les préférences photos
        const userSettings = await UserSetting.findOne({ userId: req.user.id });
        const systemPrompt = userSettings?.systemPrompt;
        const enablePhotosInStories = userSettings?.enablePhotosInStories !== false; // Par défaut true

        // Collecter les photos des hébergements et activités si l'utilisateur l'a activé
        let photos = [];
        if (enablePhotosInStories) {
            photos = await collectStepPhotos(accommodations, activities);
            console.log(`📸 ${photos.length} photos collectées pour enrichir le récit (activé par l'utilisateur)`);
        } else {
            console.log(`📸 Analyse des photos désactivée dans les paramètres utilisateur`);
        }

        // Générer le récit avec OpenAI (avec ou sans photos selon les préférences)
        let result;
        if (enablePhotosInStories && photos.length > 0) {
            // Utiliser la version avec photos (GPT-4 Vision)
            result = await genererRecitStepAvecPhotos(stepData, systemPrompt, photos);
        } else {
            // Utiliser la version texte standard
            result = await genererRecitStep(stepData, systemPrompt);
        }

        // Sauvegarder le récit dans le step
        step.story = result.story;
        await step.save();

        res.json({
            stepId: idStep,
            stepName: step.name,
            story: result.story,
            prompt: result.prompt,
            generatedAt: new Date().toISOString(),
            dataUsed: {
                stepInfo: !!step.name || !!step.address || !!step.notes,
                accommodationsCount: accommodations.length,
                activitiesCount: activities.length,
                photosCount: photos.length
            },
            model: result.model || 'gpt-4o-mini',
            photosAnalyzed: result.photosAnalyzed || 0,
            fromCache: false
        });

    } catch (error) {
        console.error('Error generating step story:', error);
        
        if (error.message.includes('OpenAI')) {
            return res.status(503).json({ 
                msg: 'Service temporarily unavailable', 
                error: 'Unable to generate story due to AI service error' 
            });
        }
        
        res.status(500).json({ 
            msg: 'Server error', 
            error: error.message 
        });
    }
};

// Méthode pour régénérer explicitement le récit d'un step
export const regenerateStepStory = async (req, res) => {
    try {
        const { idStep } = req.params;
        const step = await Step.findById(idStep);
        if (!step) {
            return res.status(404).json({ msg: 'Step not found' });
        }
        if (step.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }
        // Récupérer accommodations et activités comme dans generateStepStory
        const accommodations = await Accommodation.find({ stepId: new mongoose.Types.ObjectId(idStep), active: true });
        const allActivities = await Activity.find({ stepId: new mongoose.Types.ObjectId(idStep) });
        const activities = allActivities.filter(act => {
            if (act.active === true || act.active === 'true' || act.active === 1) return true;
            if (act.active === undefined || act.active === null) return true;
            return false;
        });
        accommodations.sort((a, b) => {
            const dateA = a.arrivalDateTime ? new Date(a.arrivalDateTime) : new Date(0);
            const dateB = b.arrivalDateTime ? new Date(b.arrivalDateTime) : new Date(0);
            return dateA - dateB;
        });
        activities.sort((a, b) => {
            const dateA = a.startDateTime ? new Date(a.startDateTime) : new Date(0);
            const dateB = b.startDateTime ? new Date(b.startDateTime) : new Date(0);
            return dateA - dateB;
        });
        const stepData = {
            step: {
                name: step.name,
                type: step.type,
                address: step.address,
                arrivalDateTime: step.arrivalDateTime,
                departureDateTime: step.departureDateTime,
                distancePreviousStep: step.distancePreviousStep,
                travelTimePreviousStep: step.travelTimePreviousStep,
                notes: step.notes
            },
            accommodations: accommodations.map(acc => ({
                name: acc.name,
                address: acc.address,
                arrivalDateTime: acc.arrivalDateTime,
                departureDateTime: acc.departureDateTime,
                nights: acc.nights,
                price: acc.price,
                currency: acc.currency,
                reservationNumber: acc.reservationNumber,
                confirmationDateTime: acc.confirmationDateTime,
                notes: acc.notes
            })),
            activities: activities.map(act => ({
                name: act.name,
                type: act.type,
                address: act.address,
                startDateTime: act.startDateTime,
                endDateTime: act.endDateTime,
                duration: act.duration,
                typeDuration: act.typeDuration,
                price: act.price,
                currency: act.currency,
                reservationNumber: act.reservationNumber,
                trailDistance: act.trailDistance,
                trailElevation: act.trailElevation,
                trailType: act.trailType,
                notes: act.notes
            }))
        };
        // Récupérer le systemPrompt personnalisé et les préférences photos
        const userSettings = await UserSetting.findOne({ userId: req.user.id });
        const systemPrompt = userSettings?.systemPrompt;
        const enablePhotosInStories = userSettings?.enablePhotosInStories !== false; // Par défaut true
        
        // Collecter les photos des hébergements et activités si l'utilisateur l'a activé
        let photos = [];
        if (enablePhotosInStories) {
            photos = await collectStepPhotos(accommodations, activities);
            console.log(`📸 ${photos.length} photos collectées pour régénérer le récit (activé par l'utilisateur)`);
        } else {
            console.log(`📸 Analyse des photos désactivée dans les paramètres utilisateur`);
        }
        
        // Générer le récit avec OpenAI (avec ou sans photos selon les préférences)
        let result;
        if (enablePhotosInStories && photos.length > 0) {
            // Utiliser la version avec photos (GPT-4 Vision)
            result = await genererRecitStepAvecPhotos(stepData, systemPrompt, photos);
        } else {
            // Utiliser la version texte standard
            result = await genererRecitStep(stepData, systemPrompt);
        }
        
        step.story = result.story;
        await step.save();
        res.json({
            stepId: idStep,
            stepName: step.name,
            story: result.story,
            prompt: result.prompt,
            generatedAt: new Date().toISOString(),
            dataUsed: {
                stepInfo: !!step.name || !!step.address || !!step.notes,
                accommodationsCount: accommodations.length,
                activitiesCount: activities.length,
                photosCount: photos.length
            },
            model: result.model || 'gpt-4o-mini',
            photosAnalyzed: result.photosAnalyzed || 0,
            fromCache: false,
            regenerated: true
        });
    } catch (error) {
        console.error('Error regenerating step story:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};

// Endpoint asynchrone pour lancer la génération du récit d'un step
export const generateStepStoryAsync = async (req, res) => {
    try {
        const { idStep } = req.params;
        const step = await Step.findById(idStep);
        if (!step) {
            return res.status(404).json({ msg: 'Step not found' });
        }
        if (step.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }
        // Créer un job en base
        const job = await StepStoryJob.create({ stepId: idStep, status: 'pending' });
        // Lancer le worker simple (setImmediate)
        setImmediate(async () => {
            try {
                job.status = 'processing';
                await job.save();
                // Reprendre la logique de generateStepStory (avec population des photos pour collectStepPhotos)
                const accommodations = await Accommodation.find({ stepId: new mongoose.Types.ObjectId(idStep), active: true })
                    .populate('photos').populate('thumbnail');
                const allActivities = await Activity.find({ stepId: new mongoose.Types.ObjectId(idStep) })
                    .populate('photos').populate('thumbnail');
                const activities = allActivities.filter(act => {
                    if (act.active === true || act.active === 'true' || act.active === 1) return true;
                    if (act.active === undefined || act.active === null) return true;
                    return false;
                });
                accommodations.sort((a, b) => {
                    const dateA = a.arrivalDateTime ? new Date(a.arrivalDateTime) : new Date(0);
                    const dateB = b.arrivalDateTime ? new Date(b.arrivalDateTime) : new Date(0);
                    return dateA - dateB;
                });
                activities.sort((a, b) => {
                    const dateA = a.startDateTime ? new Date(a.startDateTime) : new Date(0);
                    const dateB = b.startDateTime ? new Date(b.startDateTime) : new Date(0);
                    return dateA - dateB;
                });
                const stepData = {
                    step: {
                        name: step.name,
                        type: step.type,
                        address: step.address,
                        arrivalDateTime: step.arrivalDateTime,
                        departureDateTime: step.departureDateTime,
                        distancePreviousStep: step.distancePreviousStep,
                        travelTimePreviousStep: step.travelTimePreviousStep,
                        notes: step.notes
                    },
                    accommodations: accommodations.map(acc => ({
                        name: acc.name,
                        address: acc.address,
                        arrivalDateTime: acc.arrivalDateTime,
                        departureDateTime: acc.departureDateTime,
                        nights: acc.nights,
                        price: acc.price,
                        currency: acc.currency,
                        reservationNumber: acc.reservationNumber,
                        confirmationDateTime: acc.confirmationDateTime,
                        notes: acc.notes
                    })),
                    activities: activities.map(act => ({
                        name: act.name,
                        type: act.type,
                        address: act.address,
                        startDateTime: act.startDateTime,
                        endDateTime: act.endDateTime,
                        duration: act.duration,
                        typeDuration: act.typeDuration,
                        price: act.price,
                        currency: act.currency,
                        reservationNumber: act.reservationNumber,
                        trailDistance: act.trailDistance,
                        trailElevation: act.trailElevation,
                        trailType: act.trailType,
                        notes: act.notes
                    }))
                };
                // Récupérer le systemPrompt personnalisé et les préférences photos
                const userSettings = await UserSetting.findOne({ userId: req.user.id });
                const systemPrompt = userSettings?.systemPrompt;
                const enablePhotosInStories = userSettings?.enablePhotosInStories !== false; // Par défaut true
                
                // Collecter les photos des hébergements et activités si l'utilisateur l'a activé
                let photos = [];
                if (enablePhotosInStories) {
                    photos = await collectStepPhotos(accommodations, activities);
                    console.log(`📸 ${photos.length} photos collectées pour génération asynchrone (activé par l'utilisateur)`);
                } else {
                    console.log(`📸 Analyse des photos désactivée dans les paramètres utilisateur`);
                }
                
                // Générer le récit avec OpenAI (avec ou sans photos selon les préférences)
                let result;
                if (enablePhotosInStories && photos.length > 0) {
                    // Utiliser la version avec photos (GPT-4 Vision)
                    result = await genererRecitStepAvecPhotos(stepData, systemPrompt, photos);
                } else {
                    // Utiliser la version texte standard
                    result = await genererRecitStep(stepData, systemPrompt);
                }
                
                step.story = result.story;
                await step.save();
                job.status = 'done';
                job.result = {
                    stepId: idStep,
                    stepName: step.name,
                    story: result.story,
                    prompt: result.prompt,
                    generatedAt: new Date().toISOString(),
                    dataUsed: {
                        stepInfo: !!step.name || !!step.address || !!step.notes,
                        accommodationsCount: accommodations.length,
                        activitiesCount: activities.length,
                        photosCount: photos.length
                    },
                    model: result.model || 'gpt-4o-mini',
                    photosAnalyzed: result.photosAnalyzed || 0,
                    fromCache: false
                };
                await job.save();
            } catch (err) {
                console.error('❌ Erreur dans le job asynchrone de génération de récit:', err);
                console.error('Stack trace:', err.stack);
                job.status = 'error';
                job.error = err.message;
                await job.save();
            }
        });
        // Réponse immédiate
        res.status(202).json({ jobId: job._id, status: job.status });
    } catch (error) {
        console.error('Error launching async step story:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};

// Endpoint pour consulter le statut d'un job de génération de récit
export const getStepStoryJobStatus = async (req, res) => {
    try {
        const { idStep, jobId } = req.params;
        
        // Vérifier que le step existe et appartient à l'utilisateur
        const step = await Step.findById(idStep);
        if (!step) {
            return res.status(404).json({ msg: 'Step not found' });
        }
        
        if (step.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }
        
        // Récupérer le job et vérifier qu'il appartient au bon step
        const job = await StepStoryJob.findById(jobId);
        if (!job) {
            return res.status(404).json({ msg: 'Job not found' });
        }
        
        // Vérifier que le job correspond bien au step demandé
        if (job.stepId.toString() !== idStep) {
            return res.status(400).json({ 
                msg: 'Job does not belong to the specified step',
                jobStepId: job.stepId,
                requestedStepId: idStep
            });
        }
        
        res.json({ 
            jobId: job._id,
            stepId: job.stepId,
            stepName: step.name,
            status: job.status, 
            result: job.result, 
            error: job.error,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt
        });
    } catch (error) {
        console.error('Error fetching job status:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};

// Méthode pour créer une étape via un prompt en langage naturel
export const createStepFromNaturalLanguage = async (req, res) => {
    try {
        const { prompt, userLatitude, userLongitude } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ msg: 'Le prompt est requis' });
        }

        const roadtrip = await Roadtrip.findById(req.params.idRoadtrip);

        if (!roadtrip) {
            return res.status(404).json({ msg: 'Roadtrip not found' });
        }

        // Vérifier si l'utilisateur est le propriétaire du roadtrip
        if (roadtrip.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        // Préparer les informations de localisation utilisateur si disponibles
        let userLocation = null;
        if (userLatitude && userLongitude) {
            try {
                const userAddress = await getAddressFromCoordinates(userLatitude, userLongitude);
                userLocation = {
                    latitude: userLatitude,
                    longitude: userLongitude,
                    address: userAddress
                };
            } catch (error) {
                console.error('Error getting user address from coordinates:', error);
                // Continuer sans la localisation utilisateur
            }
        }

        // Analyser le prompt avec OpenAI pour extraire les informations de l'étape
        const stepData = await analyserPromptEtape(prompt, userLocation);

        // Déterminer l'adresse et les coordonnées finales
        let finalAddress = stepData.address;
        let coordinates = {};

        if (stepData.useUserLocation && userLocation) {
            // Utiliser la localisation de l'utilisateur
            finalAddress = userLocation.address;
            coordinates = { lat: userLocation.latitude, lng: userLocation.longitude };
        } else if (stepData.address) {
            // Utiliser l'adresse extraite du prompt
            try {
                coordinates = await getCoordinates(stepData.address);
            } catch (error) {
                console.error('Error getting coordinates for extracted address:', error);
                // Si on ne peut pas géocoder l'adresse extraite et qu'on a la localisation utilisateur, l'utiliser en fallback
                if (userLocation) {
                    finalAddress = userLocation.address;
                    coordinates = { lat: userLocation.latitude, lng: userLocation.longitude };
                    stepData.useUserLocation = true;
                }
            }
        }

        const newStep = new Step({
            type: stepData.type || 'Stage',
            name: stepData.name,
            address: finalAddress,
            latitude: coordinates.lat || 0,
            longitude: coordinates.lng || 0,
            arrivalDateTime: stepData.arrivalDateTime ? new Date(stepData.arrivalDateTime) : undefined,
            departureDateTime: stepData.departureDateTime ? new Date(stepData.departureDateTime) : undefined,
            notes: stepData.notes || '',
            roadtripId: req.params.idRoadtrip,
            userId: req.user.id
        });

        const step = await newStep.save();

        // Réactualiser le temps de trajet pour l'étape mise à jour
        await updateStepDatesAndTravelTime(step._id);

        // Ajouter l'ID de la nouvelle étape au tableau steps du roadtrip
        roadtrip.steps.push(step);
        await roadtrip.save();

        res.json({
            step,
            extractedData: stepData // Retourner aussi les données extraites pour debug
        });
    } catch (err) {
        console.error('Error creating step from natural language:', err.message);
        
        if (err.message.includes('analyse du prompt')) {
            return res.status(400).json({ 
                msg: 'Erreur lors de l\'analyse du prompt',
                error: err.message 
            });
        }
        
        res.status(500).json({ 
            msg: 'Erreur serveur lors de la création de l\'étape',
            error: err.message 
        });
    }
};

/**
 * Collecte les photos des hébergements et activités d'un step
 * @param {Array} accommodations - Liste des hébergements
 * @param {Array} activities - Liste des activités
 * @returns {Array} - Liste des photos avec métadonnées
 */
const collectStepPhotos = async (accommodations, activities) => {
    const photos = [];
    
    try {
        // Collecter les photos des hébergements
        for (const accommodation of accommodations) {
            if (accommodation.photos && accommodation.photos.length > 0) {
                // Récupérer les détails des photos
                const accommodationPhotos = await File.find({
                    _id: { $in: accommodation.photos },
                    type: 'photo'
                });
                
                accommodationPhotos.forEach(photo => {
                    photos.push({
                        url: photo.url,
                        source: `Hébergement: ${accommodation.name}`,
                        type: 'accommodation',
                        itemId: accommodation._id,
                        itemName: accommodation.name,
                        fileId: photo._id
                    });
                });
            }
            
            // Ajouter la photo thumbnail si elle existe
            if (accommodation.thumbnail) {
                const thumbnail = await File.findById(accommodation.thumbnail);
                if (thumbnail && thumbnail.type === 'thumbnail') {
                    photos.push({
                        url: thumbnail.url,
                        source: `Hébergement: ${accommodation.name} (miniature)`,
                        type: 'accommodation_thumbnail',
                        itemId: accommodation._id,
                        itemName: accommodation.name,
                        fileId: thumbnail._id
                    });
                }
            }
        }
        
        // Collecter les photos des activités
        for (const activity of activities) {
            if (activity.photos && activity.photos.length > 0) {
                // Récupérer les détails des photos
                const activityPhotos = await File.find({
                    _id: { $in: activity.photos },
                    type: 'photo'
                });
                
                activityPhotos.forEach(photo => {
                    photos.push({
                        url: photo.url,
                        source: `Activité: ${activity.name}`,
                        type: 'activity',
                        itemId: activity._id,
                        itemName: activity.name,
                        fileId: photo._id
                    });
                });
            }
            
            // Ajouter la photo thumbnail si elle existe
            if (activity.thumbnail) {
                const thumbnail = await File.findById(activity.thumbnail);
                if (thumbnail && thumbnail.type === 'thumbnail') {
                    photos.push({
                        url: thumbnail.url,
                        source: `Activité: ${activity.name} (miniature)`,
                        type: 'activity_thumbnail',
                        itemId: activity._id,
                        itemName: activity.name,
                        fileId: thumbnail._id
                    });
                }
            }
        }
        
        console.log(`✅ Collecté ${photos.length} photos pour le step (${accommodations.length} hébergements, ${activities.length} activités)`);
        return photos;
        
    } catch (error) {
        console.error('❌ Erreur lors de la collecte des photos:', error);
        return [];
    }
};

// Méthode pour générer le récit avec photos (force l'analyse des images)
export const generateStepStoryWithPhotos = async (req, res) => {
    try {
        const { idStep } = req.params;

        // Récupérer le step
        const step = await Step.findById(idStep);

        if (!step) {
            return res.status(404).json({ msg: 'Step not found' });
        }

        // Vérifier si l'utilisateur est autorisé à accéder à ce step
        if (step.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        // Récupérer toutes les accommodations liées à ce step avec leurs photos
        const accommodations = await Accommodation.find({ 
            stepId: new mongoose.Types.ObjectId(idStep), 
            active: true 
        }).populate('photos').populate('thumbnail');

        // Récupérer toutes les activités liées à ce step avec leurs photos
        const allActivities = await Activity.find({ 
            stepId: new mongoose.Types.ObjectId(idStep) 
        }).populate('photos').populate('thumbnail');
        
        const activities = allActivities.filter(act => {
            if (act.active === true || act.active === 'true' || act.active === 1) return true;
            if (act.active === undefined || act.active === null) return true;
            return false;
        });

        console.log(`Step ${idStep}: Found ${accommodations.length} accommodations and ${activities.length} activities for photo story`);

        // Tri côté JavaScript pour gérer les valeurs nulles
        accommodations.sort((a, b) => {
            const dateA = a.arrivalDateTime ? new Date(a.arrivalDateTime) : new Date(0);
            const dateB = b.arrivalDateTime ? new Date(b.arrivalDateTime) : new Date(0);
            return dateA - dateB;
        });

        activities.sort((a, b) => {
            const dateA = a.startDateTime ? new Date(a.startDateTime) : new Date(0);
            const dateB = b.startDateTime ? new Date(b.startDateTime) : new Date(0);
            return dateA - dateB;
        });

        // Préparer les données pour le LLM
        const stepData = {
            step: {
                name: step.name,
                type: step.type,
                address: step.address,
                arrivalDateTime: step.arrivalDateTime,
                departureDateTime: step.departureDateTime,
                distancePreviousStep: step.distancePreviousStep,
                travelTimePreviousStep: step.travelTimePreviousStep,
                notes: step.notes
            },
            accommodations: accommodations.map(acc => ({
                name: acc.name,
                address: acc.address,
                arrivalDateTime: acc.arrivalDateTime,
                departureDateTime: acc.departureDateTime,
                nights: acc.nights,
                price: acc.price,
                currency: acc.currency,
                reservationNumber: acc.reservationNumber,
                confirmationDateTime: acc.confirmationDateTime,
                notes: acc.notes
            })),
            activities: activities.map(act => ({
                name: act.name,
                type: act.type,
                address: act.address,
                startDateTime: act.startDateTime,
                endDateTime: act.endDateTime,
                duration: act.duration,
                typeDuration: act.typeDuration,
                price: act.price,
                currency: act.currency,
                reservationNumber: act.reservationNumber,
                trailDistance: act.trailDistance,
                trailElevation: act.trailElevation,
                trailType: act.trailType,
                notes: act.notes
            }))
        };

        // Récupérer le systemPrompt personnalisé
        const userSettings = await UserSetting.findOne({ userId: req.user.id });
        const systemPrompt = userSettings?.systemPrompt;

        // Collecter les photos des hébergements et activités
        const photos = await collectStepPhotos(accommodations, activities);
        console.log(`📸 ${photos.length} photos collectées pour génération avec photos`);

        if (photos.length === 0) {
            return res.status(400).json({ 
                msg: 'Aucune photo trouvée pour ce step',
                error: 'Ce step ne contient aucune photo d\'hébergement ou d\'activité à analyser'
            });
        }

        // Forcer l'utilisation de GPT-4 Vision avec les photos
        const result = await genererRecitStepAvecPhotos(stepData, systemPrompt, photos);

        // Optionnel : sauvegarder le récit dans le step
        // step.story = result.story;
        // await step.save();

        res.json({
            stepId: idStep,
            stepName: step.name,
            story: result.story,
            prompt: result.prompt,
            generatedAt: new Date().toISOString(),
            dataUsed: {
                stepInfo: !!step.name || !!step.address || !!step.notes,
                accommodationsCount: accommodations.length,
                activitiesCount: activities.length,
                photosCount: photos.length
            },
            model: result.model,
            photosAnalyzed: result.photosAnalyzed,
            photosSources: photos.map(p => ({ source: p.source, type: p.type })),
            fromCache: false,
            forcePhotos: true
        });

    } catch (error) {
        console.error('Error generating step story with photos:', error);
        
        if (error.message.includes('OpenAI')) {
            return res.status(503).json({ 
                msg: 'Service temporarily unavailable', 
                error: 'Unable to generate story due to AI service error' 
            });
        }
        
        res.status(500).json({ 
            msg: 'Server error', 
            error: error.message 
        });
    }
};
