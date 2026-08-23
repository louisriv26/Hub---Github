/* generated — Collection Luisa */
'use strict';
const SHELL_REV = "c0abb45517183b45c5fec96605e6d718185355cb8735c2ff3b85d0b80157de15";
const CACHE_NAME = `luisa-hub-shell-${SHELL_REV.slice(0,16)}`;
const SHELL_ASSETS = ["index.html","help.html","about.html","404.html","styles.css","boot.js","app.js","manifest.webmanifest","assets/apps/24h-192.png","assets/apps/ldc-192.png","assets/apps/marie-192.png","assets/apps/lettres-192.png"];
const SCOPE_PATH = new URL(self.registration.scope).pathname;
const SHELL_PATHS = new Set(SHELL_ASSETS.map((rel) => new URL(rel, self.registration.scope).pathname));
const INDEX = new URL('index.html', self.registration.scope).pathname;
const HELP = new URL('help.html', self.registration.scope).pathname;
const ABOUT = new URL('about.html', self.registration.scope).pathname;
const NOT_FOUND = new URL('404.html', self.registration.scope).pathname;
const VERSION = new URL('version.json', self.registration.scope).pathname;
function isHubOwned(url) { return url.origin === self.location.origin && url.pathname.startsWith(SCOPE_PATH); }
function navigationKey(url) {
  const p=url.pathname; const baseNoSlash=SCOPE_PATH.endsWith('/') ? SCOPE_PATH.slice(0,-1) : SCOPE_PATH;
  if (p===SCOPE_PATH || p===baseNoSlash || p===INDEX) return INDEX;
  if (p===HELP) return HELP; if (p===ABOUT) return ABOUT; return null;
}
function requestFor(rel) { return new Request(new URL(rel,self.registration.scope).href, {cache:'reload',credentials:'same-origin'}); }
self.addEventListener('install',(event)=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    for (const rel of SHELL_ASSETS) {
      const response=await fetch(requestFor(rel));
      if (!response.ok) throw new Error(`precache failed ${rel} ${response.status}`);
      await cache.put(new URL(rel,self.registration.scope).href,response.clone());
    }
  })());
});
self.addEventListener('activate',(event)=>{ event.waitUntil(Promise.resolve()); });
self.addEventListener('message',(event)=>{
  const data=event.data||{};
  if (data.type==='SKIP_WAITING') { event.waitUntil(self.skipWaiting()); return; }
  if (data.type==='GET_STATUS') { const port=event.ports&&event.ports[0]; if (port) port.postMessage({shellRev:SHELL_REV,cacheName:CACHE_NAME}); return; }
  if (data.type==='CLEAN_OLD_HUB_CACHES') {
    event.waitUntil(caches.keys().then((names)=>Promise.all(names.filter((n)=>n.startsWith('luisa-hub-')&&n!==CACHE_NAME).map((n)=>caches.delete(n)))));
  }
});
self.addEventListener('fetch',(event)=>{
  const req=event.request; if (req.method!=='GET') return;
  const url=new URL(req.url); if (!isHubOwned(url)) return;
  if (url.pathname===VERSION) { event.respondWith(fetch(req)); return; }
  if (req.mode==='navigate') {
    const key=navigationKey(url);
    if (key) { event.respondWith(caches.open(CACHE_NAME).then((c)=>c.match(new URL(key,self.location.origin).href)).then((r)=>r||fetch(req))); return; }
    event.respondWith(fetch(req).catch(()=>caches.open(CACHE_NAME).then((c)=>c.match(new URL(NOT_FOUND,self.location.origin).href)))); return;
  }
  if (SHELL_PATHS.has(url.pathname)) {
    const canonical=new URL(url.pathname,self.location.origin).href;
    event.respondWith(caches.open(CACHE_NAME).then((c)=>c.match(canonical)).then((r)=>r||fetch(req)));
  }
});
