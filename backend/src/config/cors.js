// Règles d'origine partagées par l'API REST (middleware cors) et le serveur temps réel
// (Socket.IO), pour qu'elles ne divergent jamais.

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:4200,http://127.0.0.1:4200')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const isLocalDevelopmentOrigin = (origin) => {
  if (process.env.NODE_ENV === 'production' || !origin) {
    return false;
  }

  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
};

const corsOrigin = (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin) || isLocalDevelopmentOrigin(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error(`Origin not allowed by CORS: ${origin}`));
};

module.exports = { allowedOrigins, isLocalDevelopmentOrigin, corsOrigin };
