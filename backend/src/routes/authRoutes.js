const express = require('express');
const {
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
} = require('../controllers/authController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.post('/login', login);
router.post('/verify-mfa', verifyMfa);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', protect, me);
router.get('/me/adolescents', protect, authorizeRoles('parent'), myAdolescents);
router.post('/me/adolescents', protect, authorizeRoles('parent'), addAdolescent);
router.patch('/me', protect, updateMyProfile);
router.patch('/me/password', protect, changeMyPassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPasswordWithToken);
router.get('/admin-only-check', protect, authorizeRoles('admin'), (req, res) => {
  res.status(200).json({ status: 'success', message: 'Accès admin confirmé.' });
});

module.exports = router;
