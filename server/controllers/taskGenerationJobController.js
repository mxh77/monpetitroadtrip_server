import TaskGenerationJob from '../models/TaskGenerationJob.js';
import RoadtripTask from '../models/RoadtripTask.js';
import Roadtrip from '../models/Roadtrip.js';
import Step from '../models/Step.js';
import { genererTachesRoadtrip } from '../utils/openAI/genererTaches.js';
import { parseDueDateText } from './roadtripTaskController.js';

/**
 * Lancer un job asynchrone de génération de tâches par IA
 * @route POST /api/roadtrips/:roadtripId/tasks/generate-ai-async
 */
export const startTaskGenerationJob = async (req, res) => {
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

        // Vérifier s'il y a des tâches existantes et si replace est requis
        if (!replace) {
            const existingTasksCount = await RoadtripTask.countDocuments({ roadtripId });
            
            if (existingTasksCount > 0) {
                return res.status(400).json({
                    msg: 'Des tâches existent déjà pour ce roadtrip. Utilisez replace=true pour les remplacer.',
                    existingTasksCount
                });
            }
        }

        // Vérifier s'il y a déjà un job en cours pour ce roadtrip
        const existingJob = await TaskGenerationJob.findOne({
            roadtripId,
            status: { $in: ['pending', 'processing'] }
        });

        if (existingJob) {
            return res.status(409).json({
                msg: 'Un job de génération de tâches est déjà en cours pour ce roadtrip',
                jobId: existingJob._id,
                status: existingJob.status
            });
        }

        // Créer un nouveau job
        const newJob = new TaskGenerationJob({
            roadtripId,
            userId: req.user.id,
            status: 'pending',
            options: {
                replace
            }
        });

        await newJob.save();

        // Lancer le processus de génération en arrière-plan
        setImmediate(() => processTaskGenerationJob(newJob._id));

        // Réponse immédiate
        res.status(202).json({
            msg: 'Génération de tâches lancée avec succès',
            jobId: newJob._id,
            status: newJob.status
        });

    } catch (err) {
        console.error('Error starting task generation job:', err);
        res.status(500).json({ 
            msg: 'Erreur serveur lors du lancement du job de génération',
            error: err.message 
        });
    }
};

/**
 * Fonction de traitement du job asynchrone
 * @param {string} jobId - ID du job à traiter
 */
async function processTaskGenerationJob(jobId) {
    const job = await TaskGenerationJob.findById(jobId);
    
    if (!job || job.status !== 'pending') {
        console.log(`Job ${jobId} non trouvé ou déjà traité`);
        return;
    }

    try {
        // Marquer le job comme en cours de traitement
        job.status = 'processing';
        await job.save();

        // Récupérer le roadtrip
        const roadtrip = await Roadtrip.findById(job.roadtripId);
        if (!roadtrip) {
            throw new Error('Roadtrip non trouvé');
        }

        // Récupérer les étapes du roadtrip pour un meilleur contexte
        const steps = await Step.find({ 
            roadtripId: job.roadtripId,
            userId: job.userId
        }).populate('accommodations');

        // Si l'option replace est activée, supprimer les tâches existantes
        if (job.options.replace) {
            await RoadtripTask.deleteMany({ roadtripId: job.roadtripId });
        }

        // Générer les tâches avec l'IA
        const generatedTasks = await genererTachesRoadtrip(roadtrip, steps);

        // Définir les catégories autorisées (selon le modèle Mongoose)
        const validCategories = [
            'preparation', 'booking', 'packing', 'documents', 'transport', 
            'accommodation', 'activities', 'health', 'finances', 'communication', 'other'
        ];

        // Filtrer les tâches avec des catégories valides
        const validTasks = generatedTasks.filter(task => {
            const isValid = validCategories.includes(task.category);
            if (!isValid) {
                console.warn(`Tâche ignorée - catégorie invalide "${task.category}": ${task.title}`);
            }
            return isValid;
        });

        // Calculer les dates d'échéance réelles en fonction des indications textuelles
        const processedTasks = validTasks.map((task, index) => {
            // Parse la date d'échéance relative (ex: "3 jours avant le départ")
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

        // Créer toutes les tâches
        const createdTasks = await RoadtripTask.insertMany(processedTasks);

        // Mettre à jour le job avec le résultat
        job.status = 'completed';
        job.result = {
            taskCount: createdTasks.length,
            generatedCount: generatedTasks.length,
            filteredCount: generatedTasks.length - validTasks.length
        };
        job.completedAt = new Date();
        await job.save();

        console.log(`Job ${jobId} terminé avec succès: ${createdTasks.length} tâches créées sur ${generatedTasks.length} générées (${generatedTasks.length - validTasks.length} filtrées)`);

        // Log si des tâches ont été filtrées
        if (generatedTasks.length - validTasks.length > 0) {
            console.log(`Attention: ${generatedTasks.length - validTasks.length} tâches ont été filtrées à cause de catégories invalides`);
        }

    } catch (error) {
        console.error(`Erreur lors du traitement du job ${jobId}:`, error);
        
        job.status = 'failed';
        job.result = {
            error: error.message || 'Erreur inconnue'
        };
        await job.save();
    }
}

/**
 * Récupérer le statut d'un job de génération de tâches
 * @route GET /api/roadtrips/:roadtripId/tasks/jobs/:jobId
 */
export const getTaskGenerationJobStatus = async (req, res) => {
    try {
        const { roadtripId, jobId } = req.params;

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

        // Récupérer le job
        const job = await TaskGenerationJob.findById(jobId);

        if (!job) {
            return res.status(404).json({ 
                msg: 'Job de génération non trouvé' 
            });
        }

        // Vérifier que le job appartient au roadtrip et à l'utilisateur
        if (job.roadtripId.toString() !== roadtripId || job.userId.toString() !== req.user.id) {
            return res.status(401).json({ 
                msg: 'Vous n\'avez pas les permissions nécessaires pour accéder à ce job' 
            });
        }

        const response = {
            jobId: job._id,
            status: job.status,
            createdAt: job.createdAt
        };

        // Ajouter des détails en fonction du statut
        if (job.status === 'completed') {
            response.completedAt = job.completedAt;
            response.taskCount = job.result?.taskCount || 0;
            
            // Récupérer les tâches générées
            if (job.result?.taskCount > 0) {
                const tasks = await RoadtripTask.find({ 
                    roadtripId: job.roadtripId 
                }).sort({ order: 1 });
                
                response.tasks = tasks;
            }
        } 
        else if (job.status === 'failed') {
            response.error = job.result?.error || 'Une erreur est survenue';
        }

        res.json(response);

    } catch (err) {
        console.error('Error getting task generation job status:', err);
        res.status(500).json({ 
            msg: 'Erreur serveur lors de la récupération du statut du job',
            error: err.message 
        });
    }
};
