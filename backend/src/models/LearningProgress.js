const mongoose = require('mongoose');

const { Schema } = mongoose;

const learningProgressSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pathId: { type: String, required: true, trim: true },
    completedStepIds: [{ type: String, trim: true }],
    badges: [{ type: String, trim: true }],
    progressPercent: { type: Number, default: 0, min: 0, max: 100 },
    lastCompletedAt: { type: Date },
  },
  { timestamps: true }
);

learningProgressSchema.index({ user: 1, pathId: 1 }, { unique: true });

module.exports = mongoose.model('LearningProgress', learningProgressSchema);
