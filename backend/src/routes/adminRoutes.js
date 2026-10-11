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
const specialists = require('../controllers/specialistAdminController');

const router = express.Router();

// Toutes les routes d'administration (dont la gestion des spécialistes) : administrateur uniquement.
router.use(protect, authorizeRoles('admin'));

router.get('/specialists', specialists.list);
router.post('/specialists', specialists.create);
router.get('/specialists/:id', specialists.detail);
router.patch('/specialists/:id', specialists.update);
router.delete('/specialists/:id', specialists.remove);

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
