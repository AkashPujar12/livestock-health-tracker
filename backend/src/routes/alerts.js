const router = require('express').Router();
const cfg = require('../config');
const { Alert, Farmer } = require('../models');
const { auth, requireVet } = require('../middleware');
const { within } = require('../utils');
const { notify } = require('../notify');

router.use(auth);

// Active cluster alerts near the logged-in farmer. Exposes counts only, never reporter identity.
router.get('/nearby', async (req, res) => {
  const me = await Farmer.findById(req.user.id);
  if (!me.location?.coordinates?.length) return res.json([]);
  const since = new Date(Date.now() - cfg.windowDays * 86400000);
  const list = await Alert.find({
    status: { $ne: 'dismissed' }, createdAt: { $gte: since },
    location: within(me.location.coordinates, cfg.radiusKm),
  }).select('category status reporterCount radiusKm createdAt').sort({ createdAt: -1 });
  res.json(list);
});

// Veterinary review queue
router.get('/all', requireVet, async (_req, res) => {
  res.json(await Alert.find().sort({ createdAt: -1 }).limit(100));
});

router.patch('/:id', requireVet, async (req, res) => {
  const { status } = req.body;
  if (!['verified', 'dismissed'].includes(status)) return res.status(400).json({ error: 'status must be verified or dismissed' });
  const alert = await Alert.findByIdAndUpdate(req.params.id, { status, reviewedBy: req.user.id }, { new: true });
  if (!alert) return res.status(404).json({ error: 'Not found' });
  if (status === 'verified') {
    const farmers = await Farmer.find({ notifyConsent: true, location: within(alert.location.coordinates, alert.radiusKm) }).select('_id');
    await notify(farmers.map((f) => f._id), {
      type: 'cluster_verified',
      titleEn: 'Veterinary update', titleKn: 'ಪಶುವೈದ್ಯಕೀಯ ಮಾಹಿತಿ',
      bodyEn: 'A veterinarian has reviewed the reported cases in your area and verified the cluster. Please follow official veterinary guidance.',
      bodyKn: 'ನಿಮ್ಮ ಪ್ರದೇಶದ ವರದಿಗಳನ್ನು ಪಶುವೈದ್ಯರು ಪರಿಶೀಲಿಸಿ ದೃಢಪಡಿಸಿದ್ದಾರೆ. ದಯವಿಟ್ಟು ಅಧಿಕೃತ ಪಶುವೈದ್ಯಕೀಯ ಮಾರ್ಗದರ್ಶನ ಪಾಲಿಸಿ.',
      data: { alertId: alert._id },
    });
  }
  res.json(alert);
});
module.exports = router;
