import ChatbotJob from '../models/ChatbotJob.js';
import ChatHistory from '../models/ChatHistory.js';
import Roadtrip from '../models/Roadtrip.js';
import nlpService from '../services/nlpService.js';
import notificationService from '../services/notificationService.js';
import actionExecutor from '../services/actionExecutor.js';
import { v4 as uuidv4 } from 'uuid';

// Générer un ID de conversation unique
const generateConversationId = () => {
    return `conv_${uuidv4()}_${Date.now()}`;
};

// Estimer le temps de traitement selon l'intention
const getEstimatedTime = (intent) => {
    const estimations = {
        'add_step': 15,
        'delete_step': 10,
        'add_accommodation': 20,
        'delete_accommodation': 10,
        'add_activity': 25,
        'delete_activity': 10,
        'add_task': 5,
        'update_dates': 30,
        'get_info': 3,
        'help': 1
    };
    return estimations[intent] || 10;
};

// Traitement asynchrone des jobs
const processJobAsync = async (jobId) => {
    const job = await ChatbotJob.findById(jobId);
    
    if (!job) {
        console.error(`Job ${jobId} not found`);
        return;
    }
    
    try {
        // 1. Marquer comme en cours
        job.status = 'processing';
        job.startedAt = new Date();
        await job.save();
        
        // 2. Exécuter l'action selon l'intent
        const result = await actionExecutor.executeAction(job);
        
        // 3. Calculer le temps d'exécution
        const executionTime = new Date().getTime() - job.startedAt.getTime();
        
        // 4. Marquer comme terminé
        job.status = 'completed';
        job.result = result;
        job.completedAt = new Date();
        job.executionTime = executionTime;
        await job.save();
        
        // 5. Envoyer notification de succès
        await notificationService.createNotification({
            userId: job.userId,
            roadtripId: job.roadtripId,
            type: 'chatbot_success',
            title: 'Action terminée',
            message: result.message || 'L\'action a été exécutée avec succès',
            icon: 'success',
            relatedJobId: job._id,
            data: { result }
        });
        
        // 6. Envoyer mise à jour WebSocket
        if (global.websocketService) {
            global.websocketService.sendJobUpdate(job.userId, {
                jobId: job._id,
                status: 'completed',
                result,
                executionTime
            });
        }
        
    } catch (error) {
        console.error(`Error processing job ${jobId}:`, error);
        
        // Gérer les erreurs
        job.status = 'failed';
        job.errorMessage = error.message;
        job.completedAt = new Date();
        await job.save();
        
        // Notification d'erreur
        await notificationService.createNotification({
            userId: job.userId,
            roadtripId: job.roadtripId,
            type: 'chatbot_error',
            title: 'Erreur lors du traitement',
            message: error.message,
            icon: 'error',
            relatedJobId: job._id
        });
        
        // Envoyer mise à jour WebSocket
        if (global.websocketService) {
            global.websocketService.sendJobUpdate(job.userId, {
                jobId: job._id,
                status: 'failed',
                error: error.message
            });
        }
    }
};

// Traiter une requête utilisateur
export const processUserQuery = async (req, res) => {
    const { query, conversationId } = req.body;
    const { idRoadtrip } = req.params;
    
    try {
        // Validation des données
        if (!query || query.trim().length === 0) {
            return res.status(400).json({ 
                success: false,
                msg: 'La requête ne peut pas être vide' 
            });
        }
        
        // Vérifier que le roadtrip appartient à l'utilisateur
        const roadtrip = await Roadtrip.findOne({ 
            _id: idRoadtrip, 
            userId: req.user.id 
        });
        
        if (!roadtrip) {
            return res.status(404).json({ 
                success: false,
                msg: 'Roadtrip non trouvé ou non autorisé' 
            });
        }
        
        // 1. Analyser la requête
        const analysis = await nlpService.analyzeQuery(query, roadtrip);
        
        // 2. Générer ou utiliser l'ID de conversation
        const finalConversationId = conversationId || generateConversationId();
        
        // 3. Sauvegarder le message utilisateur dans l'historique
        await ChatHistory.findOneAndUpdate(
            { 
                userId: req.user.id, 
                roadtripId: idRoadtrip, 
                conversationId: finalConversationId 
            },
            {
                $push: {
                    messages: {
                        role: 'user',
                        content: query,
                        timestamp: new Date()
                    }
                },
                $set: {
                    'context.activeRoadtripId': idRoadtrip,
                    'context.lastIntent': analysis.intent
                }
            },
            { upsert: true, new: true }
        );
        
        // 4. Créer un job asynchrone
        const job = await ChatbotJob.create({
            userId: req.user.id,
            roadtripId: idRoadtrip,
            conversationId: finalConversationId,
            userQuery: query,
            intent: analysis.intent,
            entities: analysis.entities,
            status: 'pending',
            aiModel: 'gpt-4',
            tokensUsed: analysis.tokensUsed || 0
        });
        
        // 5. Lancer le traitement asynchrone
        setImmediate(() => processJobAsync(job._id));
        
        // 6. Retourner la confirmation immédiate
        res.json({
            success: true,
            jobId: job._id,
            conversationId: finalConversationId,
            message: "Je traite votre demande...",
            estimatedTime: getEstimatedTime(analysis.intent),
            intent: analysis.intent,
            entities: analysis.entities
        });
        
    } catch (error) {
        console.error('Error processing user query:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
};

// Obtenir le statut d'un job
export const getJobStatus = async (req, res) => {
    const { jobId } = req.params;
    const { idRoadtrip } = req.params;
    
    try {
        const job = await ChatbotJob.findOne({
            _id: jobId,
            userId: req.user.id,
            roadtripId: idRoadtrip
        });
        
        if (!job) {
            return res.status(404).json({ 
                success: false,
                msg: 'Job non trouvé' 
            });
        }
        
        res.json({
            success: true,
            jobId: job._id,
            status: job.status,
            progress: job.progress,
            result: job.result,
            errorMessage: job.errorMessage,
            executionTime: job.executionTime,
            createdAt: job.createdAt,
            startedAt: job.startedAt,
            completedAt: job.completedAt
        });
        
    } catch (error) {
        console.error('Error getting job status:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
};

// Obtenir l'historique des conversations
export const getConversations = async (req, res) => {
    const { idRoadtrip } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    try {
        // Vérifier que le roadtrip appartient à l'utilisateur
        const roadtrip = await Roadtrip.findOne({ 
            _id: idRoadtrip, 
            userId: req.user.id 
        });
        
        if (!roadtrip) {
            return res.status(404).json({ 
                success: false,
                msg: 'Roadtrip non trouvé ou non autorisé' 
            });
        }
        
        const conversations = await ChatHistory.find({
            userId: req.user.id,
            roadtripId: idRoadtrip
        })
        .sort({ updatedAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
        
        const total = await ChatHistory.countDocuments({
            userId: req.user.id,
            roadtripId: idRoadtrip
        });
        
        res.json({
            success: true,
            conversations,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
        
    } catch (error) {
        console.error('Error getting conversations:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
};

// Obtenir une conversation spécifique
export const getConversation = async (req, res) => {
    const { idRoadtrip, conversationId } = req.params;
    
    try {
        // Vérifier que le roadtrip appartient à l'utilisateur
        const roadtrip = await Roadtrip.findOne({ 
            _id: idRoadtrip, 
            userId: req.user.id 
        });
        
        if (!roadtrip) {
            return res.status(404).json({ 
                success: false,
                msg: 'Roadtrip non trouvé ou non autorisé' 
            });
        }
        
        const conversation = await ChatHistory.findOne({
            userId: req.user.id,
            roadtripId: idRoadtrip,
            conversationId
        });
        
        if (!conversation) {
            return res.status(404).json({ 
                success: false,
                msg: 'Conversation non trouvée' 
            });
        }
        
        res.json({
            success: true,
            conversation
        });
        
    } catch (error) {
        console.error('Error getting conversation:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
};

// Obtenir les notifications du roadtrip
export const getNotifications = async (req, res) => {
    const { idRoadtrip } = req.params;
    const { page = 1, limit = 50, unreadOnly = false } = req.query;
    
    try {
        // Vérifier que le roadtrip appartient à l'utilisateur
        const roadtrip = await Roadtrip.findOne({ 
            _id: idRoadtrip, 
            userId: req.user.id 
        });
        
        if (!roadtrip) {
            return res.status(404).json({ 
                success: false,
                msg: 'Roadtrip non trouvé ou non autorisé' 
            });
        }
        
        const filter = {
            userId: req.user.id,
            roadtripId: idRoadtrip
        };
        
        if (unreadOnly === 'true') {
            filter.read = false;
        }
        
        const notifications = await notificationService.getUserNotifications(
            req.user.id,
            parseInt(limit),
            filter
        );
        
        res.json({
            success: true,
            notifications
        });
        
    } catch (error) {
        console.error('Error getting notifications:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
};

// Marquer une notification comme lue
export const markNotificationAsRead = async (req, res) => {
    const { idRoadtrip, notificationId } = req.params;
    
    try {
        // Vérifier que le roadtrip appartient à l'utilisateur
        const roadtrip = await Roadtrip.findOne({ 
            _id: idRoadtrip, 
            userId: req.user.id 
        });
        
        if (!roadtrip) {
            return res.status(404).json({ 
                success: false,
                msg: 'Roadtrip non trouvé ou non autorisé' 
            });
        }
        
        const notification = await notificationService.markAsRead(notificationId, req.user.id);
        
        if (!notification) {
            return res.status(404).json({ 
                success: false,
                msg: 'Notification non trouvée' 
            });
        }
        
        res.json({
            success: true,
            notification
        });
        
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
};

// Supprimer une notification
export const deleteNotification = async (req, res) => {
    const { idRoadtrip, notificationId } = req.params;
    
    try {
        // Vérifier que le roadtrip appartient à l'utilisateur
        const roadtrip = await Roadtrip.findOne({ 
            _id: idRoadtrip, 
            userId: req.user.id 
        });
        
        if (!roadtrip) {
            return res.status(404).json({ 
                success: false,
                msg: 'Roadtrip non trouvé ou non autorisé' 
            });
        }
        
        const result = await notificationService.deleteNotification(notificationId, req.user.id);
        
        if (!result) {
            return res.status(404).json({ 
                success: false,
                msg: 'Notification non trouvée' 
            });
        }
        
        res.json({
            success: true,
            message: 'Notification supprimée avec succès'
        });
        
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
};

export default {
    processUserQuery,
    getJobStatus,
    getConversations,
    getConversation,
    getNotifications,
    markNotificationAsRead,
    deleteNotification
};
