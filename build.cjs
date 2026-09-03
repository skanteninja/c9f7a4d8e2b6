const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = __dirname;
const source = path.join(root, 'public');
const runtime = path.join(source, 'assets', 'runtime');
const repairs = path.join(source, 'repairs');
const out = path.join(root, 'dist');
const assetVersion = '0.8.1-static1';
const BRAND = 'Top Classic World Maplestory';

function readChunk(name) {
  const directRepair = path.join(repairs, name);
  if (fs.existsSync(directRepair)) return fs.readFileSync(directRepair, 'utf8');
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

function ownedUrls(text) {
  return String(text)
    .replaceAll('https://raw.githubusercontent.com/ohmi69/osms_datamine_dashboard/main/', '/game-data/')
    .replaceAll('https://meowdb.com/msclassic/api/assets/icons/', '/game-media/icons/')
    .replaceAll('https://api.dreamms.gg/api/GMS/latest/item/', '/game-media/items/primary/')
    .replaceAll('https://api.dreamms.gg/api/GMS/latest/pet/', '/game-media/pets/')
    .replaceAll('https://maplestory.io/api/GMS/83/item/', '/game-media/items/fallback/')
    .replaceAll('https://maplestory.io/api/wz/img/GMS/83/Skill/', '/game-media/skills/');
}

function publicScript(text) {
  return ownedUrls(text)
    .replaceAll('OSMS', 'TCW')
    .replaceAll('Osms', 'Tcw')
    .replaceAll('osms', 'tcw')
    .replaceAll('COT2', 'CURRENT')
    .replaceAll('Cot2', 'Current')
    .replaceAll('cot2', 'current');
}

function sanitizePublicGuide(value, key = '') {
  if (Array.isArray(value)) {
    return value.map(v => sanitizePublicGuide(v, key)).filter(v => v !== undefined);
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (/(?:source|provider|evidence|provenance|audit|canonical|spreadsheet|launchscope|legacyparity|parityexamples|questcoverage|questaudit)/i.test(k)) continue;
      const clean = sanitizePublicGuide(v, k);
      if (clean !== undefined) out[k] = clean;
    }
    return out;
  }
  if (typeof value === 'string') {
    let clean = ownedUrls(value);
    if (/https?:\/\//i.test(clean)) return undefined;
    clean = clean
      .replace(/\bCOT2\b/gi, 'current')
      .replace(/\bCOT1\b/gi, 'earlier')
      .replace(/\bOSMS\b/gi, 'Top Classic World')
      .replace(/pre[- ]launch/gi, 'current')
      .replace(/\s{2,}/g, ' ')
      .trim();
    return clean;
  }
  return value;
}

function publicGuide(raw) {
  const data = JSON.parse(raw);
  if (data.meta) {
    data.meta = {
      title: BRAND,
      version: data.meta.version,
      builtAt: data.meta.builtAt,
      maxLevel: data.meta.maxLevel,
      recommendationPolicy: data.meta.recommendationPolicy
    };
  }
  if (Array.isArray(data.sources)) data.sources = [];
  return JSON.stringify(sanitizePublicGuide(data));
}

function patchApp(raw) {
  let app = ownedUrls(raw).replaceAll('MapleStory Classic Builder', BRAND);

  const oldSetLevel = `function setLevel(level){\n    state.level=Math.max(1,Math.min(Number(D.meta.maxLevel)||70,Number(level)||1));\n    save();\n    renderAll();\n  }`;
  const newSetLevel = `function preserveLoadedImages(root,render){\n    const pool=new Map();\n    if(root) root.querySelectorAll('img[src]').forEach(img=>{\n      const key=[img.getAttribute('src')||'',img.alt||'',img.className||''].join('¦');\n      if(!pool.has(key))pool.set(key,[]);\n      pool.get(key).push(img);\n    });\n    render();\n    if(!root)return;\n    root.querySelectorAll('img[src]').forEach(img=>{\n      const key=[img.getAttribute('src')||'',img.alt||'',img.className||''].join('¦');\n      const old=pool.get(key)?.shift();\n      if(old&&old!==img&&old.complete&&old.naturalWidth>0)img.replaceWith(old);\n    });\n  }\n  function renderLevelPage(){\n    const p=state.page;\n    const root=document.querySelector('.page[data-page="'+p+'"]');\n    preserveLoadedImages(root,()=>{\n      if(p==='dashboard')renderDashboard();\n      else if(p==='builds')renderBuildLibrary();\n      else if(p==='leveling')renderRoutes();\n      else if(p==='quests')renderQuests();\n      else if(p==='equipment'){renderWeapons();renderEquipment('equipment-window-page','build-summary-page');}\n      else if(p==='skills')renderSkills();\n      else if(p==='etc')renderEtc();\n      else if(p==='formulas')renderFormulas();\n    });\n  }\n  function setLevel(level){\n    const next=Math.max(1,Math.min(Number(D.meta.maxLevel)||70,Number(level)||1));\n    if(next===state.level)return;\n    state.level=next;\n    save();\n    const a=document.getElementById('level-select'),b=document.getElementById('hero-level-select'),r=document.getElementById('level-range');\n    if(a)a.value=String(next);if(b)b.value=String(next);if(r)r.value=String(next);\n    document.documentElement.dataset.levelUpdate='1';\n    renderLevelPage();\n    requestAnimationFrame(()=>document.documentElement.removeAttribute('data-level-update'));\n  }`;
  if (!app.includes(oldSetLevel)) throw new Error('setLevel patch target missing');
  app = app.replace(oldSetLevel, newSetLevel);

  const pageHook = `if(p==='equipment') renderEquipment('equipment-window-page','build-summary-page');`;
  if (!app.includes(pageHook)) throw new Error('setPage patch target missing');
  app = app.replace(pageHook, `if(p==='dashboard') renderDashboard();\n    if(p==='leveling') renderRoutes();\n    if(p==='quests') renderQuests();\n    if(p==='skills') renderSkills();\n    if(p==='etc') renderEtc();\n    if(p==='equipment'){renderWeapons();renderEquipment('equipment-window-page','build-summary-page');}`);

  app = app.replace(
    `function evidenceLabel(item){\n    const e=String(item?.['Evidence Class']||'UNVERIFIED');\n    if(e.includes('HISTORICAL')) return 'HISTORICAL ONLY';\n    if(e.includes('PRE-LAUNCH')) return 'COT2 · VERIFY LAUNCH';\n    if(e.includes('CURRENT')) return 'COT2 VERIFIED';\n    return 'UNVERIFIED';\n  }`,
    `function evidenceLabel(){ return ''; }`
  );

  app = app.replaceAll('COT2 client export via OSMS', 'Top Classic World database');
  app = app.replaceAll('Current COT2 metadata', 'Current game data');
  app = app.replaceAll('current COT2 client visual', 'game artwork');
  app = app.replaceAll('COT2 skill', 'Skill');
  app = app.replaceAll('COT2 map', 'Map');
  app = app.replaceAll('COT2 monster', 'Monster');
  app = app.replaceAll('COT2 needs', 'Needs');
  app = app.replaceAll('COT2 rewards', 'Rewards');

  // Do not expose provider/source implementation fields in public Database metadata cards.
  app = app.replace(
    `Object.entries(row).filter(([k])=>!k.startsWith('__'))`,
    `Object.entries(row).filter(([k])=>!k.startsWith('__')&&!/(?:source|provider|origin|url|thumbnail|gif|hash)/i.test(k))`
  );

  // Hidden research/agent pages are not part of the public render cycle anymore.
  app = app.replace(
    `renderDashboard();renderBuildLibrary();renderRoutes();renderQuests();renderWeapons();renderSkills();renderEtc();renderResearch();renderData();`,
    `renderDashboard();renderBuildLibrary();renderRoutes();renderQuests();renderWeapons();renderSkills();renderEtc();`
  );
  app = app.replace(`page:raw.page||'dashboard',`, `page:['research','data','formulas'].includes(raw.page)?'dashboard':(raw.page||'dashboard'),`);

  // Dashboard queues use the physical space available in the equal-height action row.
  app = app.replace(
    `.sort((a,b)=>(rank[a.Priority]??9)-(rank[b.Priority]??9)||Number(a.Lv||0)-Number(b.Lv||0)).slice(0,4);`,
    `.sort((a,b)=>(rank[a.Priority]??9)-(rank[b.Priority]??9)||Number(a.Lv||0)-Number(b.Lv||0)).slice(0,8);`
  );
  app = app.replace(
    `.sort((a,b)=>Number(a['Start Lv']||99)-Number(b['Start Lv']||99)).slice(0,6);`,
    `.sort((a,b)=>Number(a['Start Lv']||99)-Number(b['Start Lv']||99)).slice(0,12);`
  );
  return app;
}

function removePageSection(html, page) {
  const startRe = new RegExp(`<section\\s+data-page=\"${page}\"\\b`, 'i');
  const match = startRe.exec(html);
  if (!match) return html;
  const tokenRe = /<\\/?section\\b[^>]*>/gi;
  tokenRe.lastIndex = match.index;
  let depth = 0;
  let end = -1;
  let token;
  while ((token = tokenRe.exec(html))) {
    if (/^<section\\b/i.test(token[0])) depth += 1;
    else depth -= 1;
    if (depth === 0) { end = tokenRe.lastIndex; break; }
  }
  if (end < 0) throw new Error(`Could not remove ${page} page section`);
  return html.slice(0, match.index) + html.slice(end);
}

function patchHtml(raw) {
  let html = raw.replaceAll('MapleStory Classic Builder', BRAND);
  html = html.replace('<div class="brand-title">CLASSIC BUILDER</div>', '<div class="brand-title">TOP CLASSIC WORLD</div>');
  html = html.replace('<div class="brand-sub">Top Classic World Maplestory</div>', '<div class="brand-sub">Maplestory · Classic World</div>');
  html = html.replace(/\s*<div class="beta-banner">[\s\S]*?<\/div>\s*/, '\n');
  html = html.replace(/\s*<section class="v7-audit-strip v72-audit-top"[\s\S]*?<\/section>\s*/, '\n');
  html = html.replace(/\s*<div class="nav-section-label">(?:PLAY|DATABASE|META)<\/div>\s*/g, '\n');
  html = html.replace(/\s*<button data-page="research"[^>]*>[\s\S]*?<\/button>\s*/, '\n');
  html = html.replace(/\s*<button data-page="data"[^>]*>[\s\S]*?<\/button>\s*/, '\n');
  html = html.replace(/\s*<button data-page="formulas"[^>]*>[\s\S]*?<\/button>\s*/, '\n');
  html = html.replace('<div><b>Headless data source attached</b><small>Website is the main interface</small></div>', '<div><b>Top Classic World</b><small>Database online</small></div>');
  html = html.replace('<span id="atlas-beta-pill" class="beta-tag">COT2-AWARE</span>', '');

  html = html.replace(
    '<section data-page="classicdb" class="page"><div class="db-hero"><div><span class="eyebrow">OSMS · CURRENT COT2 CLIENT EXPORT</span><h2>Classic Database</h2><p>Search the broad COT2 metadata layer without mixing it into curated I/L recommendations.</p></div><div class="db-provider-badge"><b>Provider</b><span>OSMS Data Explorer</span></div></div>',
    '<section data-page="classicdb" class="page"><div class="db-hero"><div><span class="eyebrow">TOP CLASSIC WORLD</span><h2>Database</h2><p>Search items, equipment, monsters, maps, quests, skills, crafting and portals in one place.</p></div></div>'
  );
  html = html.replace(
    '<section data-page="cashshop" class="page"><div class="db-hero"><div><span class="eyebrow">COT2 CATALOG · PRICES ARE BETA DATA</span><h2>Cash Shop</h2><p>Browse the client-exported catalog. Availability and prices stay visibly pre-launch until live confirmation.</p></div><span class="beta-tag">COT2 / VERIFY LIVE</span></div>',
    '<section data-page="cashshop" class="page"><div class="db-hero"><div><span class="eyebrow">TOP CLASSIC WORLD</span><h2>Cash Shop</h2><p>Browse the current catalog, prices and availability.</p></div></div>'
  );
  html = html.replace(
    '<section data-page="beauty" class="page"><div class="db-hero"><div><span class="eyebrow">COT2 CLIENT CATALOG</span><h2>Beauty</h2><p>Hair and face styles with exact IDs and current exported artwork.</p></div></div>',
    '<section data-page="beauty" class="page"><div class="db-hero"><div><span class="eyebrow">TOP CLASSIC WORLD</span><h2>Beauty</h2><p>Hair and face styles with exact IDs and artwork.</p></div></div>'
  );
  for (const page of ['research','data','formulas']) html = removePageSection(html, page);
  return html;
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const css = readChunks('styles', 3);
const guideJson = publicGuide(readChunks('guide', 6));
const app = publicScript(patchApp(readChunks('app', 4)));
const visualCss = fs.readFileSync(path.join(source, 'visuals.css'), 'utf8');
const visuals = publicScript(fs.readFileSync(path.join(source, 'visuals.js'), 'utf8'));
const visualDbCss = fs.readFileSync(path.join(source, 'visuals-db.css'), 'utf8');
const visualDb = publicScript(fs.readFileSync(path.join(source, 'visuals-db.js'), 'utf8'));
const visualNpcCss = fs.readFileSync(path.join(source, 'visuals-npc.css'), 'utf8');
const visualNpc = publicScript(fs.readFileSync(path.join(source, 'visuals-npc.js'), 'utf8'));
const visualSkillCss = fs.readFileSync(path.join(source, 'visuals-skills.css'), 'utf8');
const visualSkill = publicScript(fs.readFileSync(path.join(source, 'visuals-skills.js'), 'utf8'));
const visualPortalCss = fs.readFileSync(path.join(source, 'visuals-portals.css'), 'utf8');
const visualPortal = publicScript(fs.readFileSync(path.join(source, 'visuals-portals.js'), 'utf8'));
const dashboardPolishCss = fs.readFileSync(path.join(source, 'dashboard-polish.css'), 'utf8');
const dashboardPolish = publicScript(fs.readFileSync(path.join(source, 'dashboard-polish.js'), 'utf8'));
const progressionSyncCss = fs.readFileSync(path.join(source, 'progression-sync.css'), 'utf8');
const progressionSync = publicScript(fs.readFileSync(path.join(source, 'progression-sync.js'), 'utf8'));
const progressionLevelHook = fs.readFileSync(path.join(source, 'progression-level-hook.js'), 'utf8');
const progressionSkillState = fs.readFileSync(path.join(source, 'progression-skill-state.js'), 'utf8');
const progressionGearVisualCss = fs.readFileSync(path.join(source, 'progression-gear-visual.css'), 'utf8');
const progressionGearVisual = fs.readFileSync(path.join(source, 'progression-gear-visual.js'), 'utf8');
const ownershipUiCss = fs.readFileSync(path.join(source, 'ownership-ui.css'), 'utf8');
const ownershipUi = fs.readFileSync(path.join(source, 'ownership-ui.js'), 'utf8');

JSON.parse(guideJson);
if (!css.includes('.sidebar') || !app.includes('GUIDE_DATA')) throw new Error('Runtime verification failed');

let html = patchHtml(fs.readFileSync(path.join(source, 'index.html'), 'utf8'));
html = html.replaceAll('?v=0.8.0', `?v=${assetVersion}`);
html = html.replace('</head>', `  <link rel="stylesheet" href="visuals.css?v=${assetVersion}">\n  <link rel="stylesheet" href="visuals-db.css?v=${assetVersion}">\n  <link rel="stylesheet" href="visuals-npc.css?v=${assetVersion}">\n  <link rel="stylesheet" href="visuals-skills.css?v=${assetVersion}">\n  <link rel="stylesheet" href="visuals-portals.css?v=${assetVersion}">\n  <link rel="stylesheet" href="dashboard-polish.css?v=${assetVersion}">\n  <link rel="stylesheet" href="progression-sync.css?v=${assetVersion}">\n  <link rel="stylesheet" href="progression-gear-visual.css?v=${assetVersion}">\n  <link rel="stylesheet" href="ownership-ui.css?v=${assetVersion}">\n</head>`);
html = html.replace('</body>', `  <script src="visuals.js?v=${assetVersion}"></script>\n  <script src="visuals-db.js?v=${assetVersion}"></script>\n  <script src="visuals-npc.js?v=${assetVersion}"></script>\n  <script src="visuals-skills.js?v=${assetVersion}"></script>\n  <script src="visuals-portals.js?v=${assetVersion}"></script>\n  <script src="dashboard-polish.js?v=${assetVersion}"></script>\n  <script src="progression-sync.js?v=${assetVersion}"></script>\n  <script src="progression-level-hook.js?v=${assetVersion}"></script>\n  <script src="progression-skill-state.js?v=${assetVersion}"></script>\n  <script src="progression-gear-visual.js?v=${assetVersion}"></script>\n  <script src="ownership-ui.js?v=${assetVersion}"></script>\n</body>`);

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
fs.writeFileSync(path.join(out, 'progression-gear-visual.css'), progressionGearVisualCss);
fs.writeFileSync(path.join(out, 'ownership-ui.css'), ownershipUiCss);
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
fs.writeFileSync(path.join(out, 'progression-skill-state.js'), progressionSkillState);
fs.writeFileSync(path.join(out, 'progression-gear-visual.js'), progressionGearVisual);
fs.writeFileSync(path.join(out, 'ownership-ui.js'), ownershipUi);
fs.writeFileSync(path.join(out, 'build-info.txt'), `${BRAND} ${assetVersion}\n`);

const sw = `const CACHE='top-classic-world-${assetVersion}';\nconst CORE=['./','./index.html','./styles.css?v=${assetVersion}','./visuals.css?v=${assetVersion}','./visuals-db.css?v=${assetVersion}','./visuals-npc.css?v=${assetVersion}','./visuals-skills.css?v=${assetVersion}','./visuals-portals.css?v=${assetVersion}','./dashboard-polish.css?v=${assetVersion}','./progression-sync.css?v=${assetVersion}','./progression-gear-visual.css?v=${assetVersion}','./ownership-ui.css?v=${assetVersion}','./guide-data.js?v=${assetVersion}','./app.js?v=${assetVersion}','./visuals.js?v=${assetVersion}','./visuals-db.js?v=${assetVersion}','./visuals-npc.js?v=${assetVersion}','./visuals-skills.js?v=${assetVersion}','./visuals-portals.js?v=${assetVersion}','./dashboard-polish.js?v=${assetVersion}','./progression-sync.js?v=${assetVersion}','./progression-level-hook.js?v=${assetVersion}','./progression-skill-state.js?v=${assetVersion}','./progression-gear-visual.js?v=${assetVersion}','./ownership-ui.js?v=${assetVersion}','./manifest.webmanifest'];\nself.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).catch(()=>{}));});\nself.addEventListener('activate',e=>{e.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('top-classic-world-')&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()]));});\nself.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);if(u.origin!==self.location.origin)return;e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});return r;}).catch(()=>caches.match(e.request).then(x=>x||caches.match('./index.html'))));});\n`;
fs.writeFileSync(path.join(out, 'sw.js'), sw);

console.log(`Built ${assetVersion}: CSS ${css.length} bytes, guide ${guideJson.length} bytes, app ${app.length} bytes, visuals ${visuals.length} bytes, DB visuals ${visualDb.length} bytes, NPC visuals ${visualNpc.length} bytes, skill visuals ${visualSkill.length} bytes, portal visuals ${visualPortal.length} bytes, dashboard polish ${dashboardPolish.length} bytes, progression sync ${progressionSync.length} bytes, progression level hook ${progressionLevelHook.length} bytes, progression skill state ${progressionSkillState.length} bytes, progression gear visual ${progressionGearVisual.length} bytes, ownership UI ${ownershipUi.length} bytes.`);
