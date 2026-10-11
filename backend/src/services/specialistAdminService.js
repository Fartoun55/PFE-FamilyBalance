const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const AppError = require('../utils/AppError');
const User = require('../models/User');
const TeleconsultationSpecialistProfile = require('../models/TeleconsultationSpecialistProfile');
const TeleconsultationAppointment = require('../models/TeleconsultationAppointment');
const { ensureSpecialistProfileForUser } = require('./teleconsultationService');
const {
  PASSWORD_REGEX,
  PASSWORD_RULE_MESSAGE,
  ACTIVE_APPOINTMENT_STATUSES,
  wipeUserData,
  countUpcomingSpecialistAppointments,
} = require('./accountCleanupService');

/*
 * Un spécialiste est représenté par deux documents :
 *  - son compte utilisateur (User, role 'specialist', sous-document specialistProfile) ;
 *  - sa fiche d'annuaire de téléconsultation (TeleconsultationSpecialistProfile), visible
 *    des familles (bio, langues, disponibilités, visibilité).
 * Ce service les gère ensemble pour qu'ils ne divergent jamais.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const LANGUAGE_REGEX = /^[a-z]{2,3}$/;
const USER_FIELDS = 'firstName lastName email phone isActive emailVerified lastLoginAt createdAt updatedAt specialistProfile';

const str = (value) => (typeof value === 'string' ? value.trim() : undefined);

/* ── Validation ────────────────────────────────────────────────────────── */

const parseAvailabilityRules = (rules, errors) => {
  if (rules === undefined) return undefined;
  if (!Array.isArray(rules)) {
    errors.availabilityRules = 'Les disponibilités doivent être une liste.';
    return undefined;
  }
  if (rules.length > 21) {
    errors.availabilityRules = '21 plages de disponibilité au maximum.';
    return undefined;
  }

  const parsed = [];
  for (const [index, rule] of rules.entries()) {
    const dayOfWeek = Number(rule?.dayOfWeek);
    const startTime = str(rule?.startTime);
    const endTime = str(rule?.endTime);
    const slotDurationMinutes = rule?.slotDurationMinutes === undefined ? 30 : Number(rule.slotDurationMinutes);
    const label = `Plage ${index + 1}`;

    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      errors.availabilityRules = `${label} : jour invalide.`;
    } else if (!TIME_REGEX.test(startTime || '') || !TIME_REGEX.test(endTime || '')) {
      errors.availabilityRules = `${label} : horaires au format HH:MM attendus.`;
    } else if (startTime >= endTime) {
      errors.availabilityRules = `${label} : l'heure de fin doit être après l'heure de début.`;
    } else if (!Number.isInteger(slotDurationMinutes) || slotDurationMinutes < 10 || slotDurationMinutes > 120) {
      errors.availabilityRules = `${label} : durée de créneau entre 10 et 120 minutes.`;
    } else {
      parsed.push({ dayOfWeek, startTime, endTime, slotDurationMinutes, active: rule?.active !== false });
      continue;
    }
    return undefined;
  }
  return parsed;
};

/**
 * Valide et normalise la saisie. En création tous les champs obligatoires sont exigés ;
 * en modification seuls les champs fournis sont contrôlés. Erreurs regroupées par champ.
 */
const parseInput = (body = {}, mode) => {
  const creating = mode === 'create';
  const errors = {};
  const data = {
    firstName: str(body.firstName),
    lastName: str(body.lastName),
    email: str(body.email)?.toLowerCase(),
    phone: str(body.phone),
    password: str(body.password),
    confirmPassword: str(body.confirmPassword),
    specialization: str(body.specialization),
    licenseNumber: str(body.licenseNumber),
    city: str(body.city),
    bio: str(body.bio),
    tariff: body.tariff === undefined || body.tariff === '' || body.tariff === null ? undefined : Number(body.tariff),
    isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
  };

  const required = { firstName: 'Le prénom', lastName: 'Le nom', email: "L'adresse e-mail", specialization: 'La spécialisation', licenseNumber: 'Le numéro de licence' };
  for (const [field, label] of Object.entries(required)) {
    if (creating ? !data[field] : data[field] === '') {
      errors[field] = `${label} est obligatoire.`;
    }
  }

  if (data.email && !EMAIL_REGEX.test(data.email)) errors.email = "Format d'adresse e-mail invalide.";
  if (data.firstName && data.firstName.length > 60) errors.firstName = '60 caractères maximum.';
  if (data.lastName && data.lastName.length > 60) errors.lastName = '60 caractères maximum.';
  if (data.phone && !/^[+\d][\d\s.-]{5,19}$/.test(data.phone)) errors.phone = 'Numéro de téléphone invalide.';
  if (data.bio && data.bio.length > 1000) errors.bio = '1000 caractères maximum.';
  if (data.tariff !== undefined && (!Number.isFinite(data.tariff) || data.tariff < 0 || data.tariff > 1000)) {
    errors.tariff = 'Le tarif doit être un nombre entre 0 et 1000 €.';
  }

  if (body.languages !== undefined) {
    const list = Array.isArray(body.languages) ? body.languages : String(body.languages).split(',');
    data.languages = [...new Set(list.map((item) => String(item).trim().toLowerCase()).filter(Boolean))];
    if (!data.languages.length || data.languages.some((code) => !LANGUAGE_REGEX.test(code))) {
      errors.languages = 'Indiquez au moins une langue, en codes de 2 ou 3 lettres (ex. fr, en, ar).';
    }
  } else if (creating) {
    data.languages = ['fr'];
  }

  data.availabilityRules = parseAvailabilityRules(body.availabilityRules, errors);

  if (creating && !data.password) errors.password = 'Le mot de passe est obligatoire.';
  if (data.password) {
    if (!PASSWORD_REGEX.test(data.password)) errors.password = PASSWORD_RULE_MESSAGE;
    else if (data.password !== data.confirmPassword) errors.confirmPassword = 'La confirmation ne correspond pas au mot de passe.';
  }

  if (Object.keys(errors).length) {
    throw new AppError('Certains champs sont invalides.', 400, errors);
  }
  return data;
};

const assertSpecialistId = (id) => {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Spécialiste introuvable.', 404);
};

const loadSpecialist = async (id, withPassword = false) => {
  assertSpecialistId(id);
  const query = User.findOne({ _id: id, role: 'specialist' });
  if (withPassword) query.select('+passwordHash');
  const user = await query;
  if (!user) throw new AppError('Spécialiste introuvable.', 404);
  return user;
};

/** Unicité des informations sensibles : e-mail (tous comptes) et numéro de licence (spécialistes). */
const assertUnique = async ({ email, licenseNumber }, excludeId = null) => {
  const exclude = excludeId ? { _id: { $ne: excludeId } } : {};
  if (email && (await User.exists({ email, ...exclude }))) {
    throw new AppError('Un compte existe déjà avec cette adresse e-mail.', 409, { email: 'Adresse e-mail déjà utilisée.' });
  }
  if (licenseNumber) {
    const escaped = licenseNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const taken = await User.exists({
      role: 'specialist',
      'specialistProfile.licenseNumber': { $regex: `^${escaped}$`, $options: 'i' },
      ...exclude,
    });
    if (taken) {
      throw new AppError('Ce numéro de licence est déjà attribué à un autre spécialiste.', 409, { licenseNumber: 'Numéro de licence déjà utilisé.' });
    }
  }
};

/* ── Synchronisation compte → fiche d'annuaire ─────────────────────────── */

/**
 * Aligne la fiche d'annuaire sur le compte (nom, spécialité, ville, tarif, langues, visibilité)
 * et applique les champs propres à l'annuaire (bio, disponibilités) s'ils sont fournis.
 * Utilisé aussi par la gestion générique des comptes, pour qu'une modification faite depuis
 * l'administration des utilisateurs soit répercutée dans l'annuaire.
 */
const syncDirectoryProfile = async (user, extras = {}) => {
  if (!user || user.role !== 'specialist') return null;
  const profile = await ensureSpecialistProfileForUser(user);
  const sp = user.specialistProfile || {};

  profile.displayName = `${user.firstName} ${user.lastName}`.trim();
  profile.email = user.email;
  if (sp.specialization) profile.specialization = sp.specialization;
  profile.city = sp.city || '';
  if (sp.tariff !== undefined && sp.tariff !== null) profile.tariff = sp.tariff;
  if (sp.languages?.length) profile.languages = sp.languages;
  profile.isActive = user.isActive !== false;
  if (extras.bio !== undefined) profile.bio = extras.bio;
  if (extras.availabilityRules !== undefined) profile.availabilityRules = extras.availabilityRules;

  await profile.save();
  return profile;
};

/* ── Lecture ───────────────────────────────────────────────────────────── */

const buildStats = async (userIds) => {
  if (!userIds.length) return new Map();
  const now = new Date();
  const rows = await TeleconsultationAppointment.aggregate([
    { $match: { specialistUser: { $in: userIds } } },
    {
      $group: {
        _id: '$specialistUser',
        totalAppointments: { $sum: 1 },
        upcomingAppointments: {
          $sum: {
            $cond: [
              { $and: [{ $in: ['$status', ACTIVE_APPOINTMENT_STATUSES] }, { $gte: ['$slotEnd', now] }] },
              1,
              0,
            ],
          },
        },
        patients: { $addToSet: '$patient' },
      },
    },
  ]);
  return new Map(rows.map((row) => [String(row._id), {
    totalAppointments: row.totalAppointments,
    upcomingAppointments: row.upcomingAppointments,
    patientCount: row.patients.length,
  }]));
};

const toSpecialistDto = (user, profile, stats) => {
  const sp = user.specialistProfile || {};
  return {
    _id: String(user._id),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone || '',
    isActive: user.isActive !== false,
    emailVerified: Boolean(user.emailVerified),
    lastLoginAt: user.lastLoginAt || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    specialization: sp.specialization || profile?.specialization || '',
    licenseNumber: sp.licenseNumber || '',
    city: sp.city || profile?.city || '',
    tariff: sp.tariff ?? profile?.tariff ?? null,
    languages: (sp.languages?.length ? sp.languages : profile?.languages) || [],
    bio: profile?.bio || '',
    availabilityRules: profile?.availabilityRules || [],
    averageRating: profile?.averageRating ?? null,
    directoryProfileId: profile ? String(profile._id) : null,
    listedInDirectory: Boolean(profile?.isActive),
    stats: stats || { totalAppointments: 0, upcomingAppointments: 0, patientCount: 0 },
  };
};

const listSpecialists = async ({ search, status, city, specialization } = {}) => {
  const query = { role: 'specialist' };
  if (status === 'active') query.isActive = true;
  if (status === 'inactive') query.isActive = false;

  const escape = (value) => String(value).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (search && String(search).trim()) {
    const pattern = new RegExp(escape(search), 'i');
    query.$or = [
      { firstName: pattern }, { lastName: pattern }, { email: pattern },
      { 'specialistProfile.specialization': pattern }, { 'specialistProfile.licenseNumber': pattern },
      { 'specialistProfile.city': pattern },
    ];
  }
  if (city) query['specialistProfile.city'] = new RegExp(`^${escape(city)}$`, 'i');
  if (specialization) query['specialistProfile.specialization'] = new RegExp(`^${escape(specialization)}$`, 'i');

  const users = await User.find(query).select(USER_FIELDS).sort({ lastName: 1, firstName: 1 }).lean();
  const ids = users.map((user) => user._id);
  const [profiles, stats] = await Promise.all([
    TeleconsultationSpecialistProfile.find({ linkedUser: { $in: ids } }).lean(),
    buildStats(ids),
  ]);
  const profileMap = new Map(profiles.map((profile) => [String(profile.linkedUser), profile]));

  // Valeurs disponibles pour les filtres (sur l'ensemble des spécialistes, pas seulement le résultat).
  const [cities, specializations] = await Promise.all([
    User.distinct('specialistProfile.city', { role: 'specialist' }),
    User.distinct('specialistProfile.specialization', { role: 'specialist' }),
  ]);

  return {
    specialists: users.map((user) => toSpecialistDto(user, profileMap.get(String(user._id)), stats.get(String(user._id)))),
    filters: {
      cities: cities.filter(Boolean).sort((a, b) => a.localeCompare(b, 'fr')),
      specializations: specializations.filter(Boolean).sort((a, b) => a.localeCompare(b, 'fr')),
    },
  };
};

const getSpecialist = async (id) => {
  const user = await loadSpecialist(id);
  const [profile, stats, recent] = await Promise.all([
    TeleconsultationSpecialistProfile.findOne({ linkedUser: user._id }).lean(),
    buildStats([user._id]),
    TeleconsultationAppointment.find({ specialistUser: user._id })
      .populate('patient', 'firstName lastName role')
      .sort({ slotStart: -1 })
      .limit(5)
      .lean(),
  ]);

  return {
    ...toSpecialistDto(user.toObject(), profile, stats.get(String(user._id))),
    recentAppointments: recent.map((item) => ({
      _id: String(item._id),
      slotStart: item.slotStart,
      status: item.status,
      reason: item.reason,
      patientName: item.patient ? `${item.patient.firstName} ${item.patient.lastName}` : 'Compte supprimé',
      patientRole: item.patient?.role || null,
    })),
  };
};

/* ── Écriture ──────────────────────────────────────────────────────────── */

const createSpecialist = async (body) => {
  const data = parseInput(body, 'create');
  await assertUnique(data);

  let user;
  try {
    user = await User.create({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone || undefined,
      role: 'specialist',
      isActive: data.isActive !== false,
      // Même règle que la création de comptes par l'administrateur (adminController).
      mfaEnabled: true,
      passwordHash: await bcrypt.hash(data.password, 12),
      specialistProfile: {
        specialization: data.specialization,
        licenseNumber: data.licenseNumber,
        city: data.city || undefined,
        tariff: data.tariff,
        languages: data.languages,
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw new AppError('Un compte existe déjà avec cette adresse e-mail.', 409, { email: 'Adresse e-mail déjà utilisée.' });
    }
    throw error;
  }

  try {
    await syncDirectoryProfile(user, { bio: data.bio, availabilityRules: data.availabilityRules });
  } catch (error) {
    // Pas de transaction sur un MongoDB autonome : on annule la création du compte pour ne
    // pas laisser un spécialiste sans fiche d'annuaire.
    await wipeUserData(user._id);
    await user.deleteOne();
    throw error;
  }

  return getSpecialist(user._id);
};

const updateSpecialist = async (id, body, adminUser) => {
  const user = await loadSpecialist(id, true);
  const data = parseInput(body, 'update');
  await assertUnique(
    {
      email: data.email && data.email !== user.email ? data.email : undefined,
      licenseNumber: data.licenseNumber,
    },
    user._id
  );

  if (String(user._id) === String(adminUser?._id) && data.isActive === false) {
    throw new AppError('Vous ne pouvez pas désactiver votre propre compte.', 400);
  }

  if (data.firstName !== undefined) user.firstName = data.firstName;
  if (data.lastName !== undefined) user.lastName = data.lastName;
  if (data.email !== undefined) user.email = data.email;
  if (data.phone !== undefined) user.phone = data.phone || undefined;
  if (data.isActive !== undefined) user.isActive = data.isActive;

  user.specialistProfile = user.specialistProfile || {};
  if (data.specialization !== undefined) user.specialistProfile.specialization = data.specialization;
  if (data.licenseNumber !== undefined) user.specialistProfile.licenseNumber = data.licenseNumber;
  if (data.city !== undefined) user.specialistProfile.city = data.city || undefined;
  if (data.tariff !== undefined) user.specialistProfile.tariff = data.tariff;
  if (data.languages !== undefined) user.specialistProfile.languages = data.languages;

  if (data.password) {
    user.passwordHash = await bcrypt.hash(data.password, 12);
    user.passwordChangedAt = new Date();
  }

  try {
    await user.save();
  } catch (error) {
    if (error?.code === 11000) {
      throw new AppError('Un compte existe déjà avec cette adresse e-mail.', 409, { email: 'Adresse e-mail déjà utilisée.' });
    }
    throw error;
  }

  await syncDirectoryProfile(user, { bio: data.bio, availabilityRules: data.availabilityRules });
  return getSpecialist(user._id);
};

/**
 * Suppression refusée tant que des rendez-vous à venir sont actifs (les familles concernées
 * perdraient leur consultation sans être prévenues) : l'administrateur doit les faire annuler
 * ou désactiver le compte. Sinon, l'historique et la fiche d'annuaire sont supprimés avec le compte.
 */
const deleteSpecialist = async (id) => {
  const user = await loadSpecialist(id);
  const upcoming = await countUpcomingSpecialistAppointments(user._id);
  if (upcoming > 0) {
    throw new AppError(
      `Suppression impossible : ${upcoming} rendez-vous à venir sont encore prévus avec ce spécialiste. Annulez-les ou désactivez le compte.`,
      409
    );
  }

  await wipeUserData(user._id);
  await user.deleteOne();
};

module.exports = {
  listSpecialists,
  getSpecialist,
  createSpecialist,
  updateSpecialist,
  deleteSpecialist,
  syncDirectoryProfile,
};
