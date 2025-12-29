import { Platform } from 'react-native';
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, collection, doc } from 'firebase/firestore';

// Centralized Firebase config and initialization
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

let auth;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
}
const db = getFirestore(app);

// New App ID Namespace
const appId = 'quan-ly-chi-tieu-family';

// Paths helper used across features
const getFirestorePaths = (user) => {
  if (!user) return null;

  // Returning access to the root path for this user based on the new rules
  // Path: artifacts/quan-ly-chi-tieu-family/users/{uid}

  const userPath = ['artifacts', appId, 'users', user.uid];

  return {
    // We expose a helper to get the root doc or collection for the user
    userDoc: doc(db, ...userPath),
    userCollection: collection(db, ...userPath, 'data'), // For flexibility if they add subcols later
  };
};

export { app, auth, db, appId, getFirestorePaths };
