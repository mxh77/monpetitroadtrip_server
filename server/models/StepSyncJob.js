import mongoose from 'mongoose';

const { Schema } = mongoose;

const stepSyncJobSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    roadtripId: { type: Schema.Types.ObjectId, ref: 'Roadtrip', required: true },
    status: { 
        type: String, 
        enum: ['pending', 'running', 'completed', 'failed'], 
        default: 'pending' 
    },
    progress: {
        total: { type: Number, default: 0 },
        completed: { type: Number, default: 0 },
        percentage: { type: Number, default: 0 }
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
    errorMessage: { type: String },
    results: {
        stepsProcessed: { type: Number, default: 0 },
        stepsSynchronized: { type: Number, default: 0 },
        errors: [{ 
            stepId: { type: Schema.Types.ObjectId, ref: 'Step' },
            error: { type: String }
        }],
        summary: {
            totalSteps: { type: Number, default: 0 },
            synchronizedSteps: { type: Number, default: 0 },
            unchangedSteps: { type: Number, default: 0 },
            details: [{
                stepId: { type: Schema.Types.ObjectId, ref: 'Step' },
                stepName: { type: String },
                before: {
                    arrivalDateTime: { type: Date },
                    departureDateTime: { type: Date }
                },
                after: {
                    arrivalDateTime: { type: Date },
                    departureDateTime: { type: Date }
                },
                changed: { type: Boolean, default: false }
            }]
        }
    }
}, {
    timestamps: true
});

export default mongoose.model('StepSyncJob', stepSyncJobSchema);
