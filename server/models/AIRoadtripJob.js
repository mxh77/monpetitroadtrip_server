import mongoose from 'mongoose';

const { Schema } = mongoose;

const aiRoadtripJobSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { 
        type: String, 
        enum: ['pending', 'planning', 'detailing', 'creating', 'completed', 'failed'], 
        default: 'pending' 
    },
    currentStep: { type: Number, default: 0 },
    totalSteps: { type: Number, default: 0 },
    progress: {
        total: { type: Number, default: 0 },
        completed: { type: Number, default: 0 },
        percentage: { type: Number, default: 0 }
    },
    parameters: {
        startLocation: {
            address: { type: String, required: true },
            coordinates: {
                lat: { type: Number },
                lng: { type: Number }
            }
        },
        endLocation: {
            address: { type: String },
            coordinates: {
                lat: { type: Number },
                lng: { type: Number }
            }
        },
        startDate: { type: Date },
        endDate: { type: Date },
        duration: { type: Number },
        budget: { type: String },
        travelers: { type: String },
        description: { type: String },
        preferences: { type: Schema.Types.Mixed },
        constraints: { type: Schema.Types.Mixed }
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
    errorMessage: { type: String },
    // Plan intermédiaire créé par l'agent planificateur
    planData: {
        name: { type: String },
        description: { type: String },
        currency: { type: String, default: 'EUR' },
        steps: [{
            name: { type: String },
            type: { type: String, enum: ['Stage', 'Stop'], default: 'Stage' },
            location: { type: String },
            arrivalDateTime: { type: Date },
            departureDateTime: { type: Date },
            description: { type: String },
            processingStatus: { 
                type: String, 
                enum: ['pending', 'processing', 'completed', 'failed'], 
                default: 'pending'
            }
        }]
    },
    // Résultats finaux
    results: {
        roadtripId: { type: Schema.Types.ObjectId, ref: 'Roadtrip' },
        stepsCreated: { type: Number, default: 0 },
        accommodationsCreated: { type: Number, default: 0 },
        activitiesCreated: { type: Number, default: 0 },
        errors: [{ 
            step: { type: String },
            error: { type: String }
        }]
    },
    // Log des requêtes à l'API d'IA
    aiApiCalls: [{
        agent: { type: String, enum: ['planner', 'detailer', 'creator'] },
        timestamp: { type: Date, default: Date.now },
        prompt: { type: String },
        response: { type: String },
        tokensUsed: { type: Number },
        model: { type: String },
        success: { type: Boolean, default: true },
        error: { type: String }
    }],
    // Notifications
    notifications: {
        emailSent: { type: Boolean, default: false },
        emailSentAt: { type: Date },
        pushSent: { type: Boolean, default: false },
        pushSentAt: { type: Date }
    }
}, {
    timestamps: true
});

export default mongoose.model('AIRoadtripJob', aiRoadtripJobSchema);
