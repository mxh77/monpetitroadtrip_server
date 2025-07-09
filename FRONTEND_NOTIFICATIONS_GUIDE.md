# Guide d'Implémentation des Notifications Frontend - MonPetitRoadtrip

## Vue d'ensemble

Ce guide fournit une implémentation complète du système de notifications côté frontend utilisant l'API REST et une stratégie de polling intelligente.

## Architecture Frontend

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Architecture                    │
├─────────────────────────────────────────────────────────────┤
│  NotificationManager (Service Principal)                   │
│  ├── NotificationAPI (Communication REST)                  │
│  ├── NotificationStore (État local)                        │
│  ├── NotificationUI (Interface utilisateur)                │
│  └── PollingStrategy (Gestion intelligente du polling)     │
└─────────────────────────────────────────────────────────────┘
```

## 1. Service API des Notifications

### `services/NotificationAPI.js`

```javascript
class NotificationAPI {
    constructor(baseURL = '/api') {
        this.baseURL = baseURL;
    }

    /**
     * Obtenir les notifications d'un roadtrip
     */
    async getNotifications(roadtripId, options = {}) {
        const {
            limit = 50,
            includeRead = true,
            types = null,
            token = null
        } = options;

        const params = new URLSearchParams();
        if (limit) params.append('limit', limit);
        if (!includeRead) params.append('includeRead', 'false');
        if (types && Array.isArray(types)) {
            types.forEach(type => params.append('types', type));
        }

        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        try {
            const response = await fetch(
                `${this.baseURL}/roadtrips/${roadtripId}/notifications?${params}`,
                { headers }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            return result.success ? result.data : [];
        } catch (error) {
            console.error('Erreur récupération notifications:', error);
            throw error;
        }
    }

    /**
     * Marquer une notification comme lue
     */
    async markAsRead(roadtripId, notificationId, token = null) {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        try {
            const response = await fetch(
                `${this.baseURL}/roadtrips/${roadtripId}/notifications/${notificationId}/read`,
                {
                    method: 'PATCH',
                    headers
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Erreur marquage notification:', error);
            throw error;
        }
    }

    /**
     * Supprimer une notification
     */
    async deleteNotification(roadtripId, notificationId, token = null) {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        try {
            const response = await fetch(
                `${this.baseURL}/roadtrips/${roadtripId}/notifications/${notificationId}`,
                {
                    method: 'DELETE',
                    headers
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Erreur suppression notification:', error);
            throw error;
        }
    }

    /**
     * Obtenir le nombre de notifications non lues
     */
    async getUnreadCount(roadtripId, token = null) {
        try {
            const notifications = await this.getNotifications(roadtripId, {
                includeRead: false,
                limit: 100,
                token
            });
            return notifications.length;
        } catch (error) {
            console.error('Erreur comptage notifications:', error);
            return 0;
        }
    }
}

export default NotificationAPI;
```

## 2. Store des Notifications (Gestion d'État)

### `stores/NotificationStore.js`

```javascript
class NotificationStore {
    constructor() {
        this.notifications = new Map(); // Map<roadtripId, Array<Notification>>
        this.unreadCounts = new Map(); // Map<roadtripId, Number>
        this.lastSync = new Map(); // Map<roadtripId, Date>
        this.listeners = new Set();
    }

    /**
     * Ajouter un listener pour les changements
     */
    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * Notifier tous les listeners
     */
    notify(event, data) {
        this.listeners.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Erreur listener notification:', error);
            }
        });
    }

    /**
     * Mettre à jour les notifications d'un roadtrip
     */
    updateNotifications(roadtripId, notifications) {
        const previous = this.notifications.get(roadtripId) || [];
        this.notifications.set(roadtripId, notifications);
        this.lastSync.set(roadtripId, new Date());

        // Calculer les nouvelles notifications
        const newNotifications = this.findNewNotifications(previous, notifications);
        
        // Mettre à jour le compteur non lues
        const unreadCount = notifications.filter(n => !n.read).length;
        this.unreadCounts.set(roadtripId, unreadCount);

        // Notifier les changements
        this.notify('notifications_updated', {
            roadtripId,
            notifications,
            newNotifications,
            unreadCount
        });

        // Notifier chaque nouvelle notification individuellement
        newNotifications.forEach(notification => {
            this.notify('new_notification', {
                roadtripId,
                notification
            });
        });
    }

    /**
     * Trouver les nouvelles notifications
     */
    findNewNotifications(previous, current) {
        const previousIds = new Set(previous.map(n => n._id));
        return current.filter(n => !previousIds.has(n._id));
    }

    /**
     * Marquer une notification comme lue
     */
    markAsRead(roadtripId, notificationId) {
        const notifications = this.notifications.get(roadtripId) || [];
        const updated = notifications.map(n => 
            n._id === notificationId ? { ...n, read: true, readAt: new Date() } : n
        );
        
        this.updateNotifications(roadtripId, updated);
    }

    /**
     * Supprimer une notification
     */
    removeNotification(roadtripId, notificationId) {
        const notifications = this.notifications.get(roadtripId) || [];
        const updated = notifications.filter(n => n._id !== notificationId);
        
        this.updateNotifications(roadtripId, updated);
    }

    /**
     * Obtenir les notifications d'un roadtrip
     */
    getNotifications(roadtripId) {
        return this.notifications.get(roadtripId) || [];
    }

    /**
     * Obtenir le nombre de notifications non lues
     */
    getUnreadCount(roadtripId) {
        return this.unreadCounts.get(roadtripId) || 0;
    }

    /**
     * Obtenir le total des notifications non lues pour tous les roadtrips
     */
    getTotalUnreadCount() {
        return Array.from(this.unreadCounts.values()).reduce((sum, count) => sum + count, 0);
    }

    /**
     * Vérifier si des notifications ont été récemment synchronisées
     */
    isRecentlySync(roadtripId, maxAgeMs = 30000) {
        const lastSync = this.lastSync.get(roadtripId);
        if (!lastSync) return false;
        
        return (Date.now() - lastSync.getTime()) < maxAgeMs;
    }

    /**
     * Nettoyer les données d'un roadtrip
     */
    clearRoadtrip(roadtripId) {
        this.notifications.delete(roadtripId);
        this.unreadCounts.delete(roadtripId);
        this.lastSync.delete(roadtripId);
        
        this.notify('roadtrip_cleared', { roadtripId });
    }

    /**
     * Nettoyer toutes les données
     */
    clear() {
        this.notifications.clear();
        this.unreadCounts.clear();
        this.lastSync.clear();
        
        this.notify('store_cleared', {});
    }
}

export default NotificationStore;
```

## 3. Gestionnaire de Polling Intelligent

### `services/PollingStrategy.js`

```javascript
class PollingStrategy {
    constructor() {
        this.intervals = new Map(); // Map<roadtripId, intervalId>
        this.frequencies = new Map(); // Map<roadtripId, frequency>
        this.isDocumentVisible = true;
        this.isOnline = navigator.onLine;
        
        this.setupVisibilityListener();
        this.setupOnlineListener();
    }

    /**
     * Démarrer le polling pour un roadtrip
     */
    start(roadtripId, callback, options = {}) {
        const {
            frequency = 3000,      // 3 secondes par défaut
            backgroundFrequency = 30000,  // 30 secondes en arrière-plan
            retryDelay = 5000,     // 5 secondes en cas d'erreur
            maxRetries = 3
        } = options;

        this.stop(roadtripId); // Arrêter l'existant

        let retryCount = 0;
        let currentFrequency = frequency;

        const poll = async () => {
            try {
                if (!this.isOnline) {
                    console.log('Offline - polling paused');
                    return;
                }

                await callback();
                retryCount = 0; // Reset retry count on success
                
                // Ajuster la fréquence selon la visibilité
                currentFrequency = this.isDocumentVisible ? frequency : backgroundFrequency;
                
            } catch (error) {
                console.error(`Erreur polling roadtrip ${roadtripId}:`, error);
                retryCount++;
                
                if (retryCount >= maxRetries) {
                    console.warn(`Max retries atteint pour roadtrip ${roadtripId}, arrêt du polling`);
                    this.stop(roadtripId);
                    return;
                }
                
                currentFrequency = retryDelay;
            }
            
            // Programmer le prochain polling
            const intervalId = setTimeout(poll, currentFrequency);
            this.intervals.set(roadtripId, intervalId);
        };

        // Démarrer immédiatement
        poll();
        this.frequencies.set(roadtripId, frequency);
    }

    /**
     * Arrêter le polling pour un roadtrip
     */
    stop(roadtripId) {
        const intervalId = this.intervals.get(roadtripId);
        if (intervalId) {
            clearTimeout(intervalId);
            this.intervals.delete(roadtripId);
            this.frequencies.delete(roadtripId);
        }
    }

    /**
     * Arrêter tous les pollings
     */
    stopAll() {
        this.intervals.forEach((intervalId, roadtripId) => {
            clearTimeout(intervalId);
        });
        this.intervals.clear();
        this.frequencies.clear();
    }

    /**
     * Redémarrer le polling avec une fréquence accélérée temporairement
     */
    boost(roadtripId, boostDuration = 30000) {
        const originalFrequency = this.frequencies.get(roadtripId);
        if (!originalFrequency) return;

        // Arrêter et redémarrer avec une fréquence plus élevée
        const callback = this.getCallback(roadtripId);
        if (callback) {
            this.start(roadtripId, callback, { frequency: 1000 });
            
            // Revenir à la fréquence normale après le boost
            setTimeout(() => {
                this.start(roadtripId, callback, { frequency: originalFrequency });
            }, boostDuration);
        }
    }

    /**
     * Écouter les changements de visibilité
     */
    setupVisibilityListener() {
        document.addEventListener('visibilitychange', () => {
            this.isDocumentVisible = !document.hidden;
            console.log(`Document visibility: ${this.isDocumentVisible ? 'visible' : 'hidden'}`);
            
            // Les intervalles se réajusteront automatiquement au prochain cycle
        });
    }

    /**
     * Écouter les changements de connexion
     */
    setupOnlineListener() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('Connexion rétablie - reprise du polling');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('Connexion perdue - polling en pause');
        });
    }

    /**
     * Obtenir le callback associé à un roadtrip (méthode helper)
     */
    getCallback(roadtripId) {
        // Cette méthode devrait être implementée selon votre architecture
        // Retourner le callback de polling pour ce roadtrip
        return null;
    }
}

export default PollingStrategy;
```

## 4. Gestionnaire Principal des Notifications

### `services/NotificationManager.js`

```javascript
import NotificationAPI from './NotificationAPI.js';
import NotificationStore from '../stores/NotificationStore.js';
import PollingStrategy from './PollingStrategy.js';

class NotificationManager {
    constructor(options = {}) {
        this.api = new NotificationAPI(options.baseURL);
        this.store = new NotificationStore();
        this.polling = new PollingStrategy();
        this.activeRoadtrips = new Set();
        
        // Configuration
        this.defaultToken = options.token;
        this.pollingFrequency = options.pollingFrequency || 3000;
        this.backgroundFrequency = options.backgroundFrequency || 30000;
        
        // Callbacks personnalisés
        this.onNewNotification = options.onNewNotification || this.defaultNewNotificationHandler;
        this.onError = options.onError || this.defaultErrorHandler;
        
        this.setupStoreListeners();
    }

    /**
     * Configurer les listeners du store
     */
    setupStoreListeners() {
        this.store.subscribe((event, data) => {
            switch (event) {
                case 'new_notification':
                    this.onNewNotification(data.notification, data.roadtripId);
                    break;
                case 'notifications_updated':
                    console.log(`Notifications mises à jour pour ${data.roadtripId}: ${data.notifications.length} total, ${data.unreadCount} non lues`);
                    break;
            }
        });
    }

    /**
     * Démarrer la surveillance d'un roadtrip
     */
    watchRoadtrip(roadtripId, token = null) {
        if (this.activeRoadtrips.has(roadtripId)) {
            console.log(`Roadtrip ${roadtripId} déjà surveillé`);
            return;
        }

        const effectiveToken = token || this.defaultToken;
        
        // Créer le callback de polling
        const pollCallback = async () => {
            try {
                const notifications = await this.api.getNotifications(roadtripId, {
                    token: effectiveToken,
                    includeRead: false,
                    limit: 50
                });
                
                this.store.updateNotifications(roadtripId, notifications);
            } catch (error) {
                this.onError(error, roadtripId);
                throw error; // Re-throw pour que PollingStrategy puisse gérer les retries
            }
        };

        // Démarrer le polling
        this.polling.start(roadtripId, pollCallback, {
            frequency: this.pollingFrequency,
            backgroundFrequency: this.backgroundFrequency
        });

        this.activeRoadtrips.add(roadtripId);
        console.log(`Surveillance démarrée pour roadtrip ${roadtripId}`);

        // Effectuer une première synchronisation immédiate
        pollCallback().catch(error => {
            console.warn('Erreur lors de la synchronisation initiale:', error);
        });
    }

    /**
     * Arrêter la surveillance d'un roadtrip
     */
    unwatchRoadtrip(roadtripId) {
        this.polling.stop(roadtripId);
        this.activeRoadtrips.delete(roadtripId);
        console.log(`Surveillance arrêtée pour roadtrip ${roadtripId}`);
    }

    /**
     * Arrêter toute surveillance
     */
    stopWatching() {
        this.polling.stopAll();
        this.activeRoadtrips.clear();
        console.log('Surveillance arrêtée pour tous les roadtrips');
    }

    /**
     * Marquer une notification comme lue
     */
    async markAsRead(roadtripId, notificationId, token = null) {
        try {
            const effectiveToken = token || this.defaultToken;
            await this.api.markAsRead(roadtripId, notificationId, effectiveToken);
            this.store.markAsRead(roadtripId, notificationId);
            
            console.log(`Notification ${notificationId} marquée comme lue`);
        } catch (error) {
            this.onError(error, roadtripId);
            throw error;
        }
    }

    /**
     * Supprimer une notification
     */
    async deleteNotification(roadtripId, notificationId, token = null) {
        try {
            const effectiveToken = token || this.defaultToken;
            await this.api.deleteNotification(roadtripId, notificationId, effectiveToken);
            this.store.removeNotification(roadtripId, notificationId);
            
            console.log(`Notification ${notificationId} supprimée`);
        } catch (error) {
            this.onError(error, roadtripId);
            throw error;
        }
    }

    /**
     * Obtenir les notifications d'un roadtrip
     */
    getNotifications(roadtripId) {
        return this.store.getNotifications(roadtripId);
    }

    /**
     * Obtenir le nombre de notifications non lues
     */
    getUnreadCount(roadtripId) {
        return this.store.getUnreadCount(roadtripId);
    }

    /**
     * Obtenir le total des notifications non lues
     */
    getTotalUnreadCount() {
        return this.store.getTotalUnreadCount();
    }

    /**
     * Forcer une synchronisation
     */
    async forceSync(roadtripId, token = null) {
        if (!this.activeRoadtrips.has(roadtripId)) {
            console.warn(`Roadtrip ${roadtripId} non surveillé`);
            return;
        }

        try {
            const effectiveToken = token || this.defaultToken;
            const notifications = await this.api.getNotifications(roadtripId, {
                token: effectiveToken,
                includeRead: false,
                limit: 50
            });
            
            this.store.updateNotifications(roadtripId, notifications);
            console.log(`Synchronisation forcée pour roadtrip ${roadtripId}`);
        } catch (error) {
            this.onError(error, roadtripId);
            throw error;
        }
    }

    /**
     * Booster temporairement la fréquence de polling
     */
    boostPolling(roadtripId, duration = 30000) {
        this.polling.boost(roadtripId, duration);
        console.log(`Polling boosté pour roadtrip ${roadtripId} pendant ${duration}ms`);
    }

    /**
     * S'abonner aux changements de notifications
     */
    subscribe(callback) {
        return this.store.subscribe(callback);
    }

    /**
     * Handler par défaut pour les nouvelles notifications
     */
    defaultNewNotificationHandler(notification, roadtripId) {
        console.log('Nouvelle notification:', notification);
        
        // Vous pouvez ajouter ici des notifications browser, sons, etc.
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(notification.title, {
                body: notification.message,
                icon: this.getIconUrl(notification.icon),
                tag: notification._id
            });
        }
    }

    /**
     * Handler par défaut pour les erreurs
     */
    defaultErrorHandler(error, roadtripId) {
        console.error(`Erreur notifications roadtrip ${roadtripId}:`, error);
    }

    /**
     * Obtenir l'URL de l'icône pour une notification
     */
    getIconUrl(iconType) {
        const iconMap = {
            'success': '/icons/success.png',
            'error': '/icons/error.png',
            'info': '/icons/info.png',
            'warning': '/icons/warning.png'
        };
        
        return iconMap[iconType] || iconMap['info'];
    }

    /**
     * Nettoyer les ressources
     */
    destroy() {
        this.stopWatching();
        this.store.clear();
        console.log('NotificationManager détruit');
    }
}

export default NotificationManager;
```

## 5. Composants UI React

### `components/NotificationBadge.jsx`

```jsx
import React from 'react';
import { useNotifications } from '../hooks/useNotifications';

const NotificationBadge = ({ roadtripId, className = '' }) => {
    const { getUnreadCount } = useNotifications();
    const unreadCount = getUnreadCount(roadtripId);

    if (unreadCount === 0) return null;

    return (
        <span className={`notification-badge ${className}`}>
            {unreadCount > 99 ? '99+' : unreadCount}
        </span>
    );
};

export default NotificationBadge;
```

### `components/NotificationList.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import NotificationItem from './NotificationItem';

const NotificationList = ({ 
    roadtripId, 
    maxItems = 10,
    showReadNotifications = false,
    className = '' 
}) => {
    const { getNotifications, markAsRead, deleteNotification } = useNotifications();
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        const updateNotifications = () => {
            let allNotifications = getNotifications(roadtripId);
            
            if (!showReadNotifications) {
                allNotifications = allNotifications.filter(n => !n.read);
            }
            
            setNotifications(allNotifications.slice(0, maxItems));
        };

        // Mise à jour initiale
        updateNotifications();

        // S'abonner aux changements
        const unsubscribe = useNotifications().subscribe((event, data) => {
            if (data.roadtripId === roadtripId && 
                (event === 'notifications_updated' || event === 'new_notification')) {
                updateNotifications();
            }
        });

        return unsubscribe;
    }, [roadtripId, maxItems, showReadNotifications, getNotifications]);

    const handleMarkAsRead = async (notificationId) => {
        try {
            await markAsRead(roadtripId, notificationId);
        } catch (error) {
            console.error('Erreur marquage notification:', error);
        }
    };

    const handleDelete = async (notificationId) => {
        try {
            await deleteNotification(roadtripId, notificationId);
        } catch (error) {
            console.error('Erreur suppression notification:', error);
        }
    };

    if (notifications.length === 0) {
        return (
            <div className={`notification-list empty ${className}`}>
                <p>Aucune notification</p>
            </div>
        );
    }

    return (
        <div className={`notification-list ${className}`}>
            {notifications.map(notification => (
                <NotificationItem
                    key={notification._id}
                    notification={notification}
                    onMarkAsRead={() => handleMarkAsRead(notification._id)}
                    onDelete={() => handleDelete(notification._id)}
                />
            ))}
        </div>
    );
};

export default NotificationList;
```

### `components/NotificationItem.jsx`

```jsx
import React from 'react';

const NotificationItem = ({ 
    notification, 
    onMarkAsRead, 
    onDelete,
    showActions = true 
}) => {
    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'À l\'instant';
        if (diffMins < 60) return `${diffMins}min`;
        if (diffHours < 24) return `${diffHours}h`;
        return `${diffDays}j`;
    };

    const getIconEmoji = (iconType) => {
        const iconMap = {
            'success': '✅',
            'error': '❌',
            'info': 'ℹ️',
            'warning': '⚠️'
        };
        return iconMap[iconType] || '📢';
    };

    return (
        <div className={`notification-item ${notification.read ? 'read' : 'unread'} ${notification.type}`}>
            <div className="notification-content">
                <div className="notification-header">
                    <span className="notification-icon">
                        {getIconEmoji(notification.icon)}
                    </span>
                    <h4 className="notification-title">{notification.title}</h4>
                    <span className="notification-time">
                        {formatTime(notification.createdAt)}
                    </span>
                </div>
                
                <p className="notification-message">{notification.message}</p>
                
                {notification.data && Object.keys(notification.data).length > 0 && (
                    <div className="notification-data">
                        <small>Données: {JSON.stringify(notification.data, null, 2)}</small>
                    </div>
                )}
            </div>
            
            {showActions && (
                <div className="notification-actions">
                    {!notification.read && (
                        <button 
                            className="btn-mark-read"
                            onClick={onMarkAsRead}
                            title="Marquer comme lu"
                        >
                            👁️
                        </button>
                    )}
                    <button 
                        className="btn-delete"
                        onClick={onDelete}
                        title="Supprimer"
                    >
                        🗑️
                    </button>
                </div>
            )}
        </div>
    );
};

export default NotificationItem;
```

## 6. Hook React Personnalisé

### `hooks/useNotifications.js`

```javascript
import { useContext, useEffect, useState } from 'react';
import { NotificationContext } from '../contexts/NotificationContext';

export const useNotifications = (roadtripId = null) => {
    const notificationManager = useContext(NotificationContext);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    if (!notificationManager) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }

    // Auto-watch roadtrip si fourni
    useEffect(() => {
        if (roadtripId) {
            notificationManager.watchRoadtrip(roadtripId);
            
            return () => {
                notificationManager.unwatchRoadtrip(roadtripId);
            };
        }
    }, [roadtripId, notificationManager]);

    const markAsRead = async (roadtripId, notificationId) => {
        setIsLoading(true);
        setError(null);
        
        try {
            await notificationManager.markAsRead(roadtripId, notificationId);
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const deleteNotification = async (roadtripId, notificationId) => {
        setIsLoading(true);
        setError(null);
        
        try {
            await notificationManager.deleteNotification(roadtripId, notificationId);
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const forceSync = async (roadtripId) => {
        setIsLoading(true);
        setError(null);
        
        try {
            await notificationManager.forceSync(roadtripId);
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        // Données
        getNotifications: notificationManager.getNotifications.bind(notificationManager),
        getUnreadCount: notificationManager.getUnreadCount.bind(notificationManager),
        getTotalUnreadCount: notificationManager.getTotalUnreadCount.bind(notificationManager),
        
        // Actions
        watchRoadtrip: notificationManager.watchRoadtrip.bind(notificationManager),
        unwatchRoadtrip: notificationManager.unwatchRoadtrip.bind(notificationManager),
        markAsRead,
        deleteNotification,
        forceSync,
        boostPolling: notificationManager.boostPolling.bind(notificationManager),
        
        // État
        isLoading,
        error,
        
        // Utilitaires
        subscribe: notificationManager.subscribe.bind(notificationManager)
    };
};
```

## 7. Context Provider React

### `contexts/NotificationContext.jsx`

```jsx
import React, { createContext, useEffect, useState } from 'react';
import NotificationManager from '../services/NotificationManager';

export const NotificationContext = createContext(null);

export const NotificationProvider = ({ 
    children, 
    token = null,
    baseURL = '/api',
    pollingFrequency = 3000,
    enableBrowserNotifications = true 
}) => {
    const [notificationManager, setNotificationManager] = useState(null);

    useEffect(() => {
        // Demander permission pour les notifications browser
        if (enableBrowserNotifications && 'Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // Créer le gestionnaire de notifications
        const manager = new NotificationManager({
            token,
            baseURL,
            pollingFrequency,
            onNewNotification: (notification, roadtripId) => {
                // Handler personnalisé pour les nouvelles notifications
                console.log('Nouvelle notification reçue:', notification);
                
                // Notification browser si autorisée
                if (enableBrowserNotifications && 'Notification' in window && Notification.permission === 'granted') {
                    const browserNotification = new Notification(notification.title, {
                        body: notification.message,
                        icon: '/favicon.ico',
                        tag: notification._id,
                        requireInteraction: false,
                        silent: false
                    });

                    // Auto-fermer après 5 secondes
                    setTimeout(() => {
                        browserNotification.close();
                    }, 5000);
                }
            },
            onError: (error, roadtripId) => {
                console.error(`Erreur notifications roadtrip ${roadtripId}:`, error);
            }
        });

        setNotificationManager(manager);

        // Cleanup
        return () => {
            manager.destroy();
        };
    }, [token, baseURL, pollingFrequency, enableBrowserNotifications]);

    return (
        <NotificationContext.Provider value={notificationManager}>
            {children}
        </NotificationContext.Provider>
    );
};
```

## 8. CSS pour les Notifications

### `styles/notifications.css`

```css
/* Badge de notification */
.notification-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 6px;
    background: #ff4757;
    color: white;
    border-radius: 9px;
    font-size: 11px;
    font-weight: bold;
    line-height: 1;
    position: absolute;
    top: -8px;
    right: -8px;
    z-index: 1000;
}

/* Liste des notifications */
.notification-list {
    max-width: 400px;
    max-height: 500px;
    overflow-y: auto;
    background: white;
    border: 1px solid #e1e8ed;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.notification-list.empty {
    padding: 20px;
    text-align: center;
    color: #666;
}

/* Item de notification */
.notification-item {
    display: flex;
    padding: 12px 16px;
    border-bottom: 1px solid #f1f3f4;
    transition: background-color 0.2s ease;
    position: relative;
}

.notification-item:last-child {
    border-bottom: none;
}

.notification-item:hover {
    background-color: #f8f9fa;
}

.notification-item.unread {
    background-color: #f0f9ff;
    border-left: 3px solid #3b82f6;
}

.notification-item.read {
    opacity: 0.8;
}

/* Type de notification */
.notification-item.chatbot_success {
    border-left-color: #10b981;
}

.notification-item.chatbot_error {
    border-left-color: #ef4444;
}

.notification-item.system {
    border-left-color: #6b7280;
}

.notification-item.reminder {
    border-left-color: #f59e0b;
}

/* Contenu de la notification */
.notification-content {
    flex: 1;
    min-width: 0;
}

.notification-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
}

.notification-icon {
    font-size: 16px;
    flex-shrink: 0;
}

.notification-title {
    font-size: 14px;
    font-weight: 600;
    margin: 0;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.notification-time {
    font-size: 11px;
    color: #6b7280;
    flex-shrink: 0;
}

.notification-message {
    font-size: 13px;
    color: #374151;
    margin: 0;
    line-height: 1.4;
    word-wrap: break-word;
}

.notification-data {
    margin-top: 8px;
    padding: 8px;
    background: #f3f4f6;
    border-radius: 4px;
    font-family: monospace;
    font-size: 11px;
    color: #6b7280;
    max-height: 100px;
    overflow: auto;
}

/* Actions de notification */
.notification-actions {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-left: 8px;
    flex-shrink: 0;
}

.notification-actions button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    font-size: 14px;
    transition: background-color 0.2s ease;
}

.notification-actions button:hover {
    background-color: #f3f4f6;
}

.btn-mark-read:hover {
    background-color: #dbeafe;
}

.btn-delete:hover {
    background-color: #fee2e2;
}

/* Animation pour les nouvelles notifications */
@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

.notification-item.new {
    animation: slideIn 0.3s ease-out;
}

/* Responsive */
@media (max-width: 768px) {
    .notification-list {
        max-width: 100%;
        border-radius: 0;
        border-left: none;
        border-right: none;
    }
    
    .notification-item {
        padding: 16px;
    }
    
    .notification-title {
        font-size: 15px;
    }
    
    .notification-message {
        font-size: 14px;
    }
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
    .notification-list {
        background: #1f2937;
        border-color: #374151;
    }
    
    .notification-item {
        border-bottom-color: #374151;
    }
    
    .notification-item:hover {
        background-color: #374151;
    }
    
    .notification-item.unread {
        background-color: #1e3a8a;
    }
    
    .notification-title {
        color: #f9fafb;
    }
    
    .notification-message {
        color: #d1d5db;
    }
    
    .notification-time {
        color: #9ca3af;
    }
    
    .notification-data {
        background: #374151;
        color: #9ca3af;
    }
}
```

## 9. Exemple d'Usage Complet

### `App.jsx`

```jsx
import React, { useEffect } from 'react';
import { NotificationProvider } from './contexts/NotificationContext';
import { useNotifications } from './hooks/useNotifications';
import NotificationBadge from './components/NotificationBadge';
import NotificationList from './components/NotificationList';

// Composant qui utilise les notifications
const RoadtripPage = ({ roadtripId }) => {
    const { 
        getUnreadCount, 
        forceSync, 
        boostPolling,
        isLoading 
    } = useNotifications(roadtripId);

    const unreadCount = getUnreadCount(roadtripId);

    const handleRefresh = async () => {
        try {
            await forceSync(roadtripId);
            console.log('Notifications synchronisées');
        } catch (error) {
            console.error('Erreur sync:', error);
        }
    };

    const handleUserAction = () => {
        // Boost le polling après une action utilisateur
        boostPolling(roadtripId, 30000);
    };

    return (
        <div className="roadtrip-page">
            <header>
                <h1>Mon Roadtrip</h1>
                <div className="notification-section">
                    <button 
                        className="notification-btn"
                        onClick={handleRefresh}
                        disabled={isLoading}
                    >
                        🔔
                        <NotificationBadge roadtripId={roadtripId} />
                    </button>
                    {unreadCount > 0 && (
                        <span className="unread-count">
                            {unreadCount} nouvelles notifications
                        </span>
                    )}
                </div>
            </header>

            <main>
                <div className="notifications-panel">
                    <h2>Notifications</h2>
                    <NotificationList 
                        roadtripId={roadtripId}
                        maxItems={5}
                        showReadNotifications={false}
                    />
                </div>
                
                <button onClick={handleUserAction}>
                    Action utilisateur (boost polling)
                </button>
            </main>
        </div>
    );
};

// App principale
const App = () => {
    const userToken = 'your-jwt-token';
    const currentRoadtripId = 'roadtrip-123';

    return (
        <NotificationProvider 
            token={userToken}
            baseURL="/api"
            pollingFrequency={3000}
            enableBrowserNotifications={true}
        >
            <div className="app">
                <RoadtripPage roadtripId={currentRoadtripId} />
            </div>
        </NotificationProvider>
    );
};

export default App;
```

## 10. Bonnes Pratiques et Optimisations

### Performance
1. **Débounce** les actions utilisateur pour éviter les calls API excessifs
2. **Cache intelligent** : ne pas refetch si récemment synchronisé
3. **Pagination** : limiter le nombre de notifications chargées
4. **Lazy loading** : charger les notifications à la demande

### UX
1. **Feedback visuel** : indicateurs de chargement et erreurs
2. **Notifications groupées** : éviter le spam
3. **Sons et vibrations** : notifications discrètes
4. **Marquage automatique** : marquer comme lu après visualisation

### Robustesse
1. **Gestion des erreurs** : retry automatique avec backoff
2. **Mode hors ligne** : mise en pause intelligente
3. **Récupération après erreur** : reprise automatique
4. **Tests unitaires** : couverture complète des services

Cette implémentation fournit un système complet, robuste et performant pour la gestion des notifications côté frontend avec une architecture REST pure.
