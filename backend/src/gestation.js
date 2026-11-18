// Approximate average gestation lengths (planning values only)
const GESTATION_DAYS = { cow: 283, buffalo: 310, goat: 150, sheep: 147 };

function expectedDate(species, matingDate) {
  const days = GESTATION_DAYS[species];
  if (!days) throw new Error('Unsupported species: ' + species);
  const d = new Date(matingDate);
  if (Number.isNaN(d.getTime())) throw new Error('Invalid mating date');
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + days));
}
function daysLeft(expected, now = new Date()) {
  return Math.ceil((new Date(expected) - now) / 86400000);
}
module.exports = { GESTATION_DAYS, expectedDate, daysLeft };
