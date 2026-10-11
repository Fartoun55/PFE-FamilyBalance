const mongoose = require('mongoose');

const { Schema } = mongoose;

const NOTIFICATION_TYPES = [
  'appointment-requested', // spécialiste : nouvelle demande de téléconsultation
  'appointment-confirmed', // patient : réservation confirmée
  'appointment-cancelled', // l'autre partie : rendez-vous annulé
  'appointment-rescheduled', // l'autre partie : rendez-vous déplacé
  'bilan-shared', // spécialiste : bilan FamilyBalance partagé par le patient
  'message-received', // destinataire : nouveau(x) message(s) dans une conversation
  'score-available', // adolescent / parent : nouveau résultat d'évaluation
  'risk-alert', // parent : profil à risque élevé détecté
  'reevaluation-due', // parent / adolescent : réévaluation (questionnaire) à faire
  'resource-published', // parent / adolescent : nouvelle ressource adaptée à l'âge
];

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    // Route frontend à ouvrir au clic (+ paramètres de requête éventuels).
    link: { type: String, trim: true },
    linkParams: { type: Schema.Types.Mixed },
    // Identifiants métier concernés (rendez-vous, ressource, enfant…), pour l'affichage et le suivi.
    data: { type: Schema.Types.Mixed },
    // Événement ponctuel : une seule notification par (user, dedupeKey), garanti par l'index unique.
    dedupeKey: { type: String, trim: true },
    // Événements répétés (messages) : regroupés dans une seule notification tant qu'elle n'est pas lue.
    groupKey: { type: String, trim: true },
    count: { type: Number, default: 1, min: 1 },
    lastEventAt: { type: Date, default: Date.now },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, lastEventAt: -1 });
notificationSchema.index({ user: 1, readAt: 1 });
notificationSchema.index(
  { user: 1, dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } }
);
notificationSchema.index({ user: 1, groupKey: 1, readAt: 1 });
// Purge automatique des notifications de plus de 6 mois.
notificationSchema.index({ lastEventAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });

notificationSchema.statics.TYPES = NOTIFICATION_TYPES;

module.exports = mongoose.model('Notification', notificationSchema);
