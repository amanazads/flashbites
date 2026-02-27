const admin = require('firebase-admin');

let firebaseApp;

// Support two initialization modes:
// 1. Production (Render/Railway/Vercel): FIREBASE_SERVICE_ACCOUNT_JSON env var
// 2. Local dev with GOOGLE_APPLICATION_CREDENTIALS file path
if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    // Parse the JSON from environment variable (for hosted environments)
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('🔥 Firebase Admin: initialized with service account JSON from env');
  } else {
    // Fallback for local dev (relies on GOOGLE_APPLICATION_CREDENTIALS file)
    firebaseApp = admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'flashbites-shop',
    });
    console.log('🔥 Firebase Admin: initialized with application default credentials');
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
