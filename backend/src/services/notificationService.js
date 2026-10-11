const mongoose = require('mongoose');

const AppError = require('../utils/AppError');
const Notification = require('../models/Notification');
const User = require('../models/User');
const ScoreRecord = require('../models/ScoreRecord');
const { emitToUser } = require('../realtime/socket');

const PAGE_SIZE_MAX = 50;
const REEVALUATION_MONTHS = 3;

/* ── Utilitaires ───────────────────────────────────────────────────────── */

const toClient = (doc) => ({
  _id: String(doc._id),
  type: doc.type,
  title: doc.title,
  message: doc.message,
  link: doc.link || null,
  linkParams: doc.linkParams || null,
  data: doc.data || null,
  count: doc.count || 1,
  read: Boolean(doc.readAt),
  readAt: doc.readAt || null,
  createdAt: doc.createdAt,
  lastEventAt: doc.lastEventAt || doc.createdAt,
});

const countUnread = (userId) => Notification.countDocuments({ user: userId, readAt: null });

const pushUnreadCount = async (userId) => {
  emitToUser(userId, 'notification:count', { unreadCount: await countUnread(userId) });
};

const formatDateTime = (value) =>
  new Date(value).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

const fullName = (user) => `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Un utilisateur';

const truncate = (text, max = 120) => {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
};

/* ── Création ──────────────────────────────────────────────────────────── */

/**
 * Crée une notification pour un utilisateur.
 * - `dedupeKey` : événement ponctuel, jamais notifié deux fois au même utilisateur.
 * - `groupKey`  : événements répétés (messages) regroupés en une seule notification non lue.
 * Retourne la notification envoyée, ou null si elle existait déjà.
 */
const createNotification = async (userId, payload) => {
  if (!userId) return null;
  const now = new Date();
  const base = {
    type: payload.type,
    title: payload.title,
    message: truncate(payload.message, 500),
    link: payload.link,
    linkParams: payload.linkParams,
    data: payload.data,
  };

  let doc;
  let isNew = true;

  if (payload.groupKey) {
    doc = await Notification.findOneAndUpdate(
      { user: userId, groupKey: payload.groupKey, readAt: null },
      { $set: { ...base, lastEventAt: now }, $inc: { count: 1 } },
      { new: true }
    ).lean();
    isNew = !doc;
    if (!doc) {
      doc = (await Notification.create({ user: userId, ...base, groupKey: payload.groupKey, lastEventAt: now })).toObject();
    }
  } else if (payload.dedupeKey) {
    try {
      doc = (await Notification.create({ user: userId, ...base, dedupeKey: payload.dedupeKey, lastEventAt: now })).toObject();
    } catch (error) {
      if (error?.code === 11000) return null; // déjà notifié : pas de doublon
      throw error;
    }
  } else {
    doc = (await Notification.create({ user: userId, ...base, lastEventAt: now })).toObject();
  }

  const notification = toClient(doc);
  emitToUser(userId, isNew ? 'notification:new' : 'notification:updated', {
    notification,
    unreadCount: await countUnread(userId),
  });
  return notification;
};

/**
 * Les notifications sont un effet secondaire : une erreur ici ne doit jamais faire
 * échouer l'action métier (réservation, envoi de message, calcul de score…).
 */
const safely = (label, task) =>
  Promise.resolve()
    .then(task)
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error(`[notifications] ${label} :`, error.message);
    });

/* ── Lecture et gestion (API) ──────────────────────────────────────────── */

const listNotifications = async (user, { limit = 20, before, unreadOnly = false } = {}) => {
  await syncReminders(user);

  const size = Math.min(Math.max(Number(limit) || 20, 1), PAGE_SIZE_MAX);
  const query = { user: user._id };
  if (unreadOnly) query.readAt = null;
  if (before) {
    const cursor = new Date(before);
    if (!Number.isNaN(cursor.getTime())) query.lastEventAt = { $lt: cursor };
  }

  const docs = await Notification.find(query).sort({ lastEventAt: -1, _id: -1 }).limit(size + 1).lean();
  return {
    notifications: docs.slice(0, size).map(toClient),
    hasMore: docs.length > size,
    unreadCount: await countUnread(user._id),
  };
};

const getUnreadCount = async (user) => {
  await syncReminders(user);
  return countUnread(user._id);
};

const assertObjectId = (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError('Notification introuvable.', 404);
  }
};

/** Le filtre { _id, user } garantit qu'un utilisateur ne modifie jamais la notification d'un autre. */
const markAsRead = async (user, notificationId) => {
  assertObjectId(notificationId);
  const doc = await Notification.findOne({ _id: notificationId, user: user._id }).lean();
  if (!doc) throw new AppError('Notification introuvable.', 404);
  if (!doc.readAt) {
    doc.readAt = new Date();
    await Notification.updateOne({ _id: doc._id, user: user._id }, { $set: { readAt: doc.readAt } });
  }
  await pushUnreadCount(user._id);
  return toClient(doc);
};

const markAllAsRead = async (user) => {
  const result = await Notification.updateMany({ user: user._id, readAt: null }, { $set: { readAt: new Date() } });
  await pushUnreadCount(user._id);
  return result.modifiedCount || 0;
};

const deleteNotification = async (user, notificationId) => {
  assertObjectId(notificationId);
  const result = await Notification.deleteOne({ _id: notificationId, user: user._id });
  if (!result.deletedCount) throw new AppError('Notification introuvable.', 404);
  await pushUnreadCount(user._id);
};

/* ── Rappels de réévaluation (questionnaires) ──────────────────────────── */

const addMonths = (date, months) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

/**
 * Même règle que le tableau de bord famille : réévaluation tous les 3 mois après le dernier
 * score (ou immédiatement s'il n'y en a pas). Évalué à la consultation des notifications ;
 * la clé inclut le dernier score, donc un seul rappel par cycle d'évaluation.
 */
const syncReminders = async (user) => {
  if (user.role !== 'parent' && user.role !== 'adolescent') return;

  const subjects = user.role === 'parent'
    ? await User.find({ role: 'adolescent', 'adolescentProfile.parentId': user._id }).select('firstName lastName').lean()
    : [user];

  const now = new Date();
  for (const subject of subjects) {
    const latest = await ScoreRecord.findOne({ user: subject._id }).sort({ calculatedAt: -1 }).select('_id calculatedAt').lean();
    const dueDate = latest ? addMonths(latest.calculatedAt, REEVALUATION_MONTHS) : now;
    if (dueDate > now) continue;

    const forChild = user.role === 'parent';
    await createNotification(user._id, {
      type: 'reevaluation-due',
      title: latest ? 'Réévaluation à faire' : 'Première évaluation à faire',
      message: forChild
        ? `${latest ? 'Le dernier bilan' : 'Aucun bilan'} de ${subject.firstName} ${latest ? 'date de plus de 3 mois' : "n'a encore été réalisé"}. Lancez le questionnaire pour suivre son équilibre numérique.`
        : latest
          ? 'Ton dernier bilan date de plus de 3 mois : refais le questionnaire pour voir ton évolution.'
          : "Fais ton premier questionnaire pour découvrir ton profil d'usage des écrans.",
      link: forChild ? '/family/dashboard' : '/survey/dynamic',
      data: { childId: String(subject._id) },
      dedupeKey: `reevaluation:${subject._id}:${latest ? latest._id : 'initial'}`,
    });
  }
};

/* ── Événements métier ─────────────────────────────────────────────────── */

const appointmentLink = (appointmentId) => ({ link: '/teleconsultation', linkParams: { appointment: String(appointmentId) } });

const specialistUserIdOf = (appointment) =>
  appointment.specialistUser || appointment.specialistProfile?.linkedUser || null;

const patientIdOf = (appointment) => appointment.patient?._id || appointment.patient;

const notifyAppointmentCreated = (appointment, patientUser) => safely('rendez-vous créé', async () => {
  const when = formatDateTime(appointment.slotStart);
  const specialistId = specialistUserIdOf(appointment);
  await createNotification(specialistId, {
    type: 'appointment-requested',
    title: 'Nouvelle demande de téléconsultation',
    message: `${fullName(patientUser)} (${patientUser.role === 'adolescent' ? 'adolescent' : 'parent'}) a réservé le ${when}. Motif : ${truncate(appointment.reason, 90)}`,
    ...appointmentLink(appointment._id),
    data: { appointmentId: String(appointment._id) },
    dedupeKey: `appointment-requested:${appointment._id}`,
  });
  await createNotification(patientUser._id, {
    type: 'appointment-confirmed',
    title: 'Rendez-vous confirmé',
    message: `Votre téléconsultation avec ${appointment.specialistProfile?.displayName || 'le spécialiste'} est confirmée pour le ${when}.`,
    ...appointmentLink(appointment._id),
    data: { appointmentId: String(appointment._id) },
    dedupeKey: `appointment-confirmed:${appointment._id}`,
  });
});

/** Annulation ou déplacement : on prévient l'autre partie que celle qui a agi. */
const notifyAppointmentChanged = (appointment, actor, change) => safely(`rendez-vous ${change}`, async () => {
  const patientId = String(patientIdOf(appointment));
  const specialistId = specialistUserIdOf(appointment);
  const actorIsPatient = String(actor._id) === patientId;
  const recipientId = actorIsPatient ? specialistId : patientId;
  const actorName = actorIsPatient ? fullName(actor) : (appointment.specialistProfile?.displayName || fullName(actor));
  const when = formatDateTime(appointment.slotStart);

  await createNotification(recipientId, change === 'cancelled'
    ? {
      type: 'appointment-cancelled',
      title: 'Rendez-vous annulé',
      message: `${actorName} a annulé la téléconsultation du ${when}.`,
      ...appointmentLink(appointment._id),
      data: { appointmentId: String(appointment._id) },
      dedupeKey: `appointment-cancelled:${appointment._id}`,
    }
    : {
      type: 'appointment-rescheduled',
      title: 'Rendez-vous déplacé',
      message: `${actorName} a déplacé la téléconsultation au ${when}.`,
      ...appointmentLink(appointment._id),
      data: { appointmentId: String(appointment._id) },
      // Chaque nouveau créneau est un événement distinct.
      dedupeKey: `appointment-rescheduled:${appointment._id}:${new Date(appointment.slotStart).toISOString()}`,
    });
});

const notifyBilanShared = (appointment, patientUser) => safely('bilan partagé', async () => {
  await createNotification(specialistUserIdOf(appointment), {
    type: 'bilan-shared',
    title: 'Bilan FamilyBalance partagé',
    message: `${fullName(patientUser)} a partagé son bilan pour la téléconsultation du ${formatDateTime(appointment.slotStart)}.`,
    ...appointmentLink(appointment._id),
    data: { appointmentId: String(appointment._id) },
    dedupeKey: `bilan-shared:${appointment._id}`,
  });
});

/**
 * Nouveau message : notification regroupée par conversation (« 3 nouveaux messages ») tant
 * qu'elle n'est pas lue, et événement temps réel pour rafraîchir la conversation ouverte.
 */
const notifyMessageReceived = (appointment, sender, recipientId, message) => safely('message reçu', async () => {
  const senderName = String(sender._id) === String(patientIdOf(appointment))
    ? fullName(sender)
    : (appointment.specialistProfile?.displayName || fullName(sender));

  emitToUser(recipientId, 'message:new', { appointmentId: String(appointment._id), messageId: String(message._id) });

  const existing = await Notification.findOne({ user: recipientId, groupKey: `messages:${appointment._id}`, readAt: null })
    .select('count').lean();
  const total = (existing?.count || 0) + 1;

  await createNotification(recipientId, {
    type: 'message-received',
    title: total > 1 ? `${total} nouveaux messages de ${senderName}` : `Nouveau message de ${senderName}`,
    message: truncate(message.content, 140),
    ...appointmentLink(appointment._id),
    data: { appointmentId: String(appointment._id) },
    groupKey: `messages:${appointment._id}`,
  });
});

const riskSentence = (category) => ({
  'equilibre-sain': 'équilibre sain',
  'vigilance-legere': 'vigilance légère',
  'risque-modere': 'risque modéré',
  'risque-eleve': 'risque élevé',
}[category] || 'résultat disponible');

/**
 * Nouveau score : l'adolescent et son parent sont informés (sauf celui qui vient de lancer le
 * calcul, déjà sur la page). L'alerte de risque élevé n'est adressée qu'au parent, pour rester
 * non anxiogène côté adolescent.
 */
const notifyScoreStored = ({ scoreRecord, alert, actor }) => safely('score calculé', async () => {
  const owner = await User.findById(scoreRecord.user).select('firstName lastName role adolescentProfile.parentId').lean();
  if (!owner) return;
  const actorId = String(actor._id);
  const parentId = owner.role === 'adolescent' ? owner.adolescentProfile?.parentId : null;

  if (String(owner._id) !== actorId) {
    await createNotification(owner._id, {
      type: 'score-available',
      title: 'Nouveau résultat disponible',
      // Message volontairement neutre (pas de score ni de niveau de risque) : l'adolescent
      // découvre son résultat dans la page dédiée, avec sa mise en contexte bienveillante.
      message: 'Ton évaluation a été analysée. Découvre ton résultat et tes conseils personnalisés.',
      link: '/scoring/results',
      data: { scoreRecordId: String(scoreRecord._id) },
      dedupeKey: `score:${scoreRecord._id}`,
    });
  }

  if (parentId && String(parentId) !== actorId) {
    await createNotification(parentId, {
      type: 'score-available',
      title: `Nouveau résultat pour ${owner.firstName}`,
      message: `${owner.firstName} a terminé une évaluation : ${scoreRecord.globalScore}/100 (${riskSentence(scoreRecord.riskCategory)}).`,
      link: '/family/dashboard',
      data: { scoreRecordId: String(scoreRecord._id), childId: String(owner._id) },
      dedupeKey: `score:${scoreRecord._id}`,
    });
  }

  if (alert) {
    const alertRecipient = parentId || owner._id;
    await createNotification(alertRecipient, {
      type: 'risk-alert',
      title: parentId ? `Point d'attention pour ${owner.firstName}` : "Point d'attention sur votre évaluation",
      message: 'Le dernier bilan indique un risque élevé. Un échange avec un spécialiste est recommandé.',
      link: '/teleconsultation',
      data: { alertId: String(alert._id), childId: String(owner._id) },
      dedupeKey: `risk-alert:${alert._id}:${scoreRecord._id}`,
    });
  }
});

const ageAt = (birthDate, now = new Date()) => {
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthday = now.getMonth() < birth.getMonth()
    || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age;
};

/**
 * Ressource publiée : adolescents dont l'âge correspond, et parents ayant au moins un
 * enfant dans la tranche d'âge (une seule notification par parent).
 */
const notifyResourcePublished = (resource) => safely('ressource publiée', async () => {
  const adolescents = await User.find({ role: 'adolescent', isActive: true })
    .select('firstName adolescentProfile.birthDate adolescentProfile.parentId').lean();

  const inRange = adolescents.filter((teen) => {
    const age = ageAt(teen.adolescentProfile?.birthDate);
    return age !== null && age >= resource.ageMin && age <= resource.ageMax;
  });

  const parentIds = new Map();
  for (const teen of inRange) {
    const parentId = teen.adolescentProfile?.parentId;
    if (parentId && !parentIds.has(String(parentId))) parentIds.set(String(parentId), teen.firstName);
  }

  const base = {
    type: 'resource-published',
    link: '/education/resources',
    data: { resourceId: String(resource._id) },
    dedupeKey: `resource:${resource._id}`,
  };

  for (const teen of inRange) {
    await createNotification(teen._id, {
      ...base,
      title: 'Nouvelle ressource pour toi',
      message: `« ${truncate(resource.title, 80)} » (${resource.category}) vient d'être publiée.`,
    });
  }
  for (const [parentId, childName] of parentIds) {
    await createNotification(parentId, {
      ...base,
      title: 'Nouvelle ressource éducative',
      message: `« ${truncate(resource.title, 80)} » est adaptée à l'âge de ${childName}.`,
    });
  }
});

module.exports = {
  createNotification,
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  syncReminders,
  notifyAppointmentCreated,
  notifyAppointmentChanged,
  notifyBilanShared,
  notifyMessageReceived,
  notifyScoreStored,
  notifyResourcePublished,
};
