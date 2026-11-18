const router = require('express').Router();
const { Animal, Vaccination, Pregnancy, SPECIES } = require('../models');
const { auth } = require('../middleware');

router.use(auth);
const newTag = () => 'LV-' + Math.random().toString(36).slice(2, 8).toUpperCase();

router.get('/', async (req, res) => {
  res.json(await Animal.find({ owner: req.user.id }).sort({ createdAt: -1 }));
});

router.post('/', async (req, res) => {
  const { name, species, sex, breed, ageMonths } = req.body;
  if (!name || !SPECIES.includes(species)) return res.status(400).json({ error: 'name and valid species required' });
  let animal;
  for (let i = 0; i < 5 && !animal; i++) {
    try {
      animal = await Animal.create({ owner: req.user.id, tag: newTag(), name, species, sex, breed, ageMonths });
    } catch (e) { if (e.code !== 11000) throw e; }
  }
  res.status(201).json(animal);
});

router.get('/:id', async (req, res) => {
  const a = await Animal.findOne({ _id: req.params.id, owner: req.user.id });
  if (!a) return res.status(404).json({ error: 'Not found' });
  const [vaccinations, pregnancies] = await Promise.all([
    Vaccination.find({ animal: a._id }).sort({ date: -1 }),
    Pregnancy.find({ animal: a._id }).sort({ matingDate: -1 }),
  ]);
  res.json({ animal: a, vaccinations, pregnancies });
});

router.delete('/:id', async (req, res) => {
  const a = await Animal.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
  if (!a) return res.status(404).json({ error: 'Not found' });
  await Promise.all([Vaccination.deleteMany({ animal: a._id }), Pregnancy.deleteMany({ animal: a._id })]);
  res.json({ ok: true });
});
module.exports = router;
