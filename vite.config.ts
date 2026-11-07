import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// index.html sert aussi à l'aperçu AI Studio, qui charge les dépendances via l'importmap
// et injecte lui-même index.tsx. Sous Vite, on retire l'importmap (le bundle n'en a pas
// besoin) et on ajoute le point d'entrée, sans lequel le build ne contient aucun JavaScript.
const standaloneEntry = (): Plugin => ({
  name: 'chronotrack-standalone-entry',
  transformIndexHtml: {
    order: 'pre',
    handler: (html) =>
      html
        .replace(/<script type="importmap">[\s\S]*?<\/script>\s*/, '')
        .replace('</body>', '  <script type="module" src="/index.tsx"></script>\n  </body>'),
  },
});

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), standaloneEntry()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
