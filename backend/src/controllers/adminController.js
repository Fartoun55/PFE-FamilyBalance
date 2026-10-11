const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const EducationalResource = require('../models/EducationalResource');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { exportToExcel, exportToWord, exportToPDF } = require('../services/exportService');
const {
  PASSWORD_REGEX: passwordRegex,
  wipeUserData,
  countUpcomingSpecialistAppointments,
} = require('../services/accountCleanupService');
const { syncDirectoryProfile } = require('../services/specialistAdminService');

const sanitizeProfileInput = (payload = {}) => ({
  firstName: typeof payload.firstName === 'string' ? payload.firstName.trim() : undefined,
  lastName: typeof payload.lastName === 'string' ? payload.lastName.trim() : undefined,
  email: typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : undefined,
  role: typeof payload.role === 'string' ? payload.role.trim().toLowerCase() : undefined,
  phone: typeof payload.phone === 'string' ? payload.phone.trim() : undefined,
  password: typeof payload.password === 'string' ? payload.password.trim() : undefined,
  confirmPassword:
    typeof payload.confirmPassword === 'string' ? payload.confirmPassword.trim() : undefined,
  isActive: payload.isActive,
  specialistProfile: payload.specialistProfile,
  adolescentProfile: payload.adolescentProfile,
});

const validateRoleSpecificData = async (data, mode = 'create') => {
  if (data.role === 'specialist') {
    const specialistProfile = data.specialistProfile || {};
    if (!specialistProfile.specialization || !specialistProfile.licenseNumber) {
      throw new AppError('Le spécialiste doit avoir une spécialisation et un numéro de licence.', 400);
    }
  }

  if (data.role === 'adolescent') {
    const adolescentProfile = data.adolescentProfile || {};
    if (!adolescentProfile.parentId || !adolescentProfile.birthDate) {
      throw new AppError("L'adolescent doit avoir parentId et birthDate.", 400);
    }

    if (!mongoose.Types.ObjectId.isValid(adolescentProfile.parentId)) {
      throw new AppError('Le parent de rattachement est invalide.', 400);
    }

    const parent = await User.findById(adolescentProfile.parentId);
    if (!parent || parent.role !== 'parent') {
      throw new AppError('Le parent de rattachement est introuvable ou invalide.', 400);
    }

    if (mode === 'create' && adolescentProfile.consentGiven !== true) {
      throw new AppError('Le consentement adolescent est obligatoire à la création.', 400);
    }
  }
};

const listAccounts = asyncHandler(async (_req, res) => {
  const users = await User.find({}, 'firstName lastName email role isActive createdAt updatedAt phone')
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    status: 'success',
    count: users.length,
    users,
  });
});

const getAccountById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError('Compte introuvable.', 404);
  }

  res.status(200).json({
    status: 'success',
    user: user.toSafeJSON(),
  });
});

const createAccount = asyncHandler(async (req, res) => {
  const input = sanitizeProfileInput(req.body);

  if (!input.firstName || !input.lastName || !input.email || !input.role || !input.password) {
    throw new AppError('firstName, lastName, email, role et password sont obligatoires.', 400);
  }

  if (!['parent', 'adolescent', 'specialist', 'admin'].includes(input.role)) {
    throw new AppError('Rôle invalide.', 400);
  }

  if (!input.confirmPassword || input.confirmPassword !== input.password) {
    throw new AppError('La confirmation du mot de passe ne correspond pas.', 400);
  }

  if (!passwordRegex.test(input.password)) {
    throw new AppError(
      'Le mot de passe doit contenir au moins 10 caractères, une majuscule, une minuscule et un chiffre.',
      400
    );
  }

  const exists = await User.findOne({ email: input.email });
  if (exists) {
    throw new AppError('Un compte existe déjà avec cette adresse email.', 409);
  }

  await validateRoleSpecificData(input, 'create');

  const userData = {
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    role: input.role,
    phone: input.phone || undefined,
    isActive: typeof input.isActive === 'boolean' ? input.isActive : true,
    mfaEnabled: input.role === 'parent' || input.role === 'adolescent' || input.role === 'specialist' || input.role === 'admin',
    passwordHash: await bcrypt.hash(input.password, 12),
  };

  if (input.role === 'specialist') {
    userData.specialistProfile = {
      specialization: input.specialistProfile.specialization,
      licenseNumber: input.specialistProfile.licenseNumber,
      city: input.specialistProfile.city,
      tariff:
        input.specialistProfile.tariff !== undefined ? Number(input.specialistProfile.tariff) : undefined,
    };
  }

  if (input.role === 'adolescent') {
    userData.adolescentProfile = {
      parentId: input.adolescentProfile.parentId,
      birthDate: new Date(input.adolescentProfile.birthDate),
      consentGiven: Boolean(input.adolescentProfile.consentGiven),
      consentAt: new Date(),
    };
  }

  const created = await User.create(userData);

  res.status(201).json({
    status: 'success',
    message: 'Compte créé avec succès.',
    user: created.toSafeJSON(),
  });
});

const updateAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('+passwordHash');
  if (!user) {
    throw new AppError('Compte introuvable.', 404);
  }

  const input = sanitizeProfileInput(req.body);

  if (input.email && input.email !== user.email) {
    const exists = await User.findOne({ email: input.email });
    if (exists) {
      throw new AppError('Un compte existe déjà avec cette adresse email.', 409);
    }
    user.email = input.email;
  }

  const isSelf = user._id.equals(req.user._id);

  if (isSelf && typeof input.isActive === 'boolean' && input.isActive === false) {
    throw new AppError('Vous ne pouvez pas désactiver votre propre compte.', 400);
  }

  if (input.firstName !== undefined) user.firstName = input.firstName;
  if (input.lastName !== undefined) user.lastName = input.lastName;
  if (input.phone !== undefined) user.phone = input.phone || undefined;
  if (typeof input.isActive === 'boolean') user.isActive = input.isActive;

  const previousRole = user.role;

  if (input.role && input.role !== user.role) {
    if (!['parent', 'adolescent', 'specialist', 'admin'].includes(input.role)) {
      throw new AppError('Rôle invalide.', 400);
    }
    if (isSelf && input.role !== 'admin') {
      throw new AppError('Vous ne pouvez pas changer le rôle de votre propre compte administrateur.', 400);
    }
    if (previousRole === 'admin' && input.role !== 'admin') {
      const otherAdmins = await User.countDocuments({ role: 'admin', _id: { $ne: user._id } });
      if (otherAdmins === 0) {
        throw new AppError('Impossible de rétrograder le dernier compte administrateur.', 400);
      }
    }
    user.role = input.role;
    user.mfaEnabled = input.role === 'parent' || input.role === 'adolescent' || input.role === 'specialist' || input.role === 'admin';
    if (previousRole === 'specialist' && input.role !== 'specialist') user.specialistProfile = undefined;
    if (previousRole === 'adolescent' && input.role !== 'adolescent') user.adolescentProfile = undefined;
  }

  if (input.password) {
    if (!input.confirmPassword || input.confirmPassword !== input.password) {
      throw new AppError('La confirmation du mot de passe ne correspond pas.', 400);
    }
    if (!passwordRegex.test(input.password)) {
      throw new AppError(
        'Le mot de passe doit contenir au moins 10 caractères, une majuscule, une minuscule et un chiffre.',
        400
      );
    }
    user.passwordHash = await bcrypt.hash(input.password, 12);
    user.passwordChangedAt = new Date();
  }

  if (input.role === 'specialist' || user.role === 'specialist') {
    user.specialistProfile = user.specialistProfile || {};
    const profile = input.specialistProfile || {};
    if (profile.specialization !== undefined) user.specialistProfile.specialization = profile.specialization;
    if (profile.licenseNumber !== undefined) user.specialistProfile.licenseNumber = profile.licenseNumber;
    if (profile.city !== undefined) user.specialistProfile.city = profile.city;
    if (profile.tariff !== undefined) user.specialistProfile.tariff = Number(profile.tariff);
  }

  if (input.role === 'adolescent' || user.role === 'adolescent') {
    user.adolescentProfile = user.adolescentProfile || {};
    const profile = input.adolescentProfile || {};
    if (profile.parentId !== undefined) user.adolescentProfile.parentId = profile.parentId;
    if (profile.birthDate !== undefined) user.adolescentProfile.birthDate = new Date(profile.birthDate);
    if (profile.consentGiven !== undefined) {
      user.adolescentProfile.consentGiven = Boolean(profile.consentGiven);
      if (Boolean(profile.consentGiven)) {
        user.adolescentProfile.consentAt = new Date();
      }
    }
  }

  await validateRoleSpecificData(
    {
      role: user.role,
      specialistProfile: user.specialistProfile,
      adolescentProfile: user.adolescentProfile,
    },
    'update'
  );

  await user.save();
  // Les informations du spécialiste (nom, spécialité, ville, tarif, statut) sont répercutées
  // dans sa fiche d'annuaire de téléconsultation.
  await syncDirectoryProfile(user);

  res.status(200).json({
    status: 'success',
    message: 'Compte mis à jour avec succès.',
    user: user.toSafeJSON(),
  });
});

const deleteAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError('Compte introuvable.', 404);
  }

  if (user._id.equals(req.user._id)) {
    throw new AppError('Vous ne pouvez pas supprimer votre propre compte administrateur.', 400);
  }

  if (user.role === 'admin') {
    const otherAdmins = await User.countDocuments({ role: 'admin', _id: { $ne: user._id } });
    if (otherAdmins === 0) {
      throw new AppError('Impossible de supprimer le dernier compte administrateur.', 400);
    }
  }

  // Même règle que la gestion des spécialistes : pas de suppression avec des rendez-vous à venir.
  if (user.role === 'specialist') {
    const upcoming = await countUpcomingSpecialistAppointments(user._id);
    if (upcoming > 0) {
      throw new AppError(
        `Suppression impossible : ${upcoming} rendez-vous à venir sont encore prévus avec ce spécialiste. Annulez-les ou désactivez le compte.`,
        409
      );
    }
  }

  // Un parent supprimé entraîne la suppression de ses comptes adolescents rattachés,
  // sans quoi ceux-ci pointeraient vers un parent inexistant (dashboard cassé).
  let removedChildren = 0;
  if (user.role === 'parent') {
    const children = await User.find({ role: 'adolescent', 'adolescentProfile.parentId': user._id }, '_id');
    for (const child of children) {
      await wipeUserData(child._id);
      await child.deleteOne();
    }
    removedChildren = children.length;
  }

  await wipeUserData(user._id);
  await user.deleteOne();

  res.status(200).json({
    status: 'success',
    message:
      removedChildren > 0
        ? `Compte supprimé avec succès (ainsi que ${removedChildren} compte(s) enfant rattaché(s)).`
        : 'Compte supprimé avec succès.',
  });
});

const updateAccountStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (typeof isActive !== 'boolean') {
    throw new AppError('Le champ isActive doit être un booléen.', 400);
  }

  const user = await User.findById(id);

  if (!user) {
    throw new AppError('Compte introuvable.', 404);
  }

  user.isActive = isActive;
  await user.save({ validateBeforeSave: false });
  // Un spécialiste désactivé disparaît de l'annuaire (et y réapparaît une fois réactivé).
  await syncDirectoryProfile(user);

  res.status(200).json({
    status: 'success',
    message: `Compte ${isActive ? 'activé' : 'désactivé'} avec succès.`,
    user: user.toSafeJSON(),
  });
});

// La file de modération renvoyait auparavant un unique élément factice codé en dur
// ("resource-demo-1"), totalement déconnecté de la base — et sans aucune interface pour
// le consulter. Les seuls éléments réellement "en attente de validation éditoriale" dans
// l'application sont les ressources éducatives en brouillon : ce sont elles qui alimentent
// désormais la file, avec les vraies actions déjà existantes (publier/supprimer) plutôt
// qu'un mécanisme d'approbation inventé sans nécessité.
const getModerationQueue = asyncHandler(async (_req, res) => {
  const draftResources = await EducationalResource.find({ status: 'draft' })
    .select('title description category ageMin ageMax contentType createdBy createdAt')
    .sort({ createdAt: 1 })
    .lean();

  const items = draftResources.map((resource) => ({
    id: resource._id,
    type: 'resource',
    title: resource.title,
    description: resource.description,
    category: resource.category,
    ageRange: `${resource.ageMin}-${resource.ageMax} ans`,
    contentType: resource.contentType,
    reason: 'Ressource éducative en brouillon en attente de publication',
    createdAt: resource.createdAt,
  }));

  res.status(200).json({
    status: 'success',
    count: items.length,
    items,
  });
});

const exportAnonymizedUsers = asyncHandler(async (_req, res) => {
  const users = await User.find({}, 'role createdAt').lean();

  const anonymized = users.map((user) => ({
    role: user.role,
    createdAt: user.createdAt,
  }));

  res.status(200).json({
    status: 'success',
    count: anonymized.length,
    data: anonymized,
  });
});

const exportAccountsToExcel = asyncHandler(async (_req, res) => {
  try {
    const users = await User.find({}, 'firstName lastName email role phone isActive createdAt updatedAt')
      .sort({ createdAt: -1 })
      .lean();

    if (!users || users.length === 0) {
      throw new Error('Aucun utilisateur à exporter.');
    }

    const buffer = exportToExcel(users);

    if (!buffer) {
      throw new Error('Erreur lors de la génération du fichier Excel.');
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="comptes-familybalance.xlsx"');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    throw new AppError(`Export Excel échoué: ${error.message}`, 500);
  }
});

const exportAccountsToWord = asyncHandler(async (_req, res) => {
  try {
    const users = await User.find({}, 'firstName lastName email role phone isActive createdAt updatedAt')
      .sort({ createdAt: -1 })
      .lean();

    if (!users || users.length === 0) {
      throw new Error('Aucun utilisateur à exporter.');
    }

    const buffer = await exportToWord(users);

    if (!buffer) {
      throw new Error('Erreur lors de la génération du fichier Word.');
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="comptes-familybalance.docx"');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    throw new AppError(`Export Word échoué: ${error.message}`, 500);
  }
});

const exportAccountsToPDF = asyncHandler(async (_req, res) => {
  try {
    const users = await User.find({}, 'firstName lastName email role phone isActive createdAt updatedAt')
      .sort({ createdAt: -1 })
      .lean();

    if (!users || users.length === 0) {
      throw new Error('Aucun utilisateur à exporter.');
    }

    const buffer = await exportToPDF(users);

    if (!buffer) {
      throw new Error('Erreur lors de la génération du fichier PDF.');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="comptes-familybalance.pdf"');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    throw new AppError(`Export PDF échoué: ${error.message}`, 500);
  }
});

module.exports = {
  listAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
  updateAccountStatus,
  getModerationQueue,
  exportAnonymizedUsers,
  exportAccountsToExcel,
  exportAccountsToWord,
  exportAccountsToPDF,
};
