// Firebase configuration - You'll need to replace this with your actual config
const firebaseConfig = {
  apiKey: "AIzaSyAc4c6h7-Re8i35P_vyxYUW7AiBBFLvQOQ",
  authDomain: "body-draw.firebaseapp.com",
  projectId: "body-draw",
  storageBucket: "body-draw.firebasestorage.app",
  messagingSenderId: "558871081893",
  appId: "1:558871081893:web:5ca2ac972414c0fe4eae4c"
};

// Initialize Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query, 
  where,
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Export for use in other scripts
window.firebase = {
  app,
  db,
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp
};