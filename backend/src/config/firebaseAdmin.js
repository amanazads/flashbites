const admin = require('firebase-admin');

let firebaseApp;

if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      // Render/Railway sometimes encode newlines in the private key — fix them
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      const serviceAccount = JSON.parse(raw);

      // Ensure private_key newlines are properly formatted
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }

      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('🔥 Firebase Admin: initialized with service account JSON from env');
    } catch (err) {
      console.error('❌ Firebase Admin: Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', err.message);
      // Fallback: try projectId-only initialization
      firebaseApp = admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'flashbites-shop',
      });
      console.warn('⚠️ Firebase Admin: Falling back to projectId-only init (token verification may fail)');
    }
  } else {
    // Local dev: rely on GOOGLE_APPLICATION_CREDENTIALS file or projectId
    firebaseApp = admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'flashbites-shop',
    });
    console.log('🔥 Firebase Admin: initialized with application default credentials (local dev)');
  }
} else {
  firebaseApp = admin.apps[0];
}

/**
 * Verify a Firebase ID token obtained from the client after phone auth.
 * Returns the decoded token containing uid and phone_number.
 */
const verifyFirebaseToken = async (idToken) => {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Firebase token verification failed:', error.message);
    return null;
  }
};

module.exports = { admin, firebaseApp, verifyFirebaseToken };
