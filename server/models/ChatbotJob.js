import mongoose from 'mongoose';

const { Schema } = mongoose;

const chatbotJobSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    roadtripId: { type: Schema.Types.ObjectId, ref: 'Roadtrip', required: true },
    conversationId: { type: String, required: true },
    
    // Requête utilisateur
    userQuery: { type: String, required: true },
    intent: { type: String, required: true }, // 'add_step', 'delete_step', 'add_accommodation', etc.
    entities: { type: Schema.Types.Mixed }, // Entités extraites
    
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
            result: { type: Schema.Types.Mixed },
            error: { type: String },
            timestamp: { type: Date, default: Date.now }
        }]
    },
    
    // Résultat
    result: {
        success: { type: Boolean },
        data: { type: Schema.Types.Mixed },
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
}, { 
    timestamps: true,
    // Index pour améliorer les performances
    indexes: [
        { roadtripId: 1, userId: 1 },
        { conversationId: 1 },
        { status: 1 },
        { createdAt: -1 }
    ]
});

export default mongoose.model('ChatbotJob', chatbotJobSchema);
