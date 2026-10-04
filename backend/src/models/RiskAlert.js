const mongoose = require('mongoose');

const { Schema } = mongoose;

const riskAlertSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    scoreRecord: { type: Schema.Types.ObjectId, ref: 'ScoreRecord', required: true, index: true },
    level: { type: String, enum: ['red'], default: 'red', required: true },
    riskCategory: {
      type: String,
      enum: ['equilibre-sain', 'vigilance-legere', 'risque-modere', 'risque-eleve'],
      required: true,
    },
    status: { type: String, enum: ['open', 'resolved'], default: 'open', index: true },
    message: { type: String, required: true, trim: true },
    resolvedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

riskAlertSchema.index({ user: 1, status: 1, createdAt: -1 });

// Un seul incident ouvert par utilisateur à la fois : empêche la création de doublons même si deux
// calculs de score se terminent presque simultanément (ex. deux domaines complétés coup sur coup).
riskAlertSchema.index({ user: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'open' } });

module.exports = mongoose.model('RiskAlert', riskAlertSchema);