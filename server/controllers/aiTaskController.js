import RoadtripTask from '../models/RoadtripTask.js';
import Roadtrip from '../models/Roadtrip.js';
import Step from '../models/Step.js';
import AITaskJob from '../models/AITaskJob.js';
import { genererTachesRoadtrip } from '../utils/openAI/genererTaches.js';

/**
 * Démarre la génération asynchrone de tâches par IA
 * @route POST /api/roadtrips/:roadtripId/tasks/generate-ai-async
 */
export const startAITaskGeneration = async (req, res) => {
    try {
        const { roadtripId } = req.params;
        const { replace = false } = req.body;

        // Vérifier que le roadtrip appartient à l'utilisateur
        const roadtrip = await Roadtrip.findOne({ 
            _id: roadtripId, 
            userId: req.user.id 
        });

        if (!roadtrip) {
            return res.status(404).json({ 
                msg: 'Roadtrip non trouvé ou vous n\'avez pas les permissions nécessaires' 
            });
        }

        // Vérifier s'il y a déjà un job en cours
        const existingJob = await AITaskJob.findOne({
            roadtripId: roadtripId,
            userId: req.user.id,
            status: { $in: ['pending', 'in_progress'] }
        });

        if (existingJob) {
            return res.status(409).json({
                msg: 'Une génération de tâches est déjà en cours pour ce roadtrip',
                jobId: existingJob._id
            });
        }

        // Vérifier les tâches existantes si replace = false
        if (!replace) {
            const existingTasksCount = await RoadtripTask.countDocuments({ 
                roadtripId: roadtripId 
            });

            if (existingTasksCount > 0) {
                return res.status(400).json({ 
                    msg: 'Des tâches existent déjà pour ce roadtrip. Utilisez replace=true pour les remplacer.',
                    existingTasksCount
                });
            }
        }

        // Créer le job
        const job = new AITaskJob({
            userId: req.user.id,
            roadtripId: roadtripId,
            status: 'pending',
            parameters: { replace }
        });

        await job.save();

        // Démarrer le traitement asynchrone
        processAITaskGeneration(job._id).catch(err => {
            console.error('Erreur lors du traitement asynchrone:', err);
        });

        res.status(202).json({
            msg: 'Génération de tâches par IA démarrée',
            jobId: job._id,
            status: 'pending',
            estimatedDuration: 30
        });

    } catch (err) {
        console.error('Error starting AI task generation:', err);
        res.status(500).json({ 
            msg: 'Erreur serveur lors du démarrage de la génération',
            error: err.message 
        });
    }
};

/**
 * Récupère le statut d'un job de génération
 * @route GET /api/roadtrips/:roadtripId/tasks/generate-ai-async/:jobId
 */
export const getAITaskGenerationStatus = async (req, res) => {
    try {
        const { roadtripId, jobId } = req.params;

        const job = await AITaskJob.findOne({
            _id: jobId,
            roadtripId: roadtripId,
            userId: req.user.id
        }).populate('result.tasks');

        if (!job) {
            return res.status(404).json({ 
                msg: 'Job de génération non trouvé' 
            });
        }

        const response = {
            jobId: job._id,
            status: job.status,
            progress: job.progress,
            currentStep: job.currentStep,
            createdAt: job.createdAt,
            estimatedDuration: job.estimatedDuration
        };

        // Ajouter les résultats si terminé
        if (job.status === 'completed') {
            response.result = {
                tasks: job.result.tasks,
                count: job.result.count
            };
            response.completedAt = job.completedAt;
        }

        // Ajouter l'erreur si échoué
        if (job.status === 'failed') {
            response.error = job.error;
            response.completedAt = job.completedAt;
        }

        // Ajouter le temps de traitement si terminé
        if (job.completedAt) {
            response.processingTime = Math.round((job.completedAt - job.createdAt) / 1000);
        }

        res.json(response);

    } catch (err) {
        console.error('Error getting AI task generation status:', err);
        res.status(500).json({ 
            msg: 'Erreur serveur lors de la récupération du statut',
            error: err.message 
        });
    }
};

/**
 * Annule un job de génération en cours
 * @route DELETE /api/roadtrips/:roadtripId/tasks/generate-ai-async/:jobId
 */
export const cancelAITaskGeneration = async (req, res) => {
    try {
        const { roadtripId, jobId } = req.params;

        const job = await AITaskJob.findOne({
            _id: jobId,
            roadtripId: roadtripId,
            userId: req.user.id
        });

        if (!job) {
            return res.status(404).json({ 
                msg: 'Job de génération non trouvé' 
            });
        }

        if (job.status === 'completed') {
            return res.status(400).json({ 
                msg: 'Impossible d\'annuler un job terminé' 
            });
        }

        if (job.status === 'failed') {
            return res.status(400).json({ 
                msg: 'Le job a déjà échoué' 
            });
        }

        // Marquer comme échoué avec raison d'annulation
        job.status = 'failed';
        job.currentStep = 'Annulé par l\'utilisateur';
        job.error = {
            message: 'Job annulé par l\'utilisateur',
            code: 'USER_CANCELLED'
        };
        job.completedAt = new Date();

        await job.save();

        res.json({
            msg: 'Job de génération annulé',
            jobId: job._id
        });

    } catch (err) {
        console.error('Error canceling AI task generation:', err);
        res.status(500).json({ 
            msg: 'Erreur serveur lors de l\'annulation',
            error: err.message 
        });
    }
};

/**
 * Traite la génération de tâches de manière asynchrone
 * @param {string} jobId - ID du job à traiter
 */
async function processAITaskGeneration(jobId) {
    let job;
    
    try {
        // Récupérer le job
        job = await AITaskJob.findById(jobId);
        if (!job) {
            throw new Error('Job non trouvé');
        }

        // Marquer comme en cours
        job.status = 'in_progress';
        job.startedAt = new Date();
        await job.updateProgress(10, 'Récupération des données du roadtrip');

        // Récupérer les données du roadtrip
        const roadtrip = await Roadtrip.findById(job.roadtripId);
        if (!roadtrip) {
            throw new Error('Roadtrip non trouvé');
        }

        await job.updateProgress(20, 'Récupération des étapes du roadtrip');

        // Récupérer les étapes
        const steps = await Step.find({ 
            roadtripId: job.roadtripId,
            userId: job.userId
        }).populate('accommodations');

        await job.updateProgress(30, 'Suppression des anciennes tâches si nécessaire');

        // Supprimer les tâches existantes si replace = true
        if (job.parameters.replace) {
            await RoadtripTask.deleteMany({ roadtripId: job.roadtripId });
        }

        await job.updateProgress(40, 'Génération des tâches par IA');

        // Générer les tâches avec l'IA
        const generatedTasks = await genererTachesRoadtrip(roadtrip, steps);

        await job.updateProgress(70, 'Traitement des dates d\'échéance');

        // Traiter les tâches et calculer les dates d'échéance
        const processedTasks = generatedTasks.map((task, index) => {
            const dueDate = parseDueDateText(task.dueDate, roadtrip.startDateTime);

            return {
                userId: job.userId,
                roadtripId: job.roadtripId,
                title: task.title,
                description: task.description || '',
                category: task.category,
                priority: task.priority || 'medium',
                dueDate: dueDate,
                status: 'pending',
                order: index
            };
        });

        await job.updateProgress(85, 'Sauvegarde des tâches en base');

        // Créer toutes les tâches
        const createdTasks = await RoadtripTask.insertMany(processedTasks);

        await job.updateProgress(100, 'Terminé');

        // Marquer le job comme terminé
        await job.markCompleted(createdTasks);

        console.log(`Job ${jobId} terminé avec succès: ${createdTasks.length} tâches créées`);

    } catch (error) {
        console.error(`Erreur lors du traitement du job ${jobId}:`, error);
        
        if (job) {
            await job.markFailed(error);
        }
    }
}

/**
 * Parse le texte de date d'échéance et calcule la date réelle
 * @param {string} dueDateText - Texte décrivant l'échéance
 * @param {Date} startDate - Date de début du roadtrip
 * @returns {Date} - Date d'échéance calculée
 */
function parseDueDateText(dueDateText, startDate) {
    try {
        if (!startDate) return null;
        
        const tripStartDate = new Date(startDate);
        
        if (!dueDateText) return null;
        
        const dayBeforePattern = /(\d+)\s*(?:jour|jours|j)\s*avant/i;
        const weekBeforePattern = /(\d+)\s*(?:semaine|semaines|sem)\s*avant/i;
        const monthBeforePattern = /(\d+)\s*(?:mois)\s*avant/i;
        
        let dueDate = new Date(tripStartDate);
        
        if (dayBeforePattern.test(dueDateText)) {
            const days = parseInt(dueDateText.match(dayBeforePattern)[1]);
            dueDate.setDate(dueDate.getDate() - days);
            return dueDate;
        }
        
        if (weekBeforePattern.test(dueDateText)) {
            const weeks = parseInt(dueDateText.match(weekBeforePattern)[1]);
            dueDate.setDate(dueDate.getDate() - (weeks * 7));
            return dueDate;
        }
        
        if (monthBeforePattern.test(dueDateText)) {
            const months = parseInt(dueDateText.match(monthBeforePattern)[1]);
            dueDate.setMonth(dueDate.getMonth() - months);
            return dueDate;
        }
        
        if (dueDateText.includes('jour du départ') || dueDateText.includes('jour même')) {
            return tripStartDate;
        }
        
        if (dueDateText.includes('immédiatement') || dueDateText.includes('dès que possible')) {
            return new Date();
        }
        
        dueDate.setDate(dueDate.getDate() - 7);
        return dueDate;
        
    } catch (error) {
        console.error('Error parsing due date:', error);
        return null;
    }
}
