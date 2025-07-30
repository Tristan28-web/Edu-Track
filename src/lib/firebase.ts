
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";

export const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Enable offline persistence.
// This must be done before any other Firestore operations.
if (typeof window !== 'undefined') {
  try {
    enableIndexedDbPersistence(db)
      .then(() => {
        console.log("Firestore offline persistence has been enabled.");
      })
      .catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn("Firestore offline persistence could not be enabled: running in multiple tabs?");
        } else if (err.code === 'unimplemented') {
          console.warn("Firestore offline persistence is not supported in this browser.");
        }
      });
  } catch (error) {
    console.error("Error enabling Firestore offline persistence: ", error);
  }
}


export { app, auth, db, storage };

// Ensure environment variables are set
if (
  !firebaseConfig.apiKey ||
  !firebaseConfig.authDomain ||
  !firebaseConfig.projectId ||
  !firebaseConfig.storageBucket ||
  !firebaseConfig.messagingSenderId ||
  !firebaseConfig.appId
) {
  console.warn(
    "Firebase configuration is incomplete. Please check your .env file and ensure all NEXT_PUBLIC_FIREBASE_ variables are set."
  );
}
