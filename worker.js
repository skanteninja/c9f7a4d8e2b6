const CURRENT_DATA = 'https://raw.githubusercontent.com/ohmi69/osms_datamine_dashboard/main/';
const ICON_MEDIA = 'https://meowdb.com/msclassic/api/assets/icons/';
const WORLD_MAP_MEDIA = 'https://meowdb.com/msclassic/worldmap/';
const ITEM_MEDIA_PRIMARY = 'https://api.dreamms.gg/api/GMS/latest/item/';
const PET_MEDIA = 'https://api.dreamms.gg/api/GMS/latest/pet/';
const CHARACTER_MEDIA = 'https://api.dreamms.gg/api/GMS/latest/character/';
const MONSTER_MEDIA = 'https://api.dreamms.gg/api/GMS/latest/mob/';
const ITEM_MEDIA_FALLBACK = 'https://maplestory.io/api/GMS/83/item/';
const SKILL_MEDIA = 'https://maplestory.io/api/wz/img/GMS/83/Skill/';
const LEGACY_MAP_MEDIA = 'https://maplestory.io/api/GMS/83/map/';
const LEGACY_WORLD_MEDIA = 'https://maplestory.io/api/wz/img/GMS/83/Map/WorldMap/';
const LEGACY_MAP_BASE = 'https://raw.githubusercontent.com/andrenogrib/gms_v83_wztoweb/main/WEB/';
const LEGACY_MAP_BUCKETS = ['Map0','Map1','Map2','Map3','Map5','Map6','Map7','Map8','Map9'];
const LEGACY_WORLD_SHEETS = {
  'maple-world':'WorldMap',
  'maple-island':'WorldMap000',
  'victoria-island':'WorldMap010',
  'nautilus':'WorldMap011',
  'sleepywood':'WorldMap012',
  'orbis-el-nath':'WorldMap020',
  'dead-mine':'WorldMap021',
  'ludus-lake':'WorldMap030',
  'clocktower':'WorldMap031',
  'aqua-road':'WorldMap040',
  'minar-forest':'WorldMap050',
  'mu-lung-garden':'WorldMap060',
  'nihal-desert':'WorldMap070',
  'temple-of-time':'WorldMap080',
  'ereve':'WorldMap090',
  'rien':'WorldMap100',
  'amoria':'WorldMap140',
  'masteria':'WorldMap141',
  'haunted-house':'WorldMap142'
};

function safeMediaPath(value) {
  return /^[a-z0-9/_\-.]+$/i.test(value) ? value : null;
}

function upstreamFor(url) {
  const p = url.pathname;
  if (p.startsWith('/game-data/')) return CURRENT_DATA + p.slice('/game-data/'.length) + url.search;
  if (p.startsWith('/game-media/icons/')) return ICON_MEDIA + p.slice('/game-media/icons/'.length) + url.search;
  if (p.startsWith('/game-media/worldmap/')) {
    const asset = safeMediaPath(p.slice('/game-media/worldmap/'.length));
    return asset ? WORLD_MAP_MEDIA + asset + url.search : null;
  }
  if (p.startsWith('/game-media/items/primary/')) return ITEM_MEDIA_PRIMARY + p.slice('/game-media/items/primary/'.length) + url.search;
  if (p.startsWith('/game-media/pets/')) return PET_MEDIA + p.slice('/game-media/pets/'.length) + url.search;
  if (p.startsWith('/game-media/characters/')) return CHARACTER_MEDIA + p.slice('/game-media/characters/'.length) + url.search;
  if (p.startsWith('/game-media/monsters/')) return MONSTER_MEDIA + p.slice('/game-media/monsters/'.length) + url.search;
  if (p.startsWith('/game-media/items/fallback/')) return ITEM_MEDIA_FALLBACK + p.slice('/game-media/items/fallback/'.length) + url.search;
  if (p.startsWith('/game-media/skills/')) return SKILL_MEDIA + p.slice('/game-media/skills/'.length) + url.search;
  return null;
}

async function ownedAsset(request, upstream, ctx) {
  const cache = caches.default;
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(upstream, {
    redirect: 'follow',
    headers: {
      Accept: request.headers.get('Accept') || '*/*',
      'User-Agent': 'Top-Classic-World-Maplestory/1.0'
    }
  });
  if (!response.ok) return new Response('Asset unavailable', { status: response.status });
  const headers = new Headers();
  headers.set('Content-Type', response.headers.get('Content-Type') || 'application/octet-stream');
  headers.set('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000');
  headers.set('X-Content-Type-Options', 'nosniff');
  const owned = new Response(response.body, { status: response.status, headers });
  ctx.waitUntil(cache.put(request, owned.clone()));
  return owned;
}

async function legacyMapIndex(request, ctx) {
  const cache = caches.default;
  const cacheUrl = new URL(request.url);
  cacheUrl.pathname = '/__tcw_cache/legacy-gms83-maps.json';
  cacheUrl.search = '';
  const cacheKey = new Request(cacheUrl.toString(), { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const responses = await Promise.all(LEGACY_MAP_BUCKETS.map(async bucket => {
    const r = await fetch(`${LEGACY_MAP_BASE}${bucket}/data.json`, { headers: { 'User-Agent': 'Top-Classic-World-Maplestory/1.0' } });
    if (!r.ok) throw new Error(`Legacy map bucket ${bucket} returned ${r.status}`);
    return { bucket, rows: await r.json() };
  }));

  const maps = [];
  for (const {bucket, rows} of responses) {
    for (const row of Array.isArray(rows) ? rows : []) {
      const f = row.fields || {};
      const id = String(row.id || f.ID || '').replace(/\D/g, '');
      if (!id) continue;
      maps.push({
        id,
        name: f.MapName || row.map_name || row.name || `Map #${id}`,
        street_name: f.StreetName || row.street_name || row.name || '',
        description: f.Description || '',
        bgm: f.Bgm || '',
        return_map: f.ReturnMap || '',
        map_mark: (String(f.Info || '').match(/(?:^|,\s*)mapMark=([^,]+)/i) || [])[1] || '',
        bucket
      });
    }
  }

  const body = JSON.stringify({ revision: 'old-school-map-catalog', count: maps.length, maps });
  const response = new Response(body, { headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000',
    'X-Content-Type-Options': 'nosniff'
  }});
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

function legacyWorldMapUpstream(pathname) {
  const match = pathname.match(/^\/game-media\/worldmap-legacy\/([a-z0-9-]+)\.png$/i);
  if (!match) return null;
  const sheet = LEGACY_WORLD_SHEETS[match[1].toLowerCase()];
  return sheet ? `${LEGACY_WORLD_MEDIA}${sheet}.img/BaseImg/0` : null;
}

function legacyMapImageUpstream(pathname) {
  const match = pathname.match(/^\/game-media\/legacy-map\/(\d{1,9})\/minimap$/);
  return match ? `${LEGACY_MAP_MEDIA}${match[1]}/minimap` : null;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/game-data/legacy/maps.json') return legacyMapIndex(request, ctx);
    if (request.method === 'GET') {
      const legacyWorld = legacyWorldMapUpstream(url.pathname);
      if (legacyWorld) return ownedAsset(request, legacyWorld, ctx);
      const legacyMap = legacyMapImageUpstream(url.pathname);
      if (legacyMap) return ownedAsset(request, legacyMap, ctx);
    }
    const upstream = upstreamFor(url);
    if (upstream && request.method === 'GET') return ownedAsset(request, upstream, ctx);
    if (url.pathname.startsWith('/game-media/worldmap/') || url.pathname.startsWith('/game-media/worldmap-legacy/') || url.pathname.startsWith('/game-media/legacy-map/')) return new Response('Invalid map asset path', { status: 400 });
    return env.ASSETS.fetch(request);
  }
};
