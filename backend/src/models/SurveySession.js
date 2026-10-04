const mongoose = require('mongoose');

const { Schema } = mongoose;

const surveyAnswerSchema = new Schema(
  {
    questionCode: { type: String, required: true, trim: true },
    questionPrompt: { type: String, required: true, trim: true },
    domain: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    answer: { type: Schema.Types.Mixed, required: true },
    draft: { type: Boolean, default: false },
    answeredAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const surveySessionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    domain: { type: String, required: true, index: true, trim: true },
    domainLabel: { type: String, required: true, trim: true },
    age: { type: Number, required: true, index: true },
    ageSegment: { type: String, required: true, index: true, trim: true },
    status: {
      type: String,
      enum: ['in-progress', 'completed'],
      default: 'in-progress',
      index: true,
    },
    currentQuestionCode: { type: String, trim: true },
    answers: [surveyAnswerSchema],
    startedAt: { type: Date, default: Date.now },
    lastSavedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  {
    timestamps: true,
    // Active le contrôle de concurrence optimiste : chaque .save() vérifie que le document n'a pas
    // été modifié entre-temps (ex. deux requêtes de sauvegarde de réponse envoyées en rafale) et
    // rejette la seconde écriture avec une VersionError plutôt que d'écraser silencieusement la première.
    optimisticConcurrency: true,
  }
);

surveySessionSchema.index({ user: 1, domain: 1, ageSegment: 1, status: 1 });

// Empêche l'existence de deux sessions "in-progress" simultanées pour le même utilisateur/domaine/
// tranche d'âge, y compris en cas de double clic ou de requêtes concurrentes sur "démarrer le survey".
surveySessionSchema.index(
  { user: 1, domain: 1, ageSegment: 1 },
  { unique: true, partialFilterExpression: { status: 'in-progress' } }
);

module.exports = mongoose.model('SurveySession', surveySessionSchema);