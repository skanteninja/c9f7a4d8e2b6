const CACHE='maplestory-classic-builder-v0.8.0';
const CORE=[
  './','./index.html?v=0.8.0','./styles.css?v=0.8.0','./guide-data.js?v=0.8.0','./app.js?v=0.8.0','./bootstrap.js?v=0.8.0','./manifest.webmanifest',
  './assets/runtime/styles.00.txt','./assets/runtime/styles.01.txt','./assets/runtime/styles.02.txt',
  './assets/runtime/guide.00.txt','./assets/runtime/guide.01.txt','./assets/runtime/guide.02.txt','./assets/runtime/guide.03.txt','./assets/runtime/guide.04.txt','./assets/runtime/guide.05.txt',
  './assets/runtime/app.00.txt','./assets/runtime/app.01.txt','./assets/runtime/app.02.txt','./assets/runtime/app.03.txt'
];
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).catch(()=>{}));});
self.addEventListener('activate',event=>{event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>(k.startsWith('ultimate-il-guide-')||k.startsWith('maplestory-classic-builder-'))&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()]));});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;const req=event.request,url=new URL(req.url);if(url.pathname==='/__builder_state'||url.origin!==self.location.origin)return;event.respondWith(fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});return res;}).catch(()=>caches.match(req).then(hit=>hit||caches.match('./index.html?v=0.8.0'))));});
