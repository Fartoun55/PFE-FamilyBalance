const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const {
  catalog,
  start,
  saveAnswer,
  complete,
} = require('../controllers/surveyController');

const router = express.Router();

router.use(protect, authorizeRoles('parent', 'adolescent'));

router.get('/catalog', catalog);
router.post('/sessions/start', start);
router.patch('/sessions/:sessionId/answers', saveAnswer);
router.post('/sessions/:sessionId/complete', complete);

module.exports = router;