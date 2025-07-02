import Roadtrip from '../models/Roadtrip.js';
import Step from '../models/Step.js';
import Accommodation from '../models/Accommodation.js';
import Activity from '../models/Activity.js';
import File from '../models/File.js';
import TravelTimeJob from '../models/TravelTimeJob.js';
import StepSyncJob from '../models/StepSyncJob.js';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { uploadToGCS, deleteFromGCS } from '../utils/fileUtils.js';
import dotenv from 'dotenv';
import { refreshTravelTimeForStep, updateStepDates, updateStepDatesAndTravelTime } from '../utils/travelTimeUtils.js';
import { calculateNights } from '../utils/dateUtils.js';

dotenv.config();

// Obtenir le répertoire courant
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fonction pour calculer le nombre de jours entre deux dates
const calculateDays = (startDateTime, endDateTime) => {
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

// Méthode pour créer un roadtrip
export const createRoadtrip = async (req, res) => {
    try {
        // Log pour vérifier le contenu de req.body
        console.log('req.body:', req.body);

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

        // Log pour vérifier le contenu de data
        console.log('Data:', data);

        // Vérifier que les champs requis sont présents
        if (!data.name || !data.startDateTime || !data.endDateTime) {
            return res.status(400).json({ msg: 'Name, startDateTime, and endDateTime are required' });
        }

        const days = calculateDays(data.startDateTime, data.endDateTime);

        const newRoadtrip = new Roadtrip({
            userId: req.user.id,
            name: data.name,
            days: days, // Calcul automatique du nombre de jours
            startLocation: data.startLocation,
            startDateTime: data.startDateTime,
            endLocation: data.endLocation,
            endDateTime: data.endDateTime,
            currency: data.currency,
            notes: data.notes,
            steps: data.steps
        });

        // Télécharger le fichier thumbnail s'il existe
        if (req.files && req.files.thumbnail) {
            console.log('Uploading thumbnail...');
            const url = await uploadToGCS(req.files.thumbnail[0], newRoadtrip._id);
            const file = new File({ url, type: 'thumbnail' });
            await file.save();
            newRoadtrip.thumbnail = file._id;
        }
        const roadtrip = await newRoadtrip.save();

        res.json(roadtrip);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Méthode pour mettre à jour un roadtrip existant
export const updateRoadtrip = async (req, res) => {
    try {
        const roadtrip = await Roadtrip.findById(req.params.idRoadtrip);

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
        } else {
            // Si 'data' n'est pas présent, utiliser les champs individuels
            data = req.body;
        }

        // Mettre à jour les champs du roadtrip
        if (data.startDateTime && data.endDateTime) {
            const days = calculateDays(data.startDateTime, data.endDateTime);
            roadtrip.days = days;
        }

        if (data.name) roadtrip.name = data.name;
        if (data.startLocation) roadtrip.startLocation = data.startLocation;
        if (data.startDateTime) roadtrip.startDateTime = data.startDateTime;
        if (data.endLocation) roadtrip.endLocation = data.endLocation;
        if (data.endDateTime) roadtrip.endDateTime = data.endDateTime;
        if (data.currency) roadtrip.currency = data.currency;
        if (data.notes) roadtrip.notes = data.notes;
        if (data.steps) roadtrip.steps = data.steps;

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
                        roadtrip.photos = roadtrip.photos.filter(f => f.toString() !== fileId.toString());
                        roadtrip.documents = roadtrip.documents.filter(f => f.toString() !== fileId.toString());
                        if (roadtrip.thumbnail && roadtrip.thumbnail.toString() === fileId.toString()) {
                            roadtrip.thumbnail = null;
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
                if (roadtrip.thumbnail) {
                    const oldThumbnail = await File.findById(roadtrip.thumbnail);
                    if (oldThumbnail) {
                        await deleteFromGCS(oldThumbnail.url);
                        await oldThumbnail.deleteOne();
                    }
                }
                const url = await uploadToGCS(req.files.thumbnail[0], roadtrip._id);
                const file = new File({ url, type: 'thumbnail' });
                await file.save();
                roadtrip.thumbnail = file._id;
            }
            if (req.files.photos && req.files.photos.length > 0) {
                console.log('Uploading photos...');
                const photos = await Promise.all(req.files.photos.map(async (photo) => {
                    const url = await uploadToGCS(photo, roadtrip._id);
                    const file = new File({ url, type: 'photo' });
                    await file.save();
                    return file._id;
                }));
                roadtrip.photos.push(...photos);
                console.log('Updated roadtrip photos:', roadtrip.photos);
            }
            if (req.files.documents && req.files.documents.length > 0) {
                console.log('Uploading documents...');
                const documents = await Promise.all(req.files.documents.map(async (document) => {
                    const url = await uploadToGCS(document, roadtrip._id);
                    const file = new File({ url, type: 'document' });
                    await file.save();
                    return file._id;
                }));
                roadtrip.documents.push(...documents);
                console.log('Updated roadtrip documents:', roadtrip.documents);
            }
        }

        await roadtrip.save();
        console.log('Roadtrip saved with updated files:', roadtrip);
        res.json(roadtrip);

    } catch (err) {
        console.error('Error updating roadtrip:', err.message);
        res.status(500).send('Server error');
    }
};

// Méthode pour supprimer un fichier spécifique
export const deleteFile = async (req, res) => {
    try {
        const roadtrip = await Roadtrip.findById(req.params.idRoadtrip);

        if (!roadtrip) {
            return res.status(404).json({ msg: 'Roadtrip not found' });
        }

        // Vérifier si l'utilisateur est le propriétaire du roadtrip
        if (roadtrip.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        const fileId = new mongoose.Types.ObjectId(req.params.fileId);
        const file = await File.findById(fileId);

        if (!file) {
            return res.status(404).json({ msg: 'File not found' });
        }

        // Supprimer le fichier de GCS
        await deleteFromGCS(file.url);

        // Supprimer le fichier de la collection File
        await file.deleteOne();

        // Supprimer le fichier du tableau photos, documents ou thumbnail du roadtrip
        roadtrip.photos = roadtrip.photos.filter(f => f.toString() !== fileId.toString());
        roadtrip.documents = roadtrip.documents.filter(f => f.toString() !== fileId.toString());
        if (roadtrip.thumbnail && roadtrip.thumbnail.toString() === fileId.toString()) {
            roadtrip.thumbnail = null;
        }

        await roadtrip.save();

        res.json({ msg: 'File removed' });
    } catch (err) {
        console.error('Error deleting file:', err.message);
        res.status(500).send('Server error');
    }
};

// Méthode pour supprimer un roadtrip
export const deleteRoadtrip = async (req, res) => {
    try {
        const roadtrip = await Roadtrip.findById(req.params.idRoadtrip);

        if (!roadtrip) {
            return res.status(404).json({ msg: 'Roadtrip not found' });
        }

        // Vérifier si l'utilisateur est le propriétaire du roadtrip
        if (roadtrip.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        // Supprimer le thumbnail associé au roadtrip
        if (roadtrip.thumbnail) {
            const thumbnail = await File.findById(roadtrip.thumbnail);
            if (thumbnail) {
                await deleteFromGCS(thumbnail.url);
                await thumbnail.deleteOne();
            }
        }

        // Supprimer les photos associés au roadtrip
        if (roadtrip.photos && roadtrip.photos.length > 0) {
            await Promise.all(roadtrip.photos.map(async (photoId) => {
                const photo = await File.findById(photoId);
                if (photo) {
                    await deleteFromGCS(photo.url);
                    await photo.deleteOne();
                }
            }
            ));
        }

        // Supprimer les documents associés au roadtrip
        if (roadtrip.documents && roadtrip.documents.length > 0) {
            await Promise.all(roadtrip.documents.map(async (documentId) => {
                const document = await File.findById(documentId);
                if (document) {
                    await deleteFromGCS(document.url);
                    await document.deleteOne();
                }
            }
            ));
        }

        // Supprimer les étapes associées au roadtrip
        if (roadtrip.steps && roadtrip.steps.length > 0) {
            await Promise.all(roadtrip.steps.map(async (stepId) => {
                const step = await Step.findById(stepId);
                if (step) {
                    if (step.accommodations && step.accommodations.length > 0) {
                        await Promise.all(step.accommodations.map(async (accommodationId) => {
                            const accommodation = await Accommodation.findById(accommodationId);
                            if (accommodation) {
                                if (accommodation.thumbnail) {
                                    const thumbnail = await File.findById(accommodation.thumbnail);
                                    if (thumbnail) {
                                        await deleteFromGCS(thumbnail.url);
                                        await thumbnail.deleteOne();
                                    }
                                }
                                if (accommodation.photos && accommodation.photos.length > 0) {
                                    await Promise.all(accommodation.photos.map(async (photoId) => {
                                        const photo = await File.findById(photoId);
                                        if (photo) {
                                            await deleteFromGCS(photo.url);
                                            await photo.deleteOne();
                                        }
                                    }
                                    ));
                                }
                                if (accommodation.documents && accommodation.documents.length > 0) {
                                    await Promise.all(accommodation.documents.map(async (documentId) => {
                                        const document = await File.findById(documentId);
                                        if (document) {
                                            await deleteFromGCS(document.url);
                                            await document.deleteOne();
                                        }
                                    }
                                    ));
                                }
                                await accommodation.deleteOne();
                            }
                        }
                        ));
                    }

                    if (step.activities && step.activities.length > 0) {
                        await Promise.all(step.activities.map(async (activityId) => {
                            const activity = await Activity.findById(activityId);
                            if (activity) {
                                if (activity.thumbnail) {
                                    const thumbnail = await File.findById(activity.thumbnail);
                                    if (thumbnail) {
                                        await deleteFromGCS(thumbnail.url);
                                        await thumbnail.deleteOne();
                                    }
                                }
                                if (activity.photos && activity.photos.length > 0) {
                                    await Promise.all(activity.photos.map(async (photoId) => {
                                        const photo = await File.findById(photoId);
                                        if (photo) {
                                            await deleteFromGCS(photo.url);
                                            await photo.deleteOne();
                                        }
                                    }
                                    ));
                                }
                                if (activity.documents && activity.documents.length > 0) {
                                    await Promise.all(activity.documents.map(async (documentId) => {
                                        const document = await File.findById(documentId);
                                        if (document) {
                                            await deleteFromGCS(document.url);
                                            await document.deleteOne();
                                        }
                                    }
                                    ));
                                }
                                await activity.deleteOne();
                            }
                        }
                        ));
                    }

                    await step.deleteOne();
                }
            }
            ));
        }

        // Supprimer le roadtrip
        await Roadtrip.deleteOne({ _id: req.params.idRoadtrip });

        res.json({ msg: 'Roadtrip removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Méthode pour récupérer les roadtrips d'un user
export const getUserRoadtrips = async (req, res) => {
    try {
        const roadtrips = await Roadtrip.find({ userId: req.user.id })
            .populate('steps')
            .populate({
                path: 'steps',
                populate: {
                    path: 'accommodations',
                    model: 'Accommodation'
                }
            })
            .populate({
                path: 'steps',
                populate: {
                    path: 'activities',
                    model: 'Activity'
                }
            })
            .populate('photos')
            .populate('documents')
            .populate('thumbnail');

        res.json(roadtrips);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Méthode pour récupérer un roadtrip
export const getRoadtripById = async (req, res) => {
    try {
        // Étape 1 : Récupérer le roadtrip avec ses steps
        const roadtrip = await Roadtrip.findById(req.params.idRoadtrip)
            .populate({
                path: 'steps',
                populate: [
                    { path: 'photos', model: 'File' },
                    { path: 'documents', model: 'File' },
                    { path: 'thumbnail', model: 'File' },
                    {
                        path: 'accommodations',
                        populate: [
                            { path: 'photos', model: 'File' },
                            { path: 'documents', model: 'File' },
                            { path: 'thumbnail', model: 'File' }
                        ]
                    },
                    {
                        path: 'activities',
                        populate: [
                            { path: 'photos', model: 'File' },
                            { path: 'documents', model: 'File' },
                            { path: 'thumbnail', model: 'File' }
                        ]
                    }
                ]
            })
            .populate('photos')
            .populate('documents')
            .populate('thumbnail');

        console.log("Roadtrip:", roadtrip);

        if (!roadtrip) {
            return res.status(404).json({ msg: 'Roadtrip not found' });
        }

        // Vérifier si l'utilisateur est le propriétaire du roadtrip
        if (roadtrip.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        // Tri des steps par arrivalDateTime tout en conservant les données peuplées
        roadtrip.steps.sort((a, b) => new Date(a.arrivalDateTime) - new Date(b.arrivalDateTime));

        // Ajouter les listes triées à la réponse
        res.json(roadtrip);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Méthode pour réactualiser les temps de trajet entre chaque étape (synchrone - existante)
export const refreshTravelTimesForRoadtrip = async (req, res) => {
    try {
        const roadtrip = await Roadtrip.findById(req.params.idRoadtrip)
            .populate({
                path: 'steps',
                populate: [
                    {
                        path: 'accommodations',
                        populate: [
                            { path: 'photos', model: 'File' },
                            { path: 'documents', model: 'File' },
                            { path: 'thumbnail', model: 'File' }
                        ]
                    },
                    {
                        path: 'activities',
                        populate: [
                            { path: 'photos', model: 'File' },
                            { path: 'documents', model: 'File' },
                            { path: 'thumbnail', model: 'File' }
                        ]
                    }
                ]
            })
            .populate('photos')
            .populate('documents')
            .populate('thumbnail');

        if (!roadtrip) {
            return res.status(404).json({ msg: 'Roadtrip not found' });
        }

        // Vérifier si l'utilisateur est le propriétaire du roadtrip
        if (roadtrip.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        // Trier les étapes par ordre croissant de arrivalDateTime
        const steps = roadtrip.steps.sort((a, b) => new Date(a.arrivalDateTime) - new Date(b.arrivalDateTime));

        // Rafraîchir les temps de trajet pour chaque étape
        for (let i = 1; i < steps.length; i++) {
            const step = steps[i];
            await refreshTravelTimeForStep(step);
        }

        res.json({ steps });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Méthode asynchrone pour lancer le recalcul des temps de trajet
export const startTravelTimeCalculationJob = async (req, res) => {
    try {
        const roadtrip = await Roadtrip.findById(req.params.idRoadtrip);

        if (!roadtrip) {
            return res.status(404).json({ msg: 'Roadtrip not found' });
        }

        // Vérifier si l'utilisateur est le propriétaire du roadtrip
        if (roadtrip.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        // Vérifier s'il y a déjà un job en cours pour ce roadtrip
        const existingJob = await TravelTimeJob.findOne({
            roadtripId: req.params.idRoadtrip,
            status: { $in: ['pending', 'running'] }
        });

        if (existingJob) {
            return res.status(409).json({ 
                msg: 'Un calcul est déjà en cours pour ce roadtrip',
                jobId: existingJob._id,
                status: existingJob.status,
                progress: existingJob.progress
            });
        }

        // Récupérer les steps pour calculer le nombre total
        const steps = await Step.find({ roadtripId: req.params.idRoadtrip })
            .sort({ arrivalDateTime: 1 });

        // Créer un nouveau job
        const job = new TravelTimeJob({
            userId: req.user.id,
            roadtripId: req.params.idRoadtrip,
            status: 'pending',
            progress: {
                total: Math.max(0, steps.length - 1), // Premier step n'a pas de temps de trajet
                completed: 0,
                percentage: 0
            }
        });

        await job.save();

        // Lancer le traitement asynchrone
        processTravelTimeCalculationWithSync(job._id, steps).catch(err => {
            console.error('Erreur lors du traitement du job:', err);
        });

        res.status(202).json({
            msg: 'Calcul des temps de trajet démarré',
            jobId: job._id,
            status: job.status,
            progress: job.progress,
            estimatedDuration: `${Math.ceil(steps.length * 2)} secondes` // Estimation
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Méthode pour vérifier le statut d'un job de calcul
export const getTravelTimeJobStatus = async (req, res) => {
    try {
        const job = await TravelTimeJob.findById(req.params.jobId);

        if (!job) {
            return res.status(404).json({ msg: 'Job not found' });
        }

        // Vérifier si l'utilisateur est le propriétaire du job
        if (job.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        res.json({
            jobId: job._id,
            status: job.status,
            progress: job.progress,
            startedAt: job.startedAt,
            completedAt: job.completedAt,
            errorMessage: job.errorMessage,
            results: job.results
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Méthode pour lister les jobs de calcul d'un roadtrip
export const getTravelTimeJobs = async (req, res) => {
    try {
        const roadtrip = await Roadtrip.findById(req.params.idRoadtrip);

        if (!roadtrip) {
            return res.status(404).json({ msg: 'Roadtrip not found' });
        }

        // Vérifier si l'utilisateur est le propriétaire du roadtrip
        if (roadtrip.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        // Récupérer les jobs des 7 derniers jours
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const jobs = await TravelTimeJob.find({
            roadtripId: req.params.idRoadtrip,
            createdAt: { $gte: sevenDaysAgo }
        })
        .sort({ createdAt: -1 })
        .limit(10);

        res.json({
            roadtripId: req.params.idRoadtrip,
            jobs: jobs.map(job => ({
                jobId: job._id,
                status: job.status,
                progress: job.progress,
                createdAt: job.createdAt,
                startedAt: job.startedAt,
                completedAt: job.completedAt,
                errorMessage: job.errorMessage,
                results: job.status === 'completed' ? job.results.summary : null
            }))
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Fonction de traitement asynchrone des calculs avec synchronisation préalable
async function processTravelTimeCalculationWithSync(jobId, steps) {
    const job = await TravelTimeJob.findById(jobId);
    
    if (!job) {
        console.error('Job not found:', jobId);
        return;
    }

    try {
        // Marquer le job comme démarré
        job.status = 'running';
        job.startedAt = new Date();
        await job.save();

        console.log(`🚀 Démarrage du calcul des temps de trajet avec synchronisation pour le roadtrip ${job.roadtripId}`);

        // ÉTAPE 1: Synchroniser les heures de tous les steps
        console.log(`📋 Étape 1/2: Synchronisation des heures des ${steps.length} steps...`);
        
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            try {
                console.log(`  📍 Synchronisation step ${i + 1}/${steps.length}: ${step.name}`);
                await updateStepDates(step._id);
                
                // Mettre à jour le progrès (50% pour la synchronisation)
                const syncProgress = Math.round((i + 1) / steps.length * 50);
                job.progress.percentage = syncProgress;
                await job.save();
                
                // Petite pause
                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (error) {
                console.error(`Erreur sync step ${step.name}:`, error);
            }
        }

        console.log(`✅ Synchronisation terminée, début du calcul des temps de trajet...`);

        // ÉTAPE 2: Calculer les temps de trajet (reprise de la logique existante)
        console.log(`🧮 Étape 2/2: Calcul des temps de trajet...`);
        
        let totalDistance = 0;
        let totalTravelTime = 0;
        let inconsistentSteps = 0;
        const errors = [];

        // Recharger les steps après synchronisation
        const updatedSteps = await Step.find({ roadtripId: job.roadtripId })
            .sort({ arrivalDateTime: 1 });

        // Traiter chaque step (sauf le premier)
        for (let i = 1; i < updatedSteps.length; i++) {
            const step = updatedSteps[i];
            
            try {
                console.log(`📍 Calcul temps trajet ${i}/${updatedSteps.length - 1}: ${step.name}`);
                
                // Rafraîchir le temps de trajet pour cette étape
                const updatedStep = await refreshTravelTimeForStep(step);
                
                // Accumuler les statistiques
                if (updatedStep.distancePreviousStep) {
                    totalDistance += updatedStep.distancePreviousStep;
                }
                if (updatedStep.travelTimePreviousStep) {
                    totalTravelTime += updatedStep.travelTimePreviousStep;
                }
                if (!updatedStep.isArrivalTimeConsistent) {
                    inconsistentSteps++;
                }

                // Mettre à jour le progrès (50% à 100%)
                const travelProgress = 50 + Math.round((i / (updatedSteps.length - 1)) * 50);
                job.progress.completed = i;
                job.progress.percentage = travelProgress;
                job.results.stepsProcessed = i;
                await job.save();

                // Petite pause pour éviter de surcharger l'API Google Maps
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                console.error(`Erreur lors du traitement de l'étape ${step.name}:`, error);
                errors.push({
                    stepId: step._id,
                    error: error.message
                });
            }
        }

        // Finaliser le job
        job.status = 'completed';
        job.completedAt = new Date();
        job.progress.percentage = 100;
        job.results.errors = errors;
        job.results.summary = {
            totalDistance: Math.round(totalDistance * 100) / 100,
            totalTravelTime: Math.round(totalTravelTime),
            inconsistentSteps
        };
        
        await job.save();

        console.log(`✅ Calcul terminé pour le roadtrip ${job.roadtripId}`);
        console.log(`📊 Résumé: ${totalDistance.toFixed(2)}km, ${totalTravelTime}min, ${inconsistentSteps} incohérences`);

    } catch (error) {
        console.error('Erreur lors du traitement du job:', error);
        
        job.status = 'failed';
        job.completedAt = new Date();
        job.errorMessage = error.message;
        await job.save();
    }
}

// Fonction de traitement asynchrone des calculs (version originale sans sync)
async function processTravelTimeCalculation(jobId, steps) {
    const job = await TravelTimeJob.findById(jobId);
    
    if (!job) {
        console.error('Job not found:', jobId);
        return;
    }

    try {
        // Marquer le job comme démarré
        job.status = 'running';
        job.startedAt = new Date();
        await job.save();

        console.log(`🚀 Démarrage du calcul des temps de trajet pour le roadtrip ${job.roadtripId}`);

        let totalDistance = 0;
        let totalTravelTime = 0;
        let inconsistentSteps = 0;
        const errors = [];

        // Traiter chaque step (sauf le premier)
        for (let i = 1; i < steps.length; i++) {
            const step = steps[i];
            
            try {
                console.log(`📍 Traitement de l'étape ${i}/${steps.length - 1}: ${step.name}`);
                
                // Rafraîchir le temps de trajet pour cette étape
                const updatedStep = await refreshTravelTimeForStep(step);
                
                // Accumuler les statistiques
                if (updatedStep.distancePreviousStep) {
                    totalDistance += updatedStep.distancePreviousStep;
                }
                if (updatedStep.travelTimePreviousStep) {
                    totalTravelTime += updatedStep.travelTimePreviousStep;
                }
                if (!updatedStep.isArrivalTimeConsistent) {
                    inconsistentSteps++;
                }

                // Mettre à jour le progrès
                job.progress.completed = i;
                job.progress.percentage = Math.round((i / (steps.length - 1)) * 100);
                job.results.stepsProcessed = i;
                await job.save();

                // Petite pause pour éviter de surcharger l'API Google Maps
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                console.error(`Erreur lors du traitement de l'étape ${step.name}:`, error);
                errors.push({
                    stepId: step._id,
                    error: error.message
                });
            }
        }

        // Finaliser le job
        job.status = 'completed';
        job.completedAt = new Date();
        job.results.errors = errors;
        job.results.summary = {
            totalDistance: Math.round(totalDistance * 100) / 100, // Arrondir à 2 décimales
            totalTravelTime: Math.round(totalTravelTime),
            inconsistentSteps
        };
        
        await job.save();

        console.log(`✅ Calcul terminé pour le roadtrip ${job.roadtripId}`);
        console.log(`📊 Résumé: ${totalDistance.toFixed(2)}km, ${totalTravelTime}min, ${inconsistentSteps} incohérences`);

    } catch (error) {
        console.error('Erreur lors du traitement du job:', error);
        
        job.status = 'failed';
        job.completedAt = new Date();
        job.errorMessage = error.message;
        await job.save();
    }
}

// Méthode asynchrone pour lancer la synchronisation des heures des steps
export const startStepSynchronizationJob = async (req, res) => {
    try {
        const roadtrip = await Roadtrip.findById(req.params.idRoadtrip);

        if (!roadtrip) {
            return res.status(404).json({ msg: 'Roadtrip not found' });
        }

        // Vérifier si l'utilisateur est le propriétaire du roadtrip
        if (roadtrip.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        // Vérifier s'il y a déjà un job en cours pour ce roadtrip
        const existingJob = await StepSyncJob.findOne({
            roadtripId: req.params.idRoadtrip,
            status: { $in: ['pending', 'running'] }
        });

        if (existingJob) {
            return res.status(409).json({ 
                msg: 'Une synchronisation est déjà en cours pour ce roadtrip',
                jobId: existingJob._id,
                status: existingJob.status,
                progress: existingJob.progress
            });
        }

        // Récupérer les steps pour calculer le nombre total
        const steps = await Step.find({ roadtripId: req.params.idRoadtrip })
            .sort({ arrivalDateTime: 1 });

        // Créer un nouveau job
        const job = new StepSyncJob({
            userId: req.user.id,
            roadtripId: req.params.idRoadtrip,
            status: 'pending',
            progress: {
                total: steps.length,
                completed: 0,
                percentage: 0
            }
        });

        await job.save();

        // Lancer le traitement asynchrone
        processStepSynchronization(job._id, steps).catch(err => {
            console.error('Erreur lors du traitement du job de synchronisation:', err);
        });

        res.status(202).json({
            msg: 'Synchronisation des heures des steps démarrée',
            jobId: job._id,
            status: job.status,
            progress: job.progress,
            estimatedDuration: `${Math.ceil(steps.length * 0.5)} secondes` // Estimation plus rapide
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Méthode pour vérifier le statut d'un job de synchronisation
export const getStepSyncJobStatus = async (req, res) => {
    try {
        const job = await StepSyncJob.findById(req.params.jobId);

        if (!job) {
            return res.status(404).json({ msg: 'Job not found' });
        }

        // Vérifier si l'utilisateur est le propriétaire du job
        if (job.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        res.json({
            jobId: job._id,
            status: job.status,
            progress: job.progress,
            startedAt: job.startedAt,
            completedAt: job.completedAt,
            errorMessage: job.errorMessage,
            results: job.results
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Méthode pour lister les jobs de synchronisation d'un roadtrip
export const getStepSyncJobs = async (req, res) => {
    try {
        const roadtrip = await Roadtrip.findById(req.params.idRoadtrip);

        if (!roadtrip) {
            return res.status(404).json({ msg: 'Roadtrip not found' });
        }

        // Vérifier si l'utilisateur est le propriétaire du roadtrip
        if (roadtrip.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        // Récupérer les jobs des 7 derniers jours
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const jobs = await StepSyncJob.find({
            roadtripId: req.params.idRoadtrip,
            createdAt: { $gte: sevenDaysAgo }
        })
        .sort({ createdAt: -1 })
        .limit(10);

        res.json({
            roadtripId: req.params.idRoadtrip,
            jobs: jobs.map(job => ({
                jobId: job._id,
                status: job.status,
                progress: job.progress,
                createdAt: job.createdAt,
                startedAt: job.startedAt,
                completedAt: job.completedAt,
                errorMessage: job.errorMessage,
                results: job.status === 'completed' ? job.results.summary : null
            }))
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Fonction de traitement asynchrone de la synchronisation
async function processStepSynchronization(jobId, steps) {
    const job = await StepSyncJob.findById(jobId);
    
    if (!job) {
        console.error('Job not found:', jobId);
        return;
    }

    try {
        // Marquer le job comme démarré
        job.status = 'running';
        job.startedAt = new Date();
        await job.save();

        console.log(`🚀 Démarrage de la synchronisation des steps pour le roadtrip ${job.roadtripId}`);

        const errors = [];
        const details = [];
        let synchronizedCount = 0;
        let unchangedCount = 0;

        // Traiter chaque step
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            
            try {
                console.log(`📍 Synchronisation de l'étape ${i + 1}/${steps.length}: ${step.name}`);
                
                // Sauvegarder l'état avant
                const beforeState = {
                    arrivalDateTime: step.arrivalDateTime,
                    departureDateTime: step.departureDateTime
                };

                // Synchroniser les dates
                await updateStepDates(step._id);
                
                // Récupérer l'état après
                const updatedStep = await Step.findById(step._id);
                const afterState = {
                    arrivalDateTime: updatedStep.arrivalDateTime,
                    departureDateTime: updatedStep.departureDateTime
                };

                // Vérifier si quelque chose a changé
                const hasChanged = 
                    beforeState.arrivalDateTime?.getTime() !== afterState.arrivalDateTime?.getTime() ||
                    beforeState.departureDateTime?.getTime() !== afterState.departureDateTime?.getTime();

                if (hasChanged) {
                    synchronizedCount++;
                } else {
                    unchangedCount++;
                }

                // Ajouter aux détails
                details.push({
                    stepId: step._id,
                    stepName: step.name,
                    before: beforeState,
                    after: afterState,
                    changed: hasChanged
                });

                // Mettre à jour le progrès
                job.progress.completed = i + 1;
                job.progress.percentage = Math.round(((i + 1) / steps.length) * 100);
                job.results.stepsProcessed = i + 1;
                await job.save();

                // Petite pause pour éviter de surcharger la base
                await new Promise(resolve => setTimeout(resolve, 100));

            } catch (error) {
                console.error(`Erreur lors de la synchronisation de l'étape ${step.name}:`, error);
                errors.push({
                    stepId: step._id,
                    error: error.message
                });
            }
        }

        // Finaliser le job
        job.status = 'completed';
        job.completedAt = new Date();
        job.results.errors = errors;
        job.results.stepsSynchronized = synchronizedCount;
        job.results.summary = {
            totalSteps: steps.length,
            synchronizedSteps: synchronizedCount,
            unchangedSteps: unchangedCount,
            details
        };
        
        await job.save();

        console.log(`✅ Synchronisation terminée pour le roadtrip ${job.roadtripId}`);
        console.log(`📊 Résumé: ${synchronizedCount} steps synchronisés, ${unchangedCount} inchangés`);

    } catch (error) {
        console.error('Erreur lors du traitement du job de synchronisation:', error);
        
        job.status = 'failed';
        job.completedAt = new Date();
        job.errorMessage = error.message;
        await job.save();
    }
}

// Méthode pour synchroniser les heures d'un step spécifique
export const syncSingleStep = async (req, res) => {
    try {
        const { idRoadtrip, idStep } = req.params;

        // Vérifier que le roadtrip existe et appartient à l'utilisateur
        const roadtrip = await Roadtrip.findById(idRoadtrip);
        if (!roadtrip) {
            return res.status(404).json({ msg: 'Roadtrip not found' });
        }

        if (roadtrip.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        // Vérifier que le step existe et appartient au roadtrip
        const step = await Step.findById(idStep);
        if (!step) {
            return res.status(404).json({ msg: 'Step not found' });
        }

        if (step.roadtripId.toString() !== idRoadtrip) {
            return res.status(400).json({ msg: 'Step does not belong to this roadtrip' });
        }

        console.log(`🔄 Synchronisation du step individuel: ${step.name} (${idStep})`);

        // Sauvegarder l'état avant synchronisation
        const beforeState = {
            arrivalDateTime: step.arrivalDateTime,
            departureDateTime: step.departureDateTime
        };

        // Synchroniser les dates du step
        await updateStepDates(idStep);

        // Récupérer l'état après synchronisation
        const updatedStep = await Step.findById(idStep);
        const afterState = {
            arrivalDateTime: updatedStep.arrivalDateTime,
            departureDateTime: updatedStep.departureDateTime
        };

        // Vérifier si quelque chose a changé
        const hasChanged = 
            beforeState.arrivalDateTime?.getTime() !== afterState.arrivalDateTime?.getTime() ||
            beforeState.departureDateTime?.getTime() !== afterState.departureDateTime?.getTime();

        console.log(`✅ Synchronisation du step ${step.name} terminée. Changé: ${hasChanged}`);

        // Préparer la réponse
        const response = {
            msg: hasChanged ? 'Step synchronisé avec succès' : 'Step déjà synchronisé',
            stepId: idStep,
            stepName: step.name,
            changed: hasChanged,
            before: beforeState,
            after: afterState
        };

        // Si des changements ont été effectués, ajouter les détails
        if (hasChanged) {
            response.changes = {
                arrivalDateTime: {
                    changed: beforeState.arrivalDateTime?.getTime() !== afterState.arrivalDateTime?.getTime(),
                    before: beforeState.arrivalDateTime,
                    after: afterState.arrivalDateTime
                },
                departureDateTime: {
                    changed: beforeState.departureDateTime?.getTime() !== afterState.departureDateTime?.getTime(),
                    before: beforeState.departureDateTime,
                    after: afterState.departureDateTime
                }
            };
        }

        res.json(response);

    } catch (err) {
        console.error('Erreur lors de la synchronisation du step:', err.message);
        res.status(500).json({ 
            msg: 'Erreur lors de la synchronisation du step',
            error: err.message 
        });
    }
};

// Méthode pour corriger les dates et calculs d'un step spécifique
export const fixStepDates = async (req, res) => {
    try {
        const { idRoadtrip, idStep } = req.params;
        
        // Vérifier l'existence du roadtrip et de l'étape
        const roadtrip = await Roadtrip.findById(idRoadtrip);
        if (!roadtrip) {
            return res.status(404).json({ msg: 'Roadtrip not found' });
        }

        const step = await Step.findById(idStep);
        if (!step) {
            return res.status(404).json({ msg: 'Step not found' });
        }

        // Vérifier l'autorisation
        if (roadtrip.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        console.log(`🔧 Correction des dates pour le step: ${step.name} (${idStep})`);
        
        // État avant les modifications
        const beforeState = {
            stepArrival: step.arrivalDateTime,
            stepDeparture: step.departureDateTime
        };

        // 1. Corriger le calcul des nuits pour les accommodations
        const accommodations = await Accommodation.find({ stepId: idStep });
        const accommodationsFixes = [];
        
        for (const accommodation of accommodations) {
            const oldNights = accommodation.nights;
            const calculatedNights = calculateNights(accommodation.arrivalDateTime, accommodation.departureDateTime);
            
            if (oldNights !== calculatedNights) {
                accommodation.nights = calculatedNights;
                await accommodation.save();
                
                accommodationsFixes.push({
                    name: accommodation.name,
                    oldNights,
                    newNights: calculatedNights,
                    arrivalDateTime: accommodation.arrivalDateTime,
                    departureDateTime: accommodation.departureDateTime
                });
                
                console.log(`  🏨 ${accommodation.name}: ${oldNights} → ${calculatedNights} nuits`);
            }
        }

        // 2. Synchroniser les dates du step
        await updateStepDatesAndTravelTime(idStep);
        
        // Récupérer l'état après synchronisation
        const updatedStep = await Step.findById(idStep);
        const afterState = {
            stepArrival: updatedStep.arrivalDateTime,
            stepDeparture: updatedStep.departureDateTime
        };

        // Vérifier si le step a changé
        const stepChanged = 
            beforeState.stepArrival?.getTime() !== afterState.stepArrival?.getTime() ||
            beforeState.stepDeparture?.getTime() !== afterState.stepDeparture?.getTime();

        console.log(`  📋 Step dates: ${beforeState.stepArrival} → ${afterState.stepArrival}`);
        console.log(`  📋 Step dates: ${beforeState.stepDeparture} → ${afterState.stepDeparture}`);

        const response = {
            msg: 'Correction des dates terminée',
            stepId: idStep,
            stepName: step.name,
            fixes: {
                accommodationsFixed: accommodationsFixes.length,
                stepDatesChanged: stepChanged,
                accommodationDetails: accommodationsFixes
            },
            before: beforeState,
            after: afterState
        };

        res.json(response);

    } catch (err) {
        console.error('Erreur lors de la correction des dates:', err.message);
        res.status(500).json({ 
            msg: 'Erreur lors de la correction des dates',
            error: err.message 
        });
    }
};
