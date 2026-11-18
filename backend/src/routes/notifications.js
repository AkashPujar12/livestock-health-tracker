const router = require('express').Router();
const { Notification } = require('../models');
const { auth } = require('../middleware');

router.use(auth);
router.get('/', async (req, res) => {
  res.json(await Notification.find({ farmer: req.user.id }).sort({ createdAt: -1 }).limit(100));
});
router.post('/read-all', async (req, res) => {
  await Notification.updateMany({ farmer: req.user.id, read: false }, { read: true });
  res.json({ ok: true });
});
module.exports = router;
