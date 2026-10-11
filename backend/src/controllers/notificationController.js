const asyncHandler = require('../utils/asyncHandler');
const {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require('../services/notificationService');

const list = asyncHandler(async (req, res) => {
  const result = await listNotifications(req.user, {
    limit: req.query.limit,
    before: req.query.before,
    unreadOnly: req.query.unread === 'true',
  });
  res.status(200).json({ status: 'success', ...result });
});

const unreadCount = asyncHandler(async (req, res) => {
  res.status(200).json({ status: 'success', unreadCount: await getUnreadCount(req.user) });
});

const read = asyncHandler(async (req, res) => {
  const notification = await markAsRead(req.user, req.params.notificationId);
  res.status(200).json({ status: 'success', notification });
});

const readAll = asyncHandler(async (req, res) => {
  const updated = await markAllAsRead(req.user);
  res.status(200).json({ status: 'success', updated, unreadCount: 0 });
});

const remove = asyncHandler(async (req, res) => {
  await deleteNotification(req.user, req.params.notificationId);
  res.status(200).json({ status: 'success', message: 'Notification supprimée.' });
});

module.exports = { list, unreadCount, read, readAll, remove };
