// src/firebase.js
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyATcU-Ee6wGD_7-EQ2aGNpR4etzHmWpnt8",
  authDomain: "tipbox-a4f99.firebaseapp.com",
  projectId: "tipbox-a4f99",
  storageBucket: "tipbox-a4f99.firebasestorage.app",
  messagingSenderId: "586501497047",
  appId: "1:586501497047:web:8d67408a7ec21907969092"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app); // <-- ajoute ça


export {
  app,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword
};
