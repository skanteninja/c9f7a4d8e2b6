const VERSION = '0.8.0-direct3';
const COUNTS = { styles: 3, guide: 6, app: 4 };
const MIME = {
  styles: 'text/css; charset=utf-8',
  guide: 'application/javascript; charset=utf-8',
  app: 'application/javascript; charset=utf-8',
};

const memo = new Map();

async function readRuntime(env, prefix) {
  if (memo.has(prefix)) return memo.get(prefix);
  const count = COUNTS[prefix];
  const parts = await Promise.all(
    Array.from({ length: count }, async (_, i) => {
      const name = `${prefix}.${String(i).padStart(2, '0')}.txt`;
      const r = await env.ASSETS.fetch(new Request(`https://assets.local/assets/runtime/${name}`));
      if (!r.ok) throw new Error(`${name}: ${r.status}`);
      return (await r.text()).replace(/\s+/g, '');
    })
  );
  const b64 = parts.join('');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const text = await new Response(
    new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
  ).text();
  memo.set(prefix, text);
  return text;
}

function response(body, type) {
  return new Response(body, {
    headers: {
      'content-type': type,
      'cache-control': 'no-cache, no-store, must-revalidate',
      'x-msclassic-build': VERSION,
    },
  });
}

function serviceWorker() {
  return `const CACHE='maplestory-classic-builder-${VERSION}';\nself.addEventListener('install',e=>self.skipWaiting());\nself.addEventListener('activate',e=>e.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('maplestory-classic-builder-')&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()])));\nself.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));});\n`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/styles.css') {
        return response(await readRuntime(env, 'styles'), MIME.styles);
      }
      if (url.pathname === '/app.js') {
        return response(await readRuntime(env, 'app'), MIME.app);
      }
      if (url.pathname === '/guide-data.js') {
        const json = await readRuntime(env, 'guide');
        JSON.parse(json);
        return response(`window.GUIDE_DATA = ${json};\n`, MIME.guide);
      }
      if (url.pathname === '/sw.js') {
        return response(serviceWorker(), 'application/javascript; charset=utf-8');
      }
      if (url.pathname === '/build-info.txt') {
        return response(`MapleStory Classic Builder ${VERSION}\n`, 'text/plain; charset=utf-8');
      }
      const asset = await env.ASSETS.fetch(request);
      const headers = new Headers(asset.headers);
      headers.set('x-msclassic-build', VERSION);
      if (url.pathname === '/' || url.pathname === '/index.html') {
        headers.set('cache-control', 'no-cache, no-store, must-revalidate');
      }
      return new Response(asset.body, { status: asset.status, statusText: asset.statusText, headers });
    } catch (err) {
      return response(`Runtime error: ${err?.message || err}`, 'text/plain; charset=utf-8');
    }
  },
};
