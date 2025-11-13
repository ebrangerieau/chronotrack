
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC78NuhV0pxYjyqJKwYZ9Wrr2LkuBm8n6g",
  authDomain: "chronotrack-773e8.firebaseapp.com",
  projectId: "chronotrack-773e8",
  storageBucket: "chronotrack-773e8.firebasestorage.app",
  messagingSenderId: "1008324597599",
  appId: "1:1008324597599:web:1472ff10c179a0e8ab88ea",
  measurementId: "G-9VCNZQRLLF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
