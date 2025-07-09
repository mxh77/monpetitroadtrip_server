# Architecture du Chatbot IA pour MonPetitRoadtrip

## 🎯 Objectifs
- Permettre aux utilisateurs d'interagir avec leur roadtrip en langage naturel
- Exécuter des actions asynchrones (ajouter/supprimer des steps, hébergements, activités, tâches)
- Système de notifications intégré dans l'application
- Interface conversationnelle intuitive

## 🏗️ Architecture Proposée

### 1. **Composants Backend**

#### A. **Module de traitement du langage naturel (NLP)**
```
server/
├── controllers/
│   ├── chatbotController.js          # Contrôleur principal du chatbot
│   ├── chatbotJobController.js       # Gestion des tâches asynchrones
│   └── notificationController.js     # Gestion des notifications
├── services/
│   ├── nlpService.js                 # Analyse du langage naturel
│   ├── intentClassifier.js          # Classification des intentions
│   ├── entityExtractor.js           # Extraction d'entités
│   └── actionExecutor.js            # Exécution des actions
├── models/
│   ├── ChatbotJob.js                # Modèle pour les tâches du chatbot
│   ├── Notification.js              # Modèle pour les notifications
│   └── ChatHistory.js               # Historique des conversations
└── utils/
    ├── nlpUtils.js                  # Utilitaires NLP
    └── responseGenerator.js         # Génération de réponses
```

#### B. **Système de notifications en temps réel**
```
server/
├── services/
│   ├── notificationService.js       # Service de notifications
│   ├── websocketService.js          # WebSocket pour temps réel
│   └── eventEmitter.js              # Gestionnaire d'événements
├── middleware/
│   └── websocketAuth.js             # Authentification WebSocket
└── sockets/
    └── notificationSocket.js        # Socket pour notifications
```

## 📊 Modèles de données

### ChatbotJob (Tâches asynchrones)
```javascript
const ChatbotJobSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    roadtripId: { type: Schema.Types.ObjectId, ref: 'Roadtrip', required: true },
    conversationId: { type: String, required: true },
    
    // Requête utilisateur
    userQuery: { type: String, required: true },
    intent: { type: String, required: true }, // 'add_step', 'delete_step', 'add_accommodation', etc.
    entities: { type: Mixed }, // Entités extraites
    
    // Statut du job
    status: { 
        type: String, 
        enum: ['pending', 'processing', 'completed', 'failed'], 
        default: 'pending' 
    },
    
    // Progression
    progress: {
        currentStep: { type: String },
        percentage: { type: Number, default: 0 },
        steps: [{
            name: { type: String },
            status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'] },
            result: { type: Mixed },
            error: { type: String },
            timestamp: { type: Date, default: Date.now }
        }]
    },
    
    // Résultat
    result: {
        success: { type: Boolean },
        data: { type: Mixed },
        message: { type: String },
        createdItems: [{ type: Schema.Types.ObjectId, refPath: 'result.createdItemsModel' }],
        createdItemsModel: { type: String, enum: ['Step', 'Accommodation', 'Activity', 'RoadtripTask'] }
    },
    
    // Métadonnées
    aiModel: { type: String, default: 'gpt-4' },
    tokensUsed: { type: Number, default: 0 },
    executionTime: { type: Number }, // en millisecondes
    
    startedAt: { type: Date },
    completedAt: { type: Date },
    errorMessage: { type: String }
}, { timestamps: true });
```

### Notification (Notifications utilisateur)
```javascript
const NotificationSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    roadtripId: { type: Schema.Types.ObjectId, ref: 'Roadtrip' },
    
    // Type de notification
    type: { 
        type: String, 
        enum: ['chatbot_success', 'chatbot_error', 'system', 'reminder'], 
        required: true 
    },
    
    // Contenu
    title: { type: String, required: true },
    message: { type: String, required: true },
    icon: { type: String, default: 'info' }, // 'success', 'error', 'warning', 'info'
    
    // Métadonnées
    data: { type: Mixed }, // Données additionnelles
    relatedJobId: { type: Schema.Types.ObjectId, ref: 'ChatbotJob' },
    
    // Statut
    read: { type: Boolean, default: false },
    readAt: { type: Date },
    
    // Expiration
    expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } // 7 jours
}, { timestamps: true });
```

### ChatHistory (Historique des conversations)
```javascript
const ChatHistorySchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    roadtripId: { type: Schema.Types.ObjectId, ref: 'Roadtrip', required: true },
    conversationId: { type: String, required: true },
    
    messages: [{
        role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        
        // Métadonnées pour les messages assistant
        intent: { type: String },
        entities: { type: Mixed },
        jobId: { type: Schema.Types.ObjectId, ref: 'ChatbotJob' },
        
        // Métadonnées pour les messages système
        actionType: { type: String },
        actionResult: { type: Mixed }
    }],
    
    // Contexte de la conversation
    context: {
        activeRoadtripId: { type: Schema.Types.ObjectId, ref: 'Roadtrip' },
        lastIntent: { type: String },
        pendingActions: [{ type: String }]
    }
}, { timestamps: true });
```

## 🔄 Flow d'exécution

### 1. **Réception et traitement de la requête**
```javascript
// chatbotController.js
export const processUserQuery = async (req, res) => {
    const { query, conversationId } = req.body;
    const { idRoadtrip } = req.params;
    
    try {
        // Vérifier que le roadtrip appartient à l'utilisateur
        const roadtrip = await Roadtrip.findOne({ 
            _id: idRoadtrip, 
            userId: req.user.id 
        });
        
        if (!roadtrip) {
            return res.status(404).json({ 
                msg: 'Roadtrip not found or not authorized' 
            });
        }
        
        // 1. Analyser la requête
        const analysis = await nlpService.analyzeQuery(query, roadtrip);
        
        // 2. Créer un job asynchrone
        const job = await ChatbotJob.create({
            userId: req.user.id,
            roadtripId: idRoadtrip,
            conversationId: conversationId || generateConversationId(),
            userQuery: query,
            intent: analysis.intent,
            entities: analysis.entities,
            status: 'pending'
        });
        
        // 3. Lancer le traitement asynchrone
        processJobAsync(job._id);
        
        // 4. Retourner la confirmation immédiate
        res.json({
            success: true,
            jobId: job._id,
            conversationId: job.conversationId,
            message: "Je traite votre demande...",
            estimatedTime: getEstimatedTime(analysis.intent)
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
```

### 2. **Traitement asynchrone**
```javascript
// chatbotJobController.js
const processJobAsync = async (jobId) => {
    const job = await ChatbotJob.findById(jobId);
    
    try {
        // 1. Marquer comme en cours
        job.status = 'processing';
        job.startedAt = new Date();
        await job.save();
        
        // 2. Exécuter l'action selon l'intent
        const result = await executeAction(job);
        
        // 3. Marquer comme terminé
        job.status = 'completed';
        job.result = result;
        job.completedAt = new Date();
        await job.save();
        
        // 4. Envoyer notification de succès
        await notificationService.createNotification({
            userId: job.userId,
            roadtripId: job.roadtripId,
            type: 'chatbot_success',
            title: 'Action terminée',
            message: generateSuccessMessage(job.intent, result),
            relatedJobId: job._id,
            data: { result }
        });
        
    } catch (error) {
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
            relatedJobId: job._id
        });
    }
};
```

### 3. **Classification des intentions**
```javascript
// intentClassifier.js
export const classifyIntent = (query) => {
    const intents = {
        'add_step': /ajouter?.*(?:étape|step|ville|destination)/i,
        'delete_step': /supprimer?.*(?:étape|step)/i,
        'add_accommodation': /ajouter?.*(?:hébergement|hôtel|logement)/i,
        'delete_accommodation': /supprimer?.*(?:hébergement|hôtel|logement)/i,
        'add_activity': /ajouter?.*(?:activité|visite|attraction)/i,
        'delete_activity': /supprimer?.*(?:activité|visite|attraction)/i,
        'add_task': /ajouter?.*(?:tâche|todo|à faire)/i,
        'update_dates': /modifier?.*(?:dates?|horaires?)/i,
        'get_info': /(?:informations?|détails?|voir|afficher)/i,
        'help': /aide|help|comment/i
    };
    
    for (const [intent, pattern] of Object.entries(intents)) {
        if (pattern.test(query)) {
            return intent;
        }
    }
    
    return 'unknown';
};
```

### 4. **Exécution des actions**
```javascript
// actionExecutor.js
export const executeAction = async (job) => {
    const { intent, entities, roadtripId, userId } = job;
    
    switch (intent) {
        case 'add_step':
            return await addStep(roadtripId, entities, userId);
        case 'delete_step':
            return await deleteStep(roadtripId, entities, userId);
        case 'add_accommodation':
            return await addAccommodation(roadtripId, entities, userId);
        case 'add_activity':
            return await addActivity(roadtripId, entities, userId);
        case 'add_task':
            return await addTask(roadtripId, entities, userId);
        // ... autres actions
        default:
            throw new Error(`Action non supportée: ${intent}`);
    }
};

const addStep = async (roadtripId, entities, userId) => {
    // Utiliser l'IA pour extraire les détails
    const stepDetails = await nlpService.extractStepDetails(entities);
    
    // Créer le step
    const step = await Step.create({
        roadtripId,
        userId,
        name: stepDetails.name,
        address: stepDetails.address,
        arrivalDateTime: stepDetails.arrivalDateTime,
        departureDateTime: stepDetails.departureDateTime,
        notes: stepDetails.notes
    });
    
    // Ajouter aux steps du roadtrip
    await Roadtrip.findByIdAndUpdate(roadtripId, {
        $push: { steps: step._id }
    });
    
    return {
        success: true,
        action: 'add_step',
        data: step,
        message: `Étape "${step.name}" ajoutée avec succès`
    };
};
```

## 🌐 Système de notifications en temps réel

### 1. **WebSocket Setup**
```javascript
// websocketService.js
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

class WebSocketService {
    constructor(server) {
        this.io = new Server(server, {
            cors: {
                origin: process.env.FRONTEND_URL,
                methods: ["GET", "POST"]
            }
        });
        
        this.setupAuth();
        this.setupHandlers();
    }
    
    setupAuth() {
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token;
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                socket.userId = decoded.user.id;
                next();
            } catch (error) {
                next(new Error('Authentication failed'));
            }
        });
    }
    
    setupHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`User ${socket.userId} connected`);
            
            // Rejoindre la room de l'utilisateur
            socket.join(`user_${socket.userId}`);
            
            // Gestionnaires d'événements
            socket.on('join_roadtrip', (roadtripId) => {
                socket.join(`roadtrip_${roadtripId}`);
            });
            
            socket.on('disconnect', () => {
                console.log(`User ${socket.userId} disconnected`);
            });
        });
    }
    
    // Envoyer une notification à un utilisateur
    sendNotification(userId, notification) {
        this.io.to(`user_${userId}`).emit('notification', notification);
    }
    
    // Envoyer une mise à jour de job
    sendJobUpdate(userId, jobUpdate) {
        this.io.to(`user_${userId}`).emit('job_update', jobUpdate);
    }
}
```

### 2. **Service de notifications**
```javascript
// notificationService.js
import Notification from '../models/Notification.js';
import { websocketService } from './websocketService.js';

export const createNotification = async (notificationData) => {
    // Créer en base
    const notification = await Notification.create(notificationData);
    
    // Envoyer en temps réel
    websocketService.sendNotification(notification.userId, {
        id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        icon: notification.icon,
        data: notification.data,
        timestamp: notification.createdAt
    });
    
    return notification;
};

export const markAsRead = async (notificationId, userId) => {
    return await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { read: true, readAt: new Date() },
        { new: true }
    );
};

export const getUserNotifications = async (userId, limit = 50) => {
    return await Notification.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit);
};
```

## 📱 Interface Frontend

### 1. **Composant Chatbot**
```javascript
// components/Chatbot.js
class Chatbot {
    constructor() {
        this.socket = io({
            auth: {
                token: localStorage.getItem('token')
            }
        });
        
        this.setupSocketListeners();
        this.conversationId = this.generateConversationId();
    }
    
    setupSocketListeners() {
        this.socket.on('notification', (notification) => {
            this.showNotification(notification);
        });
        
        this.socket.on('job_update', (update) => {
            this.updateJobStatus(update);
        });
    }
    
    async sendMessage(message) {
        // Afficher le message utilisateur
        this.addMessage('user', message);
        
        // Envoyer au serveur
        const response = await fetch(`/api/roadtrips/${this.currentRoadtripId}/chat/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                query: message,
                conversationId: this.conversationId
            })
        });
        
        const result = await response.json();
        
        // Afficher la réponse
        this.addMessage('assistant', result.message);
        
        // Suivre le job si asynchrone
        if (result.jobId) {
            this.trackJob(result.jobId);
        }
    }
    
    trackJob(jobId) {
        // Afficher un indicateur de progression
        this.showJobProgress(jobId);
        
        // Polling pour le statut (en complément du WebSocket)
        const checkStatus = async () => {
            const response = await fetch(`/api/roadtrips/${this.currentRoadtripId}/chat/jobs/${jobId}/status`);
            const status = await response.json();
            
            if (status.status === 'completed') {
                this.hideJobProgress(jobId);
                this.addMessage('system', `✅ ${status.result.message}`);
                this.refreshRoadtripData();
            } else if (status.status === 'failed') {
                this.hideJobProgress(jobId);
                this.addMessage('system', `❌ Erreur: ${status.errorMessage}`);
            } else {
                setTimeout(checkStatus, 2000);
            }
        };
        
        checkStatus();
    }
}
```

### 2. **Système de notifications**
```javascript
// components/NotificationSystem.js
class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.container = this.createContainer();
    }
    
    show(notification) {
        const element = this.createElement(notification);
        this.container.appendChild(element);
        
        // Auto-dismiss après 5 secondes
        setTimeout(() => {
            this.hide(notification.id);
        }, 5000);
    }
    
    createElement(notification) {
        const div = document.createElement('div');
        div.className = `notification notification-${notification.type}`;
        div.innerHTML = `
            <div class="notification-icon">
                <i class="fas fa-${this.getIcon(notification.icon)}"></i>
            </div>
            <div class="notification-content">
                <h4>${notification.title}</h4>
                <p>${notification.message}</p>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        return div;
    }
}
```

## 🚀 Exemples d'utilisation

### URL patterns
```
🌐 POST /api/roadtrips/{idRoadtrip}/chat/query
🌐 GET /api/roadtrips/{idRoadtrip}/chat/conversations
🌐 GET /api/roadtrips/{idRoadtrip}/chat/jobs/{jobId}/status
🌐 GET /api/roadtrips/{idRoadtrip}/notifications
```

### Commandes supportées
```
🗣️ "Ajoute une étape à Paris du 15 au 17 juillet"
🗣️ "Supprime l'étape de Lyon"
🗣️ "Ajoute un hébergement Hôtel de la Paix à Marseille"
🗣️ "Ajoute une activité visite du Louvre le 16 juillet à 14h"
🗣️ "Ajoute une tâche réserver les billets de train"
🗣️ "Modifie les dates du roadtrip du 10 au 20 juillet"
🗣️ "Montre-moi les informations de l'étape de Nice"
```

### Exemple d'utilisation frontend
```javascript
// Initialiser le chatbot pour un roadtrip spécifique
const chatbot = new Chatbot(roadtripId);

// Envoyer une requête
await chatbot.sendMessage("Ajoute une étape à Paris du 15 au 17 juillet");

// Récupérer les notifications du roadtrip
const notifications = await fetch(`/api/roadtrips/${roadtripId}/notifications`);

// Récupérer l'historique des conversations
const conversations = await fetch(`/api/roadtrips/${roadtripId}/chat/conversations`);
```

### Exemple de WebSocket room
```javascript
// Rejoindre la room spécifique au roadtrip
socket.on('connect', () => {
    socket.emit('join_roadtrip', roadtripId);
});

// Écouter les notifications pour ce roadtrip
socket.on('notification', (notification) => {
    if (notification.roadtripId === roadtripId) {
        showNotification(notification);
    }
});
```

## 💡 Avantages de cette architecture

1. **Contexte roadtrip** : Chaque chatbot est lié à un roadtrip spécifique
2. **Sécurité renforcée** : Vérification systématique des autorisations
3. **Organisation claire** : Routes logiquement groupées sous `/roadtrips/{id}/`
4. **Notifications ciblées** : Système de notifications par roadtrip
5. **Asynchrone** : Les actions longues ne bloquent pas l'interface
6. **Notifications en temps réel** : L'utilisateur est informé immédiatement
7. **Extensible** : Facile d'ajouter de nouvelles intentions et actions
8. **Historique** : Toutes les conversations sont sauvegardées par roadtrip
9. **Robuste** : Gestion d'erreurs et récupération automatique
10. **Scalable** : Peut gérer plusieurs utilisateurs et roadtrips simultanément

Cette architecture vous permet d'avoir un chatbot IA complet avec notifications intégrées, parfaitement adapté à votre application de roadtrip et respectant l'organisation de vos routes existantes ! 🚀