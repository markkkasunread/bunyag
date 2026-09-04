// Fill these in from Firebase Console > Project settings > General > Your apps > SDK setup and configuration
// This is safe to expose publicly (it's not a secret) as long as your Realtime Database rules are set correctly.
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_WEB_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Same email/password you registered in Firebase Authentication and used in the ESP32 firmware,
// OR set up anonymous auth (simpler) - see README for both options.
const DASHBOARD_LOGIN = {
  email: "device@yourproject.com",
  password: "choose_a_strong_password"
};
