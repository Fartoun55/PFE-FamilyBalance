const crypto = require('crypto');

const generatePlainResetToken = () => crypto.randomBytes(32).toString('hex');
const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

module.exports = {
  generatePlainResetToken,
  hashResetToken,
};
