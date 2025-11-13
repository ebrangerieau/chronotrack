const CACHE_NAME = 'chronotrack-cache-v1';
// Les ressources fondamentales pour la structure et la fonctionnalité de l'application.
const APP_SHELL_URLS = [
    '/',
    '/index.html',
    'https://cdn.tailwindcss.com',
];

// À l'installation, mise en cache de l'App Shell.
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Cache ouvert et mise en cache de l\'App Shell');
                // Utilise addAll pour récupérer et mettre en cache toutes les URLs de l'App Shell.
                // C'est atomique - si un fichier échoue, toute l'opération échoue.
                return cache.addAll(APP_SHELL_URLS);
            })
            .catch(error => {
                console.error('Échec de la mise en cache de l\'App Shell:', error);
            })
    );
});

// À l'activation, nettoyage des anciens caches.
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Si le nom d'un cache n'est pas dans notre liste de caches autorisés, on le supprime.
                    if (cacheName !== CACHE_NAME) {
                        console.log('Suppression de l\'ancien cache :', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// À chaque requête (fetch), utilisation d'une stratégie "stale-while-revalidate".
self.addEventListener('fetch', (event) => {
    // Nous ne voulons intercepter que les requêtes GET.
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Pour les requêtes vers Firebase, on passe toujours par le réseau.
    // Le SDK Firebase gère sa propre persistance hors ligne.
    if (event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('firebaseapp.com')) {
        return;
    }

    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((cachedResponse) => {
                // Requête au réseau.
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    // Si nous obtenons une réponse valide, on met à jour le cache.
                    if (networkResponse && networkResponse.ok) {
                         // Ne pas mettre en cache les requêtes d'extensions chrome.
                        if (!event.request.url.startsWith('chrome-extension://')) {
                            cache.put(event.request, networkResponse.clone());
                        }
                    }
                    return networkResponse;
                }).catch(error => {
                    console.error('La requête a échoué ; retour à la version hors ligne.', error);
                });

                // Retourne la réponse en cache immédiatement si disponible,
                // et met à jour le cache en arrière-plan avec la réponse du réseau.
                return cachedResponse || fetchPromise;
            });
        })
    );
});
