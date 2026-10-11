const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { list, unreadCount, read, readAll, remove } = require('../controllers/notificationController');

const router = express.Router();

// Toutes les routes sont limitées aux notifications de l'utilisateur authentifié
// (le filtre { user: req.user._id } est appliqué dans le service).
router.use(protect);

router.get('/', list);
router.get('/unread-count', unreadCount);
router.patch('/read-all', readAll);
router.patch('/:notificationId/read', read);
router.delete('/:notificationId', remove);

module.exports = router;
