const router = require('express').Router();
const { DiseaseReport, Animal, Farmer, SPECIES, CATEGORIES } = require('../models');
const { auth } = require('../middleware');
const { validLoc } = require('../utils');
const { evaluate } = require('../cluster');

router.use(auth);

router.post('/', async (req, res) => {
  const { animalId, species, category, symptoms, notes, lat, lng } = req.body;
  if (!CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid category' });
  let animal = null;
  if (animalId) animal = await Animal.findOne({ _id: animalId, owner: req.user.id });

  let location = validLoc(lat, lng);
  if (!location) {
    const me = await Farmer.findById(req.user.id);
    if (me.location?.coordinates?.length) location = { type: 'Point', coordinates: me.location.coordinates };
  }
  if (!location) return res.status(400).json({ error: 'Location required (allow GPS or set it in your profile)' });

  const report = await DiseaseReport.create({
    reporter: req.user.id, animal: animal?._id,
    species: SPECIES.includes(species) ? species : animal?.species,
    category, symptoms: Array.isArray(symptoms) ? symptoms.slice(0, 20) : [], notes, location,
  });
  const alert = await evaluate(report);
  res.status(201).json({ report: { id: report._id, category: report.category }, clusterAlertTriggered: !!alert });
});

router.get('/mine', async (req, res) => {
  res.json(await DiseaseReport.find({ reporter: req.user.id }).select('-location').sort({ createdAt: -1 }).limit(50));
});
module.exports = router;
