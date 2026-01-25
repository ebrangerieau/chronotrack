// FIX: Use namespace imports for Firebase modules to address potential module resolution issues.
import * as firebaseApp from "firebase/app";
import * as firebaseAuth from "firebase/auth";
import * as firestore from "firebase/firestore";

// REMPLACEZ CECI par la configuration de VOTRE projet Firebase
// Vous pouvez trouver ces informations dans les paramètres de votre projet sur la console Firebase :
// https://console.firebase.google.com/
const firebaseConfig = {
  apiKey: "AIzaSyC78NuhV0pxYjyqJKwYZ9Wrr2LkuBm8n6g",
  authDomain: "chronotrack-773e8.firebaseapp.com",
  projectId: "chronotrack-773e8",
  storageBucket: "chronotrack-773e8.firebasestorage.app",
  messagingSenderId: "1008324597599",
  appId: "1:1008324597599:web:1472ff10c179a0e8ab88ea"
};

// Vérification de la configuration Firebase pour s'assurer qu'elle a été modifiée.
if (firebaseConfig.apiKey === "VOTRE_API_KEY" || firebaseConfig.authDomain === "VOTRE_AUTH_DOMAIN") {
  const errorMessage = "La configuration de Firebase est manquante. Veuillez éditer le fichier `firebase.ts` et remplacer les valeurs d'exemple par vos propres identifiants de projet Firebase.";
  
  // Affiche une erreur visible par l'utilisateur final et arrête l'exécution du script.
  // Cela se produit avant que React ne s'initialise.
  document.addEventListener('DOMContentLoaded', () => {
    document.body.innerHTML = `<div style="font-family: sans-serif; padding: 2rem; text-align: center; background-color: #fff3f3; color: #b91c1c; border: 1px solid #fecaca; border-radius: 0.5rem; margin: 2rem;"><h2>Erreur de Configuration</h2><p>${errorMessage}</p></div>`;
  });
  throw new Error(errorMessage);
}


// Initialize Firebase
const app = firebaseApp.initializeApp(firebaseConfig);
export const auth = firebaseAuth.getAuth(app);

// Initialize Firestore
export const db = firestore.getFirestore(app);

// Initialize Firestore with modern persistence settings
firestore.enableMultiTabIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      console.warn('Firebase persistence could not be enabled. Another tab has it enabled.');
    } else if (err.code == 'unimplemented') {
      console.warn('The current browser does not support all of the features required to enable persistence.');
    } else {
      console.error("Failed to enable Firebase persistence", err);
    }
  });