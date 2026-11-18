const router = require('express').Router();
const { Pregnancy, Animal } = require('../models');
const { auth } = require('../middleware');
const { expectedDate, daysLeft, GESTATION_DAYS } = require('../gestation');

router.use(auth);
const out = (p) => ({ ...p.toObject(), daysLeft: p.status === 'active' ? daysLeft(p.expectedDate) : null });

router.get('/gestation', (_req, res) => res.json(GESTATION_DAYS));

router.get('/', async (req, res) => {
  const list = await Pregnancy.find({ owner: req.user.id }).populate('animal', 'name species tag').sort({ expectedDate: 1 });
  res.json(list.map(out));
});

router.post('/', async (req, res) => {
  const { animalId, matingDate } = req.body;
  const animal = await Animal.findOne({ _id: animalId, owner: req.user.id });
  if (!animal) return res.status(404).json({ error: 'Animal not found' });
  let expected;
  try { expected = expectedDate(animal.species, matingDate); } catch (e) { return res.status(400).json({ error: e.message }); }
  const p = await Pregnancy.create({ animal: animal._id, owner: req.user.id, species: animal.species, matingDate, expectedDate: expected });
  res.status(201).json(out(p));
});

// Record actual delivery; optionally register the newborn
router.patch('/:id/deliver', async (req, res) => {
  const p = await Pregnancy.findOne({ _id: req.params.id, owner: req.user.id });
  if (!p) return res.status(404).json({ error: 'Not found' });
  p.status = 'delivered';
  p.actualDate = req.body.actualDate || new Date();
  if (req.body.calfName) {
    const mom = await Animal.findById(p.animal);
    const calf = await Animal.create({
      owner: req.user.id, tag: 'LV-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
      name: req.body.calfName, species: p.species, sex: req.body.calfSex === 'male' ? 'male' : 'female',
      breed: mom?.breed, ageMonths: 0,
    });
    p.calf = calf._id;
  }
  await p.save();
  res.json(out(p));
});
module.exports = router;
