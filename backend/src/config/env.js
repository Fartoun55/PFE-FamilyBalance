// Valeurs par défaut réservées au développement : validateEnv() exige les vrais secrets en production.
const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  adminRegistrationKey: process.env.ADMIN_REGISTRATION_KEY || 'familybalance-admin-dev-key',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || 'FamilyBalance <no-reply@familybalance.local>',
};

const validateEnv = () => {
  const requiredInProduction = [
    'MONGODB_URI',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'ADMIN_REGISTRATION_KEY',
    'TELECONSULTATION_SECRET',
  ];
  const missing = requiredInProduction.filter((key) => !process.env[key]);

  if (env.nodeEnv === 'production' && missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return env;
};

/**
 * Cookie de session « Secure » (envoyé uniquement en HTTPS) ?
 * Par défaut : oui en production. COOKIE_SECURE=false le désactive pour un site servi
 * en HTTP simple — sinon le navigateur refuse le cookie et la session expire au bout
 * de la durée du jeton d'accès.
 */
const useSecureCookies = () => {
  if (process.env.COOKIE_SECURE) {
    return process.env.COOKIE_SECURE === 'true';
  }

  return process.env.NODE_ENV === 'production';
};

/**
 * Adresse publique du site, pour les liens envoyés par e-mail (activation, réinitialisation).
 * APP_URL en priorité ; sinon la première origine de CLIENT_ORIGIN (qui peut en lister
 * plusieurs, séparées par des virgules) ; sinon le serveur de développement Angular.
 */
const getAppUrl = () => {
  const explicit = String(process.env.APP_URL || '').trim();
  const firstOrigin = String(process.env.CLIENT_ORIGIN || '').split(',')[0].trim();

  return (explicit || firstOrigin || 'http://localhost:4200').replace(/\/+$/, '');
};

const buildAppUrl = (pathWithQuery) => `${getAppUrl()}${pathWithQuery}`;

/**
 * Un lien contenant un jeton secret (activation, réinitialisation) ne doit jamais être
 * renvoyé au navigateur : il permettrait d'activer ou de reprendre un compte sans accès
 * à sa boîte mail. Exception de développement uniquement : l'e-mail n'a pas pu partir.
 */
const exposeSecretLinkInDev = (url, emailSent) =>
  process.env.NODE_ENV !== 'production' && !emailSent ? url : undefined;

module.exports = {
  env,
  validateEnv,
  useSecureCookies,
  getAppUrl,
  buildAppUrl,
  exposeSecretLinkInDev,
};
