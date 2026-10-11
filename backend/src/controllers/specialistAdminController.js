const asyncHandler = require('../utils/asyncHandler');
const {
  listSpecialists,
  getSpecialist,
  createSpecialist,
  updateSpecialist,
  deleteSpecialist,
} = require('../services/specialistAdminService');

const list = asyncHandler(async (req, res) => {
  const result = await listSpecialists({
    search: req.query.search,
    status: req.query.status,
    city: req.query.city,
    specialization: req.query.specialization,
  });
  res.status(200).json({ status: 'success', count: result.specialists.length, ...result });
});

const detail = asyncHandler(async (req, res) => {
  res.status(200).json({ status: 'success', specialist: await getSpecialist(req.params.id) });
});

const create = asyncHandler(async (req, res) => {
  const specialist = await createSpecialist(req.body);
  res.status(201).json({ status: 'success', message: 'Spécialiste créé avec succès.', specialist });
});

const update = asyncHandler(async (req, res) => {
  const specialist = await updateSpecialist(req.params.id, req.body, req.user);
  res.status(200).json({ status: 'success', message: 'Spécialiste mis à jour avec succès.', specialist });
});

const remove = asyncHandler(async (req, res) => {
  await deleteSpecialist(req.params.id);
  res.status(200).json({ status: 'success', message: 'Spécialiste supprimé avec succès.' });
});

module.exports = { list, detail, create, update, remove };
