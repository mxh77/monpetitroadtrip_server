import mongoose from 'mongoose';

const { Schema } = mongoose;

const chatHistorySchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    roadtripId: { type: Schema.Types.ObjectId, ref: 'Roadtrip', required: true },
    conversationId: { type: String, required: true },
    
    messages: [{
        role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        
        // Métadonnées pour les messages assistant
        intent: { type: String },
        entities: { type: Schema.Types.Mixed },
        jobId: { type: Schema.Types.ObjectId, ref: 'ChatbotJob' },
        
        // Métadonnées pour les messages système
        actionType: { type: String },
        actionResult: { type: Schema.Types.Mixed }
    }],
    
    // Contexte de la conversation
    context: {
        activeRoadtripId: { type: Schema.Types.ObjectId, ref: 'Roadtrip' },
        lastIntent: { type: String },
        pendingActions: [{ type: String }]
    },
    
    // Métadonnées de la conversation
    title: { type: String }, // Titre généré automatiquement
    summary: { type: String }, // Résumé de la conversation
    isActive: { type: Boolean, default: true }
}, { 
    timestamps: true,
    // Index pour améliorer les performances
    indexes: [
        { roadtripId: 1, userId: 1 },
        { conversationId: 1 },
        { updatedAt: -1 },
        { 'messages.timestamp': -1 }
    ]
});

// Méthode pour ajouter un message
chatHistorySchema.methods.addMessage = function(role, content, metadata = {}) {
    const message = {
        role,
        content,
        timestamp: new Date(),
        ...metadata
    };
    
    this.messages.push(message);
    return this.save();
};

// Méthode pour générer un titre automatique
chatHistorySchema.methods.generateTitle = function() {
    if (this.messages.length > 0) {
        const firstUserMessage = this.messages.find(m => m.role === 'user');
        if (firstUserMessage) {
            // Prendre les premiers mots du premier message utilisateur
            this.title = firstUserMessage.content.substring(0, 50) + '...';
        }
    }
    return this.title;
};

export default mongoose.model('ChatHistory', chatHistorySchema);
