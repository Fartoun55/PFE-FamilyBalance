const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const {
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
  REFRESH_TOKEN_COOKIE_NAME,
} = require('../services/authService');
const {
  validateRegisterInput,
  validateLoginInput,
  validateEmailVerificationInput,
  validateMfaVerificationInput,
  validateChangePasswordInput,
  validatePasswordResetRequestInput,
  validatePasswordResetConfirmInput,
  validateUpdateProfileInput,
} = require('../validators/authValidators');

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
});

const setRefreshCookie = (res, refreshToken) => {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
    ...cookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, cookieOptions());
};

const register = asyncHandler(async (req, res) => {
  const validation = validateRegisterInput(req.body);

  if (!validation.isValid) {
    throw new AppError(validation.errors.join(' '), 400);
  }

  const result = await registerUser(validation.value, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  if (result.refreshToken) {
    setRefreshCookie(res, result.refreshToken);
  }

  if (!result.requiresEmailVerification && !result.requiresMfa) {
    res.status(201).json({
      status: 'success',
      message: 'Compte cree avec succes.',
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      requiresMfa: false,
    });

    return;
  }

  if (result.requiresMfa) {
    res.status(201).json({
      status: 'success',
      message: 'Compte cree. Une verification MFA est requise.',
      user: result.user,
      requiresMfa: true,
      mfaToken: result.mfaToken,
      mfaCodeSent: result.mfaCodeSent || false,
      maskedEmail: result.maskedEmail,
      challengeExpiresAt: result.challengeExpiresAt,
    });

    return;
  }

  res.status(201).json({
    status: 'success',
    message:
      'Compte créé. Un e-mail de confirmation a été envoyé. Veuillez confirmer votre adresse pour activer le compte.',
    user: result.user,
    requiresEmailVerification: result.requiresEmailVerification || false,
    verificationEmailSent: result.verificationEmailSent || false,
    verificationUrl: result.verificationUrl,
  });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const validation = validateEmailVerificationInput(req.body);

  if (!validation.isValid) {
    throw new AppError(validation.errors.join(' '), 400);
  }

  const result = await verifyEmailToken(validation.value, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  if (result.refreshToken) {
    setRefreshCookie(res, result.refreshToken);
  }

  if (result.requiresMfa) {
    res.status(200).json({
      status: 'success',
      message: 'Adresse e-mail confirmée. Une vérification MFA est requise.',
      user: result.user,
      requiresMfa: true,
      mfaToken: result.mfaToken,
      mfaCodeSent: result.mfaCodeSent || false,
      maskedEmail: result.maskedEmail,
      challengeExpiresAt: result.challengeExpiresAt,
    });

    return;
  }

  res.status(200).json({
    status: 'success',
    message: 'Adresse e-mail confirmée. Compte activé avec succès.',
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    requiresMfa: result.requiresMfa,
  });
});

const login = asyncHandler(async (req, res) => {
  const validation = validateLoginInput(req.body);

  if (!validation.isValid) {
    throw new AppError(validation.errors.join(' '), 400);
  }

  const result = await loginUser(validation.value, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  if (result.refreshToken) {
    setRefreshCookie(res, result.refreshToken);
  }

  if (result.requiresMfa) {
    res.status(200).json({
      status: 'success',
      message: 'Code MFA envoyé. Veuillez le saisir pour terminer la connexion.',
      user: result.user,
      requiresMfa: true,
      mfaToken: result.mfaToken,
      mfaCodeSent: result.mfaCodeSent || false,
      maskedEmail: result.maskedEmail,
      challengeExpiresAt: result.challengeExpiresAt,
    });

    return;
  }

  res.status(200).json({
    status: 'success',
    message: 'Connexion réussie.',
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    requiresMfa: result.requiresMfa,
  });
});

const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.body.refreshToken || req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

  if (!refreshToken) {
    throw new AppError('Jeton de rafraîchissement manquant.', 401);
  }

  const result = await refreshSession(
    { refreshToken },
    { ip: req.ip, userAgent: req.get('user-agent') }
  );

  setRefreshCookie(res, result.refreshToken);

  res.status(200).json({
    status: 'success',
    message: 'Session renouvelée.',
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
});

const verifyMfa = asyncHandler(async (req, res) => {
  const validation = validateMfaVerificationInput(req.body);

  if (!validation.isValid) {
    throw new AppError(validation.errors.join(' '), 400);
  }

  const result = await verifyMfaChallenge(validation.value, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  setRefreshCookie(res, result.refreshToken);

  res.status(200).json({
    status: 'success',
    message: 'Vérification MFA réussie.',
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
});

const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.body.refreshToken || req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

  if (refreshToken) {
    await revokeRefreshToken({ refreshToken, reason: 'logout' });
  }

  clearRefreshCookie(res);

  res.status(200).json({
    status: 'success',
    message: 'Déconnexion effectuée.',
  });
});

const me = asyncHandler(async (req, res) => {
  const user = await getCurrentUser(req.user._id);

  res.status(200).json({
    status: 'success',
    user: user.toSafeJSON(),
  });
});

const myAdolescents = asyncHandler(async (req, res) => {
  const adolescents = await getLinkedAdolescentsForParent(req.user._id);

  res.status(200).json({
    status: 'success',
    count: adolescents.length,
    adolescents,
  });
});

const changeMyPassword = asyncHandler(async (req, res) => {
  const validation = validateChangePasswordInput(req.body);

  if (!validation.isValid) {
    throw new AppError(validation.errors.join(' '), 400);
  }

  const result = await changePassword({
    userId: req.user._id,
    currentPassword: validation.value.currentPassword,
    newPassword: validation.value.newPassword,
  });

  res.status(200).json({
    status: 'success',
    message: 'Mot de passe modifié avec succès.',
    user: result.user,
  });
});

const updateMyProfile = asyncHandler(async (req, res) => {
  const validation = validateUpdateProfileInput(req.body);

  if (!validation.isValid) {
    throw new AppError(validation.errors.join(' '), 400);
  }

  const result = await updateCurrentUserProfile(req.user._id, validation.value);

  res.status(200).json({
    status: 'success',
    message: 'Profil mis à jour avec succès.',
    user: result.user,
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const validation = validatePasswordResetRequestInput(req.body);

  if (!validation.isValid) {
    throw new AppError(validation.errors.join(' '), 400);
  }

  const result = await requestPasswordReset(validation.value, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.status(200).json({
    status: 'success',
    message: result.message,
    resetUrl: result.resetUrl,
    expiresAt: result.expiresAt,
    sent: result.sent,
  });
});

const resetPasswordWithToken = asyncHandler(async (req, res) => {
  const validation = validatePasswordResetConfirmInput(req.body);

  if (!validation.isValid) {
    throw new AppError(validation.errors.join(' '), 400);
  }

  const result = await resetPassword(validation.value);

  res.status(200).json({
    status: 'success',
    message: 'Mot de passe réinitialisé avec succès.',
    user: result.user,
  });
});

const addAdolescent = asyncHandler(async (req, res) => {
  const result = await createAdolescentForParent(req.user._id, req.body);

  res.status(201).json({
    status: 'success',
    message: 'Compte adolescent créé avec succès. Un e-mail de confirmation a été envoyé.',
    adolescent: result.adolescent,
    verificationEmailSent: result.verificationEmailSent,
    verificationUrl: result.verificationUrl,
  });
});

module.exports = {
  register,
  verifyEmail,
  login,
  verifyMfa,
  refresh,
  logout,
  me,
  myAdolescents,
  updateMyProfile,
  changeMyPassword,
  forgotPassword,
  resetPasswordWithToken,
  addAdolescent,
};
