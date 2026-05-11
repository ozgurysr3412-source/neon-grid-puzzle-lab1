const CACHE_NAME = "luma-blocks-v6";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/styles/main.css",
  "/src/main.js",
  "/src/ui/uiManager.js",
  "/src/game/gameStateManager.js",
  "/src/game/boardLogic.js",
  "/src/game/pieceCatalog.js",
  "/src/game/pieceGenerator.js",
  "/src/game/scoringSystem.js",
  "/src/input/dragDropController.js",
  "/src/config/tuning.js",
  "/src/feedback/audioHooks.js",
  "/src/feedback/haptics.js",
  "/src/meta/progressionManager.js",
  "/src/analytics/telemetry.js",
  "/src/core/eventBus.js",
  "/src/core/random.js",
  "/assets/blocks/block-blue.png",
  "/assets/blocks/block-green.png",
  "/assets/blocks/block-orange.png",
  "/assets/blocks/block-pink.png",
  "/assets/blocks/block-purple.png",
  "/assets/icons/icon-180.png",
  "/assets/icons/icon-192.png",
  "/assets/icons/icon-512.png",
  "/assets/sounds/place.mp3",
  "/assets/sounds/pickup.mp3",
  "/assets/sounds/clear.wav",
  "/assets/sounds/combo-good-job.mp3",
  "/assets/sounds/combo-perfect.mp3",
  "/assets/sounds/combo-incredible.mp3",
  "/assets/sounds/gameover.mp3"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        return response;
      });
    })
  );
});
