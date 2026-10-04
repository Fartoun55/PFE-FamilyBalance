const crypto = require('crypto');

const AppError = require('../utils/AppError');
const User = require('../models/User');
const ScoreRecord = require('../models/ScoreRecord');
const RiskAlert = require('../models/RiskAlert');
const TeleconsultationSpecialistProfile = require('../models/TeleconsultationSpecialistProfile');
const TeleconsultationAppointment = require('../models/TeleconsultationAppointment');
const TeleconsultationMessage = require('../models/TeleconsultationMessage');

const TELECONSULTATION_SECRET = process.env.TELECONSULTATION_SECRET || 'familybalance-teleconsultation-secret';

const buildConversationKey = (appointmentId) =>
  crypto.createHash('sha256').update(`${appointmentId}:${TELECONSULTATION_SECRET}`).digest();

const encryptContent = (appointmentId, plainText) => {
  const iv = crypto.randomBytes(12);
  const key = buildConversationKey(appointmentId);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encryptedContent: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
};

const decryptContent = (appointmentId, message) => {
  const key = buildConversationKey(appointmentId);
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(message.iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(message.authTag, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(message.encryptedContent, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
};

const generateRoomSlug = () => `tele-${crypto.randomBytes(8).toString('hex')}`;

const toHHMM = (date) => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const parseDateTime = (baseDate, time) => {
  const [hours, minutes] = String(time).split(':').map(Number);
  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const ensureSpecialistProfileForUser = async (user) => {
  const specialization = user?.specialistProfile?.specialization || 'Spécialiste';
  let profile = await TeleconsultationSpecialistProfile.findOne({ linkedUser: user._id });
  if (!profile) {
    profile = await TeleconsultationSpecialistProfile.create({
      linkedUser: user._id,
      displayName: `${user.firstName} ${user.lastName}`.trim(),
      specialization,
      languages: ['fr'],
      tariff: user?.specialistProfile?.tariff || 60,
      city: user?.specialistProfile?.city || '',
      bio: 'Profil spécialiste rattaché au compte professionnel.',
      availabilityRules: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '12:00', slotDurationMinutes: 30, active: true },
        { dayOfWeek: 3, startTime: '14:00', endTime: '18:00', slotDurationMinutes: 30, active: true },
      ],
    });
  }
  return profile;
};

const loadDirectoryProfiles = async () => {
  return TeleconsultationSpecialistProfile.find({ isActive: true }).lean();
};

const isFilterMatch = (profile, filters) => {
  if (filters.speciality && !String(profile.specialization).toLowerCase().includes(filters.speciality.toLowerCase())) {
    return false;
  }
  if (filters.language && !(profile.languages || []).includes(filters.language.toLowerCase())) {
    return false;
  }
  if (filters.city && !String(profile.city || '').toLowerCase().includes(filters.city.toLowerCase())) {
    return false;
  }
  if (filters.maxTariff !== undefined && Number(profile.tariff) > Number(filters.maxTariff)) {
    return false;
  }
  return true;
};

const getBookedSlots = async (specialistProfileId, from, to) => {
  const appointments = await TeleconsultationAppointment.find({
    specialistProfile: specialistProfileId,
    status: { $in: ['pending', 'confirmed', 'in-progress'] },
    slotStart: { $lt: to },
    slotEnd: { $gt: from },
  })
    .select('slotStart slotEnd')
    .lean();

  return appointments.map((appointment) => ({
    start: new Date(appointment.slotStart).getTime(),
    end: new Date(appointment.slotEnd).getTime(),
  }));
};

const generateAvailableSlots = async (profile, day = null) => {
  const baseDate = day ? new Date(day) : new Date();
  const days = day ? [baseDate] : Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return date;
  });

  const slots = [];
  for (const currentDate of days) {
    const ruleMatches = (profile.availabilityRules || []).filter(
      (rule) => rule.active && rule.dayOfWeek === currentDate.getDay()
    );

    for (const rule of ruleMatches) {
      const slotDuration = rule.slotDurationMinutes || 30;
      let cursor = parseDateTime(currentDate, rule.startTime);
      const end = parseDateTime(currentDate, rule.endTime);
      const booked = await getBookedSlots(profile._id, cursor, end);

      while (cursor < end) {
        const slotEnd = new Date(cursor.getTime() + slotDuration * 60 * 1000);
        if (slotEnd > end) break;

        const isTaken = booked.some((range) => cursor.getTime() < range.end && slotEnd.getTime() > range.start);
        // Un créneau déjà passé (tôt le jour même) ne doit jamais apparaître comme
        // disponible : createAppointment le rejetterait de toute façon ("créneau dans le
        // passé"), mais l'annuaire l'affichait quand même comme cliquable jusqu'ici.
        const isPast = cursor.getTime() < Date.now();
        if (!isTaken && !isPast) {
          slots.push({
            start: cursor.toISOString(),
            end: slotEnd.toISOString(),
            label: `${toHHMM(cursor)} - ${toHHMM(slotEnd)}`,
          });
        }

        cursor = slotEnd;
      }
    }
  }

  return slots.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
};

const getDirectory = async (filters = {}) => {
  const profiles = await loadDirectoryProfiles();
  const matched = profiles.filter((profile) => isFilterMatch(profile, filters));

  const enriched = [];
  for (const profile of matched) {
    const nextSlots = await generateAvailableSlots(profile, filters.date || null);
    enriched.push({
      ...profile,
      nextSlots: nextSlots.slice(0, 5),
      hasAvailability: nextSlots.length > 0,
    });
  }

  return enriched;
};

const getSlotsForSpecialist = async (profileId, date = null) => {
  const profile = await TeleconsultationSpecialistProfile.findById(profileId).lean();
  if (!profile || !profile.isActive) {
    throw new AppError('Spécialiste introuvable.', 404);
  }
  return generateAvailableSlots(profile, date);
};

const getPatientAppointments = async (patientId) => {
  return TeleconsultationAppointment.find({ patient: patientId })
    .populate('specialistProfile')
    .sort({ slotStart: -1 })
    .lean();
};

const getAppointmentByIdForUser = async (appointmentId, user) => {
  const appointment = await TeleconsultationAppointment.findById(appointmentId)
    .populate('specialistProfile')
    .lean();

  if (!appointment) {
    throw new AppError('Rendez-vous introuvable.', 404);
  }

  const isPatient = String(appointment.patient) === String(user._id);
  const isSpecialist = String(appointment.specialistUser || '') === String(user._id)
    || String(appointment.specialistProfile?.linkedUser || '') === String(user._id);

  if (!isPatient && !isSpecialist && user.role !== 'admin') {
    throw new AppError('Accès refusé à ce rendez-vous.', 403);
  }

  return appointment;
};

const buildMeetingUrl = (roomSlug) => `https://meet.jit.si/${roomSlug}`;

const createAppointment = async (patientUser, payload) => {
  const specialistProfile = await TeleconsultationSpecialistProfile.findById(payload.specialistProfileId);
  if (!specialistProfile || !specialistProfile.isActive) {
    throw new AppError('Spécialiste introuvable.', 404);
  }

  const slotStart = new Date(payload.slotStart);
  const slotEnd = new Date(payload.slotEnd);
  if (Number.isNaN(slotStart.getTime()) || Number.isNaN(slotEnd.getTime()) || slotEnd <= slotStart) {
    throw new AppError('Créneau invalide.', 400);
  }

  if (slotStart.getTime() < Date.now()) {
    throw new AppError('Impossible de réserver un créneau dans le passé.', 400);
  }

  const overlapping = await TeleconsultationAppointment.findOne({
    specialistProfile: specialistProfile._id,
    status: { $in: ['pending', 'confirmed', 'in-progress'] },
    slotStart: { $lt: slotEnd },
    slotEnd: { $gt: slotStart },
  }).lean();

  if (overlapping) {
    throw new AppError('Ce créneau n’est plus disponible.', 409);
  }

  const roomSlug = generateRoomSlug();
  const encryptedAccessSecret = crypto.randomBytes(24).toString('hex');
  const meetingProvider = payload.meetingProvider === 'daily' ? 'daily' : 'jitsi';

  let appointment;
  try {
    appointment = await TeleconsultationAppointment.create({
      patient: patientUser._id,
      specialistProfile: specialistProfile._id,
      specialistUser: specialistProfile.linkedUser || undefined,
      reason: payload.reason,
      consultationMode: payload.consultationMode || 'video',
      status: 'confirmed',
      slotStart,
      slotEnd,
      meetingProvider,
      roomSlug,
      meetingUrl: buildMeetingUrl(roomSlug),
      waitingRoomMessage: 'Veuillez patienter en salle d’attente. Le spécialiste vous rejoindra sous peu.',
      encryptedAccessSecret,
      patientInstructions: 'Vérifiez votre caméra et votre micro avant la séance.',
      specialistInstructions: 'Préparez le dossier patient et les scores récents avant la consultation.',
    });
  } catch (error) {
    // Deux requêtes concurrentes ont toutes deux passé la vérification de chevauchement
    // ci-dessus avant qu'aucune n'ait encore écrit : l'index unique partiel du modèle
    // rejette la seconde écriture avec un code 11000, qu'on traduit en la même erreur 409
    // que le cas normal (créneau déjà pris), plutôt que de laisser fuiter une erreur Mongo brute.
    if (error?.code === 11000) {
      throw new AppError('Ce créneau n’est plus disponible.', 409);
    }
    throw error;
  }

  return appointment.populate('specialistProfile');
};

const rescheduleAppointment = async (appointmentId, user, payload) => {
  const appointment = await getAppointmentByIdForUser(appointmentId, user);

  if (['completed', 'cancelled'].includes(appointment.status)) {
    throw new AppError('Ce rendez-vous ne peut plus être déplacé.', 400);
  }

  const slotStart = new Date(payload.slotStart);
  const slotEnd = new Date(payload.slotEnd);
  if (Number.isNaN(slotStart.getTime()) || Number.isNaN(slotEnd.getTime()) || slotEnd <= slotStart) {
    throw new AppError('Créneau invalide.', 400);
  }

  if (slotStart.getTime() < Date.now()) {
    throw new AppError('Impossible de déplacer un rendez-vous vers un créneau dans le passé.', 400);
  }

  const specialistProfileId = appointment.specialistProfile?._id || appointment.specialistProfile;

  const overlapping = await TeleconsultationAppointment.findOne({
    _id: { $ne: appointment._id },
    specialistProfile: specialistProfileId,
    status: { $in: ['pending', 'confirmed', 'in-progress'] },
    slotStart: { $lt: slotEnd },
    slotEnd: { $gt: slotStart },
  }).lean();

  if (overlapping) {
    throw new AppError('Ce créneau n’est plus disponible.', 409);
  }

  try {
    return await TeleconsultationAppointment.findByIdAndUpdate(
      appointmentId,
      { $set: { slotStart, slotEnd, status: 'confirmed' } },
      { new: true }
    ).populate('specialistProfile');
  } catch (error) {
    // Même filet de sécurité que createAppointment : une réservation concurrente sur le
    // nouveau créneau visé peut se glisser entre la vérification et l'écriture.
    if (error?.code === 11000) {
      throw new AppError('Ce créneau n’est plus disponible.', 409);
    }
    throw error;
  }
};

const shareBilanWithSpecialist = async (patientUser, appointmentId) => {
  const appointment = await TeleconsultationAppointment.findById(appointmentId);
  if (!appointment) {
    throw new AppError('Rendez-vous introuvable.', 404);
  }

  if (String(appointment.patient) !== String(patientUser._id)) {
    throw new AppError('Accès refusé au partage du bilan.', 403);
  }

  const latestScore = await ScoreRecord.findOne({ user: patientUser._id }).sort({ calculatedAt: -1 }).lean();
  if (!latestScore) {
    throw new AppError('Aucun bilan FamilyBalance disponible pour le partage.', 404);
  }

  appointment.bilanShared = true;
  appointment.bilanSharedAt = new Date();
  appointment.sharedScoreSnapshot = {
    globalScore: latestScore.globalScore,
    riskLevel: latestScore.riskLevel,
    subScores: latestScore.subScores,
    recommendations: latestScore.recommendations,
    ageSegment: latestScore.ageSegment,
    calculatedAt: latestScore.calculatedAt,
  };

  await appointment.save();
  return appointment.populate('specialistProfile');
};

const getSharedBilanForAppointment = async (appointmentId, user) => {
  const appointment = await getAppointmentByIdForUser(appointmentId, user);
  if (!appointment.bilanShared || !appointment.sharedScoreSnapshot) {
    throw new AppError('Aucun bilan partagé pour ce rendez-vous.', 404);
  }

  return appointment.sharedScoreSnapshot;
};

const getPatientDashboard = async (patientId) => {
  const appointments = await TeleconsultationAppointment.find({ patient: patientId })
    .populate('specialistProfile')
    .sort({ slotStart: -1 })
    .lean();

  const latestScore = await ScoreRecord.findOne({ user: patientId }).sort({ calculatedAt: -1 }).lean();
  const openAlerts = await RiskAlert.find({ user: patientId, status: 'open' }).sort({ createdAt: -1 }).lean();

  return {
    appointments,
    latestScore,
    openAlerts,
  };
};

const getSpecialistDashboard = async (specialistUserId) => {
  const profile = await ensureSpecialistProfileForUser(await User.findById(specialistUserId));

  const appointments = await TeleconsultationAppointment.find({
    $or: [{ specialistUser: specialistUserId }, { specialistProfile: profile._id }],
  })
    .populate('patient')
    .populate('specialistProfile')
    .sort({ slotStart: -1 })
    .lean();

  const patientIds = [...new Set(appointments.map((item) => String(item.patient?._id || item.patient)).filter(Boolean))];
  const patients = await User.find({ _id: { $in: patientIds } }).select('firstName lastName email role adolescentProfile').lean();
  const latestScores = await ScoreRecord.find({ user: { $in: patientIds } }).sort({ calculatedAt: -1 }).lean();
  const openAlerts = await RiskAlert.find({ user: { $in: patientIds }, status: 'open' }).sort({ createdAt: -1 }).lean();

  const scoreMap = new Map();
  for (const score of latestScores) {
    if (!scoreMap.has(String(score.user))) {
      scoreMap.set(String(score.user), score);
    }
  }

  return {
    specialistProfile: profile,
    appointments,
    patients: patients.map((patient) => ({
      ...patient,
      latestScore: scoreMap.get(String(patient._id)) || null,
      openAlerts: openAlerts.filter((alert) => String(alert.user) === String(patient._id)),
    })),
  };
};

const getAppointmentMessages = async (appointmentId, user) => {
  const appointment = await getAppointmentByIdForUser(appointmentId, user);

  const messages = await TeleconsultationMessage.find({ appointment: appointment._id })
    .sort({ createdAt: 1 })
    .lean();

  return messages.map((message) => ({
    ...message,
    content: decryptContent(appointment._id, message),
  }));
};

const sendAppointmentMessage = async (appointmentId, user, payload) => {
  const appointment = await getAppointmentByIdForUser(appointmentId, user);
  const recipientId = String(appointment.patient) === String(user._id)
    ? appointment.specialistUser || appointment.specialistProfile.linkedUser
    : appointment.patient;

  if (!recipientId) {
    throw new AppError('Le destinataire de la consultation est introuvable.', 404);
  }

  const encrypted = encryptContent(appointment._id, payload.content);
  const message = await TeleconsultationMessage.create({
    appointment: appointment._id,
    sender: user._id,
    recipient: recipientId,
    encryptedContent: encrypted.encryptedContent,
    iv: encrypted.iv,
    authTag: encrypted.authTag,
    messageType: payload.messageType || 'pre',
  });

  return message;
};

const cancelAppointment = async (appointmentId, user) => {
  const appointment = await getAppointmentByIdForUser(appointmentId, user);

  if (['completed', 'cancelled'].includes(appointment.status)) {
    throw new AppError('Ce rendez-vous ne peut plus être annulé.', 400);
  }

  return TeleconsultationAppointment.findByIdAndUpdate(
    appointmentId,
    { $set: { status: 'cancelled' } },
    { new: true }
  ).populate('specialistProfile');
};

const getRoomDetails = async (appointmentId, user) => {
  const appointment = await getAppointmentByIdForUser(appointmentId, user);

  return {
    appointment,
    meetingUrl: appointment.meetingUrl,
    waitingRoomMessage: appointment.waitingRoomMessage,
    roomSlug: appointment.roomSlug,
    meetingProvider: appointment.meetingProvider,
  };
};

module.exports = {
  getDirectory,
  getSlotsForSpecialist,
  createAppointment,
  getPatientAppointments,
  getPatientDashboard,
  getSpecialistDashboard,
  getAppointmentMessages,
  sendAppointmentMessage,
  getRoomDetails,
  ensureSpecialistProfileForUser,
  shareBilanWithSpecialist,
  getSharedBilanForAppointment,
  cancelAppointment,
  rescheduleAppointment,
};
