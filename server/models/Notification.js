import mongoose from 'mongoose';

const { Schema } = mongoose;

const notificationSchema = new Schema({
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
    data: { type: Schema.Types.Mixed }, // Données additionnelles
    relatedJobId: { type: Schema.Types.ObjectId, ref: 'ChatbotJob' },
    
    // Statut
    read: { type: Boolean, default: false },
    readAt: { type: Date },
    
    // Expiration automatique
    expiresAt: { 
        type: Date, 
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
        expires: 0 // TTL index pour suppression automatique
    }
}, { 
    timestamps: true,
    // Index pour améliorer les performances
    indexes: [
        { userId: 1, createdAt: -1 },
        { roadtripId: 1, userId: 1 },
        { read: 1 },
        { expiresAt: 1 }
    ]
});

export default mongoose.model('Notification', notificationSchema);
