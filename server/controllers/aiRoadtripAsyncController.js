import Roadtrip from '../models/Roadtrip.js';
import Step from '../models/Step.js';
import Accommodation from '../models/Accommodation.js';
import Activity from '../models/Activity.js';
import AIRoadtripJob from '../models/AIRoadtripJob.js';
import { getCoordinates } from '../utils/googleMapsUtils.js';
import { updateStepDatesAndTravelTime } from '../utils/travelTimeUtils.js';
import { 
    genererPlanRoadtrip, 
    genererDetailsEtape,
    envoyerEmailNotification 
} from '../utils/openAI/genererRoadtrip.js';

/**
 * Lance la génération asynchrone d'un roadtrip complet via l'IA
 * @route POST /roadtrips/ai/async
 */
export const startAsyncRoadtripGeneration = async (req, res) => {
    try {
        console.log("Démarrage de la génération asynchrone du roadtrip:", JSON.stringify(req.body, null, 2));
        
        // Extraction des paramètres avec prise en compte de formats variés
        const {
            startLocation,        // Point de départ (obligatoire)
            endLocation,          // Destination finale optionnelle
            destination,          // Alternative à endLocation
            startDate,            // Date de début explicite
            endDate,              // Date de fin explicite
            dates,                // Format alternatif "01/08/2025 au 23/08/2025"
            duration,             // Durée en jours
            budget,               // Budget global
            travelers,            // Nombre et profil des voyageurs
            prompt,               // Description en langage naturel
            description,          // Description alternative
            preferences,          // Préférences de voyage
            constraints           // Contraintes
        } = req.body;
        
        // Variables normalisées
        let normalizedStartLocation = startLocation;
        let normalizedEndLocation = endLocation || destination;
        let normalizedStartDate = startDate;
        let normalizedEndDate = endDate;
        let normalizedDuration = duration;
        let normalizedDescription = description || prompt || '';

        // Validation du point de départ
        if (!normalizedStartLocation) {
            return res.status(400).json({ msg: 'Le point de départ est requis' });
        }

        // Traitement du format de dates alternatif (ex: "01/08/2025 au 23/08/2025")
        if (dates && typeof dates === 'string') {
            // Détecter différents formats de date possibles
            const datePatterns = [
                // Format "01/08/2025 au 23/08/2025"
                /(\d{1,2}\/\d{1,2}\/\d{2,4})\s*(?:au|à|to|-)\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
                // Format "du 01/08/2025 au 23/08/2025"
                /du\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s*(?:au|à)\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
                // Format "1er août au 23 août 2025"
                /((?:\d{1,2}(?:er|ème|e|è)?)\s+\w+)(?:\s+\d{4})?\s*(?:au|à)\s*((?:\d{1,2}(?:er|ème|e|è)?)\s+\w+)(?:\s+(\d{4}))?/i
            ];
            
            let dateMatch = null;
            let patternIndex = -1;
            
            // Tester chaque pattern jusqu'à trouver une correspondance
            for (let i = 0; i < datePatterns.length; i++) {
                const match = dates.match(datePatterns[i]);
                if (match && match.length >= 3) {
                    dateMatch = match;
                    patternIndex = i;
                    break;
                }
            }
            
            if (dateMatch) {
                try {
                    if (patternIndex === 0 || patternIndex === 1) {
                        // Parser les dates au format DD/MM/YYYY
                        const [day1, month1, rawYear1] = dateMatch[1].split('/');
                        const year1 = rawYear1.length === 2 ? '20' + rawYear1 : rawYear1;
                        normalizedStartDate = `${year1}-${month1.padStart(2, '0')}-${day1.padStart(2, '0')}`;
                        
                        const [day2, month2, rawYear2] = dateMatch[2].split('/');
                        const year2 = rawYear2.length === 2 ? '20' + rawYear2 : rawYear2;
                        normalizedEndDate = `${year2}-${month2.padStart(2, '0')}-${day2.padStart(2, '0')}`;
                    } else if (patternIndex === 2) {
                        // Traitement des dates en format texte (1er août au 23 août 2025)
                        console.log("Format texte détecté, utilisation de date par défaut");
                        const year = dateMatch[3] || new Date().getFullYear();
                        
                        // Pour simplifier, on utilise des dates génériques basées sur l'année mentionnée
                        normalizedStartDate = `${year}-08-01`;  // Par défaut 1er août
                        normalizedEndDate = `${year}-08-23`;    // Par défaut 23 août
                    }
                    
                    // Calculer la durée en jours
                    const startDateObj = new Date(normalizedStartDate);
                    const endDateObj = new Date(normalizedEndDate);
                    const diffTime = Math.abs(endDateObj - startDateObj);
                    normalizedDuration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                } catch (e) {
                    console.error("Erreur lors du parsing des dates:", e);
                }
            }
        }

        // Vérifier qu'on a au moins une date de début ou une durée
        if (!normalizedStartDate && !normalizedDuration) {
            return res.status(400).json({ msg: 'La date de début ou la durée est requise' });
        }

        // Calculer la date de fin si elle n'est pas fournie mais que la durée l'est
        let calculatedEndDate = normalizedEndDate;
        if (normalizedStartDate && normalizedDuration && !normalizedEndDate) {
            const start = new Date(normalizedStartDate);
            calculatedEndDate = new Date(start);
            calculatedEndDate.setDate(start.getDate() + parseInt(normalizedDuration));
        }

        // Obtenir les coordonnées géographiques du point de départ
        let startCoordinates = {};
        try {
            startCoordinates = await getCoordinates(normalizedStartLocation, 'object');
        } catch (error) {
            console.error('Error getting coordinates for start location:', error);
            return res.status(400).json({ msg: 'Impossible de géocoder le point de départ' });
        }

        // Obtenir les coordonnées géographiques du point d'arrivée (si fourni)
        let endCoordinates = {};
        if (normalizedEndLocation) {
            try {
                endCoordinates = await getCoordinates(normalizedEndLocation, 'object');
            } catch (error) {
                console.error('Error getting coordinates for end location:', error);
                // On continue même si on ne peut pas géocoder le point d'arrivée
            }
        }

        // Créer un nouveau job de génération de roadtrip
        const newJob = new AIRoadtripJob({
            userId: req.user.id,
            status: 'pending',
            parameters: {
                startLocation: {
                    address: normalizedStartLocation,
                    coordinates: startCoordinates
                },
                endLocation: normalizedEndLocation ? {
                    address: normalizedEndLocation,
                    coordinates: endCoordinates
                } : null,
                startDate: normalizedStartDate ? new Date(normalizedStartDate) : null,
                endDate: calculatedEndDate ? new Date(calculatedEndDate) : (normalizedEndDate ? new Date(normalizedEndDate) : null),
                duration: normalizedDuration,
                budget: budget,
                travelers: travelers,
                description: normalizedDescription,
                preferences: preferences,
                constraints: constraints
            }
        });

        // Sauvegarder le job
        const savedJob = await newJob.save();

        // Lancer le traitement asynchrone (sans attendre la fin)
        processRoadtripJob(savedJob._id).catch(err => {
            console.error(`Erreur dans le processus asynchrone pour le job ${savedJob._id}:`, err);
        });

        // Répondre immédiatement avec l'ID du job
        res.status(202).json({
            jobId: savedJob._id,
            message: "Génération de roadtrip lancée avec succès",
            status: savedJob.status,
            estimatedTime: "5-10 minutes"
        });

    } catch (err) {
        console.error('Error starting AI roadtrip generation:', err);
        res.status(500).json({ 
            msg: 'Erreur serveur lors de la génération du roadtrip',
            error: err.message 
        });
    }
};

/**
 * Récupère le statut d'un job de génération de roadtrip
 * @route GET /roadtrips/ai/jobs/:jobId
 */
export const getRoadtripJobStatus = async (req, res) => {
    try {
        const job = await AIRoadtripJob.findById(req.params.jobId);
        
        if (!job) {
            return res.status(404).json({ msg: 'Job not found' });
        }
        
        // Vérifier que l'utilisateur est le propriétaire du job
        if (job.userId.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'User not authorized' });
        }
        
        // Préparer la réponse
        const response = {
            jobId: job._id,
            status: job.status,
            progress: job.progress,
            startedAt: job.startedAt,
            completedAt: job.completedAt,
            errorMessage: job.errorMessage
        };
        
        // Ajouter les résultats si le job est terminé
        if (job.status === 'completed') {
            response.results = {
                roadtripId: job.results.roadtripId,
                stepsCreated: job.results.stepsCreated,
                accommodationsCreated: job.results.accommodationsCreated,
                activitiesCreated: job.results.activitiesCreated
            };
        }
        
        res.json(response);
    } catch (err) {
        console.error('Error getting roadtrip job status:', err);
        res.status(500).json({ msg: 'Server error' });
    }
};

/**
 * Récupère l'historique des jobs de génération de roadtrip d'un utilisateur
 * @route GET /roadtrips/ai/jobs
 */
export const getRoadtripJobsHistory = async (req, res) => {
    try {
        const jobs = await AIRoadtripJob.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .select('_id status progress startedAt completedAt results.roadtripId errorMessage createdAt')
            .limit(20);
        
        res.json({ jobs });
    } catch (err) {
        console.error('Error getting roadtrip jobs history:', err);
        res.status(500).json({ msg: 'Server error' });
    }
};

/**
 * Fonction asynchrone qui exécute le processus de génération de roadtrip
 * Cette fonction n'est pas un endpoint API mais un processus en arrière-plan
 */
async function processRoadtripJob(jobId) {
    // Récupérer le job
    const job = await AIRoadtripJob.findById(jobId);
    if (!job) {
        console.error(`Job ${jobId} non trouvé`);
        return;
    }
    
    try {
        // Mettre à jour le statut du job
        job.status = 'planning';
        job.startedAt = new Date();
        await job.save();
        
        // ÉTAPE 1: Génération du plan global du roadtrip
        console.log(`[Job ${jobId}] Début de la planification du roadtrip`);
        const planResult = await genererPlanRoadtrip(job.parameters);
        
        // Enregistrer les détails de l'appel à l'API
        job.aiApiCalls.push({
            agent: 'planner',
            timestamp: new Date(),
            prompt: JSON.stringify(job.parameters),
            response: JSON.stringify(planResult.data),
            tokensUsed: planResult.tokensUsed,
            model: planResult.model,
            success: true
        });
        
        // Stocker le plan dans le job
        job.planData = planResult.data;
        job.totalSteps = planResult.data.steps.length;
        job.progress.total = planResult.data.steps.length;
        job.progress.completed = 0;
        job.progress.percentage = 0;
        await job.save();
        
        // ÉTAPE 2: Génération des détails pour chaque étape
        job.status = 'detailing';
        await job.save();
        
        console.log(`[Job ${jobId}] Début de la génération des détails pour ${job.totalSteps} étapes`);
        
        for (let i = 0; i < job.planData.steps.length; i++) {
            const step = job.planData.steps[i];
            job.currentStep = i + 1;
            
            console.log(`[Job ${jobId}] Traitement de l'étape ${i+1}/${job.totalSteps}: ${step.name}`);
            
            // Marquer l'étape comme en cours de traitement
            step.processingStatus = 'processing';
            await job.save();
            
            try {
                // Générer les détails de l'étape
                const stepDetails = await genererDetailsEtape(step, job.parameters);
                
                // Mettre à jour les détails de l'étape dans le plan
                Object.assign(job.planData.steps[i], stepDetails.data);
                job.planData.steps[i].processingStatus = 'completed';
                
                // Enregistrer l'appel à l'API
                job.aiApiCalls.push({
                    agent: 'detailer',
                    timestamp: new Date(),
                    prompt: JSON.stringify(step),
                    response: JSON.stringify(stepDetails.data),
                    tokensUsed: stepDetails.tokensUsed,
                    model: stepDetails.model,
                    success: true
                });
                
                // Mettre à jour la progression
                job.progress.completed = i + 1;
                job.progress.percentage = Math.round((job.progress.completed / job.progress.total) * 100);
                await job.save();
            } catch (error) {
                console.error(`[Job ${jobId}] Erreur lors de la génération des détails pour l'étape ${step.name}:`, error);
                
                // Enregistrer l'erreur
                job.planData.steps[i].processingStatus = 'failed';
                job.aiApiCalls.push({
                    agent: 'detailer',
                    timestamp: new Date(),
                    prompt: JSON.stringify(step),
                    error: error.message,
                    success: false
                });
                
                if (!job.results.errors) job.results.errors = [];
                job.results.errors.push({
                    step: step.name,
                    error: error.message
                });
                
                await job.save();
                
                // Continuer avec l'étape suivante malgré l'erreur
                continue;
            }
        }
        
        // ÉTAPE 3: Création des entités dans MongoDB
        job.status = 'creating';
        await job.save();
        
        console.log(`[Job ${jobId}] Début de la création des entités dans la base de données`);
        
        // Créer le roadtrip
        const newRoadtrip = new Roadtrip({
            userId: job.userId,
            name: job.planData.name,
            startLocation: job.parameters.startLocation.address,
            startDateTime: job.parameters.startDate,
            endLocation: job.parameters.endLocation ? job.parameters.endLocation.address : job.planData.steps[job.planData.steps.length - 1].location,
            endDateTime: job.parameters.endDate,
            currency: job.planData.currency || 'EUR',
            notes: job.planData.description || job.parameters.description
        });
        
        const savedRoadtrip = await newRoadtrip.save();
        job.results.roadtripId = savedRoadtrip._id;
        await job.save();
        
        // Créer les étapes et leurs éléments associés
        const createdSteps = [];
        
        for (const stepData of job.planData.steps) {
            if (stepData.processingStatus !== 'completed') {
                console.warn(`[Job ${jobId}] Étape ${stepData.name} ignorée car son statut est ${stepData.processingStatus}`);
                continue;
            }
            
            // Obtenir les coordonnées de l'étape
            let stepCoordinates = {};
            try {
                stepCoordinates = await getCoordinates(stepData.location, 'object');
            } catch (error) {
                console.error(`[Job ${jobId}] Erreur lors de la géolocalisation de l'étape ${stepData.name}:`, error);
            }
            
            // Créer l'étape
            const newStep = new Step({
                type: stepData.type || 'Stage',
                name: stepData.name,
                address: stepData.location,
                latitude: stepCoordinates.lat || 0,
                longitude: stepCoordinates.lng || 0,
                arrivalDateTime: new Date(stepData.arrivalDateTime),
                departureDateTime: new Date(stepData.departureDateTime),
                notes: stepData.description || '',
                roadtripId: savedRoadtrip._id,
                userId: job.userId
            });
            
            const savedStep = await newStep.save();
            createdSteps.push(savedStep._id);
            job.results.stepsCreated++;
            
            // Ajouter les hébergements
            if (stepData.accommodations && Array.isArray(stepData.accommodations) && stepData.accommodations.length > 0) {
                for (const accomData of stepData.accommodations) {
                    // Obtenir les coordonnées
                    let accomCoordinates = {};
                    try {
                        accomCoordinates = await getCoordinates(accomData.address, 'object');
                    } catch (error) {
                        console.error(`[Job ${jobId}] Erreur lors de la géolocalisation de l'hébergement ${accomData.name}:`, error);
                    }
                    
                    // Créer l'hébergement
                    const newAccommodation = new Accommodation({
                        stepId: savedStep._id,
                        roadtripId: savedRoadtrip._id,
                        userId: job.userId,
                        name: accomData.name,
                        address: accomData.address,
                        latitude: accomCoordinates.lat || 0,
                        longitude: accomCoordinates.lng || 0,
                        arrivalDateTime: new Date(stepData.arrivalDateTime),
                        departureDateTime: new Date(stepData.departureDateTime),
                        nights: accomData.nights || 1,
                        price: accomData.price || 0,
                        currency: accomData.currency || 'EUR',
                        notes: accomData.description || ''
                    });
                    
                    const savedAccommodation = await newAccommodation.save();
                    job.results.accommodationsCreated++;
                    
                    // Ajouter l'ID de l'hébergement à l'étape
                    await Step.findByIdAndUpdate(
                        savedStep._id,
                        { $push: { accommodations: savedAccommodation._id } },
                        { new: true }
                    );
                }
            }
            
            // Ajouter les activités
            if (stepData.activities && Array.isArray(stepData.activities) && stepData.activities.length > 0) {
                for (const activityData of stepData.activities) {
                    // Obtenir les coordonnées
                    let activityCoordinates = {};
                    try {
                        activityCoordinates = await getCoordinates(activityData.address, 'object');
                    } catch (error) {
                        console.error(`[Job ${jobId}] Erreur lors de la géolocalisation de l'activité ${activityData.name}:`, error);
                    }
                    
                    // Créer l'activité
                    const newActivity = new Activity({
                        stepId: savedStep._id,
                        roadtripId: savedRoadtrip._id,
                        userId: job.userId,
                        name: activityData.name,
                        type: activityData.type || 'Visite',
                        address: activityData.address,
                        latitude: activityCoordinates.lat || 0,
                        longitude: activityCoordinates.lng || 0,
                        startDateTime: new Date(activityData.startDateTime || stepData.arrivalDateTime),
                        endDateTime: new Date(activityData.endDateTime || activityData.startDateTime),
                        duration: activityData.duration || 60,
                        typeDuration: activityData.typeDuration || 'M',
                        price: activityData.price || 0,
                        currency: activityData.currency || 'EUR',
                        notes: activityData.description || ''
                    });
                    
                    const savedActivity = await newActivity.save();
                    job.results.activitiesCreated++;
                    
                    // Ajouter l'ID de l'activité à l'étape
                    await Step.findByIdAndUpdate(
                        savedStep._id,
                        { $push: { activities: savedActivity._id } },
                        { new: true }
                    );
                }
            }
            
            // Calculer le temps de trajet pour l'étape
            await updateStepDatesAndTravelTime(savedStep._id);
        }
        
        // Mettre à jour le roadtrip avec les étapes créées
        savedRoadtrip.steps = createdSteps;
        await savedRoadtrip.save();
        
        // Finaliser le job
        job.status = 'completed';
        job.completedAt = new Date();
        job.progress.percentage = 100;
        await job.save();
        
        // Envoyer une notification par email (si implémenté)
        try {
            await envoyerEmailNotification(job.userId, {
                type: 'roadtripGenerated',
                roadtripId: savedRoadtrip._id,
                roadtripName: savedRoadtrip.name
            });
            
            job.notifications.emailSent = true;
            job.notifications.emailSentAt = new Date();
            await job.save();
        } catch (error) {
            console.error(`[Job ${jobId}] Erreur lors de l'envoi de l'email de notification:`, error);
        }
        
        console.log(`[Job ${jobId}] Génération du roadtrip terminée avec succès`);
        
    } catch (error) {
        console.error(`[Job ${jobId}] Erreur critique lors du traitement du job:`, error);
        
        // Mettre à jour le job avec l'erreur
        job.status = 'failed';
        job.errorMessage = error.message;
        job.completedAt = new Date();
        await job.save();
    }
}
