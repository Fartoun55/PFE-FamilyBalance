const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

const accessTokenOptions = {
  expiresIn: env.jwtAccessExpiresIn,
};

const refreshTokenOptions = {
  expiresIn: env.jwtRefreshExpiresIn,
};

const signAccessToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
    },
    env.jwtAccessSecret,
    accessTokenOptions
  );

const signRefreshToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      tokenType: 'refresh',
    },
    env.jwtRefreshSecret,
    {
      ...refreshTokenOptions,
      jwtid: crypto.randomUUID(),
    }
  );

const verifyAccessToken = (token) => jwt.verify(token, env.jwtAccessSecret);
const verifyRefreshToken = (token) => jwt.verify(token, env.jwtRefreshSecret);

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const createAuthTokens = (user) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  return {
    accessToken,
    refreshToken,
    refreshTokenHash: hashToken(refreshToken),
  };
};

module.exports = {
  createAuthTokens,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
