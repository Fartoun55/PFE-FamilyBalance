const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const {
  overview,
  childDetails,
  exportChildPdf,
} = require('../controllers/familyDashboardController');

const router = express.Router();

router.use(protect, authorizeRoles('parent'));

router.get('/overview', overview);
router.get('/children/:childId', childDetails);
router.get('/children/:childId/report-pdf', exportChildPdf);

module.exports = router;
