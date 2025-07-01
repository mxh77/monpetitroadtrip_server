import mongoose from 'mongoose';

const { Schema } = mongoose;

const travelTimeJobSchema = new Schema({
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
        errors: [{ 
            stepId: { type: Schema.Types.ObjectId, ref: 'Step' },
            error: { type: String }
        }],
        summary: {
            totalDistance: { type: Number, default: 0 },
            totalTravelTime: { type: Number, default: 0 },
            inconsistentSteps: { type: Number, default: 0 }
        }
    }
}, {
    timestamps: true
});

export default mongoose.model('TravelTimeJob', travelTimeJobSchema);
