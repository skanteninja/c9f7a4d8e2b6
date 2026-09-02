const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = __dirname;
const source = path.join(root, 'public');
const runtime = path.join(source, 'assets', 'runtime');
const repairs = path.join(source, 'repairs');
const out = path.join(root, 'dist');
const assetVersion = '0.8.1-static1';

function readChunk(name) {
  const directRepair = path.join(repairs, name);
  if (fs.existsSync(directRepair)) {
    return fs.readFileSync(directRepair, 'utf8');
  }

  const stem = name.replace(/\.txt$/, '');
  let repaired = '';
  for (let i = 0; ; i++) {
    const part = path.join(repairs, `${stem}.part${i}.txt`);
    if (!fs.existsSync(part)) break;
    repaired += fs.readFileSync(part, 'utf8');
  }
  if (repaired) return repaired;

  return fs.readFileSync(path.join(runtime, name), 'utf8');
}

function readChunks(prefix, count) {
  let base64 = '';
  for (let i = 0; i < count; i++) {
    const name = `${prefix}.${String(i).padStart(2, '0')}.txt`;
    base64 += readChunk(name).replace(/\s+/g, '');
  }
  return zlib.gunzipSync(Buffer.from(base64, 'base64')).toString('utf8');
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const css = readChunks('styles', 3);
const guideJson = readChunks('guide', 6);
const app = readChunks('app', 4);
const visualCss = fs.readFileSync(path.join(source, 'visuals.css'), 'utf8');
const visuals = fs.readFileSync(path.join(source, 'visuals.js'), 'utf8');
const visualDbCss = fs.readFileSync(path.join(source, 'visuals-db.css'), 'utf8');
const visualDb = fs.readFileSync(path.join(source, 'visuals-db.js'), 'utf8');
const visualNpcCss = fs.readFileSync(path.join(source, 'visuals-npc.css'), 'utf8');
const visualNpc = fs.readFileSync(path.join(source, 'visuals-npc.js'), 'utf8');
const visualSkillCss = fs.readFileSync(path.join(source, 'visuals-skills.css'), 'utf8');
const visualSkill = fs.readFileSync(path.join(source, 'visuals-skills.js'), 'utf8');
const visualPortalCss = fs.readFileSync(path.join(source, 'visuals-portals.css'), 'utf8');
const visualPortal = fs.readFileSync(path.join(source, 'visuals-portals.js'), 'utf8');
const dashboardPolishCss = fs.readFileSync(path.join(source, 'dashboard-polish.css'), 'utf8');
const dashboardPolish = fs.readFileSync(path.join(source, 'dashboard-polish.js'), 'utf8');
const progressionSyncCss = fs.readFileSync(path.join(source, 'progression-sync.css'), 'utf8');
const progressionSync = fs.readFileSync(path.join(source, 'progression-sync.js'), 'utf8');
const progressionLevelHook = fs.readFileSync(path.join(source, 'progression-level-hook.js'), 'utf8');

JSON.parse(guideJson);
if (!css.includes('.sidebar') || !app.includes('GUIDE_DATA')) {
  throw new Error('Runtime verification failed');
}

let html = fs.readFileSync(path.join(source, 'index.html'), 'utf8');
html = html.replaceAll('?v=0.8.0', `?v=${assetVersion}`);
html = html.replace('</head>', `  <link rel="stylesheet" href="visuals.css?v=${assetVersion}">\n  <link rel="stylesheet" href="visuals-db.css?v=${assetVersion}">\n  <link rel="stylesheet" href="visuals-npc.css?v=${assetVersion}">\n  <link rel="stylesheet" href="visuals-skills.css?v=${assetVersion}">\n  <link rel="stylesheet" href="visuals-portals.css?v=${assetVersion}">\n  <link rel="stylesheet" href="dashboard-polish.css?v=${assetVersion}">\n  <link rel="stylesheet" href="progression-sync.css?v=${assetVersion}">\n</head>`);
html = html.replace('</body>', `  <script src="visuals.js?v=${assetVersion}"></script>\n  <script src="visuals-db.js?v=${assetVersion}"></script>\n  <script src="visuals-npc.js?v=${assetVersion}"></script>\n  <script src="visuals-skills.js?v=${assetVersion}"></script>\n  <script src="visuals-portals.js?v=${assetVersion}"></script>\n  <script src="dashboard-polish.js?v=${assetVersion}"></script>\n  <script src="progression-sync.js?v=${assetVersion}"></script>\n  <script src="progression-level-hook.js?v=${assetVersion}"></script>\n</body>`);
fs.writeFileSync(path.join(out, 'index.html'), html);
fs.copyFileSync(path.join(source, 'manifest.webmanifest'), path.join(out, 'manifest.webmanifest'));
fs.writeFileSync(path.join(out, 'styles.css'), css);
fs.writeFileSync(path.join(out, 'visuals.css'), visualCss);
fs.writeFileSync(path.join(out, 'visuals-db.css'), visualDbCss);
fs.writeFileSync(path.join(out, 'visuals-npc.css'), visualNpcCss);
fs.writeFileSync(path.join(out, 'visuals-skills.css'), visualSkillCss);
fs.writeFileSync(path.join(out, 'visuals-portals.css'), visualPortalCss);
fs.writeFileSync(path.join(out, 'dashboard-polish.css'), dashboardPolishCss);
fs.writeFileSync(path.join(out, 'progression-sync.css'), progressionSyncCss);
fs.writeFileSync(path.join(out, 'guide-data.js'), `window.GUIDE_DATA = ${guideJson};\n`);
fs.writeFileSync(path.join(out, 'app.js'), app);
fs.writeFileSync(path.join(out, 'visuals.js'), visuals);
fs.writeFileSync(path.join(out, 'visuals-db.js'), visualDb);
fs.writeFileSync(path.join(out, 'visuals-npc.js'), visualNpc);
fs.writeFileSync(path.join(out, 'visuals-skills.js'), visualSkill);
fs.writeFileSync(path.join(out, 'visuals-portals.js'), visualPortal);
fs.writeFileSync(path.join(out, 'dashboard-polish.js'), dashboardPolish);
fs.writeFileSync(path.join(out, 'progression-sync.js'), progressionSync);
fs.writeFileSync(path.join(out, 'progression-level-hook.js'), progressionLevelHook);
fs.writeFileSync(path.join(out, 'build-info.txt'), `MapleStory Classic Builder ${assetVersion}\n`);

const sw = `const CACHE='maplestory-classic-builder-${assetVersion}';\nconst CORE=['./','./index.html','./styles.css?v=${assetVersion}','./visuals.css?v=${assetVersion}','./visuals-db.css?v=${assetVersion}','./visuals-npc.css?v=${assetVersion}','./visuals-skills.css?v=${assetVersion}','./visuals-portals.css?v=${assetVersion}','./dashboard-polish.css?v=${assetVersion}','./progression-sync.css?v=${assetVersion}','./guide-data.js?v=${assetVersion}','./app.js?v=${assetVersion}','./visuals.js?v=${assetVersion}','./visuals-db.js?v=${assetVersion}','./visuals-npc.js?v=${assetVersion}','./visuals-skills.js?v=${assetVersion}','./visuals-portals.js?v=${assetVersion}','./dashboard-polish.js?v=${assetVersion}','./progression-sync.js?v=${assetVersion}','./progression-level-hook.js?v=${assetVersion}','./manifest.webmanifest'];\nself.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).catch(()=>{}));});\nself.addEventListener('activate',e=>{e.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('maplestory-classic-builder-')&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()]));});\nself.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);if(u.origin!==self.location.origin)return;e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});return r;}).catch(()=>caches.match(e.request).then(x=>x||caches.match('./index.html'))));});\n`;
fs.writeFileSync(path.join(out, 'sw.js'), sw);

console.log(`Built ${assetVersion}: CSS ${css.length} bytes, guide ${guideJson.length} bytes, app ${app.length} bytes, visuals ${visuals.length} bytes, DB visuals ${visualDb.length} bytes, NPC visuals ${visualNpc.length} bytes, skill visuals ${visualSkill.length} bytes, portal visuals ${visualPortal.length} bytes, dashboard polish ${dashboardPolish.length} bytes, progression sync ${progressionSync.length} bytes, progression level hook ${progressionLevelHook.length} bytes.`);
