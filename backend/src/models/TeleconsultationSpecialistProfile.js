const mongoose = require('mongoose');

const { Schema } = mongoose;

const availabilityRuleSchema = new Schema(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, required: true, trim: true },
    slotDurationMinutes: { type: Number, default: 30, min: 10, max: 120 },
    active: { type: Boolean, default: true },
  },
  { _id: false }
);

const teleconsultationSpecialistProfileSchema = new Schema(
  {
    linkedUser: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    email: { type: String, trim: true, lowercase: true, index: true },
    displayName: { type: String, required: true, trim: true },
    specialization: { type: String, required: true, trim: true, index: true },
    languages: [{ type: String, trim: true, lowercase: true, index: true }],
    tariff: { type: Number, required: true, min: 0, index: true },
    city: { type: String, trim: true, index: true },
    bio: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    averageRating: { type: Number, default: 4.8, min: 0, max: 5 },
    availabilityRules: [availabilityRuleSchema],
  },
  { timestamps: true }
);

teleconsultationSpecialistProfileSchema.index({ specialization: 1, tariff: 1, city: 1 });

module.exports = mongoose.model('TeleconsultationSpecialistProfile', teleconsultationSpecialistProfileSchema);
