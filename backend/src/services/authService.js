const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const mongoose = require('mongoose');

const AppError = require('../utils/AppError');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const PasswordResetToken = require('../models/PasswordResetToken');
const EmailVerificationToken = require('../models/EmailVerificationToken');
const MfaChallenge = require('../models/MfaChallenge');
const { createAuthTokens, hashToken, verifyRefreshToken } = require('../utils/tokenService');
const { generatePlainResetToken, hashResetToken } = require('../utils/passwordResetToken');
const { sendResetPasswordEmail, sendEmailVerificationEmail, sendMfaCodeEmail } = require('./mailService');
const { validatePassword } = require('../validators/authValidators');

const REFRESH_TOKEN_COOKIE_NAME = 'familybalance_refresh_token';

const sanitizeUser = (user) => user.toSafeJSON();

const maskEmail = (email) => {
  const value = String(email || '').trim();
  const atIndex = value.indexOf('@');

  if (atIndex <= 1) {
    return value;
  }

  return `${value[0]}***${value.slice(atIndex)}`;
};

const getRefreshTokenExpiryDate = () => {
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  const now = new Date();
  const match = expiresIn.match(/^(\d+)([smhd])$/i);

  if (!match) {
    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return new Date(now.getTime() + amount * multipliers[unit]);
};

const buildTokenCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

const normalizeProfile = (profile = {}) => {
  const normalized = {};

  if (profile.specialization) normalized.specialization = String(profile.specialization).trim();
  if (profile.licenseNumber) normalized.licenseNumber = String(profile.licenseNumber).trim();
  if (profile.city) normalized.city = String(profile.city).trim();
  if (profile.tariff !== undefined) normalized.tariff = Number(profile.tariff);
  if (Array.isArray(profile.languages)) {
    normalized.languages = profile.languages
      .map((language) => String(language).trim().toLowerCase())
      .filter(Boolean);
  }

  if (profile.parentId) normalized.parentId = profile.parentId;
  if (profile.birthDate) normalized.birthDate = new Date(profile.birthDate);
  if (profile.consentGiven !== undefined) normalized.consentGiven = Boolean(profile.consentGiven);
  if (profile.consentAt) normalized.consentAt = new Date(profile.consentAt);
  if (profile.ageSegment) normalized.ageSegment = String(profile.ageSegment).trim();

  return normalized;
};

const AGE_SEGMENTS = [
  { key: '3-6', min: 3, max: 6, label: '3 - 6 ans' },
  { key: '7-11', min: 7, max: 11, label: '7 - 11 ans' },
  { key: '12-15', min: 12, max: 15, label: '12 - 15 ans' },
  { key: '16-18', min: 16, max: 18, label: '16 - 18 ans' },
];

const getAgeSegmentFromBirthDate = (birthDate) => {
  const date = birthDate instanceof Date ? birthDate : new Date(birthDate);

  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new AppError('Date de naissance invalide.', 400);
  }

  const age = Math.floor((Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  const segment = AGE_SEGMENTS.find((item) => age >= item.min && age <= item.max);

  if (!segment) {
    throw new AppError('L\'âge doit être compris entre 3 et 18 ans.', 400);
  }

  return segment;
};

const generateMfaToken = () => crypto.randomBytes(32).toString('hex');

const generateMfaCode = () => String(crypto.randomInt(100000, 1000000));

const createMfaChallenge = async (user, meta = {}) => {
  await MfaChallenge.deleteMany({ user: user._id, usedAt: { $exists: false } });

  const plainToken = generateMfaToken();
  const plainCode = generateMfaCode();
  const challenge = await MfaChallenge.create({
    user: user._id,
    tokenHash: hashToken(plainToken),
    codeHash: hashToken(plainCode),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    attempts: 0,
  });

  const mailResult = await sendMfaCodeEmail({
    to: user.email,
    code: plainCode,
    firstName: user.firstName,
  });

  return {
    mfaToken: plainToken,
    challengeId: challenge._id.toString(),
    challengeExpiresAt: challenge.expiresAt,
    mfaCodeSent: mailResult.sent,
    maskedEmail: maskEmail(user.email),
  };
};

const createRefreshTokenRecord = async ({ userId, refreshToken, ip, userAgent }) => {
  const decoded = verifyRefreshToken(refreshToken);
  const tokenHash = hashToken(refreshToken);

  const refreshTokenDocument = await RefreshToken.create({
    user: userId,
    tokenHash,
    expiresAt: new Date(decoded.exp * 1000),
    createdByIp: ip,
    createdByUserAgent: userAgent,
  });

  return refreshTokenDocument;
};

const issueTokens = async (user, meta = {}) => {
  const tokens = createAuthTokens(user);
  await createRefreshTokenRecord({
    userId: user._id,
    refreshToken: tokens.refreshToken,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return tokens;
};

const completeAuthenticatedSession = async (user, meta = {}) => {
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  const tokens = await issueTokens(user, meta);

  return {
    user: sanitizeUser(user),
    ...tokens,
    requiresMfa: false,
  };
};

const registerUser = async (payload = {}, meta = {}) => {
  const existingUser = await User.findOne({ email: payload.email });

  if (existingUser) {
    throw new AppError('Un compte existe déjà avec cette adresse email.', 409);
  }

  const hashedPassword = await bcrypt.hash(payload.password, 12);
  const role = payload.role || 'parent';

  if (role === 'admin') {
    const expectedAdminKey = String(
      process.env.ADMIN_REGISTRATION_KEY || 'familybalance-admin-dev-key'
    ).trim();
    const providedAdminKey = String(payload.adminRegistrationKey || '').trim();
    if (!providedAdminKey || providedAdminKey !== expectedAdminKey) {
      throw new AppError("Clé d'inscription admin invalide.", 403);
    }
  }

  const userData = {
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    passwordHash: hashedPassword,
    role,
    phone: payload.phone,
    mfaEnabled: role === 'parent' || role === 'adolescent' || role === 'specialist' || role === 'admin',
  };

  const requiresEmailVerification =
    role === 'parent' || role === 'adolescent' || role === 'specialist';
  if (requiresEmailVerification) {
    userData.emailVerified = false;
    userData.isActive = false;
  }

  if (role === 'specialist' && payload.specialistProfile) {
    userData.specialistProfile = normalizeProfile(payload.specialistProfile);
  }

  if (role === 'adolescent' && payload.adolescentProfile) {
    const adolescentProfile = normalizeProfile(payload.adolescentProfile);

    if (!mongoose.Types.ObjectId.isValid(adolescentProfile.parentId)) {
      throw new AppError('Le parent de rattachement est invalide.', 400);
    }

    const parent = await User.findById(adolescentProfile.parentId);
    if (!parent || parent.role !== 'parent') {
      throw new AppError('Le parent de rattachement est introuvable ou invalide.', 400);
    }

    userData.adolescentProfile = {
      ...adolescentProfile,
      consentAt: adolescentProfile.consentAt || new Date(),
    };
  }

  const user = await User.create(userData);

  if (requiresEmailVerification) {
    await EmailVerificationToken.deleteMany({ user: user._id, usedAt: { $exists: false } });

    const plainToken = generatePlainResetToken();
    const tokenHash = hashResetToken(plainToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await EmailVerificationToken.create({
      user: user._id,
      tokenHash,
      expiresAt,
    });

    const verifyUrl = `${process.env.CLIENT_ORIGIN || 'http://localhost:4200'}/auth/verify-email?token=${plainToken}`;
    const mailResult = await sendEmailVerificationEmail({
      to: user.email,
      verifyUrl,
      firstName: user.firstName,
    });

    return {
      user: sanitizeUser(user),
      requiresEmailVerification: true,
      verificationEmailSent: mailResult.sent,
      verificationUrl: verifyUrl,
    };
  }

  if (user.mfaEnabled) {
    const challenge = await createMfaChallenge(user, meta);

    return {
      user: sanitizeUser(user),
      requiresMfa: true,
      ...challenge,
    };
  }

  const tokens = await issueTokens(user, meta);

  return {
    user: sanitizeUser(user),
    ...tokens,
    requiresMfa: false,
  };
};

const verifyEmailToken = async ({ token }, meta = {}) => {
  const tokenHash = hashResetToken(token);
  const verificationToken = await EmailVerificationToken.findOne({ tokenHash }).populate('user');

  if (!verificationToken || verificationToken.usedAt) {
    throw new AppError('Lien de confirmation invalide.', 400);
  }

  if (verificationToken.expiresAt.getTime() < Date.now()) {
    throw new AppError('Lien de confirmation expire.', 400);
  }

  const user = await User.findById(verificationToken.user._id);

  if (!user) {
    throw new AppError('Utilisateur introuvable.', 404);
  }

  user.emailVerified = true;
  user.isActive = true;
  await user.save({ validateBeforeSave: false });

  verificationToken.usedAt = new Date();
  await verificationToken.save();

  if (user.mfaEnabled) {
    const challenge = await createMfaChallenge(user, meta);

    return {
      user: sanitizeUser(user),
      requiresMfa: true,
      ...challenge,
    };
  }

  const tokens = await issueTokens(user, meta);

  return {
    user: sanitizeUser(user),
    ...tokens,
    requiresMfa: false,
  };
};

const loginUser = async ({ email, password }, meta = {}) => {
  const user = await User.findOne({ email }).select('+passwordHash');

  if (!user) {
    throw new AppError('Identifiants invalides.', 401);
  }

  if (!user.isActive) {
    if (
      (user.role === 'parent' || user.role === 'adolescent' || user.role === 'specialist') &&
      !user.emailVerified
    ) {
      throw new AppError('Veuillez confirmer votre adresse e-mail avant de vous connecter.', 403);
    }

    throw new AppError('Ce compte est désactivé.', 403);
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    throw new AppError('Identifiants invalides.', 401);
  }

  if (user.mfaEnabled) {
    const challenge = await createMfaChallenge(user, meta);

    return {
      user: sanitizeUser(user),
      requiresMfa: true,
      ...challenge,
    };
  }

  const tokens = await issueTokens(user, meta);

  return {
    user: sanitizeUser(user),
    ...tokens,
    requiresMfa: false,
  };
};

const verifyMfaChallenge = async ({ token, code }, meta = {}) => {
  const tokenHash = hashToken(token);
  const challenge = await MfaChallenge.findOne({ tokenHash }).populate('user');

  if (!challenge || challenge.usedAt) {
    throw new AppError('Code MFA invalide.', 400);
  }

  if (challenge.expiresAt.getTime() < Date.now()) {
    throw new AppError('Code MFA expiré.', 400);
  }

  const user = await User.findById(challenge.user._id).select('+passwordHash');

  if (!user || !user.isActive) {
    throw new AppError('Compte introuvable ou désactivé.', 401);
  }

  const isCodeValid = hashToken(code) === challenge.codeHash;

  if (!isCodeValid) {
    challenge.attempts += 1;

    if (challenge.attempts >= 5) {
      challenge.usedAt = new Date();
    }

    await challenge.save();
    throw new AppError('Code MFA invalide.', 400);
  }

  challenge.usedAt = new Date();
  await challenge.save();

  return completeAuthenticatedSession(user, meta);
};

const refreshSession = async ({ refreshToken }, meta = {}) => {
  if (!refreshToken) {
    throw new AppError('Jeton de rafraîchissement manquant.', 401);
  }

  const tokenHash = hashToken(refreshToken);
  const storedToken = await RefreshToken.findOne({ tokenHash }).populate('user');

  if (!storedToken || storedToken.revokedAt) {
    throw new AppError('Jeton de rafraîchissement invalide.', 401);
  }

  if (storedToken.expiresAt.getTime() < Date.now()) {
    throw new AppError('Jeton de rafraîchissement expiré.', 401);
  }

  const decoded = verifyRefreshToken(refreshToken);
  const user = decoded.sub ? await User.findById(decoded.sub).select('+passwordHash') : null;

  if (!user || !user.isActive) {
    throw new AppError('Compte introuvable ou désactivé.', 401);
  }

  const tokens = createAuthTokens(user);
  const newRefreshTokenDocument = await RefreshToken.create({
    user: user._id,
    tokenHash: tokens.refreshTokenHash,
    expiresAt: getRefreshTokenExpiryDate(),
    createdByIp: meta.ip,
    createdByUserAgent: meta.userAgent,
  });

  storedToken.revokedAt = new Date();
  storedToken.revokedReason = 'rotated';
  storedToken.replacedByTokenHash = newRefreshTokenDocument.tokenHash;
  await storedToken.save();

  return {
    user: sanitizeUser(user),
    ...tokens,
  };
};

const revokeRefreshToken = async ({ refreshToken, reason = 'logout' }) => {
  if (!refreshToken) {
    return { revoked: false };
  }

  const tokenHash = hashToken(refreshToken);
  const storedToken = await RefreshToken.findOne({ tokenHash });

  if (!storedToken) {
    return { revoked: false };
  }

  storedToken.revokedAt = new Date();
  storedToken.revokedReason = reason;
  await storedToken.save();

  return { revoked: true };
};

const revokeAllSessions = async (userId, reason = 'password-change') => {
  await RefreshToken.updateMany(
    { user: userId, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date(), revokedReason: reason } }
  );
};

const changePassword = async ({ userId, currentPassword, newPassword }) => {
  const user = await User.findById(userId).select('+passwordHash');

  if (!user) {
    throw new AppError('Utilisateur introuvable.', 404);
  }

  const isPasswordValid = await user.comparePassword(currentPassword);

  if (!isPasswordValid) {
    throw new AppError('Le mot de passe actuel est incorrect.', 400);
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.passwordChangedAt = new Date();
  await user.save();

  await revokeAllSessions(user._id, 'password-change');

  return { user: sanitizeUser(user) };
};

const requestPasswordReset = async ({ email }, meta = {}) => {
  const user = await User.findOne({ email });

  if (!user) {
    return {
      success: true,
      message: 'Si le compte existe, un e-mail de réinitialisation sera envoyé.',
    };
  }

  await PasswordResetToken.deleteMany({ user: user._id, usedAt: { $exists: false } });

  const plainToken = generatePlainResetToken();
  const tokenHash = hashResetToken(plainToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await PasswordResetToken.create({
    user: user._id,
    tokenHash,
    expiresAt,
  });

  const resetUrl = `${process.env.CLIENT_ORIGIN || 'http://localhost:4200'}/auth/reset-password?token=${plainToken}`;
  const mailResult = await sendResetPasswordEmail({
    to: user.email,
    resetUrl,
    firstName: user.firstName,
  });

  return {
    success: true,
    message: mailResult.message,
    resetUrl,
    expiresAt,
    sent: mailResult.sent,
  };
};

const resetPassword = async ({ token, newPassword }) => {
  const tokenHash = hashResetToken(token);
  const resetToken = await PasswordResetToken.findOne({ tokenHash }).populate('user');

  if (!resetToken || resetToken.usedAt) {
    throw new AppError('Jeton de réinitialisation invalide.', 400);
  }

  if (resetToken.expiresAt.getTime() < Date.now()) {
    throw new AppError('Jeton de réinitialisation expiré.', 400);
  }

  const user = await User.findById(resetToken.user._id).select('+passwordHash');

  if (!user) {
    throw new AppError('Utilisateur introuvable.', 404);
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.passwordChangedAt = new Date();
  await user.save();

  resetToken.usedAt = new Date();
  await resetToken.save();

  await revokeAllSessions(user._id, 'password-reset');

  return {
    user: sanitizeUser(user),
  };
};

const getCurrentUser = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError('Utilisateur introuvable.', 404);
  }

  return user;
};

const getLinkedAdolescentsForParent = async (parentUserId) => {
  const parent = await User.findById(parentUserId).select('role');

  if (!parent) {
    throw new AppError('Utilisateur introuvable.', 404);
  }

  if (parent.role !== 'parent') {
    throw new AppError('Acces reserve aux comptes parent.', 403);
  }

  const adolescents = await User.find(
    {
      role: 'adolescent',
      'adolescentProfile.parentId': parentUserId,
    },
    'firstName lastName email phone adolescentProfile.birthDate adolescentProfile.ageSegment adolescentProfile.consentGiven createdAt'
  )
    .sort({ createdAt: -1 })
    .lean();

  return adolescents;
};

const updateCurrentUserProfile = async (userId, payload = {}) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError('Utilisateur introuvable.', 404);
  }

  if (payload.firstName !== undefined) user.firstName = payload.firstName;
  if (payload.lastName !== undefined) user.lastName = payload.lastName;
  if (payload.phone !== undefined) user.phone = payload.phone || undefined;

  if (payload.specialistProfile && user.role === 'specialist') {
    user.specialistProfile = user.specialistProfile || {};

    if (payload.specialistProfile.specialization !== undefined) {
      user.specialistProfile.specialization = payload.specialistProfile.specialization;
    }
    if (payload.specialistProfile.licenseNumber !== undefined) {
      user.specialistProfile.licenseNumber = payload.specialistProfile.licenseNumber;
    }
    if (payload.specialistProfile.city !== undefined) {
      user.specialistProfile.city = payload.specialistProfile.city;
    }
    if (payload.specialistProfile.tariff !== undefined) {
      user.specialistProfile.tariff = payload.specialistProfile.tariff;
    }
    if (payload.specialistProfile.languages !== undefined) {
      user.specialistProfile.languages = Array.isArray(payload.specialistProfile.languages)
        ? payload.specialistProfile.languages.map((language) => String(language).trim().toLowerCase()).filter(Boolean)
        : [];
    }
  }

  await user.save();

  return {
    user: sanitizeUser(user),
  };
};

const createAdolescentForParent = async (parentUserId, payload = {}) => {
  const parent = await User.findById(parentUserId);

  if (!parent || parent.role !== 'parent') {
    throw new AppError('Acces reserve aux comptes parent.', 403);
  }

  const existingAdolescent = await User.findOne({ email: payload.email });

  if (existingAdolescent) {
    throw new AppError('Un compte existe déjà avec cette adresse email.', 409);
  }

  if (!payload.firstName || !payload.lastName || !payload.email || !payload.password) {
    throw new AppError('firstName, lastName, email et password sont obligatoires.', 400);
  }

  const passwordError = validatePassword(payload.password);
  if (passwordError) {
    throw new AppError(passwordError, 400);
  }

  if (payload.consentGiven !== true) {
    throw new AppError('Le consentement explicite du parent est obligatoire pour créer ce profil.', 400);
  }

  if (!payload.birthDate) {
    throw new AppError('La date de naissance est obligatoire.', 400);
  }

  const birthDateValue = new Date(payload.birthDate);
  const ageSegment = getAgeSegmentFromBirthDate(birthDateValue).key;
  const hashedPassword = await bcrypt.hash(payload.password, 12);

  const userData = {
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    passwordHash: hashedPassword,
    role: 'adolescent',
    emailVerified: false,
    isActive: false,
    mfaEnabled: true,
    adolescentProfile: {
      parentId: parentUserId,
      birthDate: birthDateValue,
      ageSegment,
      consentGiven: Boolean(payload.consentGiven),
      consentAt: new Date(),
    },
  };

  const adolescent = await User.create(userData);

  await EmailVerificationToken.deleteMany({ user: adolescent._id, usedAt: { $exists: false } });

  const plainToken = generatePlainResetToken();
  const tokenHash = hashResetToken(plainToken);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await EmailVerificationToken.create({
    user: adolescent._id,
    tokenHash,
    expiresAt,
  });

  const verifyUrl = `${process.env.CLIENT_ORIGIN || 'http://localhost:4200'}/auth/verify-email?token=${plainToken}`;
  const mailResult = await sendEmailVerificationEmail({
    to: adolescent.email,
    verifyUrl,
    firstName: adolescent.firstName,
  });

  return {
    adolescent: sanitizeUser(adolescent),
    verificationEmailSent: mailResult.sent,
    verificationUrl: verifyUrl,
    requiresEmailVerification: true,
  };
};

module.exports = {
  REFRESH_TOKEN_COOKIE_NAME,
  registerUser,
  verifyEmailToken,
  loginUser,
  verifyMfaChallenge,
  refreshSession,
  revokeRefreshToken,
  changePassword,
  requestPasswordReset,
  resetPassword,
  getCurrentUser,
  getLinkedAdolescentsForParent,
  updateCurrentUserProfile,
  createAdolescentForParent,
};
