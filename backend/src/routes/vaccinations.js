const router = require('express').Router();
const { Vaccination, Animal, Schedule } = require('../models');
const { auth, requireVet } = require('../middleware');

router.use(auth);

const status = (v) => {
  if (!v.nextDue) return 'completed';
  const d = (new Date(v.nextDue) - Date.now()) / 86400000;
  if (d < 0) return 'overdue';
  if (d <= 14) return 'due_soon';
  return 'upcoming';
};
const withStatus = (v) => ({ ...v.toObject(), status: status(v) });

router.get('/', async (req, res) => {
  const list = await Vaccination.find({ owner: req.user.id, superseded: false })
    .populate('animal', 'name species tag').sort({ nextDue: 1, date: -1 });
  res.json(list.map(withStatus));
});

router.get('/due', async (req, res) => {
  const list = await Vaccination.find({
    owner: req.user.id, superseded: false,
    nextDue: { $lte: new Date(Date.now() + 30 * 86400000) },
  }).populate('animal', 'name species tag').sort({ nextDue: 1 });
  res.json(list.map(withStatus));
});

// Configurable schedules (species-specific)
router.get('/schedules', async (req, res) => {
  const q = req.query.species ? { species: req.query.species } : {};
  res.json(await Schedule.find(q).sort({ species: 1, vaccine: 1 }));
});
router.post('/schedules', requireVet, async (req, res) => {
  const { species, vaccine, intervalDays, minAgeMonths, region, notes } = req.body;
  const s = await Schedule.findOneAndUpdate({ species, vaccine, region }, { intervalDays, minAgeMonths, notes }, { upsert: true, new: true, setDefaultsOnInsert: true });
  res.status(201).json(s);
});

router.post('/', async (req, res) => {
  const { animalId, vaccine, date, dose, vetName, vetPhone } = req.body;
  let { nextDue } = req.body;
  const animal = await Animal.findOne({ _id: animalId, owner: req.user.id });
  if (!animal) return res.status(404).json({ error: 'Animal not found' });
  if (!vaccine || !date || Number.isNaN(new Date(date).getTime())) return res.status(400).json({ error: 'vaccine and valid date required' });

  if (!nextDue) {
    const esc = vaccine.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const s = await Schedule.findOne({ species: animal.species, vaccine: new RegExp(`^${esc}$`, 'i') });
    if (s?.intervalDays > 0) nextDue = new Date(new Date(date).getTime() + s.intervalDays * 86400000);
  }
  await Vaccination.updateMany(
    { animal: animal._id, vaccine: new RegExp(`^${vaccine.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), superseded: false },
    { superseded: true });
  const v = await Vaccination.create({
    animal: animal._id, owner: req.user.id, vaccine: vaccine.trim(), date, dose, vetName, vetPhone,
    nextDue: nextDue || undefined,
  });
  res.status(201).json(withStatus(v));
});

router.delete('/:id', async (req, res) => {
  await Vaccination.deleteOne({ _id: req.params.id, owner: req.user.id });
  res.json({ ok: true });
});
module.exports = router;
