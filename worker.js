const MAP_GATEWAY_REVISION = 'gms83-world-sheets-v2';
const CURRENT_DATA = 'https://raw.githubusercontent.com/ohmi69/osms_datamine_dashboard/main/';
const ICON_MEDIA = 'https://meowdb.com/msclassic/api/assets/icons/';
const WORLD_MAP_MEDIA = 'https://meowdb.com/msclassic/worldmap/';
const PET_MEDIA = 'https://api.dreamms.gg/api/GMS/latest/pet/';
const CHARACTER_MEDIA = 'https://api.dreamms.gg/api/GMS/latest/character/';
const CLASSIC_AVATAR_PREVIEW = 'https://meowdb.com/msclassic/api/avatar-preview';
const MONSTER_MEDIA = 'https://api.dreamms.gg/api/GMS/latest/mob/';
const ITEM_MEDIA_FALLBACK = 'https://maplestory.io/api/GMS/83/item/';
const SKILL_MEDIA = 'https://maplestory.io/api/wz/img/GMS/83/Skill/';

function safeMediaPath(value) {
  return /^[a-z0-9/_\-.]+$/i.test(value) ? value : null;
}


const CLASSIC_AVATAR_SLOT_QUERY = Object.freeze([
  ['hat','hat'],['eye','eye'],['face_acc','face_acc'],['earring','earring'],
  ['top','top'],['overall','overall'],['bottom','bottom'],['shoes','shoes'],
  ['gloves','gloves'],['cape','cape'],['shield','shield'],['weapon','weapon']
]);

function classicAvatarNumber(url, key, allowZero=false) {
  const raw = url.searchParams.get(key);
  if (raw === null || !/^\d{1,9}$/.test(raw)) return null;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) return null;
  return value;
}

function classicAvatarRequestBody(url) {
  const regularEquipment = {};
  for (const [queryKey, apiKey] of CLASSIC_AVATAR_SLOT_QUERY) {
    const value = classicAvatarNumber(url, queryKey);
    if (value !== null) regularEquipment[apiKey] = value;
  }
  if (regularEquipment.overall !== undefined) {
    delete regularEquipment.top;
    delete regularEquipment.bottom;
  }
  return {
    appearance: {
      skin: classicAvatarNumber(url, 'skin', true) ?? 0,
      hairId: classicAvatarNumber(url, 'hair') ?? 30000,
      faceId: classicAvatarNumber(url, 'face') ?? 20000,
      cashEquipment: {},
      regularEquipment,
      emote: null
    },
    direction: 'right',
    frame: 0,
    expression: 'default',
    pose: 'stand'
  };
}

async function classicAvatarAsset(request, url, ctx) {
  const cache = caches.default;
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(CLASSIC_AVATAR_PREVIEW, {
    method: 'POST',
    redirect: 'follow',
    headers: {
      Accept: 'image/png',
      'Content-Type': 'application/json',
      'User-Agent': 'Top-Classic-World-Maplestory/1.0'
    },
    body: JSON.stringify(classicAvatarRequestBody(url))
  });
  if (!response.ok) return new Response('Classic avatar unavailable', { status: response.status });
  const headers = new Headers();
  headers.set('Content-Type', response.headers.get('Content-Type') || 'image/png');
  headers.set('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000');
  headers.set('X-Content-Type-Options', 'nosniff');
  const owned = new Response(response.body, { status: 200, headers });
  ctx.waitUntil(cache.put(request, owned.clone()));
  return owned;
}

function upstreamFor(url) {
  const p = url.pathname;
  const emblem=p.match(/^\/game-media\/class-emblems\/(Beginner|Warrior|Magician|Bowman|Thief)\.png$/);
  if(emblem)return 'https://media.maplestorywiki.net/yetidb/Class_'+emblem[1]+'.png';
  if (p.startsWith('/game-data/')) return CURRENT_DATA + p.slice('/game-data/'.length) + url.search;
  if (p.startsWith('/game-media/icons/')) return ICON_MEDIA + p.slice('/game-media/icons/'.length) + url.search;
  if (p.startsWith('/game-media/worldmap/')) {
    const asset = safeMediaPath(p.slice('/game-media/worldmap/'.length));
    return asset ? WORLD_MAP_MEDIA + asset + url.search : null;
  }
  // Item IDs are served from the MapleStory Classic icon catalog.  The old
  // DreamMS/GMS route reused IDs from a different item table (1050003 was
  // returned as a magician robe), so it could show the wrong class artwork.
  const primaryItem = p.match(/^\/game-media\/items\/primary\/(\d+)(?:\/icon)?$/);
  if (primaryItem) return ICON_MEDIA + primaryItem[1];
  if (p.startsWith('/game-media/pets/')) return PET_MEDIA + p.slice('/game-media/pets/'.length) + url.search;
  if (p === '/game-media/characters/classic-preview') return null;
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

async function rewriteClassicVisualScript(request, env) {
  const asset = await env.ASSETS.fetch(request);
  if (!asset.ok) return asset;
  let body = await asset.text();
  body = body
    .replace("const REPO_RAW = 'https://raw.githubusercontent.com/ohmi69/osms_datamine_dashboard/main/';", "const REPO_RAW = '/game-data/';")
    .replace("const RAW = `${REPO_RAW}data/current/`;", "const RAW = '/game-data/data/current/';");
  const headers = new Headers(asset.headers);
  headers.set('Content-Type', 'application/javascript; charset=utf-8');
  headers.set('Cache-Control', 'public, max-age=300, s-maxage=300');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(body, { status: asset.status, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === 'GET' && ['/visuals.js','/visuals-db.js','/visuals-npc.js'].includes(url.pathname)) return rewriteClassicVisualScript(request, env);
    if (request.method === 'GET' && url.pathname === '/game-media/characters/classic-preview') return classicAvatarAsset(request, url, ctx);
    const upstream = upstreamFor(url);
    if (upstream && request.method === 'GET') return ownedAsset(request, upstream, ctx);
    if (url.pathname.startsWith('/game-media/worldmap-legacy/') || url.pathname.startsWith('/game-media/legacy-map/')) return new Response('Legacy map assets are not part of the Classic beta atlas', { status: 410 });
    return env.ASSETS.fetch(request);
  }
};

// Atlas resolver checkpoint: WZ Henesys maps to the current Classic record before legacy fallback.
// Deployment checkpoint: force a fresh Cloudflare build from the verified main branch.
// Visual delivery checkpoint: Classic item/map/NPC/monster assets are same-origin through /game-data/.
