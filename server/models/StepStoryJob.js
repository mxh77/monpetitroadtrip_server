import mongoose from 'mongoose';

const StepStoryJobSchema = new mongoose.Schema({
  stepId: { type: mongoose.Schema.Types.ObjectId, ref: 'Step', required: true },
  status: { type: String, enum: ['pending', 'processing', 'done', 'error'], default: 'pending' },
  result: { type: mongoose.Schema.Types.Mixed },
  error: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

StepStoryJobSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const StepStoryJob = mongoose.model('StepStoryJob', StepStoryJobSchema);
export default StepStoryJob;
