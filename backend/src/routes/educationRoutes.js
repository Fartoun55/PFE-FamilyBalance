const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { uploadResourceFile } = require('../middleware/uploadMiddleware');
const {
  resources,
  categories,
  adminListResources,
  adminCreateResource,
  adminUpdateResource,
  adminDeleteResource,
  adminPublishResource,
  adminUnpublishResource,
  learningPaths,
  completeStep,
  toolbox,
  createContract,
  createSchedule,
  newsletterPreview,
} = require('../controllers/educationController');

const router = express.Router();

router.use(protect);

router.get('/resources', resources);
router.get('/resources/categories', categories);
router.get('/learning/paths', learningPaths);
router.post('/learning/paths/:pathId/steps/:stepId/complete', completeStep);
router.get('/toolbox', toolbox);
router.post('/toolbox/contracts', createContract);
router.post('/toolbox/schedules', createSchedule);
router.get('/newsletter/preview', newsletterPreview);

// Gestion des ressources éducatives : réservée à l'administrateur (ajout, modification,
// suppression, publication). `uploadResourceFile` n'intervient que sur les requêtes
// multipart/form-data (création/modification) et laisse passer un champ fichier absent.
router.get('/admin/resources', authorizeRoles('admin'), adminListResources);
router.post('/admin/resources', authorizeRoles('admin'), uploadResourceFile, adminCreateResource);
router.patch('/admin/resources/:id', authorizeRoles('admin'), uploadResourceFile, adminUpdateResource);
router.delete('/admin/resources/:id', authorizeRoles('admin'), adminDeleteResource);
router.patch('/admin/resources/:id/publish', authorizeRoles('admin'), adminPublishResource);
router.patch('/admin/resources/:id/unpublish', authorizeRoles('admin'), adminUnpublishResource);

module.exports = router;
