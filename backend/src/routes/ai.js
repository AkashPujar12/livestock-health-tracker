const router = require('express').Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const cfg = require('../config');
const { auth } = require('../middleware');

router.use(auth);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    /^image\/(jpeg|png|webp)$/.test(file.mimetype) ? cb(null, true) : cb(new Error('Only JPEG, PNG or WebP images are allowed')),
});

const fallback = {
  available: false,
  observations: [{ en: 'The photo analysis service is not reachable right now.', kn: 'ಫೋಟೋ ವಿಶ್ಲೇಷಣಾ ಸೇವೆ ಈಗ ಲಭ್ಯವಿಲ್ಲ.' }],
  possibleConcerns: [],
  precautions: [
    { en: 'Keep the affected area clean and dry.', kn: 'ಬಾಧಿತ ಭಾಗವನ್ನು ಸ್ವಚ್ಛ ಮತ್ತು ಒಣಗಿಸಿ ಇಡಿ.' },
    { en: 'Separate the animal if a contagious condition is suspected.', kn: 'ಸಾಂಕ್ರಾಮಿಕ ಎಂದು ಅನುಮಾನವಿದ್ದರೆ ಪ್ರಾಣಿಯನ್ನು ಬೇರೆ ಇಡಿ.' },
  ],
  urgency: 'unknown',
  vetRecommended: true,
};

router.post('/analyze', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'image file required' });
  const fd = new FormData();
  fd.append('image', req.file.buffer, { filename: 'photo', contentType: req.file.mimetype });
  try {
    const r = await axios.post(`${cfg.aiUrl}/analyze?species=${encodeURIComponent(req.body.species || 'cow')}`, fd,
      { headers: fd.getHeaders(), timeout: 20000, maxBodyLength: Infinity });
    res.json({ available: true, ...r.data });
  } catch (e) {
    console.warn('AI service error:', e.message);
    res.json(fallback);
  }
});
module.exports = router;
