
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("L'élément root est introuvable");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Uniquement dans le build Vite de production : en dev, le cache du service worker
// servirait des modules périmés. Hors Vite (aperçu AI Studio), import.meta.env n'existe pas.
if ('serviceWorker' in navigator && import.meta.env?.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error("Échec de l'enregistrement du service worker :", error);
    });
  });
}
