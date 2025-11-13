
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// ERREUR CORRIGÉE : L'erreur "auth/invalid-api-key" se produisait car les variables d'environnement
// (process.env) n'étaient pas disponibles dans l'environnement d'exécution.
// J'ai remplacé la configuration par des placeholders.
//
// ACTION REQUISE : Vous devez remplacer les valeurs ci-dessous par votre propre configuration
// que vous trouverez dans les paramètres de votre projet Firebase.
//
// NOTE DE SÉCURITÉ : Pour une application web client, ces clés sont considérées comme publiques.
// La sécurité de vos données est assurée par les Règles de Sécurité de Firestore.
const firebaseConfig = {
  apiKey: "VOTRE_API_KEY",
  authDomain: "VOTRE_AUTH_DOMAIN",
  projectId: "VOTRE_PROJECT_ID",
  storageBucket: "VOTRE_STORAGE_BUCKET",
  messagingSenderId: "VOTRE_MESSAGING_SENDER_ID",
  appId: "VOTRE_APP_ID",
  measurementId: "VOTRE_MEASUREMENT_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled
      // in one tab at a a time.
      console.warn('La persistance des données a échoué: plusieurs onglets sont ouverts.');
    } else if (err.code == 'unimplemented') {
      // The current browser does not support all of the
      // features required to enable persistence
      console.warn('La persistance des données n\'est pas supportée par ce navigateur.');
    }
  });
