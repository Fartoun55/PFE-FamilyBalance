const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const {
  getDirectory,
  getSlotsForSpecialist,
  createAppointment,
  getPatientAppointments,
  getPatientDashboard,
  getSpecialistDashboard,
  getAppointmentMessages,
  sendAppointmentMessage,
  getRoomDetails,
  shareBilanWithSpecialist,
  getSharedBilanForAppointment,
  cancelAppointment,
  rescheduleAppointment,
} = require('../services/teleconsultationService');

const directory = asyncHandler(async (req, res) => {
  const filters = {
    speciality: req.query.speciality || undefined,
    language: req.query.language || undefined,
    city: req.query.city || undefined,
    maxTariff: req.query.maxTariff ? Number(req.query.maxTariff) : undefined,
    date: req.query.date || undefined,
  };

  const specialists = await getDirectory(filters);

  res.status(200).json({
    status: 'success',
    count: specialists.length,
    specialists,
  });
});

const slots = asyncHandler(async (req, res) => {
  const availableSlots = await getSlotsForSpecialist(req.params.specialistId, req.query.date || null);

  res.status(200).json({
    status: 'success',
    count: availableSlots.length,
    slots: availableSlots,
  });
});

const bookAppointment = asyncHandler(async (req, res) => {
  const appointment = await createAppointment(req.user, req.body);

  res.status(201).json({
    status: 'success',
    message: 'Rendez-vous confirmé.',
    appointment,
  });
});

const myAppointments = asyncHandler(async (req, res) => {
  const appointments = await getPatientAppointments(req.user._id);

  res.status(200).json({
    status: 'success',
    count: appointments.length,
    appointments,
  });
});

const myDashboard = asyncHandler(async (req, res) => {
  const dashboard = await getPatientDashboard(req.user._id);

  res.status(200).json({
    status: 'success',
    ...dashboard,
  });
});

const specialistDashboard = asyncHandler(async (req, res) => {
  const dashboard = await getSpecialistDashboard(req.user._id);

  res.status(200).json({
    status: 'success',
    ...dashboard,
  });
});

const cancelAppointmentHandler = asyncHandler(async (req, res) => {
  const appointment = await cancelAppointment(req.params.appointmentId, req.user);

  res.status(200).json({
    status: 'success',
    message: 'Rendez-vous annulé.',
    appointment,
  });
});

const rescheduleAppointmentHandler = asyncHandler(async (req, res) => {
  const appointment = await rescheduleAppointment(req.params.appointmentId, req.user, req.body);

  res.status(200).json({
    status: 'success',
    message: 'Rendez-vous déplacé.',
    appointment,
  });
});

const appointmentRoom = asyncHandler(async (req, res) => {
  const room = await getRoomDetails(req.params.appointmentId, req.user);

  res.status(200).json({
    status: 'success',
    ...room,
  });
});

const shareBilan = asyncHandler(async (req, res) => {
  const appointment = await shareBilanWithSpecialist(req.user, req.params.appointmentId);

  res.status(200).json({
    status: 'success',
    message: 'Bilan FamilyBalance partagé avec le spécialiste.',
    appointment,
  });
});

const sharedBilan = asyncHandler(async (req, res) => {
  const snapshot = await getSharedBilanForAppointment(req.params.appointmentId, req.user);

  res.status(200).json({
    status: 'success',
    sharedBilan: snapshot,
  });
});

const messages = asyncHandler(async (req, res) => {
  const conversation = await getAppointmentMessages(req.params.appointmentId, req.user);

  res.status(200).json({
    status: 'success',
    count: conversation.length,
    messages: conversation,
  });
});

const sendMessage = asyncHandler(async (req, res) => {
  if (!req.body.content) {
    throw new AppError('Le contenu du message est obligatoire.', 400);
  }

  const message = await sendAppointmentMessage(req.params.appointmentId, req.user, req.body);

  res.status(201).json({
    status: 'success',
    message: 'Message sécurisé envoyé.',
    conversationMessage: message,
  });
});

module.exports = {
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
  cancelAppointment: cancelAppointmentHandler,
  rescheduleAppointment: rescheduleAppointmentHandler,
};
