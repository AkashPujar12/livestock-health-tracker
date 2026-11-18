const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cfg = require('../config');
const { Farmer } = require('../models');
const { auth } = require('../middleware');
const { validLoc } = require('../utils');

const sign = (u) => jwt.sign({ id: u._id, role: u.role }, cfg.jwtSecret, { expiresIn: '30d' });
const pub = (u) => ({
  id: u._id, name: u.name, phone: u.phone, language: u.language, village: u.village,
  district: u.district, role: u.role, notifyConsent: u.notifyConsent,
  location: u.location?.coordinates?.length ? { lat: u.location.coordinates[1], lng: u.location.coordinates[0] } : null,
});

router.post('/register', async (req, res) => {
  const { name, phone, password, language, village, district, lat, lng } = req.body;
  if (!name || !phone || !password || password.length < 6)
    return res.status(400).json({ error: 'name, phone and password (min 6 chars) are required' });
  if (await Farmer.findOne({ phone })) return res.status(409).json({ error: 'Phone already registered' });
  const u = await Farmer.create({
    name, phone, village, district,
    passwordHash: await bcrypt.hash(password, 10),
    language: language === 'en' ? 'en' : 'kn',
    location: validLoc(lat, lng),
  });
  res.status(201).json({ token: sign(u), user: pub(u) });
});

router.post('/login', async (req, res) => {
  const u = await Farmer.findOne({ phone: req.body.phone });
  if (!u || !(await bcrypt.compare(req.body.password || '', u.passwordHash)))
    return res.status(401).json({ error: 'Wrong phone or password' });
  res.json({ token: sign(u), user: pub(u) });
});

router.get('/me', auth, async (req, res) => {
  const u = await Farmer.findById(req.user.id);
  if (!u) return res.status(401).json({ error: 'Account not found' });
  res.json(pub(u));
});

router.patch('/me', auth, async (req, res) => {
  const u = await Farmer.findById(req.user.id);
  const { language, lat, lng, fcmToken, notifyConsent, village, district } = req.body;
  if (language) u.language = language === 'en' ? 'en' : 'kn';
  const loc = validLoc(lat, lng); if (loc) u.location = loc;
  if (fcmToken !== undefined) u.fcmToken = fcmToken;
  if (typeof notifyConsent === 'boolean') u.notifyConsent = notifyConsent;
  if (village !== undefined) u.village = village;
  if (district !== undefined) u.district = district;
  await u.save();
  res.json(pub(u));
});
module.exports = router;
