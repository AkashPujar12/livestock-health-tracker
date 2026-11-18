const jwt = require('jsonwebtoken');
const cfg = require('./config');

exports.auth = (req, res, next) => {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Login required' });
  try {
    req.user = jwt.verify(token, cfg.jwtSecret); // { id, role }
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
exports.requireVet = (req, res, next) =>
  req.user?.role === 'vet' ? next() : res.status(403).json({ error: 'Veterinarians only' });
