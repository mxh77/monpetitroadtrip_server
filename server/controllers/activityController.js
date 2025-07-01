import Activity from '../models/Activity.js';
import Step from '../models/Step.js';
import Roadtrip from '../models/Roadtrip.js';
import File from '../models/File.js';
import { getCoordinates, getAddressFromCoordinates } from '../utils/googleMapsUtils.js';
import { uploadToGCS, deleteFromGCS } from '../utils/fileUtils.js';
import { updateStepDatesAndTravelTime } from '../utils/travelTimeUtils.js';
import { getUserSettings, getUserAlgoliaRadius } from '../utils/userSettingsUtils.js';
import { analyserPromptActivite } from '../utils/openaiUtils.js';

/**
 * Fonction spécifique pour convertir une adresse en coordonnées pour la recherche Algolia
 * Parse la string retournée par getCoordinates (format "lat lng") en objet {lat, lng}
 * @param {string} address - L'adresse à convertir
 * @returns {Promise<{lat: number|null, lng: number|null}>} - Coordonnées parsées
 */
async function getCoordinatesForAlgolia(address) {
    if (!address) {
        return { lat: null, lng: null };
    }
    
    try {
        // getCoordinates retourne une string au format "lat lng"
        const coordinatesString = await getCoordinates(address);
        
        if (!coordinatesString || typeof coordinatesString !== 'string') {
            return { lat: null, lng: null };
        }
        
        // Parser la string avec regex pour gérer les espaces multiples
        const parts = coordinatesString.trim().split(/\s+/);
        if (parts.length !== 2) {
            return { lat: null, lng: null };
        }
        
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        
        if (isNaN(lat) || isNaN(lng)) {
            return { lat: null, lng: null };
        }
        
        return { lat, lng };
        
    } catch (error) {
        console.error('Erreur lors de la conversion d\'adresse pour Algolia:', error.message);
        return { lat: null, lng: null };
    }
}

/**
 * Calcule la distance en mètres entre deux coordonnées géographiques
 * Utilise la formule de Haversine
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Rayon de la Terre en mètres
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance en mètres
}

// Méthode pour créer une nouvelle activité pour une étape donnée
export const createActivityForStep = async (req, res) => {
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

        // Vérifier si le type de l'étape est 'Stop' et retourner une erreur si des activities existent
        if (step.type === 'Stop') {
            return res.status(400).json({ msg: "Erreur lors de la création du Step : un step de type 'Stop' ne peut pas contenir d'activités" });
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

        // Obtenir les coordonnées géographiques à partir de l'adresse
        let coordinates = {};
        if (data.address) {
            try {
                coordinates = await getCoordinates(data.address);
            } catch (error) {
                console.error('Error getting coordinates:', error);
            }
        }

        const activity = new Activity({
            active: data.active,
            type: data.type,
            name: data.name,
            address: data.address,
            latitude: coordinates.lat,
            longitude: coordinates.lng,
            website: data.website,
            phone: data.phone,
            email: data.email,
            startDateTime: data.startDateTime,
            endDateTime: data.endDateTime,
            typeDuration: data.typeDuration,
            duration: data.duration,
            reservationNumber: data.reservationNumber,
            price: data.price,
            currency: data.currency,
            notes: data.notes,
            algoliaId: data.algoliaId || '',
            stepId: req.params.idStep,
            userId: req.user.id
        });

        // Télécharger les nouveaux fichiers
        if (req.files) {
            if (req.files.thumbnail) {
                console.log('Uploading thumbnail...');
                const url = await uploadToGCS(req.files.thumbnail[0], activity._id);
                const file = new File({ url, type: 'thumbnail' });
                await file.save();
                activity.thumbnail = file._id;
            }
            if (req.files.photos && req.files.photos.length > 0) {
                console.log('Uploading photos...');
                const photos = await Promise.all(req.files.photos.map(async (photo) => {
                    const url = await uploadToGCS(photo, activity._id);
                    const file = new File({ url, type: 'photo' });
                    await file.save();
                    return file._id;
                }));
                activity.photos.push(...photos);
                console.log('Updated activity photos:', activity.photos);
            }
            if (req.files.documents && req.files.documents.length > 0) {
                console.log('Uploading documents...');
                const documents = await Promise.all(req.files.documents.map(async (document) => {
                    const url = await uploadToGCS(document, activity._id);
                    const file = new File({ url, type: 'document' });
                    await file.save();
                    return file._id;
                }));
                activity.documents.push(...documents);
                console.log('Updated activity documents:', activity.documents);
            }
        }

        // Ajouter l'activité à la liste des activités de l'étape
        step.activities.push(activity._id);
        await step.save();

        await activity.save();

        // Mettre à jour les dates du step et le temps de trajet
        await updateStepDatesAndTravelTime(activity.stepId);

        res.status(201).json(activity);
    } catch (err) {
        console.error(err.message);
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({ errors });
        }
        res.status(500).send('Server Error');
    }
};

// Méthode pour mettre à jour une activité (utilisé par la route PUT)
export const updateActivity = async (req, res) => {
    try {
        const activity = await Activity.findById(req.params.idActivity);

        if (!activity) {
            return res.status(404).json({ msg: 'Activité non trouvée' });
        }

        // Vérifier si l'utilisateur est le propriétaire de l'activité
        if (activity.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        // Extraire les données JSON du champ 'data' si elles existent
        let data = {};
        if (req.body.data) {
            try {
                data = JSON.parse(req.body.data);
                console.log('Données reçues pour mise à jour activité:', {
                    activityId: req.params.idActivity,
                    algoliaId: data.algoliaId,
                    name: data.name,
                    type: data.type
                });
            } catch (error) {
                return res.status(400).json({ msg: 'Invalid JSON in data field' });
            }
        } else {
            // Si 'data' n'est pas présent, utiliser les champs individuels
            data = req.body;
            console.log('Données reçues directement (pas de champ data):', {
                activityId: req.params.idActivity,
                algoliaId: data.algoliaId,
                name: data.name,
                type: data.type
            });
        }


        // Obtenir les coordonnées géographiques à partir de l'adresse
        let coordinates = {};
        if (data.address) {
            try {
                coordinates = await getCoordinates(data.address);
                activity.latitude = coordinates.lat;
                activity.longitude = coordinates.lng;
            } catch (error) {
                console.error('Error getting coordinates:', error);
            }
        }

        // Mettre à jour les champs de l'activité
        if (data.active !== undefined) {
            activity.active = data.active;
        }
        activity.type = data.type || activity.type
        activity.name = data.name || activity.name //Obligatoire
        activity.address = data.address || activity.address //Obligatoire
        activity.website = data.website || activity.website
        activity.phone = data.phone || activity.phone
        activity.email = data.email || activity.email
        activity.startDateTime = data.startDateTime || activity.startDateTime //Obligatoire
        activity.endDateTime = data.endDateTime || activity.endDateTime //Obligatoire
        activity.duration = data.duration || activity.duration
        activity.typeDuration = data.typeDuration || activity.typeDuration
        activity.reservationNumber = data.reservationNumber || activity.reservationNumber
        activity.price = data.price || activity.price
        activity.currency = data.currency || activity.currency
        activity.notes = data.notes || activity.notes
        
        // Mettre à jour algoliaId si présent (permet d'associer/dissocier)
        if (data.algoliaId !== undefined) {
            activity.algoliaId = data.algoliaId;
        }

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
                        activity.photos = activity.photos.filter(f => f.toString() !== fileId.toString());
                        activity.documents = activity.documents.filter(f => f.toString() !== fileId.toString());
                        if (activity.thumbnail && activity.thumbnail.toString() === fileId.toString()) {
                            activity.thumbnail = null;
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
                if (activity.thumbnail) {
                    const oldThumbnail = await File.findById(activity.thumbnail);
                    if (oldThumbnail) {
                        await deleteFromGCS(oldThumbnail.url);
                        await oldThumbnail.deleteOne();
                    }
                }
                const url = await uploadToGCS(req.files.thumbnail[0], activity._id);
                const file = new File({ url, type: 'thumbnail' });
                await file.save();
                activity.thumbnail = file._id;
            }
            if (req.files.photos && req.files.photos.length > 0) {
                console.log('Uploading photos...');
                const photos = await Promise.all(req.files.photos.map(async (photo) => {
                    const url = await uploadToGCS(photo, activity._id);
                    const file = new File({ url, type: 'photo' });
                    await file.save();
                    return file._id;
                }));
                activity.photos.push(...photos);
                console.log('Updated activity photos:', activity.photos);
            }
            if (req.files.documents && req.files.documents.length > 0) {
                console.log('Uploading documents...');
                const documents = await Promise.all(req.files.documents.map(async (document) => {
                    const url = await uploadToGCS(document, activity._id);
                    const file = new File({ url, type: 'document' });
                    await file.save();
                    return file._id;
                }));
                activity.documents.push(...documents);
                console.log('Updated activity documents:', activity.documents);
            }
        }

        await activity.save();

        console.log('Activité mise à jour avec succès:', {
            activityId: activity._id,
            algoliaId: activity.algoliaId,
            name: activity.name,
            type: activity.type
        });

        // Mettre à jour les dates du step et le temps de trajet
        console.log("Mise à jour des dates et du temps de trajet pour l'étape mise à jour");
        await updateStepDatesAndTravelTime(activity.stepId);

        res.status(200).json(activity);
    } catch (err) {
        console.error(err.message);
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({ errors });
        }
        res.status(500).send('Server error');
    }
};

// Méthode pour mettre à jour les dates d'une activité (utilisé par la route PATCH)
export const updateActivityDates = async (req, res) => {
    try {
        const activity = await Activity.findById(req.params.idActivity);

        if (!activity) {
            return res.status(404).json({ msg: 'Activité non trouvée' });
        }

        // Vérifier si l'utilisateur est le propriétaire de l'activité
        if (activity.userId.toString() !== req.user.id) {
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

        // Mettre à jour les dates de l'activité
        activity.startDateTime = data.startDateTime;
        activity.endDateTime = data.endDateTime;

        await activity.save();

        // Réactualiser le temps de trajet pour l'étape mise à jour
        await updateStepDatesAndTravelTime(activity.stepId);

        res.json(activity);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Méthode pour obtenir les informations d'une activité
export const getActivityById = async (req, res) => {
    try {
        const activity = await Activity.findById(req.params.idActivity)
            .populate('documents')
            .populate('photos')
            .populate('thumbnail');

        if (!activity) {
            return res.status(404).json({ msg: 'Activité non trouvé !' });
        }

        // Vérifier si l'utilisateur est le propriétaire de l'activité
        if (activity.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        res.json(activity);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Méthode pour supprimer une activité
export const deleteActivity = async (req, res) => {
    try {
        const activity = await Activity.findById(req.params.idActivity);

        // Vérifier si l'activité existe
        if (!activity) {
            return res.status(404).json({ msg: 'Activité non trouvée' });
        }

        // Vérifier si l'utilisateur est le propriétaire de l'activité
        if (activity.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        // Supprimer l'activité de la liste des activités de l'étape
        if (activity.stepId) {
            const step = await Step.findById(activity.stepId);
            step.activities = step.activities.filter(activityId => activityId.toString() !== req.params.idActivity);
            await step.save();
        }

        // Supprimer les fichiers de Google Cloud Storage
        if (activity.thumbnail) {
            const thumbnailFile = await File.findById(activity.thumbnail);
            if (thumbnailFile) {
                await deleteFromGCS(thumbnailFile.url);
                await thumbnailFile.deleteOne();
            }
        }

        if (activity.photos && activity.photos.length > 0) {
            await Promise.all(activity.photos.map(async (photoId) => {
                const photoFile = await File.findById(photoId);
                if (photoFile) {
                    await deleteFromGCS(photoFile.url);
                    await photoFile.deleteOne();
                }
            }));
        }

        if (activity.documents && activity.documents.length > 0) {
            await Promise.all(activity.documents.map(async (documentId) => {
                const documentFile = await File.findById(documentId);
                if (documentFile) {
                    await deleteFromGCS(documentFile.url);
                    await documentFile.deleteOne();
                }
            }));
        }

        // Supprimer l'activité
        await Activity.deleteOne({ _id: req.params.idActivity });

        // Réactualiser le temps de trajet pour l'étape mise à jour
        await updateStepDatesAndTravelTime(activity.stepId);

        res.json({ msg: 'Activité supprimée' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Méthode pour obtenir les documents d'une activité
export const getDocumentsFromActivity = async (req, res) => {
    try {
        const activity = await Activity.findById(req.params.idActivity).populate('documents');

        if (!activity) {
            return res.status(404).json({ msg: 'Activité non trouvée' });
        }

        // Vérifier si l'utilisateur est le propriétaire de l'activité
        if (activity.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        res.json(activity.documents);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Méthode pour ajouter des documents à une activité
export const addDocumentsToActivity = async (req, res) => {
    try {
        const activity = await Activity.findById(req.params.idActivity);

        if (!activity) {
            return res.status(404).json({ msg: 'Activité non trouvée' });
        }

        // Vérifier si l'utilisateur est le propriétaire de l'activité
        if (activity.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        if (req.files && req.files.documents && req.files.documents.length > 0) {
            console.log('Uploading documents...');
            const documents = await Promise.all(req.files.documents.map(async (document) => {
                const name = document.originalname;
                const url = await uploadToGCS(document, activity._id);
                const file = new File({ name, url, type: 'document' });
                await file.save();
                return file._id;
            }));
            activity.documents.push(...documents);
            console.log('Updated activity documents:', activity.documents);
        }

        await activity.save();

        // Peupler les documents dans l'hébergement avant de renvoyer la réponse
        await activity.populate({
            path: 'documents',
            model: 'File'
        });

        res.status(201).json(activity.documents);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Méthode pour supprimer un document d'une activité
export const deleteDocumentFromActivity = async (req, res) => {
    try {
        const activity = await Activity.findById(req.params.idActivity);

        if (!activity) {
            return res.status(404).json({ msg: 'Activité non trouvée' });
        }

        // Vérifier si l'utilisateur est le propriétaire de l'activité
        if (activity.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        const documentId = req.params.idDocument;

        // Supprimer le document de Google Cloud Storage
        const documentFile = await File.findById(documentId);
        if (documentFile) {
            await deleteFromGCS(documentFile.url);
            await documentFile.deleteOne();
        }

        // Supprimer le document de la liste des documents de l'activité
        activity.documents = activity.documents.filter(document => document.toString() !== documentId.toString());
        await activity.save();

        // Peupler les documents dans l'activité avant de renvoyer la réponse
        await activity.populate({
            path: 'documents',
            model: 'File'
        });

        res.json(activity);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Recherche de randonnées dans Algolia (proxy sécurisé)
export const searchAlgoliaHikes = async (req, res) => {
    try {
        const { query, indexName, hitsPerPage = 5 } = req.body;
        if (!query || !indexName) {
            return res.status(400).json({ msg: 'query et indexName requis' });
        }
        
        // Import et utilisation de l'API Algolia v5
        const { algoliasearch } = await import('algoliasearch');
        const client = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_API_KEY);
        
        // Vérifier d'abord si l'index existe
        try {
            const { items } = await client.listIndices();
            const indexExists = items.some(index => index.name === indexName);
            
            if (!indexExists) {
                return res.status(404).json({ 
                    msg: `L'index '${indexName}' n'existe pas`,
                    availableIndices: items.map(index => index.name)
                });
            }
        } catch (listError) {
            console.warn('Impossible de vérifier les index disponibles:', listError.message);
        }
        
        const { results } = await client.search([{
            indexName,
            query,
            params: {
                hitsPerPage
            }
        }]);
        
        res.json({
            indexName,
            query,
            hitsPerPage,
            results: results[0]?.hits || [],
            nbHits: results[0]?.nbHits || 0
        });
    } catch (err) {
        console.error('Erreur Algolia:', err.message);
        
        // Gestion spécifique des erreurs d'index
        if (err.message.includes('does not exist')) {
            return res.status(404).json({ 
                msg: `L'index '${req.body.indexName}' n'existe pas sur Algolia`,
                error: err.message,
                suggestion: "Vérifiez le nom de l'index ou utilisez l'endpoint /activities/algolia/indices pour voir les index disponibles"
            });
        }
        
        res.status(500).json({ 
            msg: 'Erreur lors de la recherche Algolia',
            error: err.message 
        });
    }
};

// Recherche automatique de randonnées Algolia basée sur une activité existante
export const searchAlgoliaHikesForActivity = async (req, res) => {
    try {
        const activity = await Activity.findById(req.params.idActivity);
        
        console.log("Activity pour la recherche Algolia:", activity);

        if (!activity) {
            return res.status(404).json({ msg: 'Activité non trouvée' });
        }
        
        // Vérifier si l'utilisateur est le propriétaire de l'activité
        if (activity.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }
        
        // Convertir l'adresse en coordonnées si elles ne sont pas présentes
        if (!activity.latitude || !activity.longitude) {
            if (activity.address) {
                console.log('🗺️ Conversion de l\'adresse en coordonnées:', activity.address);
                const coordinates = await getCoordinatesForAlgolia(activity.address);
                if (coordinates.lat && coordinates.lng) {
                    activity.latitude = coordinates.lat;
                    activity.longitude = coordinates.lng;
                    await activity.save(); // Sauvegarder les coordonnées pour les prochaines fois
                    console.log(`✅ Coordonnées obtenues: ${coordinates.lat}, ${coordinates.lng}`);
                } else {
                    console.log('⚠️ Impossible d\'obtenir des coordonnées valides');
                }
            } else {
                console.log('⚠️ Aucune adresse disponible pour la géolocalisation');
            }
        }
        
        // Récupérer les paramètres utilisateur pour le rayon de recherche
        const radiusMeters = await getUserAlgoliaRadius(req.user.id);
        
        // Construction simple de la requête de recherche
        let searchQuery = activity.name;
        
        // Ajouter l'adresse complète à la recherche
        // if (activity.address) {
        //     searchQuery += ` ${activity.address}`;
        // }
        
        const { hitsPerPage = 10 } = req.query;
        const indexName = 'alltrails_primary_fr-FR'; // Index par défaut découvert
        
        // Log de la requête de recherche pour debug
        console.log('🔍 Recherche Algolia:', {
            activityName: activity.name || 'N/A',
            activityAddress: activity.address || 'N/A',
            searchQuery: searchQuery,
            indexName: indexName,
            hitsPerPage: hitsPerPage,
            coordinates: activity.latitude && activity.longitude ? 
                `${activity.latitude}, ${activity.longitude}` : 'Non disponibles',
            searchRadius: `${radiusMeters/1000}km (paramètre utilisateur)`,
            geoFiltering: activity.latitude && activity.longitude ? `Activé (${radiusMeters/1000}km)` : 'Désactivé'
        });
        
        // Import et utilisation de l'API Algolia v5
        const { algoliasearch } = await import('algoliasearch');
        const client = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_API_KEY);
        
        const { results } = await client.search([{
            indexName,
            query: searchQuery,
            params: {
                hitsPerPage: hitsPerPage * 2, // Demander plus de résultats pour compenser le filtrage
                filters: '', // Peut être étendu selon les besoins
                getRankingInfo: true, // Pour récupérer les distances
                // Recherche géographique si on a les coordonnées
                ...(activity.latitude && activity.longitude && {
                    aroundLatLng: `${activity.latitude},${activity.longitude}`,
                    aroundRadius: radiusMeters
                })
            }
        }]);
        
        let hits = results[0]?.hits || [];
        
        // Filtrage pour ne récupérer que les trails (objectID commence par "trail-")
        const originalCountBeforeTrailFilter = hits.length;
        hits = hits.filter(hit => hit.objectID && hit.objectID.startsWith('trail-'));
        
        console.log(`🔍 Filtrage trails: ${originalCountBeforeTrailFilter} → ${hits.length} résultats (objectID commence par "trail-")`);
        
        // Filtrage côté serveur pour respecter strictement le rayon
        if (activity.latitude && activity.longitude) {
            const originalCount = hits.length;
            hits = hits.filter(hit => {
                let distance = hit._rankingInfo?.geoDistance;
                
                // Si Algolia ne fournit pas la distance, la calculer nous-même
                if (distance === undefined && hit._geoloc?.lat && hit._geoloc?.lng) {
                    distance = calculateDistance(
                        activity.latitude, 
                        activity.longitude, 
                        hit._geoloc.lat, 
                        hit._geoloc.lng
                    );
                }
                
                return distance === undefined || distance <= radiusMeters;
            });
            
            // Limiter au nombre demandé après filtrage
            hits = hits.slice(0, hitsPerPage);
            
            // Log du filtrage pour debug
            console.log(`📏 Filtrage géographique: ${originalCount} → ${hits.length} résultats (rayon ${radiusMeters/1000}km)`);
            
            if (hits.length > 0) {
                console.log('Distances des résultats filtrés:');
                hits.forEach((hit, index) => {
                    const algoliaDistance = hit._rankingInfo?.geoDistance;
                    let distance = algoliaDistance;
                    let source = 'Algolia';
                    
                    // Si pas de distance Algolia, calculer
                    if (distance === undefined && hit._geoloc?.lat && hit._geoloc?.lng) {
                        distance = calculateDistance(
                            activity.latitude, 
                            activity.longitude, 
                            hit._geoloc.lat, 
                            hit._geoloc.lng
                        );
                        source = 'Calculée';
                    }
                    
                    const name = hit.name || 'Nom non disponible';
                    if (distance !== undefined) {
                        console.log(`  ${index + 1}. ${name} - ${(distance/1000).toFixed(2)}km (${source})`);
                    } else {
                        console.log(`  ${index + 1}. ${name} - Distance inconnue`);
                    }
                });
            }
        } else {
            // Pas de coordonnées disponibles, recherche textuelle uniquement
            console.log('📍 Recherche textuelle uniquement (pas de coordonnées disponibles)');
            hits = hits.slice(0, hitsPerPage);
        }
        
        res.json({
            activity: {
                id: activity._id,
                name: activity.name,
                address: activity.address,
                currentAlgoliaId: activity.algoliaId || null
            },
            search: {
                query: searchQuery,
                indexName,
                hitsPerPage: parseInt(hitsPerPage),
                nbHits: results[0]?.nbHits || 0,
                radiusKm: activity.latitude && activity.longitude ? radiusMeters / 1000 : null,
                filteredResults: activity.latitude && activity.longitude
            },
            suggestions: hits.map(hit => {
                // Calculer ou récupérer la distance pour l'inclure dans la réponse
                let distance = hit._rankingInfo?.geoDistance;
                if (distance === undefined && activity.latitude && activity.longitude && hit._geoloc?.lat && hit._geoloc?.lng) {
                    distance = calculateDistance(
                        activity.latitude, 
                        activity.longitude, 
                        hit._geoloc.lat, 
                        hit._geoloc.lng
                    );
                }
                
                return {
                    objectID: hit.objectID,
                    name: hit.name,
                    slug: hit.slug,
                    rating: hit.avg_rating,
                    numReviews: hit.num_reviews,
                    difficulty: hit.difficulty_rating,
                    length: hit.length,
                    elevationGain: hit.elevation_gain,
                    location: {
                        lat: hit._geoloc?.lat,
                        lng: hit._geoloc?.lng
                    },
                    distance: distance ? Math.round(distance) : null, // Distance en mètres
                    distanceKm: distance ? parseFloat((distance / 1000).toFixed(2)) : null, // Distance en km
                    features: hit.features || [],
                    url: hit.slug ? `https://www.alltrails.com/${hit.slug}` : null
                };
            })
        });
        
    } catch (err) {
        console.error('Erreur lors de la recherche Algolia pour l\'activité:', err.message);
        res.status(500).json({ 
            msg: 'Erreur lors de la recherche automatique de randonnées',
            error: err.message 
        });
    }
};

// Associer une activité à un résultat de recherche Algolia
export const linkActivityToAlgoliaResult = async (req, res) => {
    try {
        const activity = await Activity.findById(req.params.idActivity);
        
        if (!activity) {
            return res.status(404).json({ msg: 'Activité non trouvée' });
        }
        
        if (activity.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }
        
        const { objectID, name, slug } = req.body;
        
        if (!objectID) {
            return res.status(400).json({ msg: 'objectID requis' });
        }
        
        // Mettre à jour l'activité avec les informations Algolia
        activity.algoliaId = objectID;
        
        // Optionnellement, mettre à jour le nom de l'activité avec celui d'Algolia
        if (req.body.updateActivityName === true && name) {
            activity.name = name;
        }
        
        await activity.save();
        
        res.json({ 
            msg: 'Activité associée avec succès à la randonnée Algolia',
            activity: {
                id: activity._id,
                name: activity.name,
                algoliaId: activity.algoliaId
            },
            algolia: {
                objectID,
                name,
                slug,
                url: slug ? `https://www.alltrails.com/${slug}` : null
            }
        });
        
    } catch (err) {
        console.error('Erreur lors de l\'association avec Algolia:', err.message);
        res.status(500).json({ 
            msg: 'Erreur lors de l\'association avec la randonnée',
            error: err.message 
        });
    }
};

// Méthode pour obtenir les photos d'une activité
export const getPhotosFromActivity = async (req, res) => {
    try {
        const activity = await Activity.findById(req.params.idActivity).populate('photos');

        if (!activity) {
            return res.status(404).json({ msg: 'Activité non trouvée' });
        }

        // Vérifier si l'utilisateur est le propriétaire de l'activité
        if (activity.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        res.json(activity.photos);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Méthode pour ajouter des photos à une activité
export const addPhotosToActivity = async (req, res) => {
    try {
        const activity = await Activity.findById(req.params.idActivity);

        if (!activity) {
            return res.status(404).json({ msg: 'Activité non trouvée' });
        }

        // Vérifier si l'utilisateur est le propriétaire de l'activité
        if (activity.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        if (req.files && req.files.photos && req.files.photos.length > 0) {
            console.log('Uploading photos...');
            const photos = await Promise.all(req.files.photos.map(async (photo) => {
                const name = photo.originalname;
                const url = await uploadToGCS(photo, activity._id);
                const file = new File({ name, url, type: 'photo' });
                await file.save();
                return file._id;
            }));
            activity.photos.push(...photos);
            console.log('Updated activity photos:', activity.photos);
        }

        await activity.save();

        // Peupler les photos dans l'activité avant de renvoyer la réponse
        await activity.populate({
            path: 'photos',
            model: 'File'
        });

        res.status(201).json(activity.photos);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Méthode pour supprimer une photo d'une activité
export const deletePhotoFromActivity = async (req, res) => {
    try {
        const activity = await Activity.findById(req.params.idActivity);

        if (!activity) {
            return res.status(404).json({ msg: 'Activité non trouvée' });
        }

        // Vérifier si l'utilisateur est le propriétaire de l'activité
        if (activity.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        const photoId = req.params.idPhoto;

        // Supprimer la photo de Google Cloud Storage
        const photoFile = await File.findById(photoId);
        if (photoFile) {
            await deleteFromGCS(photoFile.url);
            await photoFile.deleteOne();
        }

        // Supprimer la photo de la liste des photos de l'activité
        activity.photos = activity.photos.filter(photo => photo.toString() !== photoId.toString());
        await activity.save();

        // Peupler les photos dans l'activité avant de renvoyer la réponse
        await activity.populate({
            path: 'photos',
            model: 'File'
        });

        res.json(activity);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Méthode pour créer une activité via un prompt en langage naturel
export const createActivityFromNaturalLanguage = async (req, res) => {
    try {
        const { prompt, userLatitude, userLongitude } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ msg: 'Le prompt est requis' });
        }

        const roadtrip = await Roadtrip.findById(req.params.idRoadtrip);
        const step = await Step.findById(req.params.idStep);

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

        // Vérifier si le type de l'étape est 'Stop' et retourner une erreur si des activities existent
        if (step.type === 'Stop') {
            return res.status(400).json({ msg: "Erreur lors de la création de l'activité : un step de type 'Stop' ne peut pas contenir d'activités" });
        }

        // Préparer les données de localisation utilisateur si disponibles
        let userLocation = null;
        if (userLatitude && userLongitude) {
            try {
                const address = await getAddressFromCoordinates(userLatitude, userLongitude);
                userLocation = {
                    latitude: userLatitude,
                    longitude: userLongitude,
                    address: address
                };
            } catch (error) {
                console.error('Error getting address from coordinates:', error);
                userLocation = {
                    latitude: userLatitude,
                    longitude: userLongitude,
                    address: `Coordonnées: ${userLatitude}, ${userLongitude}`
                };
            }
        }

        // Préparer les données de l'étape pour le contexte
        const stepData = {
            name: step.name,
            address: step.address,
            arrivalDateTime: step.arrivalDateTime,
            departureDateTime: step.departureDateTime
        };

        // Analyser le prompt avec OpenAI
        const activityData = await analyserPromptActivite(prompt, stepData, userLocation);

        // Déterminer l'adresse finale à utiliser
        let finalAddress = activityData.address;
        let coordinates = { lat: 0, lng: 0 };

        // Géocodage de l'adresse
        if (activityData.useUserLocation && userLocation) {
            finalAddress = userLocation.address;
            coordinates = { lat: userLocation.latitude, lng: userLocation.longitude };
        } else if (activityData.useStepLocation) {
            finalAddress = step.address;
            coordinates = { lat: step.latitude, lng: step.longitude };
        } else if (activityData.address) {
            // Utiliser l'adresse extraite du prompt
            try {
                coordinates = await getCoordinates(activityData.address);
            } catch (error) {
                console.error('Error getting coordinates for extracted address:', error);
                // Si on ne peut pas géocoder l'adresse extraite, utiliser l'adresse de l'étape en fallback
                finalAddress = step.address;
                coordinates = { lat: step.latitude, lng: step.longitude };
                activityData.useStepLocation = true;
            }
        }

        const newActivity = new Activity({
            active: true,
            name: activityData.name,
            address: finalAddress,
            latitude: coordinates.lat || 0,
            longitude: coordinates.lng || 0,
            website: activityData.website || '',
            phone: activityData.phone || '',
            email: activityData.email || '',
            startDateTime: activityData.startDateTime ? new Date(activityData.startDateTime) : undefined,
            endDateTime: activityData.endDateTime ? new Date(activityData.endDateTime) : undefined,
            duration: activityData.duration || 0,
            typeDuration: activityData.typeDuration || 'H',
            type: activityData.type || 'Autre',
            reservationNumber: activityData.reservationNumber || '',
            price: activityData.price || 0,
            currency: activityData.currency || 'EUR',
            notes: activityData.notes || '',
            stepId: req.params.idStep,
            userId: req.user.id
        });

        const activity = await newActivity.save();

        // Ajouter l'activité à la liste des activités de l'étape
        step.activities.push(activity._id);
        await step.save();

        // Mettre à jour les dates du step et le temps de trajet
        await updateStepDatesAndTravelTime(activity.stepId);

        res.json({
            activity,
            extractedData: activityData // Retourner aussi les données extraites pour debug
        });
    } catch (err) {
        console.error('Error creating activity from natural language:', err.message);
        
        if (err.message.includes('analyse du prompt')) {
            return res.status(400).json({ 
                msg: 'Erreur lors de l\'analyse du prompt',
                error: err.message 
            });
        }
        
        res.status(500).json({ 
            msg: 'Server error', 
            error: err.message 
        });
    }
};
