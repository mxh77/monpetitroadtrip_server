import mongoose from 'mongoose';

const { Schema } = mongoose;

const aiTaskJobSchema = new Schema({
    userId: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    roadtripId: { 
        type: Schema.Types.ObjectId, 
        ref: 'Roadtrip', 
        required: true 
    },
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'failed'],
        default: 'pending'
    },
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    currentStep: {
        type: String,
        default: 'Initialisation'
    },
    result: {
        tasks: [{
            type: Schema.Types.ObjectId,
            ref: 'RoadtripTask'
        }],
        count: {
            type: Number,
            default: 0
        }
    },
    error: {
        message: String,
        stack: String,
        code: String
    },
    parameters: {
        replace: {
            type: Boolean,
            default: false
        }
    },
    startedAt: {
        type: Date
    },
    completedAt: {
        type: Date
    },
    estimatedDuration: {
        type: Number, // en secondes
        default: 30
    }
}, {
    timestamps: true
});

// Index pour optimiser les requêtes
aiTaskJobSchema.index({ userId: 1, roadtripId: 1 });
aiTaskJobSchema.index({ status: 1 });
aiTaskJobSchema.index({ createdAt: -1 });

// Méthode pour mettre à jour le statut
aiTaskJobSchema.methods.updateProgress = function(progress, currentStep) {
    this.progress = progress;
    this.currentStep = currentStep;
    return this.save();
};

// Méthode pour marquer comme terminé
aiTaskJobSchema.methods.markCompleted = function(tasks) {
    this.status = 'completed';
    this.progress = 100;
    this.currentStep = 'Terminé';
    this.completedAt = new Date();
    this.result.tasks = tasks.map(task => task._id);
    this.result.count = tasks.length;
    return this.save();
};

// Méthode pour marquer comme échoué
aiTaskJobSchema.methods.markFailed = function(error) {
    this.status = 'failed';
    this.currentStep = 'Échec';
    this.error = {
        message: error.message,
        stack: error.stack,
        code: error.code || 'UNKNOWN_ERROR'
    };
    this.completedAt = new Date();
    return this.save();
};

export default mongoose.model('AITaskJob', aiTaskJobSchema);
