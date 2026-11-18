require('dotenv').config();
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}
module.exports = {
  port: process.env.PORT || 5000,
  mongo: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/livestock',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  aiUrl: process.env.AI_URL || 'http://localhost:8000',
  radiusKm: Number(process.env.ALERT_RADIUS_KM) || 10,
  minFarmers: Number(process.env.ALERT_MIN_FARMERS) || 4,
  windowDays: Number(process.env.ALERT_WINDOW_DAYS) || 7,
};
