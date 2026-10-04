const User = require('../models/User');
const AppError = require('../utils/AppError');
const { verifyAccessToken } = require('../utils/tokenService');

const extractBearerToken = (req) => {
  const authorizationHeader = req.headers.authorization || '';

  if (authorizationHeader.startsWith('Bearer ')) {
    return authorizationHeader.slice(7);
  }

  return req.cookies?.accessToken || null;
};

const protect = async (req, _res, next) => {
  try {
    const token = extractBearerToken(req);

    if (!token) {
      return next(new AppError('Authentification requise.', 401));
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.sub);

    if (!user || !user.isActive) {
      return next(new AppError('Compte introuvable ou désactivé.', 401));
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(new AppError('Token invalide ou expiré.', 401));
  }
};

const authorizeRoles = (...allowedRoles) => (req, _res, next) => {
  if (!req.user) {
    return next(new AppError('Authentification requise.', 401));
  }

  if (!allowedRoles.includes(req.user.role)) {
    return next(new AppError('Accès refusé pour ce rôle.', 403));
  }

  return next();
};

module.exports = {
  protect,
  authorizeRoles,
};
