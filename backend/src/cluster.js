const cfg = require('./config');
const { DiseaseReport, Alert, Farmer } = require('./models');
const { within } = require('./utils');
const { notify } = require('./notify');

const round2 = (c) => c.map((x) => Math.round(x * 100) / 100);

/**
 * Called after every new report. If >= minFarmers DISTINCT farmers reported the same
 * category within radiusKm in the last windowDays, create a *suspected* cluster alert
 * and notify consenting farmers within radiusKm. Never discloses who reported.
 */
async function evaluate(report) {
  if (report.category === 'other') return null;
  const since = new Date(Date.now() - cfg.windowDays * 86400000);
  const center = report.location.coordinates;

  const nearby = await DiseaseReport.find({
    category: report.category,
    createdAt: { $gte: since },
    location: within(center, cfg.radiusKm),
  }).select('reporter');
  const distinct = new Set(nearby.map((r) => String(r.reporter))); // duplicates from one farmer count once
  if (distinct.size < cfg.minFarmers) return null;

  const existing = await Alert.findOne({
    category: report.category,
    status: { $in: ['suspected', 'verified'] },
    createdAt: { $gte: since },
    location: within(center, cfg.radiusKm),
  });
  if (existing) {
    existing.reporterCount = distinct.size;
    await existing.save();
    return null; // already alerted for this cluster
  }

  const alert = await Alert.create({
    category: report.category,
    location: { type: 'Point', coordinates: round2(center) },
    radiusKm: cfg.radiusKm,
    reporterCount: distinct.size,
  });

  const farmers = await Farmer.find({ notifyConsent: true, location: within(center, cfg.radiusKm) }).select('_id');
  await notify(farmers.map((f) => f._id), {
    type: 'cluster_alert',
    titleEn: 'Livestock health advisory',
    titleKn: 'ಜಾನುವಾರು ಆರೋಗ್ಯ ಎಚ್ಚರಿಕೆ',
    bodyEn: 'Multiple farmers near you have reported similar animal symptoms (suspected disease cluster, not yet verified). Monitor your animals, avoid unnecessary animal movement, contact a veterinarian if symptoms appear, and follow official veterinary guidance.',
    bodyKn: 'ನಿಮ್ಮ ಹತ್ತಿರದ ಹಲವು ರೈತರು ಇದೇ ರೀತಿಯ ಪ್ರಾಣಿ ಲಕ್ಷಣಗಳನ್ನು ವರದಿ ಮಾಡಿದ್ದಾರೆ (ಶಂಕಿತ ರೋಗ ಗುಂಪು, ಇನ್ನೂ ದೃಢಪಟ್ಟಿಲ್ಲ). ನಿಮ್ಮ ಪ್ರಾಣಿಗಳನ್ನು ಗಮನಿಸಿ, ಅನಗತ್ಯ ಪ್ರಾಣಿ ಸಾಗಣೆ ತಪ್ಪಿಸಿ, ಲಕ್ಷಣ ಕಂಡರೆ ಪಶುವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ ಮತ್ತು ಅಧಿಕೃತ ಪಶುವೈದ್ಯಕೀಯ ಮಾರ್ಗದರ್ಶನ ಪಾಲಿಸಿ.',
    data: { alertId: alert._id, category: alert.category },
  });
  return alert;
}
module.exports = { evaluate };
