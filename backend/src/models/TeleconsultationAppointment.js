const mongoose = require('mongoose');

const { Schema } = mongoose;

const teleconsultationAppointmentSchema = new Schema(
  {
    patient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    specialistProfile: {
      type: Schema.Types.ObjectId,
      ref: 'TeleconsultationSpecialistProfile',
      required: true,
      index: true,
    },
    specialistUser: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    reason: { type: String, required: true, trim: true },
    consultationMode: {
      type: String,
      enum: ['video', 'audio', 'chat'],
      default: 'video',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    slotStart: { type: Date, required: true, index: true },
    slotEnd: { type: Date, required: true, index: true },
    meetingProvider: { type: String, enum: ['jitsi', 'daily'], default: 'jitsi' },
    roomSlug: { type: String, required: true, unique: true, index: true },
    meetingUrl: { type: String, required: true, trim: true },
    waitingRoomMessage: { type: String, trim: true },
    encryptedAccessSecret: { type: String, required: true },
    patientInstructions: { type: String, trim: true },
    specialistInstructions: { type: String, trim: true },
    bilanShared: { type: Boolean, default: false },
    bilanSharedAt: { type: Date },
    sharedScoreSnapshot: {
      globalScore: { type: Number, min: 0, max: 100 },
      riskLevel: { type: String, enum: ['green', 'orange', 'red'] },
      subScores: {
        comportemental: { type: Number, min: 0, max: 100 },
        emotionnel: { type: Number, min: 0, max: 100 },
        social: { type: Number, min: 0, max: 100 },
        parental: { type: Number, min: 0, max: 100 },
      },
      recommendations: [{ type: String, trim: true }],
      ageSegment: { type: String },
      calculatedAt: { type: Date },
    },
  },
  { timestamps: true }
);

teleconsultationAppointmentSchema.index({ specialistProfile: 1, slotStart: 1, status: 1 });
teleconsultationAppointmentSchema.index({ patient: 1, createdAt: -1 });

// Filet de sécurité au niveau base de données contre le double-réservation : la vérification
// de chevauchement dans createAppointment/rescheduleAppointment (lecture puis écriture) reste
// théoriquement sujette à une condition de course entre deux requêtes concurrentes. Un test de
// charge réel (6 requêtes simultanées sur le même créneau) n'a jamais réussi à la déclencher en
// pratique, mais rien ne le garantit au niveau du code applicatif seul. Cet index unique partiel
// (même motif que SurveySession/RiskAlert dans ce projet) rend la double réservation EXACTE
// impossible au niveau de MongoDB lui-même, quelle que soit la charge ou un futur refactoring.
teleconsultationAppointmentSchema.index(
  { specialistProfile: 1, slotStart: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['pending', 'confirmed', 'in-progress'] } } }
);

module.exports = mongoose.model('TeleconsultationAppointment', teleconsultationAppointmentSchema);
