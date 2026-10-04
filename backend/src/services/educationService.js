const AppError = require('../utils/AppError');
const EducationalResource = require('../models/EducationalResource');
const LearningProgress = require('../models/LearningProgress');
const ParentToolkitItem = require('../models/ParentToolkitItem');
const NewsletterDigest = require('../models/NewsletterDigest');
const ScoreRecord = require('../models/ScoreRecord');
const User = require('../models/User');
const { deleteUploadedFile, verifyUploadedFileSignature } = require('../middleware/uploadMiddleware');

const LEARNING_PATHS = [
  {
    id: 'path-parent-digital-balance',
    title: 'Parent Coach Digital',
    audienceRoles: ['parent'],
    theme: 'famille',
    steps: [
      { id: 'step-1', title: 'Diagnostiquer les habitudes familiales' },
      { id: 'step-2', title: 'Co-construire un contrat numérique' },
      { id: 'step-3', title: 'Mettre en place un planning d’activités' },
      { id: 'step-4', title: 'Suivre les progrès et ajuster' },
    ],
  },
  {
    id: 'path-teen-digital-skills',
    title: 'Compétences Numériques Ado',
    audienceRoles: ['adolescent'],
    theme: 'autonomie',
    steps: [
      { id: 'step-1', title: 'Auto-évaluer ses habitudes écran' },
      { id: 'step-2', title: 'Appliquer la méthode 20-20-20' },
      { id: 'step-3', title: 'Renforcer ses limites notifications' },
      { id: 'step-4', title: 'Créer sa semaine équilibrée' },
    ],
  },
  {
    id: 'path-cyberharcelement-safe',
    title: 'Sécurité et résilience contre le cyberharcèlement',
    audienceRoles: ['adolescent', 'parent'],
    theme: 'cyberharcelement',
    steps: [
      { id: 'step-1', title: 'Reconnaître les signes du cyberharcèlement' },
      { id: 'step-2', title: 'Construire une réponse sécurisée' },
      { id: 'step-3', title: 'Parler avec un adulte de confiance' },
      { id: 'step-4', title: 'Développer des stratégies de reprise en main' },
    ],
  },
  {
    id: 'path-digital-crisis-resilience',
    title: 'Résilience en situation de crise numérique',
    audienceRoles: ['parent', 'adolescent'],
    theme: 'gestion-crise',
    steps: [
      { id: 'step-1', title: 'Identifier le type de crise digitale' },
      { id: 'step-2', title: 'Établir un plan de soutien immédiat' },
      { id: 'step-3', title: 'Limiter les interactions toxiques' },
      { id: 'step-4', title: 'Renforcer la confiance post-crise' },
    ],
  },
];

const buildBadges = (progressPercent) => {
  const badges = [];
  if (progressPercent >= 25) badges.push('Explorateur');
  if (progressPercent >= 50) badges.push('Pratique régulière');
  if (progressPercent >= 100) badges.push('Maîtrise digitale');
  return badges;
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// `contentUrl` est un virtuel du schéma EducationalResource (fileUrl || externalUrl),
// mais .lean() — utilisé partout ici pour la performance — n'applique PAS les virtuels
// par défaut : le champ `virtuals: true` passé à .lean() ne fonctionne QUE si le plugin
// `mongoose-lean-virtuals` est enregistré sur le schéma, ce qui n'est pas le cas ici, donc
// il est silencieusement ignoré. On calcule donc contentUrl explicitement après coup :
// c'est ce champ manquant qui rendait une vidéo pourtant publiée totalement inaccessible
// côté Parent (le lien n'apparaissait simplement jamais dans la réponse API).
const withContentUrl = (resource) => ({ ...resource, contentUrl: resource.fileUrl || resource.externalUrl || null });

// Bibliothèque exposée au Parent/Adolescent : uniquement les ressources publiées par
// un administrateur. `age` restreint aux ressources dont la tranche [ageMin, ageMax]
// couvre effectivement l'âge de l'enfant sélectionné (ou de l'adolescent lui-même).
const getResourceLibrary = async ({ age, category, search }) => {
  const query = { status: 'published' };

  if (typeof age === 'number' && !Number.isNaN(age)) {
    query.ageMin = { $lte: age };
    query.ageMax = { $gte: age };
  }

  if (category) {
    query.category = { $regex: new RegExp(`^${escapeRegex(category)}$`, 'i') };
  }

  if (search) {
    const safeSearch = escapeRegex(search);
    query.$or = [
      { title: { $regex: safeSearch, $options: 'i' } },
      { description: { $regex: safeSearch, $options: 'i' } },
      { themes: { $regex: safeSearch, $options: 'i' } },
    ];
  }

  const results = await EducationalResource.find(query).sort({ createdAt: -1 }).lean();
  return results.map(withContentUrl);
};

// Catégories distinctes actuellement en usage parmi les ressources PUBLIÉES : alimente
// le filtre "Catégorie" côté Parent sans jamais lui exposer une catégorie qui n'existe
// que sur des brouillons.
const getPublishedCategories = async () => {
  const categories = await EducationalResource.distinct('category', { status: 'published' });
  return categories.sort((a, b) => a.localeCompare(b, 'fr'));
};

// --- Gestion administrateur (CRUD + publication) ---------------------------------

const listAllResourcesForAdmin = async () => {
  const results = await EducationalResource.find({}).sort({ createdAt: -1 }).lean();
  return results.map(withContentUrl);
};

const parseThemesInput = (raw) => {
  if (Array.isArray(raw)) return raw.map((t) => String(t).trim()).filter(Boolean);
  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
};

const buildResourcePayload = (body, file, existing) => {
  const contentType = body.contentType || existing?.contentType;

  const payload = {
    title: body.title ?? existing?.title,
    description: body.description ?? existing?.description,
    category: body.category ?? existing?.category,
    ageMin: body.ageMin !== undefined ? Number(body.ageMin) : existing?.ageMin,
    ageMax: body.ageMax !== undefined ? Number(body.ageMax) : existing?.ageMax,
    contentType,
    themes: body.themes !== undefined ? parseThemesInput(body.themes) : existing?.themes,
    estimatedMinutes:
      body.estimatedMinutes !== undefined ? Number(body.estimatedMinutes) : existing?.estimatedMinutes,
    difficulty: body.difficulty ?? existing?.difficulty,
  };

  if (['image', 'pdf'].includes(contentType)) {
    if (file) {
      payload.fileUrl = `/uploads/education/${file.filename}`;
    } else if (existing?.contentType === contentType) {
      payload.fileUrl = existing.fileUrl;
    }
    payload.externalUrl = undefined;
  } else if (['video', 'link'].includes(contentType)) {
    payload.externalUrl = body.externalUrl ?? (existing?.contentType === contentType ? existing.externalUrl : undefined);
    payload.fileUrl = undefined;
  }

  return payload;
};

const rejectIfFileSignatureMismatch = (file) => {
  if (!file) return;

  if (!verifyUploadedFileSignature(file.path, file.mimetype)) {
    deleteUploadedFile(`/uploads/education/${file.filename}`);
    throw new AppError(
      "Le contenu du fichier ne correspond pas au type annoncé (l'en-tête binaire ne correspond pas). Fichier rejeté.",
      400
    );
  }
};

const createResource = async (adminUser, body, file) => {
  rejectIfFileSignatureMismatch(file);
  const payload = buildResourcePayload(body, file, null);

  if (!payload.title || !payload.description || !payload.category) {
    if (file) deleteUploadedFile(`/uploads/education/${file.filename}`);
    throw new AppError('Titre, description et catégorie sont obligatoires.', 400);
  }

  const resource = new EducationalResource({
    ...payload,
    status: 'draft',
    createdBy: adminUser._id,
  });

  try {
    await resource.save();
  } catch (error) {
    if (file) deleteUploadedFile(`/uploads/education/${file.filename}`);
    if (error.name === 'ValidationError') {
      throw new AppError(Object.values(error.errors)[0]?.message || 'Ressource invalide.', 400);
    }
    // Le hook pre('validate') du modèle lève un Error nu (ex. tranche d'âge invalide,
    // fichier/URL manquant) pour interrompre la sauvegarde : mongoose ne l'enveloppe pas
    // dans un ValidationError, il remonte tel quel. C'est toujours une erreur de saisie
    // à ce stade (400), jamais une panne serveur — sauf si c'est déjà une AppError connue.
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(error.message || 'Ressource invalide.', 400);
  }

  return resource.toJSON();
};

const updateResource = async (id, body, file) => {
  rejectIfFileSignatureMismatch(file);
  const existing = await EducationalResource.findById(id);
  if (!existing) {
    if (file) deleteUploadedFile(`/uploads/education/${file.filename}`);
    throw new AppError('Ressource introuvable.', 404);
  }

  const previousFileUrl = existing.fileUrl;
  const payload = buildResourcePayload(body, file, existing);

  Object.assign(existing, payload);

  try {
    await existing.save();
  } catch (error) {
    if (file) deleteUploadedFile(`/uploads/education/${file.filename}`);
    if (error.name === 'ValidationError') {
      throw new AppError(Object.values(error.errors)[0]?.message || 'Ressource invalide.', 400);
    }
    // Le hook pre('validate') du modèle lève un Error nu (ex. tranche d'âge invalide,
    // fichier/URL manquant) pour interrompre la sauvegarde : mongoose ne l'enveloppe pas
    // dans un ValidationError, il remonte tel quel. C'est toujours une erreur de saisie
    // à ce stade (400), jamais une panne serveur — sauf si c'est déjà une AppError connue.
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(error.message || 'Ressource invalide.', 400);
  }

  // Un nouveau fichier remplace l'ancien : on ne garde pas un fichier orphelin sur le disque.
  if (file && previousFileUrl && previousFileUrl !== existing.fileUrl) {
    deleteUploadedFile(previousFileUrl);
  }

  return existing.toJSON();
};

const deleteResource = async (id) => {
  const resource = await EducationalResource.findById(id);
  if (!resource) {
    throw new AppError('Ressource introuvable.', 404);
  }

  await resource.deleteOne();
  deleteUploadedFile(resource.fileUrl);
};

const setResourceStatus = async (id, status) => {
  const resource = await EducationalResource.findById(id);
  if (!resource) {
    throw new AppError('Ressource introuvable.', 404);
  }

  resource.status = status;
  resource.publishedAt = status === 'published' ? new Date() : resource.publishedAt;
  await resource.save();

  return resource.toJSON();
};

const getLearningPaths = async (user) => {
  const paths = LEARNING_PATHS.filter((path) => path.audienceRoles.includes(user.role));
  const progressRecords = await LearningProgress.find({
    user: user._id,
    pathId: { $in: paths.map((p) => p.id) },
  }).lean();

  const progressMap = new Map(progressRecords.map((item) => [item.pathId, item]));

  return paths.map((path) => {
    const progress = progressMap.get(path.id);
    const completedStepIds = progress?.completedStepIds || [];
    const percent = Math.round((completedStepIds.length / path.steps.length) * 100);
    const nextStep = path.steps.find((step) => !completedStepIds.includes(step.id)) || null;

    return {
      ...path,
      completedStepIds,
      progressPercent: percent,
      badges: buildBadges(percent),
      nextStep,
    };
  });
};

const completeLearningStep = async (user, pathId, stepId) => {
  const path = LEARNING_PATHS.find((item) => item.id === pathId && item.audienceRoles.includes(user.role));
  if (!path) {
    throw new AppError('Parcours e-learning introuvable pour ce profil.', 404);
  }

  const stepExists = path.steps.some((step) => step.id === stepId);
  if (!stepExists) {
    throw new AppError('Étape introuvable dans ce parcours.', 404);
  }

  const progress =
    (await LearningProgress.findOne({ user: user._id, pathId })) ||
    new LearningProgress({ user: user._id, pathId, completedStepIds: [], badges: [] });

  if (!progress.completedStepIds.includes(stepId)) {
    progress.completedStepIds.push(stepId);
  }

  progress.progressPercent = Math.round((progress.completedStepIds.length / path.steps.length) * 100);
  progress.badges = buildBadges(progress.progressPercent);
  progress.lastCompletedAt = new Date();

  await progress.save();

  return {
    pathId,
    stepId,
    completedStepIds: progress.completedStepIds,
    progressPercent: progress.progressPercent,
    badges: progress.badges,
  };
};

const ensureParentRole = (user) => {
  if (user.role !== 'parent') {
    throw new AppError('Boîte à outils réservée aux comptes parent.', 403);
  }
};

const getParentToolbox = async (user) => {
  ensureParentRole(user);
  return ParentToolkitItem.find({ parent: user._id }).sort({ createdAt: -1 }).lean();
};

const createDigitalContract = async (user, payload) => {
  ensureParentRole(user);
  const { title, content } = payload;

  if (!title || !content) {
    throw new AppError('Titre et contenu du contrat sont requis.', 400);
  }

  return ParentToolkitItem.create({
    parent: user._id,
    itemType: 'contract',
    title,
    content,
  });
};

const createActivitySchedule = async (user, payload) => {
  ensureParentRole(user);
  const { title, content, activities = [], startDate, endDate } = payload;

  if (!title || !content) {
    throw new AppError('Titre et description du planning sont requis.', 400);
  }

  return ParentToolkitItem.create({
    parent: user._id,
    itemType: 'schedule',
    title,
    content,
    activities,
    startDate: startDate || null,
    endDate: endDate || null,
  });
};

const profileInsight = (user) => {
  if (user.role === 'parent') {
    return 'Votre rôle parent active des recommandations orientées communication familiale.';
  }
  if (user.role === 'adolescent') {
    return 'Votre profil adolescent active des contenus orientés autonomie et équilibre numérique.';
  }
  return 'Votre profil active des contenus éducatifs transverses.';
};

const scoreTrendLabel = (latest, previous) => {
  if (!latest) return 'Aucune donnée de score disponible pour le moment.';
  if (!previous) return `Nouveau score global enregistré: ${latest.globalScore.toFixed(1)} / 100.`;

  const delta = latest.globalScore - previous.globalScore;
  if (delta > 2) return `Progression positive: +${delta.toFixed(1)} points depuis la dernière évaluation.`;
  if (delta < -2) return `Vigilance: ${delta.toFixed(1)} points, un accompagnement ciblé est recommandé.`;
  return 'Stabilité du score global observée depuis la dernière évaluation.';
};

const themeRecommendationsFromScore = (scoreRecord) => {
  if (!scoreRecord) return ['communication', 'activites', 'sommeil'];

  const sub = scoreRecord.subScores || {};
  const entries = [
    ['comportemental', sub.comportemental ?? 100, 'regles'],
    ['emotionnel', sub.emotionnel ?? 100, 'bien-etre'],
    ['social', sub.social ?? 100, 'reseaux-sociaux'],
    ['parental', sub.parental ?? 100, 'famille'],
  ];

  return entries
    .sort((a, b) => a[1] - b[1])
    .slice(0, 2)
    .map((item) => item[2]);
};

const generateNewsletterPreview = async (user) => {
  let latestScore = null;
  let previousScore = null;

  if (user.role === 'parent') {
    const children = await User.find({ role: 'adolescent', 'adolescentProfile.parentId': user._id }, '_id').lean();
    const childIds = children.map((child) => child._id);

    if (childIds.length) {
      const scores = await ScoreRecord.find({ user: { $in: childIds } })
        .sort({ calculatedAt: -1 })
        .limit(2)
        .lean();
      latestScore = scores[0] || null;
      previousScore = scores[1] || null;
    }
  } else {
    const scores = await ScoreRecord.find({ user: user._id }).sort({ calculatedAt: -1 }).limit(2).lean();
    latestScore = scores[0] || null;
    previousScore = scores[1] || null;
  }

  const recommendationsThemes = themeRecommendationsFromScore(latestScore);
  const suggestedResources = await EducationalResource.find({
    status: 'published',
    themes: { $in: recommendationsThemes },
  })
    .sort({ createdAt: -1 })
    .limit(3)
    .lean();

  const digestPayload = {
    user: user._id,
    subject: 'Votre newsletter FamilyBalance personnalisée',
    profileInsights: [profileInsight(user)],
    scoreInsights: [scoreTrendLabel(latestScore, previousScore)],
    recommendations: suggestedResources.map(
      (item) => `${item.title} (${item.themes.join(', ')})`
    ),
  };

  const digest = await NewsletterDigest.create(digestPayload);

  return {
    newsletterId: digest._id,
    subject: digest.subject,
    profileInsights: digest.profileInsights,
    scoreInsights: digest.scoreInsights,
    recommendations: digest.recommendations,
    suggestedThemes: recommendationsThemes,
  };
};

module.exports = {
  getResourceLibrary,
  getPublishedCategories,
  listAllResourcesForAdmin,
  createResource,
  updateResource,
  deleteResource,
  setResourceStatus,
  getLearningPaths,
  completeLearningStep,
  getParentToolbox,
  createDigitalContract,
  createActivitySchedule,
  generateNewsletterPreview,
};
