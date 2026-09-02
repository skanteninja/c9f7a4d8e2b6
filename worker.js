const VERSION = '0.8.1-direct4';
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

function response(body, type, extra = {}) {
  return new Response(body, {
    headers: {
      'content-type': type,
      'cache-control': 'no-cache, no-store, must-revalidate',
      'x-msclassic-build': VERSION,
      ...extra,
    },
  });
}

function cleanupScript() {
  return `<script>window.__MSCLASSIC_BUILD='${VERSION}';if('serviceWorker'in navigator){navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister())).catch(()=>{});}if(window.caches){caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('maplestory-classic-builder-')||k.startsWith('ultimate-il-guide-')).map(k=>caches.delete(k)))).catch(()=>{});}</script>`;
}

function patchIndex(html) {
  let out = html
    .replace(/styles\.css\?v=0\.8\.0/g, 'styles-v081.css?v=0.8.1')
    .replace(/<script src="guide-data\.js\?v=0\.8\.0"><\/script>\s*<script src="app\.js\?v=0\.8\.0"><\/script>/g, '<script src="app-v081.js?v=0.8.1"></script>');
  if (!out.includes('__MSCLASSIC_BUILD')) out = out.replace('</head>', `${cleanupScript()}\n</head>`);
  return out;
}

function retirementServiceWorker() {
  return `const PREFIXES=['maplestory-classic-builder-','ultimate-il-guide-'];\nself.addEventListener('install',e=>self.skipWaiting());\nself.addEventListener('activate',e=>e.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>PREFIXES.some(p=>k.startsWith(p))).map(k=>caches.delete(k)))),self.registration.unregister(),self.clients.claim()])));\n`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/styles-v081.css' || url.pathname === '/styles.css') {
        return response(await readRuntime(env, 'styles'), MIME.styles);
      }

      if (url.pathname === '/app-v081.js') {
        const [json, app] = await Promise.all([readRuntime(env, 'guide'), readRuntime(env, 'app')]);
        JSON.parse(json);
        const bundle = `window.__MSCLASSIC_BUILD='${VERSION}';\nwindow.GUIDE_DATA = ${json};\n${app}`;
        return response(bundle, MIME.app);
      }

      // Kept temporarily for old tabs while the versioned bundle takes over.
      if (url.pathname === '/app.js') {
        return response(await readRuntime(env, 'app'), MIME.app);
      }
      if (url.pathname === '/guide-data.js') {
        const json = await readRuntime(env, 'guide');
        JSON.parse(json);
        return response(`window.GUIDE_DATA = ${json};\n`, MIME.guide);
      }
      if (url.pathname === '/sw.js') {
        return response(retirementServiceWorker(), 'application/javascript; charset=utf-8');
      }
      if (url.pathname === '/build-info.txt') {
        return response(`MapleStory Classic Builder ${VERSION}\n`, 'text/plain; charset=utf-8');
      }
      if (url.pathname === '/runtime-health.json') {
        const [css, json, app] = await Promise.all([readRuntime(env, 'styles'), readRuntime(env, 'guide'), readRuntime(env, 'app')]);
        JSON.parse(json);
        return response(JSON.stringify({ ok: true, version: VERSION, cssBytes: css.length, guideBytes: json.length, appBytes: app.length, atomicBundle: true }), 'application/json; charset=utf-8');
      }

      const asset = await env.ASSETS.fetch(request);
      if ((url.pathname === '/' || url.pathname === '/index.html') && asset.ok) {
        const html = patchIndex(await asset.text());
        return response(html, 'text/html; charset=utf-8');
      }
      const headers = new Headers(asset.headers);
      headers.set('x-msclassic-build', VERSION);
      return new Response(asset.body, { status: asset.status, statusText: asset.statusText, headers });
    } catch (err) {
      return response(`Runtime error: ${err?.message || err}`, 'text/plain; charset=utf-8', { 'x-msclassic-error': '1' });
    }
  },
};
