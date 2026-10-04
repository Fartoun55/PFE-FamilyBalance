const AppError = require('../utils/AppError');
const User = require('../models/User');
const ScoreRecord = require('../models/ScoreRecord');
const RiskAlert = require('../models/RiskAlert');

const addMonths = (date, months) => {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
};

const generateAvatarUrl = (firstName = '', lastName = '') => {
  const name = encodeURIComponent(`${firstName || ''} ${lastName || ''}`.trim());
  // Use ui-avatars as a lightweight avatar generation service
  return `https://ui-avatars.com/api/?name=${name}&background=eef4ff&color=1246c4&size=128`;
};

const toHistoryPoint = (record) => ({
  calculatedAt: record.calculatedAt,
  globalScore: record.globalScore,
  subScores: record.subScores,
  riskLevel: record.riskLevel,
});

const ensureParent = async (parentUserId) => {
  const parent = await User.findById(parentUserId).select('role firstName lastName email');

  if (!parent) {
    throw new AppError('Utilisateur introuvable.', 404);
  }

  if (parent.role !== 'parent') {
    throw new AppError('Acces reserve aux comptes parent.', 403);
  }

  return parent;
};

const getLinkedChildren = async (parentUserId) => {
  return User.find(
    {
      role: 'adolescent',
      'adolescentProfile.parentId': parentUserId,
    },
    'firstName lastName email phone avatarUrl adolescentProfile.birthDate adolescentProfile.ageSegment adolescentProfile.consentGiven'
  )
    .sort({ firstName: 1, lastName: 1 })
    .lean();
};

const buildChildDashboard = async (child, now = new Date()) => {
  const records = await ScoreRecord.find({ user: child._id })
    .sort({ calculatedAt: 1 })
    .lean();

  const latestRecord = records.length ? records[records.length - 1] : null;
  const openAlerts = await RiskAlert.find({ user: child._id, status: 'open' })
    .sort({ createdAt: -1 })
    .lean();

  const nextReevaluationDate = latestRecord
    ? addMonths(new Date(latestRecord.calculatedAt), 3)
    : now;

  return {
    child: {
      _id: child._id,
      firstName: child.firstName,
      lastName: child.lastName,
      email: child.email,
      avatarUrl: child.avatarUrl || generateAvatarUrl(child.firstName, child.lastName),
      phone: child.phone,
      birthDate: child?.adolescentProfile?.birthDate || null,
      consentGiven: Boolean(child?.adolescentProfile?.consentGiven),
    },
    latestRecord,
    history: records.map(toHistoryPoint),
    reminders: {
      frequencyMonths: 3,
      nextReevaluationDate,
      due: now >= nextReevaluationDate,
      daysRemaining: Math.max(0, Math.ceil((nextReevaluationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))),
    },
    openAlerts,
  };
};

const getFamilyDashboardOverview = async (parentUserId) => {
  const parent = await ensureParent(parentUserId);
  const children = await getLinkedChildren(parentUserId);

  const dashboards = [];
  for (const child of children) {
    // Sequential access keeps query load predictable for small family-sized sets.
    const data = await buildChildDashboard(child);
    dashboards.push(data);
  }

  return {
    parent: {
      _id: parent._id,
      firstName: parent.firstName,
      lastName: parent.lastName,
      email: parent.email,
    },
    totalChildren: dashboards.length,
    dueReminders: dashboards.filter((item) => item.reminders.due).length,
    children: dashboards,
  };
};

const getChildDashboardForParent = async (parentUserId, childId) => {
  await ensureParent(parentUserId);

  const child = await User.findOne(
    {
      _id: childId,
      role: 'adolescent',
      'adolescentProfile.parentId': parentUserId,
    },
    'firstName lastName email phone avatarUrl adolescentProfile.birthDate adolescentProfile.consentGiven'
  ).lean();

  if (!child) {
    throw new AppError('Enfant introuvable ou non rattaché à ce compte parent.', 404);
  }

  return buildChildDashboard(child);
};

module.exports = {
  getFamilyDashboardOverview,
  getChildDashboardForParent,
};
