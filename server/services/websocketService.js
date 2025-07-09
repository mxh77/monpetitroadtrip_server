import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

class WebSocketService {
    constructor() {
        this.wss = null;
        this.clients = new Map(); // userId -> WebSocket
        this.userToSocket = new Map(); // userId -> Set of sockets
    }

    // Initialiser le serveur WebSocket
    init(server) {
        this.wss = new WebSocketServer({ 
            server,
            path: '/websocket'
        });

        this.wss.on('connection', (ws, req) => {
            this.handleConnection(ws, req);
        });

        console.log('WebSocket server initialized');
    }

    // Gérer une nouvelle connexion WebSocket
    async handleConnection(ws, req) {
        try {
            // Extraire le token du query string ou des headers
            const token = this.extractToken(req);
            
            let user = null;
            let userId = 'anonymous';
            let userEmail = 'anonymous';
            
            if (token) {
                try {
                    // Vérifier le token
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    user = await User.findById(decoded.id);
                    
                    if (user) {
                        userId = user._id.toString();
                        userEmail = user.email;
                    }
                } catch (error) {
                    console.warn('Token invalide, connexion anonyme:', error.message);
                }
            } else {
                console.log('Connexion WebSocket sans token (mode test)');
            }

            // Associer l'utilisateur au socket
            ws.userId = userId;
            ws.userEmail = userEmail;
            ws.isAuthenticated = !!user;
            
            // Ajouter le socket aux collections
            this.addSocketForUser(ws.userId, ws);
            
            // Envoyer un message de bienvenue
            this.sendToSocket(ws, {
                type: 'connection_established',
                message: 'Connexion WebSocket établie',
                userId: ws.userId,
                authenticated: ws.isAuthenticated,
                timestamp: new Date()
            });

            console.log(`WebSocket connected: ${userEmail} (${userId}) - Auth: ${ws.isAuthenticated}`);

            // Gérer les messages du client
            ws.on('message', (data) => {
                this.handleMessage(ws, data);
            });

            // Gérer la déconnexion
            ws.on('close', () => {
                this.handleDisconnection(ws);
            });

            // Gérer les erreurs
            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                this.handleDisconnection(ws);
            });

        } catch (error) {
            console.error('Error handling WebSocket connection:', error);
            ws.close(1008, 'Erreur d\'authentification');
        }
    }

    // Extraire le token de la requête
    extractToken(req) {
        // Essayer d'abord le query string
        const url = new URL(req.url, `http://${req.headers.host}`);
        let token = url.searchParams.get('token');
        
        if (!token) {
            // Essayer les headers
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }
        
        return token;
    }

    // Ajouter un socket pour un utilisateur
    addSocketForUser(userId, ws) {
        if (!this.userToSocket.has(userId)) {
            this.userToSocket.set(userId, new Set());
        }
        this.userToSocket.get(userId).add(ws);
    }

    // Supprimer un socket pour un utilisateur
    removeSocketForUser(userId, ws) {
        if (this.userToSocket.has(userId)) {
            this.userToSocket.get(userId).delete(ws);
            if (this.userToSocket.get(userId).size === 0) {
                this.userToSocket.delete(userId);
            }
        }
    }

    // Gérer un message reçu du client
    handleMessage(ws, data) {
        try {
            const message = JSON.parse(data);
            
            switch (message.type) {
                case 'ping':
                    this.sendToSocket(ws, {
                        type: 'pong',
                        timestamp: new Date()
                    });
                    break;
                    
                case 'subscribe_roadtrip':
                    // Souscrire aux notifications d'un roadtrip
                    ws.subscribedRoadtrips = ws.subscribedRoadtrips || new Set();
                    ws.subscribedRoadtrips.add(message.roadtripId);
                    
                    this.sendToSocket(ws, {
                        type: 'subscription_confirmed',
                        roadtripId: message.roadtripId
                    });
                    break;
                    
                case 'unsubscribe_roadtrip':
                    // Se désabonner des notifications d'un roadtrip
                    if (ws.subscribedRoadtrips) {
                        ws.subscribedRoadtrips.delete(message.roadtripId);
                    }
                    
                    this.sendToSocket(ws, {
                        type: 'unsubscription_confirmed',
                        roadtripId: message.roadtripId
                    });
                    break;
                    
                default:
                    console.log('Unknown message type:', message.type);
            }
            
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
        }
    }

    // Gérer une déconnexion
    handleDisconnection(ws) {
        if (ws.userId) {
            this.removeSocketForUser(ws.userId, ws);
            console.log(`WebSocket disconnected: ${ws.userEmail} (${ws.userId})`);
        }
    }

    // Envoyer un message à un socket spécifique
    sendToSocket(ws, message) {
        if (ws.readyState === ws.OPEN) {
            try {
                ws.send(JSON.stringify(message));
            } catch (error) {
                console.error('Error sending message to socket:', error);
            }
        }
    }

    // Envoyer un message à un utilisateur (tous ses sockets)
    sendToUser(userId, message) {
        const sockets = this.userToSocket.get(userId);
        if (sockets) {
            sockets.forEach(ws => {
                this.sendToSocket(ws, message);
            });
        }
    }

    // Envoyer une notification à un utilisateur
    sendNotification(userId, notification) {
        this.sendToUser(userId, {
            type: 'notification',
            data: notification,
            timestamp: new Date()
        });
    }

    // Envoyer une mise à jour de job
    sendJobUpdate(userId, jobUpdate) {
        this.sendToUser(userId, {
            type: 'job_update',
            data: jobUpdate,
            timestamp: new Date()
        });
    }

    // Envoyer une mise à jour de roadtrip
    sendRoadtripUpdate(userId, roadtripId, updateData) {
        const sockets = this.userToSocket.get(userId);
        if (sockets) {
            sockets.forEach(ws => {
                // Vérifier si le socket est abonné à ce roadtrip
                if (ws.subscribedRoadtrips && ws.subscribedRoadtrips.has(roadtripId)) {
                    this.sendToSocket(ws, {
                        type: 'roadtrip_update',
                        roadtripId,
                        data: updateData,
                        timestamp: new Date()
                    });
                }
            });
        }
    }

    // Envoyer un message de typing indicator
    sendTypingIndicator(userId, roadtripId, isTyping) {
        const sockets = this.userToSocket.get(userId);
        if (sockets) {
            sockets.forEach(ws => {
                if (ws.subscribedRoadtrips && ws.subscribedRoadtrips.has(roadtripId)) {
                    this.sendToSocket(ws, {
                        type: 'typing_indicator',
                        roadtripId,
                        isTyping,
                        timestamp: new Date()
                    });
                }
            });
        }
    }

    // Diffuser un message à tous les utilisateurs connectés
    broadcast(message) {
        this.userToSocket.forEach((sockets, userId) => {
            sockets.forEach(ws => {
                this.sendToSocket(ws, message);
            });
        });
    }

    // Obtenir les statistiques de connexion
    getStats() {
        return {
            totalConnections: Array.from(this.userToSocket.values())
                .reduce((total, sockets) => total + sockets.size, 0),
            uniqueUsers: this.userToSocket.size,
            users: Array.from(this.userToSocket.keys())
        };
    }

    // Vérifier si un utilisateur est connecté
    isUserConnected(userId) {
        return this.userToSocket.has(userId) && this.userToSocket.get(userId).size > 0;
    }

    // Fermer toutes les connexions
    closeAll() {
        this.userToSocket.forEach((sockets, userId) => {
            sockets.forEach(ws => {
                ws.close(1000, 'Server shutdown');
            });
        });
        this.userToSocket.clear();
    }
}

// Instance singleton
const websocketService = new WebSocketService();

export default websocketService;
