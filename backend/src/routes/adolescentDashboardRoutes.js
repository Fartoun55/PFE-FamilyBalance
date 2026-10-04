const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { adolescentDashboard, getAdolescentResources } = require('../controllers/adolescentDashboardController');

const router = express.Router();

router.use(protect, authorizeRoles('adolescent'));

router.get('/overview', adolescentDashboard);
router.get('/resources', getAdolescentResources);

module.exports = router;
