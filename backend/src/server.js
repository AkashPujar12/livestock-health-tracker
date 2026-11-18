const dns = require('node:dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const cfg = require('./config');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connect = require('./db');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use('/api', rateLimit({ windowMs: 60_000, max: 300 }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/animals', require('./routes/animals'));
app.use('/api/vaccinations', require('./routes/vaccinations'));
app.use('/api/pregnancies', require('./routes/pregnancies'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/vets', require('./routes/vets'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/notifications', require('./routes/notifications'));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

connect().then(() => {
  app.listen(cfg.port, () => console.log(`API on :${cfg.port}`));
  require('./jobs').start();
}).catch((e) => { console.error('Mongo connection failed', e.message); process.exit(1); });
