const SurveySession = require('../models/SurveySession');
const ScoreRecord = require('../models/ScoreRecord');
const RiskAlert = require('../models/RiskAlert');
const LearningProgress = require('../models/LearningProgress');
const NewsletterDigest = require('../models/NewsletterDigest');
const ParentToolkitItem = require('../models/ParentToolkitItem');
const TeleconsultationAppointment = require('../models/TeleconsultationAppointment');
const TeleconsultationMessage = require('../models/TeleconsultationMessage');
const TeleconsultationSpecialistProfile = require('../models/TeleconsultationSpecialistProfile');
const RefreshToken = require('../models/RefreshToken');
const EmailVerificationToken = require('../models/EmailVerificationToken');
const PasswordResetToken = require('../models/PasswordResetToken');
const MfaChallenge = require('../models/MfaChallenge');
const Notification = require('../models/Notification');

/** Politique de mot de passe des comptes créés par l'administrateur. */
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/;
const PASSWORD_RULE_MESSAGE = 'Le mot de passe doit contenir au moins 10 caractères, une majuscule, une minuscule et un chiffre.';

/** Statuts d'un rendez-vous encore « vivant » (ni terminé ni annulé). */
const ACTIVE_APPOINTMENT_STATUSES = ['pending', 'confirmed', 'in-progress'];

/**
 * Supprime toutes les données applicatives rattachées à un utilisateur (sessions, scores,
 * alertes, téléconsultation, notifications, jetons) pour éviter les références orphelines
 * en base après la suppression d'un compte.
 */
const wipeUserData = async (userId) => {
  await Promise.all([
    SurveySession.deleteMany({ user: userId }),
    ScoreRecord.deleteMany({ user: userId }),
    RiskAlert.deleteMany({ user: userId }),
    LearningProgress.deleteMany({ user: userId }),
    NewsletterDigest.deleteMany({ user: userId }),
    ParentToolkitItem.deleteMany({ parent: userId }),
    TeleconsultationAppointment.deleteMany({ $or: [{ patient: userId }, { specialistUser: userId }] }),
    TeleconsultationMessage.deleteMany({ $or: [{ sender: userId }, { recipient: userId }] }),
    TeleconsultationSpecialistProfile.deleteMany({ linkedUser: userId }),
    RefreshToken.deleteMany({ user: userId }),
    EmailVerificationToken.deleteMany({ user: userId }),
    PasswordResetToken.deleteMany({ user: userId }),
    MfaChallenge.deleteMany({ user: userId }),
    Notification.deleteMany({ user: userId }),
  ]);
};

/**
 * Rendez-vous à venir encore actifs d'un spécialiste : tant qu'il en existe, sa suppression
 * ferait disparaître sans prévenir des consultations attendues par des familles.
 */
const countUpcomingSpecialistAppointments = async (specialistUserId) => {
  const profiles = await TeleconsultationSpecialistProfile.find({ linkedUser: specialistUserId }).distinct('_id');
  return TeleconsultationAppointment.countDocuments({
    $or: [{ specialistUser: specialistUserId }, { specialistProfile: { $in: profiles } }],
    status: { $in: ACTIVE_APPOINTMENT_STATUSES },
    slotEnd: { $gte: new Date() },
  });
};

module.exports = {
  PASSWORD_REGEX,
  PASSWORD_RULE_MESSAGE,
  ACTIVE_APPOINTMENT_STATUSES,
  wipeUserData,
  countUpcomingSpecialistAppointments,
};
