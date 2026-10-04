const mongoose = require('mongoose');

const { Schema } = mongoose;

const scoreBreakdownSchema = new Schema(
  {
    comportemental: { type: Number, required: true, min: 0, max: 100 },
    emotionnel: { type: Number, required: true, min: 0, max: 100 },
    social: { type: Number, required: true, min: 0, max: 100 },
    parental: { type: Number, required: true, min: 0, max: 100 },
  },
  { _id: false }
);

const weightSchema = new Schema(
  {
    comportemental: { type: Number, required: true },
    emotionnel: { type: Number, required: true },
    social: { type: Number, required: true },
    parental: { type: Number, required: true },
  },
  { _id: false }
);

const scoreRecordSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sourceSession: {
      type: Schema.Types.ObjectId,
      ref: 'SurveySession',
      required: true,
      unique: true,
      index: true,
    },
    age: { type: Number, required: true, min: 3, max: 18, index: true },
    ageSegment: { type: String, required: true, index: true },
    subScores: { type: scoreBreakdownSchema, required: true },
    weights: { type: weightSchema, required: true },
    globalScore: { type: Number, required: true, min: 0, max: 100, index: true },
    riskLevel: {
      type: String,
      enum: ['green', 'orange', 'red'],
      required: true,
      index: true,
    },
    riskCategory: {
      type: String,
      enum: ['equilibre-sain', 'vigilance-legere', 'risque-modere', 'risque-eleve'],
      required: true,
      index: true,
    },
    recommendations: [{ type: String, trim: true }],
    answerCount: { type: Number, default: 0 },
    trigger: { type: String, enum: ['auto', 'manual'], default: 'auto' },
    calculatedAt: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: true,
  }
);

scoreRecordSchema.index({ user: 1, calculatedAt: -1 });

module.exports = mongoose.model('ScoreRecord', scoreRecordSchema);