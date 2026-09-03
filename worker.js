const ORIGIN_RAW = 'https://raw.githubusercontent.com/ohmi69/osms_datamine_dashboard/main/';
const MEOW = 'https://meowdb.com/msclassic/api/assets/icons/';
const DREAM_ITEM = 'https://api.dreamms.gg/api/GMS/latest/item/';
const DREAM_PET = 'https://api.dreamms.gg/api/GMS/latest/pet/';
const MAPLE_ITEM = 'https://maplestory.io/api/GMS/83/item/';
const MAPLE_SKILL = 'https://maplestory.io/api/wz/img/GMS/83/Skill/';

function upstreamFor(url) {
  const p = url.pathname;
  if (p.startsWith('/game-origin/')) return ORIGIN_RAW + p.slice('/game-origin/'.length) + url.search;
  if (p.startsWith('/game-art/meow/icons/')) return MEOW + p.slice('/game-art/meow/icons/'.length) + url.search;
  if (p.startsWith('/game-art/dream/item/')) return DREAM_ITEM + p.slice('/game-art/dream/item/'.length) + url.search;
  if (p.startsWith('/game-art/dream/pet/')) return DREAM_PET + p.slice('/game-art/dream/pet/'.length) + url.search;
  if (p.startsWith('/game-art/mapleio/item/')) return MAPLE_ITEM + p.slice('/game-art/mapleio/item/'.length) + url.search;
  if (p.startsWith('/game-art/mapleio/skill/')) return MAPLE_SKILL + p.slice('/game-art/mapleio/skill/'.length) + url.search;
  return null;
}

async function ownedAsset(request, upstream, ctx) {
  const cache = caches.default;
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(upstream, {
    headers: {
      Accept: request.headers.get('Accept') || '*/*',
      'User-Agent': 'Top-Classic-World-Maplestory/1.0'
    }
  });
  if (!response.ok) return new Response('Asset unavailable', { status: response.status });

  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000');
  headers.delete('set-cookie');
  headers.delete('server');
  const owned = new Response(response.body, { status: response.status, headers });
  ctx.waitUntil(cache.put(request, owned.clone()));
  return owned;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const upstream = upstreamFor(url);
    if (upstream && request.method === 'GET') return ownedAsset(request, upstream, ctx);
    return env.ASSETS.fetch(request);
  }
};
