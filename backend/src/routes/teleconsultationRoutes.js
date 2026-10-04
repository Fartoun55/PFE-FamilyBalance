const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const {
  directory,
  slots,
  bookAppointment,
  myAppointments,
  myDashboard,
  specialistDashboard,
  appointmentRoom,
  shareBilan,
  sharedBilan,
  messages,
  sendMessage,
  cancelAppointment,
  rescheduleAppointment,
} = require('../controllers/teleconsultationController');

const router = express.Router();

router.use(protect);

router.get('/specialists', directory);
router.get('/specialists/:specialistId/slots', slots);
router.post('/appointments', authorizeRoles('parent', 'adolescent'), bookAppointment);
router.get('/appointments/me', authorizeRoles('parent', 'adolescent'), myAppointments);
router.post('/appointments/:appointmentId/share-bilan', authorizeRoles('parent', 'adolescent'), shareBilan);
router.get('/appointments/:appointmentId/bilan', sharedBilan);
router.get('/appointments/:appointmentId/room', appointmentRoom);
router.patch('/appointments/:appointmentId/cancel', cancelAppointment);
router.patch('/appointments/:appointmentId/reschedule', rescheduleAppointment);
router.get('/appointments/:appointmentId/messages', messages);
router.post('/appointments/:appointmentId/messages', sendMessage);
router.get('/dashboard', authorizeRoles('specialist'), specialistDashboard);
router.get('/dashboard/me', authorizeRoles('parent', 'adolescent'), myDashboard);

module.exports = router;
