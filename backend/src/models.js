const { Schema, model, Types } = require('mongoose');
const crypto = require('crypto');

// GeoJSON point: coordinates are [lng, lat]
const pointDef = {
  type: { type: String, enum: ['Point'] },
  coordinates: { type: [Number], default: undefined },
};
const SPECIES = ['cow', 'buffalo', 'goat', 'sheep'];
const CATEGORIES = ['skin', 'fever', 'mouth_foot', 'breathing', 'diarrhea', 'abortion', 'other'];

const farmerSchema = new Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, required: true },
  language: { type: String, enum: ['en', 'kn'], default: 'kn' },
  village: String,
  district: String,
  role: { type: String, enum: ['farmer', 'vet'], default: 'farmer' },
  location: pointDef,
  notifyConsent: { type: Boolean, default: true },
  fcmToken: String,
}, { timestamps: true });
farmerSchema.index({ location: '2dsphere' });

const animalSchema = new Schema({
  owner: { type: Types.ObjectId, ref: 'Farmer', required: true, index: true },
  tag: { type: String, unique: true },
  publicId: { type: String, default: () => crypto.randomUUID() },
  name: { type: String, required: true, trim: true },
  species: { type: String, enum: SPECIES, required: true },
  sex: { type: String, enum: ['female', 'male'], default: 'female' },
  breed: String,
  ageMonths: Number,
}, { timestamps: true });

const vaccinationSchema = new Schema({
  animal: { type: Types.ObjectId, ref: 'Animal', required: true, index: true },
  owner: { type: Types.ObjectId, ref: 'Farmer', required: true, index: true },
  vaccine: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  dose: String,
  vetName: String,
  vetPhone: String,
  nextDue: Date,
  superseded: { type: Boolean, default: false },
  remindedAt: Date,
}, { timestamps: true });

// Configurable schedule (sample defaults are seeded; a vet must confirm local values)
const scheduleSchema = new Schema({
  species: { type: String, enum: SPECIES, required: true },
  vaccine: { type: String, required: true },
  intervalDays: { type: Number, default: 0 }, // 0 = one-off
  minAgeMonths: { type: Number, default: 0 },
  region: String,
  notes: String,
});
scheduleSchema.index({ species: 1, vaccine: 1, region: 1 }, { unique: true });

const pregnancySchema = new Schema({
  animal: { type: Types.ObjectId, ref: 'Animal', required: true, index: true },
  owner: { type: Types.ObjectId, ref: 'Farmer', required: true, index: true },
  species: { type: String, enum: SPECIES, required: true },
  matingDate: { type: Date, required: true },
  expectedDate: { type: Date, required: true },
  actualDate: Date,
  status: { type: String, enum: ['active', 'delivered', 'lost'], default: 'active' },
  milestones: { type: [Number], default: [] },
  calf: { type: Types.ObjectId, ref: 'Animal' },
}, { timestamps: true });

const reportSchema = new Schema({
  reporter: { type: Types.ObjectId, ref: 'Farmer', required: true, index: true },
  animal: { type: Types.ObjectId, ref: 'Animal' },
  species: { type: String, enum: SPECIES },
  category: { type: String, enum: CATEGORIES, required: true },
  symptoms: [String],
  notes: String,
  location: { ...pointDef },
}, { timestamps: true });
reportSchema.index({ location: '2dsphere' });
reportSchema.index({ category: 1, createdAt: -1 });

const alertSchema = new Schema({
  category: { type: String, enum: CATEGORIES, required: true },
  location: pointDef, // rounded (~1 km) so individual farms are not exposed
  radiusKm: Number,
  reporterCount: Number,
  status: { type: String, enum: ['suspected', 'verified', 'dismissed'], default: 'suspected' },
  reviewedBy: { type: Types.ObjectId, ref: 'Farmer' },
}, { timestamps: true });
alertSchema.index({ location: '2dsphere' });

const vetSchema = new Schema({
  name: String, phone: String, district: String, address: String,
  verified: { type: Boolean, default: false },
  location: pointDef,
});
vetSchema.index({ location: '2dsphere' });

const notificationSchema = new Schema({
  farmer: { type: Types.ObjectId, ref: 'Farmer', required: true, index: true },
  type: String,
  titleEn: String, titleKn: String, bodyEn: String, bodyKn: String,
  read: { type: Boolean, default: false },
  data: Schema.Types.Mixed,
}, { timestamps: true });

module.exports = {
  SPECIES, CATEGORIES,
  Farmer: model('Farmer', farmerSchema),
  Animal: model('Animal', animalSchema),
  Vaccination: model('Vaccination', vaccinationSchema),
  Schedule: model('Schedule', scheduleSchema),
  Pregnancy: model('Pregnancy', pregnancySchema),
  DiseaseReport: model('DiseaseReport', reportSchema),
  Alert: model('Alert', alertSchema),
  Vet: model('Vet', vetSchema),
  Notification: model('Notification', notificationSchema),
};
