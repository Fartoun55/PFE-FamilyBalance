const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  // Pas de valeur par défaut : la connexion échoue clairement si MONGODB_URI manque (voir db.js).
  mongoUri: process.env.MONGODB_URI,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
  adminRegistrationKey: process.env.ADMIN_REGISTRATION_KEY || 'familybalance-admin-dev-key',
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:4200',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || 'FamilyBalance <no-reply@familybalance.local>',
};

const validateEnv = () => {
  const requiredInProduction = ['MONGODB_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  const missing = requiredInProduction.filter((key) => !process.env[key]);

  if (env.nodeEnv === 'production' && missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return env;
};

module.exports = {
  env,
  validateEnv,
};
