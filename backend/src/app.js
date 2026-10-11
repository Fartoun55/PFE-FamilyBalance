const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const surveyRoutes = require('./routes/surveyRoutes');
const scoringRoutes = require('./routes/scoringRoutes');
const familyDashboardRoutes = require('./routes/familyDashboardRoutes');
const adolescentDashboardRoutes = require('./routes/adolescentDashboardRoutes');
const educationRoutes = require('./routes/educationRoutes');
const teleconsultationRoutes = require('./routes/teleconsultationRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const { corsOrigin } = require('./config/cors');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'familybalance-backend' });
});

// Fichiers uploadés par l'administrateur pour les ressources éducatives (images, PDF).
// Le frontend Angular (localhost:4200) est une origine différente du backend : helmet
// impose par défaut Cross-Origin-Resource-Policy: same-origin, ce qui bloquerait le
// chargement de ces fichiers depuis <img>/<a> côté client. On relâche cette policy
// uniquement sur cette route statique de lecture seule, sans affaiblir le reste de l'API.
app.use(
  '/uploads',
  (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  express.static(path.join(__dirname, '..', 'uploads'))
);

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/surveys', surveyRoutes);
app.use('/api/scoring', scoringRoutes);
app.use('/api/family-dashboard', familyDashboardRoutes);
app.use('/api/adolescent-dashboard', adolescentDashboardRoutes);
app.use('/api/education', educationRoutes);
app.use('/api/teleconsultation', teleconsultationRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
