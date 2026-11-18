const { Vaccination, Pregnancy, Animal } = require('./models');
const { notify } = require('./notify');
const { daysLeft } = require('./gestation');

async function run() {
  const now = new Date();
  // Vaccinations due within 7 days
  const vacs = await Vaccination.find({
    superseded: false, remindedAt: null,
    nextDue: { $gte: now, $lte: new Date(now.getTime() + 7 * 86400000) },
  }).populate('animal', 'name');
  for (const v of vacs) {
    const d = v.nextDue.toISOString().slice(0, 10);
    await notify([v.owner], {
      type: 'vaccination_reminder',
      titleEn: 'Vaccination due soon', titleKn: 'ಲಸಿಕೆ ಶೀಘ್ರದಲ್ಲಿ ಬಾಕಿ',
      bodyEn: `${v.animal?.name || 'Animal'}: ${v.vaccine} is due on ${d}.`,
      bodyKn: `${v.animal?.name || 'ಪ್ರಾಣಿ'}: ${v.vaccine} ಲಸಿಕೆ ${d} ರಂದು ಬಾಕಿ ಇದೆ.`,
      data: { vaccinationId: v._id },
    });
    v.remindedAt = now; await v.save();
  }
  // Delivery countdown milestones: 14, 7, 1 days
  const preds = await Pregnancy.find({ status: 'active' }).populate('animal', 'name');
  for (const p of preds) {
    const left = daysLeft(p.expectedDate, now);
    const m = [1, 7, 14].find((x) => left <= x && left >= 0 && !p.milestones.includes(x));
    if (m === undefined) continue;
    await notify([p.owner], {
      type: 'delivery_reminder',
      titleEn: 'Delivery approaching', titleKn: 'ಹೆರಿಗೆ ಸಮೀಪಿಸುತ್ತಿದೆ',
      bodyEn: `${p.animal?.name || 'Animal'} is expected to deliver in about ${left} day(s). Arrange veterinary support.`,
      bodyKn: `${p.animal?.name || 'ಪ್ರಾಣಿ'} ಸುಮಾರು ${left} ದಿನಗಳಲ್ಲಿ ಹೆರಿಗೆ ಆಗುವ ನಿರೀಕ್ಷೆ ಇದೆ. ಪಶುವೈದ್ಯರ ಸಹಾಯ ಸಿದ್ಧವಿರಲಿ.`,
      data: { pregnancyId: p._id },
    });
    p.milestones.push(m); await p.save();
  }
}
exports.start = () => {
  const safe = () => run().catch((e) => console.error('reminder job failed', e));
  safe();
  setInterval(safe, 6 * 3600 * 1000);
};
