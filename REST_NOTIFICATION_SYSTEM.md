# Système de Notifications REST - MonPetitRoadtrip

## Vue d'ensemble

Le système de notifications a été simplifié et ne repose plus que sur des endpoints REST. Toutes les fonctionnalités WebSocket et SSE ont été supprimées pour une architecture plus simple et maintenable.

## Architecture

### Backend
- **Service de notification simplifié** : Sauvegarde uniquement en base de données avec logs console
- **Endpoints REST** : API complète pour la gestion des notifications
- **Pas de temps réel** : Fini les WebSocket, SSE ou EventEmitter

### Frontend (recommandations)
- **Polling simple** : Interroger l'API toutes les 2-5 secondes
- **État local** : Gérer les notifications côté client
- **UX optimisée** : Utiliser des indicateurs visuels pour les nouvelles notifications

## Endpoints API

### Récupérer les notifications
```
GET /api/roadtrips/:roadtripId/notifications
```

**Paramètres de requête optionnels :**
- `limit` : Nombre max de notifications (défaut: 50)
- `includeRead` : Inclure les lues (défaut: true)
- `types` : Filtrer par types (array)

**Réponse :**
```json
{
  "success": true,
  "data": [
    {
      "_id": "notification_id",
      "userId": "user_id",
      "roadtripId": "roadtrip_id",
      "type": "chatbot_success",
      "title": "Action terminée",
      "message": "Votre demande a été traitée",
      "icon": "success",
      "read": false,
      "createdAt": "2025-01-09T...",
      "data": {...}
    }
  ]
}
```

### Marquer comme lue
```
PUT /api/roadtrips/:roadtripId/notifications/:notificationId/read
```

### Supprimer une notification
```
DELETE /api/roadtrips/:roadtripId/notifications/:notificationId
```

### Compter les non lues
```
GET /api/roadtrips/:roadtripId/notifications/unread/count
```

## Stratégie de Polling Frontend

### Implémentation recommandée

```javascript
class NotificationManager {
    constructor(roadtripId, token) {
        this.roadtripId = roadtripId;
        this.token = token;
        this.pollingInterval = null;
        this.lastCheck = new Date();
    }
    
    start() {
        // Polling toutes les 3 secondes
        this.pollingInterval = setInterval(() => {
            this.checkNotifications();
        }, 3000);
    }
    
    async checkNotifications() {
        try {
            const response = await fetch(`/api/roadtrips/${this.roadtripId}/notifications?includeRead=false`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            const result = await response.json();
            if (result.success) {
                this.handleNewNotifications(result.data);
            }
        } catch (error) {
            console.error('Erreur polling notifications:', error);
        }
    }
    
    handleNewNotifications(notifications) {
        notifications.forEach(notification => {
            if (new Date(notification.createdAt) > this.lastCheck) {
                this.displayNotification(notification);
            }
        });
        this.lastCheck = new Date();
    }
    
    stop() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
    }
}
```

### Optimisations

1. **Polling intelligent** :
   - Ralentir quand l'onglet n'est pas actif
   - Accélérer après une action utilisateur
   - Arrêter complètement si déconnecté

2. **Cache local** :
   - Stocker les notifications en localStorage
   - Éviter les requêtes inutiles
   - Synchroniser avec le serveur

3. **UX améliorée** :
   - Badge de compteur sur l'icône notifications
   - Toast/popup pour les nouvelles notifications
   - Son/vibration selon les préférences

## Types de Notifications

- `chatbot_success` : Action IA terminée avec succès
- `chatbot_error` : Erreur lors d'une action IA
- `system` : Notification système
- `reminder` : Rappel utilisateur

## Avantages du Système REST

✅ **Simplicité** : Pas de gestion de connexions WebSocket
✅ **Fiabilité** : Pas de problèmes de reconnexion
✅ **Compatibilité** : Fonctionne partout sans configuration
✅ **Débogage** : Plus facile à tester et déboguer
✅ **Évolutivité** : Plus simple à mettre à l'échelle

## Migration depuis WebSocket

Si vous aviez du code WebSocket existant :

```javascript
// AVANT (WebSocket)
websocket.onmessage = function(event) {
    const data = JSON.parse(event.data);
    if (data.type === 'notification') {
        handleNotification(data.data);
    }
};

// APRÈS (REST Polling)
setInterval(async () => {
    const notifications = await fetchNotifications();
    notifications.forEach(handleNotification);
}, 3000);
```

## Exemple Complet

Voir le fichier `public/test_chatbot.html` pour un exemple complet d'implémentation côté client avec polling des notifications.
