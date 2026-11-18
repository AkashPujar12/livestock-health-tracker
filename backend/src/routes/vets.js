const router = require('express').Router();
const { Vet, Farmer } = require('../models');
const { auth } = require('../middleware');
const { validLoc, haversineKm } = require('../utils');

router.use(auth);

// Only vets marked verified in the directory are returned (numbers are never AI-generated).
router.get('/nearby', async (req, res) => {
  let loc = validLoc(req.query.lat, req.query.lng);
  if (!loc) {
    const me = await Farmer.findById(req.user.id);
    if (me.location?.coordinates?.length) loc = { type: 'Point', coordinates: me.location.coordinates };
  }
  if (!loc) return res.status(400).json({ error: 'Location required' });
  const km = Math.min(Number(req.query.km) || 50, 200);
  const vets = await Vet.find({
    verified: true,
    location: { $near: { $geometry: loc, $maxDistance: km * 1000 } },
  }).limit(10);
  res.json(vets.map((v) => ({
    id: v._id, name: v.name, phone: v.phone, district: v.district, address: v.address,
    distanceKm: Math.round(haversineKm(loc.coordinates, v.location.coordinates) * 10) / 10,
  })));
});
module.exports = router;
