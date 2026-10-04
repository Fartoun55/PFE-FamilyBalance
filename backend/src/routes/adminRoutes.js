const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const {
  listAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
  updateAccountStatus,
  getModerationQueue,
  exportAnonymizedUsers,
  exportAccountsToExcel,
  exportAccountsToWord,
  exportAccountsToPDF,
} = require('../controllers/adminController');

const router = express.Router();

router.use(protect, authorizeRoles('admin'));

router.get('/accounts', listAccounts);
router.post('/accounts', createAccount);
router.get('/accounts/:id', getAccountById);
router.patch('/accounts/:id', updateAccount);
router.delete('/accounts/:id', deleteAccount);
router.patch('/accounts/:id/status', updateAccountStatus);
router.get('/content/moderation-queue', getModerationQueue);
router.get('/exports/anonymized-users', exportAnonymizedUsers);
router.get('/exports/accounts-excel', exportAccountsToExcel);
router.get('/exports/accounts-word', exportAccountsToWord);
router.get('/exports/accounts-pdf', exportAccountsToPDF);

module.exports = router;
