class AppError extends Error {
  /**
   * @param {string} message
   * @param {number} statusCode
   * @param {Record<string, string>} [details] erreurs par champ (formulaires), renvoyées dans `errors`
   */
  constructor(message, statusCode = 500, details) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    if (details && Object.keys(details).length) {
      this.details = details;
    }

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
