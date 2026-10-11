const AppError = require('../utils/AppError');

const notFound = (req, _res, next) => {
  next(new AppError(`Route introuvable: ${req.originalUrl}`, 404));
};

const errorHandler = (err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const status = err.status || (statusCode >= 400 && statusCode < 500 ? 'fail' : 'error');

  res.status(statusCode).json({
    status,
    message: err.message || 'Erreur serveur.',
    ...(err.details && { errors: err.details }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = {
  notFound,
  errorHandler,
};
