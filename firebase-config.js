import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAuth, updateProfile, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app-check.js";

const firebaseConfig = {
  apiKey: "AIzaSyAasiNjvsvZ54UhTrG0LEuORkphyWVSUQc",
  authDomain: "taskmanager-29.firebaseapp.com",
  projectId: "taskmanager-29",
  storageBucket: "taskmanager-29.firebasestorage.app",
  messagingSenderId: "230972431248",
  appId: "1:230972431248:web:cf710b36bc4d4717abb115",
  measurementId: "G-N11PRV5QMP"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Enable App Check with reCAPTCHA v3
const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('6LfVpGkrAAAAAGhXxT4Gh5UjlzzEvlAiCnieNke0'),
  isTokenAutoRefreshEnabled: true
});

export const auth = getAuth(app);
export const db = getFirestore(app);

// Export or use db, auth as needed
window.db = db;
window.auth = auth;

// Export Firebase functions
export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  collection,
  updateProfile,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
};