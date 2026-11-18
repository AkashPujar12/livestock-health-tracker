// Seeds SAMPLE data for development. Replace with real, verified data before real use.
const bcrypt = require('bcryptjs');
const connect = require('./db');
const { Schedule, Vet, Farmer } = require('./models');

const schedules = [
  // Sample defaults only - a veterinarian must confirm intervals for your region.
  { species: 'cow', vaccine: 'FMD', intervalDays: 180 },
  { species: 'cow', vaccine: 'HS', intervalDays: 365 },
  { species: 'cow', vaccine: 'BQ', intervalDays: 365 },
  { species: 'cow', vaccine: 'Brucellosis', intervalDays: 0, minAgeMonths: 4 },
  { species: 'buffalo', vaccine: 'FMD', intervalDays: 180 },
  { species: 'buffalo', vaccine: 'HS', intervalDays: 365 },
  { species: 'buffalo', vaccine: 'BQ', intervalDays: 365 },
  { species: 'goat', vaccine: 'PPR', intervalDays: 1095 },
  { species: 'goat', vaccine: 'ET', intervalDays: 365 },
  { species: 'sheep', vaccine: 'PPR', intervalDays: 1095 },
  { species: 'sheep', vaccine: 'ET', intervalDays: 365 },
  { species: 'sheep', vaccine: 'Sheep Pox', intervalDays: 365 },
];

(async () => {
  await connect();
  for (const s of schedules) {
    await Schedule.updateOne({ species: s.species, vaccine: s.vaccine, region: undefined }, { $set: s }, { upsert: true });
  }
  await Vet.deleteMany({ name: /^SAMPLE/ });
  await Vet.insertMany([
    { name: 'SAMPLE - Veterinary Hospital A', phone: '0000000000', district: 'Sample District', address: 'Replace with directory data', verified: true, location: { type: 'Point', coordinates: [77.59, 12.97] } },
    { name: 'SAMPLE - Veterinary Dispensary B', phone: '0000000000', district: 'Sample District', address: 'Replace with directory data', verified: true, location: { type: 'Point', coordinates: [77.45, 13.05] } },
  ]);
  if (!(await Farmer.findOne({ phone: '9000000001' }))) {
    await Farmer.create({ name: 'Demo Vet', phone: '9000000001', passwordHash: await bcrypt.hash('vet12345', 10), role: 'vet', language: 'en', location: { type: 'Point', coordinates: [77.59, 12.97] } });
  }
  console.log('Seeded. Demo vet login: 9000000001 / vet12345 (development only)');
  process.exit(0);
})();
