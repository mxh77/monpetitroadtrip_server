import mongoose from 'mongoose';

const { Schema } = mongoose;

const taskGenerationJobSchema = new Schema({
    roadtripId: {
        type: Schema.Types.ObjectId,
        ref: 'Roadtrip',
        required: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    result: {
        taskCount: Number,
        error: String
    },
    options: {
        replace: {
            type: Boolean,
            default: false
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date
    }
}, {
    timestamps: true
});

export default mongoose.model('TaskGenerationJob', taskGenerationJobSchema);
