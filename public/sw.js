const CACHE='maplestory-classic-builder-v0.8.0';
const CORE=['./','./index.html?v=0.8.0','./styles.css?v=0.8.0','./app.js?v=0.8.0','./guide-data.js?v=0.8.0','./manifest.webmanifest'];
self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).catch(()=>{}));
});
self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(k=>(k.startsWith('ultimate-il-guide-')||k.startsWith('maplestory-classic-builder-'))&&k!==CACHE).map(k=>caches.delete(k)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const req=event.request;
  const url=new URL(req.url);
  if(url.pathname==='/__builder_state') return;
  if(url.origin!==self.location.origin) return;
  event.respondWith(fetch(req).then(res=>{
    const copy=res.clone(); caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{}); return res;
  }).catch(()=>caches.match(req).then(hit=>hit||caches.match('./index.html?v=0.8.0'))));
});
