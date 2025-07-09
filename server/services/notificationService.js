import Notification from '../models/Notification.js';
import { EventEmitter } from 'events';

/**
 * Service de gestion des notifications
 */
class NotificationService extends EventEmitter {
    constructor() {
        super();
    }
    
    /**
     * Obtenir le service WebSocket global
     */
    getWebSocketService() {
        return global.websocketService;
    }
    
    /**
     * Créer une nouvelle notification
     */
    async createNotification(notificationData) {
        try {
            console.log(`📧 Création notification:`, notificationData);
            
            // Validation des données
            if (!notificationData.userId || !notificationData.type || !notificationData.title) {
                throw new Error('Données de notification invalides');
            }
            
            // Créer en base de données
            const notification = await Notification.create({
                userId: notificationData.userId,
                roadtripId: notificationData.roadtripId,
                type: notificationData.type,
                title: notificationData.title,
                message: notificationData.message,
                icon: this.getIconForType(notificationData.type),
                data: notificationData.data || {},
                relatedJobId: notificationData.relatedJobId
            });
            
            console.log(`✅ Notification créée:`, notification._id);
            
            // Envoyer en temps réel via WebSocket
            const websocketService = global.websocketService || this.websocketService;
            if (websocketService) {
                websocketService.sendNotification(notification.userId, {
                    id: notification._id,
                    type: notification.type,
                    title: notification.title,
                    message: notification.message,
                    icon: notification.icon,
                    data: notification.data,
                    roadtripId: notification.roadtripId,
                    timestamp: notification.createdAt
                });
            }
            
            // Émettre un événement local
            this.emit('notification_created', notification);
            
            return notification;
            
        } catch (error) {
            console.error('❌ Erreur création notification:', error);
            throw error;
        }
    }
    
    /**
     * Marquer une notification comme lue
     */
    async markAsRead(notificationId, userId) {
        try {
            const notification = await Notification.findOneAndUpdate(
                { _id: notificationId, userId },
                { read: true, readAt: new Date() },
                { new: true }
            );
            
            if (!notification) {
                throw new Error('Notification introuvable');
            }
            
            console.log(`📖 Notification marquée comme lue:`, notificationId);
            
            // Notifier via WebSocket
            if (this.websocketService) {
                this.websocketService.sendNotificationUpdate(userId, {
                    id: notification._id,
                    read: true,
                    readAt: notification.readAt
                });
            }
            
            return notification;
            
        } catch (error) {
            console.error('❌ Erreur marquage lecture:', error);
            throw error;
        }
    }
    
    /**
     * Récupérer les notifications d'un utilisateur
     */
    async getUserNotifications(userId, options = {}) {
        try {
            const {
                limit = 50,
                roadtripId = null,
                includeRead = true,
                types = null
            } = options;
            
            const query = { userId };
            
            if (roadtripId) {
                query.roadtripId = roadtripId;
            }
            
            if (!includeRead) {
                query.read = false;
            }
            
            if (types && Array.isArray(types)) {
                query.type = { $in: types };
            }
            
            const notifications = await Notification.find(query)
                .sort({ createdAt: -1 })
                .limit(limit)
                .populate('relatedJobId', 'status result');
            
            return notifications;
            
        } catch (error) {
            console.error('❌ Erreur récupération notifications:', error);
            throw error;
        }
    }
    
    /**
     * Récupérer les notifications pour un roadtrip spécifique
     */
    async getRoadtripNotifications(userId, roadtripId, options = {}) {
        return this.getUserNotifications(userId, {
            ...options,
            roadtripId
        });
    }
    
    /**
     * Supprimer une notification
     */
    async deleteNotification(notificationId, userId) {
        try {
            const notification = await Notification.findOneAndDelete({
                _id: notificationId,
                userId
            });
            
            if (!notification) {
                throw new Error('Notification introuvable');
            }
            
            console.log(`🗑️ Notification supprimée:`, notificationId);
            
            // Notifier via WebSocket
            if (this.websocketService) {
                this.websocketService.sendNotificationDeleted(userId, notificationId);
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Erreur suppression notification:', error);
            throw error;
        }
    }
    
    /**
     * Compter les notifications non lues
     */
    async getUnreadCount(userId, roadtripId = null) {
        try {
            const query = { userId, read: false };
            if (roadtripId) {
                query.roadtripId = roadtripId;
            }
            
            return await Notification.countDocuments(query);
            
        } catch (error) {
            console.error('❌ Erreur comptage notifications:', error);
            return 0;
        }
    }
    
    /**
     * Nettoyer les anciennes notifications
     */
    async cleanupOldNotifications(daysOld = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);
            
            const result = await Notification.deleteMany({
                createdAt: { $lt: cutoffDate },
                read: true
            });
            
            console.log(`🧹 ${result.deletedCount} anciennes notifications supprimées`);
            return result.deletedCount;
            
        } catch (error) {
            console.error('❌ Erreur nettoyage notifications:', error);
            return 0;
        }
    }
    
    /**
     * Créer une notification de succès pour un job de chatbot
     */
    async notifyChatbotSuccess(userId, roadtripId, jobId, result) {
        return this.createNotification({
            userId,
            roadtripId,
            type: 'chatbot_success',
            title: 'Action terminée avec succès',
            message: result.message || 'Votre demande a été traitée avec succès',
            relatedJobId: jobId,
            data: { result }
        });
    }
    
    /**
     * Créer une notification d'erreur pour un job de chatbot
     */
    async notifyChatbotError(userId, roadtripId, jobId, error) {
        return this.createNotification({
            userId,
            roadtripId,
            type: 'chatbot_error',
            title: 'Erreur lors du traitement',
            message: error.message || 'Une erreur est survenue lors du traitement de votre demande',
            relatedJobId: jobId,
            data: { error: error.message }
        });
    }
    
    /**
     * Obtenir l'icône appropriée selon le type
     */
    getIconForType(type) {
        const iconMap = {
            'chatbot_success': 'success',
            'chatbot_error': 'error',
            'system': 'info',
            'reminder': 'warning'
        };
        
        return iconMap[type] || 'info';
    }
    
    /**
     * Créer des notifications en lot
     */
    async createBulkNotifications(notifications) {
        try {
            const results = [];
            
            for (const notificationData of notifications) {
                const notification = await this.createNotification(notificationData);
                results.push(notification);
            }
            
            return results;
            
        } catch (error) {
            console.error('❌ Erreur création notifications en lot:', error);
            throw error;
        }
    }
}

// Instance singleton
export const notificationService = new NotificationService();
export default notificationService;
