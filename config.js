// Fill these in from Firebase Console > Project settings > General > Your apps > SDK setup and configuration
// This is safe to expose publicly (it's not a secret) as long as your Realtime Database rules are set correctly.
const firebaseConfig = {
  apiKey: "AIzaSyBjPnSc0PrCyhXly2H-MsGh-Dpjle8kJlk",
  authDomain: "autowatering-sys.firebaseapp.com",
  databaseURL: "https://autowatering-sys-default-rtdb.firebaseio.com",
  projectId: "autowatering-sys",
  storageBucket: "autowatering-sys.firebasestorage.app",
  messagingSenderId: "540491278021",
  appId: "1:540491278021:web:4e0e47bd0e4a433d52b2ac",
  measurementId: "G-QFQN2KKD0E"
};

// Same email/password you registered in Firebase Authentication and used in the ESP32 firmware,
// OR set up anonymous auth (simpler) - see README for both options.
const DASHBOARD_LOGIN = {
  email: "device@yourproject.com",
  password: "choose_a_strong_password"
};
