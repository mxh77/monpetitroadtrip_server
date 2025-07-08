import mongoose from 'mongoose';

const { Schema } = mongoose;

const roadtripTaskSchema = new Schema({
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
    title: { 
        type: String, 
        required: true,
        maxlength: 200,
        trim: true
    },
    description: { 
        type: String, 
        maxlength: 1000,
        trim: true,
        default: ''
    },
    category: {
        type: String,
        enum: [
            'preparation', // Préparation du voyage
            'booking', // Réservations
            'packing', // Bagages
            'documents', // Documents/papiers
            'transport', // Transport
            'accommodation', // Hébergement
            'activities', // Activités
            'health', // Santé/médicaments
            'finances', // Finances
            'communication', // Communication
            'other' // Autre
        ],
        default: 'preparation'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'cancelled'],
        default: 'pending'
    },
    dueDate: { 
        type: Date,
        default: null
    },
    completedAt: { 
        type: Date,
        default: null
    },
    assignedTo: {
        type: String,
        maxlength: 100,
        trim: true,
        default: '' // Nom de la personne responsable (optionnel)
    },
    estimatedDuration: {
        type: Number, // En minutes
        default: null
    },
    reminderDate: {
        type: Date,
        default: null
    },
    attachments: [{
        type: Schema.Types.ObjectId,
        ref: 'File'
    }],
    notes: {
        type: String,
        maxlength: 2000,
        default: ''
    },
    // Métadonnées pour le suivi
    order: {
        type: Number,
        default: 0 // Pour permettre le réordonnancement des tâches
    },
    isRecurring: {
        type: Boolean,
        default: false
    },
    recurringPattern: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
        default: null
    }
}, {
    timestamps: true // Ajoute createdAt et updatedAt automatiquement
});

// Index pour optimiser les requêtes
roadtripTaskSchema.index({ roadtripId: 1, userId: 1 });
roadtripTaskSchema.index({ roadtripId: 1, status: 1 });
roadtripTaskSchema.index({ roadtripId: 1, category: 1 });
roadtripTaskSchema.index({ dueDate: 1 });
roadtripTaskSchema.index({ order: 1 });

// Middleware pour mettre à jour completedAt automatiquement
roadtripTaskSchema.pre('save', function(next) {
    if (this.isModified('status')) {
        if (this.status === 'completed' && !this.completedAt) {
            this.completedAt = new Date();
        } else if (this.status !== 'completed') {
            this.completedAt = null;
        }
    }
    next();
});

// Méthode virtuelle pour calculer si la tâche est en retard
roadtripTaskSchema.virtual('isOverdue').get(function() {
    return this.dueDate && 
           this.dueDate < new Date() && 
           this.status !== 'completed' && 
           this.status !== 'cancelled';
});

// Méthode virtuelle pour calculer le temps restant
roadtripTaskSchema.virtual('timeRemaining').get(function() {
    if (!this.dueDate || this.status === 'completed' || this.status === 'cancelled') {
        return null;
    }
    const now = new Date();
    const remaining = this.dueDate.getTime() - now.getTime();
    return Math.max(0, remaining);
});

// Inclure les champs virtuels lors de la sérialisation JSON
roadtripTaskSchema.set('toJSON', { virtuals: true });
roadtripTaskSchema.set('toObject', { virtuals: true });

export default mongoose.model('RoadtripTask', roadtripTaskSchema);
