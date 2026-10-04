const asyncHandler = require('../utils/asyncHandler');
const {
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
} = require('../services/educationService');

const resources = asyncHandler(async (req, res) => {
  const age = req.query.age ? Number(req.query.age) : undefined;
  const category = req.query.category ? String(req.query.category) : undefined;
  const search = req.query.search ? String(req.query.search) : undefined;

  const library = await getResourceLibrary({ age, category, search });

  res.status(200).json({
    status: 'success',
    count: library.length,
    resources: library,
  });
});

const categories = asyncHandler(async (_req, res) => {
  const list = await getPublishedCategories();

  res.status(200).json({
    status: 'success',
    categories: list,
  });
});

// --- Administration des ressources ------------------------------------------------

const adminListResources = asyncHandler(async (_req, res) => {
  const list = await listAllResourcesForAdmin();

  res.status(200).json({
    status: 'success',
    count: list.length,
    resources: list,
  });
});

const adminCreateResource = asyncHandler(async (req, res) => {
  const resource = await createResource(req.user, req.body, req.file);

  res.status(201).json({
    status: 'success',
    message: 'Ressource créée en brouillon.',
    resource,
  });
});

const adminUpdateResource = asyncHandler(async (req, res) => {
  const resource = await updateResource(req.params.id, req.body, req.file);

  res.status(200).json({
    status: 'success',
    message: 'Ressource mise à jour.',
    resource,
  });
});

const adminDeleteResource = asyncHandler(async (req, res) => {
  await deleteResource(req.params.id);

  res.status(200).json({
    status: 'success',
    message: 'Ressource supprimée.',
  });
});

const adminPublishResource = asyncHandler(async (req, res) => {
  const resource = await setResourceStatus(req.params.id, 'published');

  res.status(200).json({
    status: 'success',
    message: 'Ressource publiée.',
    resource,
  });
});

const adminUnpublishResource = asyncHandler(async (req, res) => {
  const resource = await setResourceStatus(req.params.id, 'draft');

  res.status(200).json({
    status: 'success',
    message: 'Ressource repassée en brouillon.',
    resource,
  });
});

const learningPaths = asyncHandler(async (req, res) => {
  const paths = await getLearningPaths(req.user);

  res.status(200).json({
    status: 'success',
    count: paths.length,
    paths,
  });
});

const completeStep = asyncHandler(async (req, res) => {
  const progress = await completeLearningStep(req.user, req.params.pathId, req.params.stepId);

  res.status(200).json({
    status: 'success',
    message: 'Progression mise à jour.',
    progress,
  });
});

const toolbox = asyncHandler(async (req, res) => {
  const items = await getParentToolbox(req.user);

  res.status(200).json({
    status: 'success',
    count: items.length,
    items,
  });
});

const createContract = asyncHandler(async (req, res) => {
  const item = await createDigitalContract(req.user, req.body);

  res.status(201).json({
    status: 'success',
    message: 'Contrat numérique créé.',
    item,
  });
});

const createSchedule = asyncHandler(async (req, res) => {
  const item = await createActivitySchedule(req.user, req.body);

  res.status(201).json({
    status: 'success',
    message: 'Planning d\'activités créé.',
    item,
  });
});

const newsletterPreview = asyncHandler(async (req, res) => {
  const newsletter = await generateNewsletterPreview(req.user);

  res.status(200).json({
    status: 'success',
    newsletter,
  });
});

module.exports = {
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
};
