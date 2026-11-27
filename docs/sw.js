// Service worker du site : il se rouvre instantanément et reste utilisable hors ligne une fois visité.
// Les fichiers versionnés (?v=empreinte, voir site.py) ne changent jamais : cache d'abord.
// La page elle-même : réseau d'abord (pour avoir les mises à jour), cache seulement hors ligne.
// Les appels externes (Wikipédia, Supabase, affiches) ne passent pas par ici.
const CACHE = "tastebridge-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

async function garder(requete, reponse) {
  if (!reponse.ok) return;
  const c = await caches.open(CACHE), u = new URL(requete.url);
  // Une seule version par fichier : l'ancien catalogue (3,7 Mo) ne s'accumule pas
  for (const k of await c.keys()) if (new URL(k.url).pathname === u.pathname && k.url !== requete.url) await c.delete(k);
  await c.put(requete, reponse);
}

// Rappel du vendredi (notifier.py) : la notification ouvre les recos, où la sélection de la semaine est en tête
self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch { /* message vide */ }
  e.waitUntil(self.registration.showNotification(d.titre || "Pontil", {body: d.texte || "", icon: "icones/icone-192.png", tag: "selection", data: {url: d.url || "./#/film"}}));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.openWindow(new URL(e.notification.data?.url || "./", self.registration.scope).href));
});

self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  if (u.searchParams.has("v"))
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(rep => { e.waitUntil(garder(e.request, rep.clone())); return rep; })));
  else
    e.respondWith(fetch(e.request).then(rep => { e.waitUntil(garder(e.request, rep.clone())); return rep; })
      .catch(() => caches.match(e.request).then(r => r || caches.match("./"))));
});
