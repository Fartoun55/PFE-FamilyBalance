const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const {
  calculateFromSession,
  latest,
  history,
  latestCompletedSession,
  exportLatestReportPdf,
} = require('../controllers/scoringController');

const router = express.Router();

router.use(protect, authorizeRoles('parent', 'adolescent'));

router.get('/latest', latest);
router.get('/history', history);
router.get('/report/latest-pdf', exportLatestReportPdf);
router.get('/sessions/latest-completed', latestCompletedSession);
router.post('/sessions/:sessionId/calculate', calculateFromSession);

module.exports = router;