const { Notification, Farmer } = require('./models');
let fcm = null;

function initFcm() {
  if (fcm !== null) return fcm;
  fcm = false;
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const admin = require('firebase-admin');
      const path = require('path');
      admin.initializeApp({ credential: admin.credential.cert(require(path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT))) });
      fcm = admin;
    }
  } catch (e) { console.warn('FCM disabled:', e.message); }
  return fcm;
}

// Always stores an in-app notification; also sends push if FCM is configured.
async function notify(farmerIds, msg) {
  if (!farmerIds.length) return;
  await Notification.insertMany(farmerIds.map((farmer) => ({ farmer, ...msg })));
  const admin = initFcm();
  if (!admin) return;
  const farmers = await Farmer.find({ _id: { $in: farmerIds }, fcmToken: { $nin: [null, ''] }, notifyConsent: true })
    .select('fcmToken language');
  await Promise.allSettled(farmers.map((f) => admin.messaging().send({
    token: f.fcmToken,
    notification: { title: f.language === 'kn' ? msg.titleKn : msg.titleEn, body: f.language === 'kn' ? msg.bodyKn : msg.bodyEn },
  })));
}
module.exports = { notify };
