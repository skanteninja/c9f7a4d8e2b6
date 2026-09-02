(() => {
  const D = window.GUIDE_DATA;
  if (!D) return;

  const RAW = 'https://raw.githubusercontent.com/ohmi69/osms_datamine_dashboard/main/data/current/';
  const cache = new Map();
  const indexes = new Map();
  let observerTimer = null;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const norm = value => String(value ?? '').toLowerCase().replace(/\[[^\]]*\]/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
  const entityName = row => row?.name || row?.title || row?.quest_name || row?.map_name || row?.monster_name || row?.item_name || '';

  function collect(value, out = [], depth = 0) {
    if (depth > 6 || value == null) return out;
    if (Array.isArray(value)) {
      value.forEach(v => collect(v, out, depth + 1));
      return out;
    }
    if (typeof value !== 'object') return out;
    const name = entityName(value);
    if (name && value.id !== undefined) out.push(value);
    Object.values(value).forEach(v => {
      if (v && typeof v === 'object') collect(v, out, depth + 1);
    });
    return out;
  }

  async function load(file) {
    if (!cache.has(file)) {
      cache.set(file, fetch(`${RAW}${file}`, {cache:'force-cache'})
        .then(r => { if (!r.ok) throw new Error(`${file} HTTP ${r.status}`); return r.json(); })
        .catch(() => null));
    }
    return cache.get(file);
  }

  async function index(file) {
    if (!indexes.has(file)) {
      indexes.set(file, load(file).then(data => {
        const rows = collect(data || {});
        const exact = new Map();
        rows.forEach(row => {
          const name = norm(entityName(row));
          if (name && !exact.has(name)) exact.set(name, row);
        });
        return {rows, exact};
      }));
    }
    return indexes.get(file);
  }

  function idNum(row) {
    const n = Number(row?.id);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  }
  function itemImage(row) {
    const id = idNum(row); if (id == null) return '';
    return `${RAW}images/items/${String(id).padStart(8,'0')}.png`;
  }
  function mapImage(row) {
    const id = idNum(row); if (id == null) return '';
    return `${RAW}images/maps/${String(id).padStart(9,'0')}.png`;
  }
  function mobImage(row) {
    const id = idNum(row); if (id == null) return '';
    return `https://maplestory.io/api/GMS/83/mob/${id}/render/stand`;
  }

  function contained(idx, text, limit = 4, minLen = 4) {
    const hay = ` ${norm(text)} `;
    const hits = [];
    for (const row of idx.rows) {
      const name = norm(entityName(row));
      if (name.length < minLen) continue;
      if (hay.includes(` ${name} `) || hay.includes(name)) hits.push({row, len:name.length});
    }
    hits.sort((a,b) => b.len - a.len);
    const seen = new Set();
    return hits.filter(x => {
      const id = idNum(x.row);
      if (id == null || seen.has(id)) return false;
      seen.add(id); return true;
    }).slice(0, limit).map(x => x.row);
  }

  function cleanItemName(value) {
    return String(value || '')
      .replace(/\bx\s*\d+\b/ig,'')
      .replace(/×\s*\d+/g,'')
      .replace(/\([^)]*(?:verify|optional|quest|craft)[^)]*\)/ig,'')
      .trim();
  }

  function exactItem(idx, value) {
    const cleaned = cleanItemName(value);
    if (!cleaned) return null;
    const exact = idx.exact.get(norm(cleaned));
    if (exact) return exact;
    const hay = ` ${norm(cleaned)} `;
    let best = null, bestLen = 0;
    for (const [name, row] of idx.exact.entries()) {
      if (name.length < 3 || name.length <= bestLen) continue;
      if (hay.includes(` ${name} `) || hay.includes(name)) { best = row; bestLen = name.length; }
    }
    return best;
  }

  function imageNode(url, alt, kind, fallback = '') {
    const img = document.createElement('img');
    img.src = url; img.alt = alt; img.loading = 'lazy'; img.decoding = 'async';
    img.dataset.visualKind = kind;
    if (fallback) img.dataset.visualFallback = fallback;
    img.addEventListener('error', () => {
      if (img.dataset.visualFallback && !img.dataset.visualFallbackUsed) {
        img.dataset.visualFallbackUsed = '1';
        img.src = img.dataset.visualFallback;
        return;
      }
      img.closest('.visual-asset')?.classList.add('visual-missing');
    });
    return img;
  }

  function assetCard(kind, row, label, note = '') {
    const wrap = document.createElement('div');
    wrap.className = `visual-asset visual-${kind}`;
    const url = kind === 'map' ? mapImage(row) : kind === 'mob' ? mobImage(row) : itemImage(row);
    if (url) wrap.appendChild(imageNode(url, label, kind));
    const copy = document.createElement('span');
    copy.innerHTML = `<b>${esc(label)}</b>${note ? `<small>${esc(note)}</small>` : ''}`;
    wrap.appendChild(copy);
    return wrap;
  }

  function makeMedia(maps, mobs, compact = false) {
    if (!maps.length && !mobs.length) return null;
    const media = document.createElement('div');
    media.className = `visual-media-strip${compact ? ' compact' : ''}`;
    maps.forEach(row => media.appendChild(assetCard('map', row, entityName(row), 'COT2 map')));
    mobs.forEach(row => media.appendChild(assetCard('mob', row, entityName(row), 'v83 visual')));
    return media;
  }

  async function enhanceRoutes() {
    const cards = [...document.querySelectorAll('#route-cards .route-card')];
    if (!cards.length) return;
    const [mapsIdx, mobsIdx] = await Promise.all([index('maps.json'), index('monsters.json')]);
    cards.forEach((card, i) => {
      if (card.querySelector('.visual-media-strip')) return;
      const route = D.routes?.[i]; if (!route) return;
      const mapText = `${route['Primary Route'] || ''} ${route.Region || ''}`;
      const mobText = route['Main Monsters'] || '';
      const maps = contained(mapsIdx, mapText, 2, 5);
      const mobs = contained(mobsIdx, mobText, 5, 3);
      const media = makeMedia(maps, mobs);
      if (!media) return;
      card.classList.add('visualized-route');
      const title = card.querySelector('h3');
      title ? card.insertBefore(media, title) : card.appendChild(media);
    });
  }

  async function enhanceLevelDetail() {
    const root = document.getElementById('level-detail');
    if (!root || root.querySelector('.visual-media-strip')) return;
    const level = Number(document.getElementById('hero-level')?.textContent || document.getElementById('level-select')?.value || 1);
    const row = D.leveling?.find(x => Number(x.Lv) === level); if (!row) return;
    const [mapsIdx, mobsIdx] = await Promise.all([index('maps.json'), index('monsters.json')]);
    const maps = contained(mapsIdx, `${row['Primary Route'] || ''} ${row.Alternative || ''}`, 3, 5);
    const mobs = contained(mobsIdx, row['Main Monsters'] || '', 6, 3);
    const media = makeMedia(maps, mobs);
    if (media) root.appendChild(media);
  }

  async function enhanceEtc() {
    const rows = [...document.querySelectorAll('#etc-list .etc-row')];
    if (!rows.length) return;
    const idx = await index('items.json');
    rows.forEach(row => {
      if (row.querySelector('.visual-inline-item')) return;
      const nameEl = row.querySelector('.etc-name');
      const name = nameEl?.textContent?.trim(); if (!name) return;
      const item = exactItem(idx, name); if (!item) return;
      const holder = document.createElement('span');
      holder.className = 'visual-inline-item visual-asset';
      holder.title = `${name} · current COT2 client visual`;
      holder.appendChild(imageNode(itemImage(item), name, 'item'));
      nameEl.before(holder);
      row.classList.add('visualized-item-row');
    });
  }

  function splitItems(value) {
    return String(value || '').split(/\s*(?:,|\+|\band\b|\bor\b|\/+)\s*/i).map(cleanItemName).filter(Boolean);
  }

  async function enhanceQuests() {
    const rows = [...document.querySelectorAll('#quest-list .quest-row')];
    if (!rows.length) return;
    const idx = await index('items.json');
    rows.forEach(row => {
      if (row.querySelector('.visual-quest-items')) return;
      const title = row.querySelector('.quest-name')?.textContent?.trim(); if (!title) return;
      const quest = D.quests?.find(q => String(q.Quest).trim() === title); if (!quest) return;
      const raw = quest['ETC / Item To Save']; if (!raw) return;
      const found = [];
      for (const name of splitItems(raw)) {
        const item = exactItem(idx, name);
        if (item && !found.some(x => idNum(x.item) === idNum(item))) found.push({name, item});
      }
      if (!found.length) {
        const item = exactItem(idx, raw); if (item) found.push({name:entityName(item), item});
      }
      if (!found.length) return;
      const strip = document.createElement('div');
      strip.className = 'visual-quest-items';
      found.slice(0,4).forEach(({name,item}) => strip.appendChild(assetCard('item', item, name, 'save')));
      const why = row.querySelector('.quest-why');
      why ? why.before(strip) : row.appendChild(strip);
    });
  }

  async function enhanceRecipes() {
    const cards = [...document.querySelectorAll('#recipe-grid .recipe-card')];
    if (!cards.length) return;
    const idx = await index('items.json');
    cards.forEach(card => {
      if (card.querySelector('.visual-recipe-strip')) return;
      const weapon = card.querySelector('h3')?.textContent?.trim();
      const recipe = D.recipes?.find(r => String(r.Weapon).trim() === weapon); if (!recipe) return;
      const targets = [
        {name:recipe.Weapon, note:'result'},
        {name:recipe.Ingredient1, note:`×${recipe.Qty1 || 1}`},
        {name:recipe.Ingredient2, note:`×${recipe.Qty2 || 1}`},
        {name:recipe.Ingredient3, note:recipe.Qty3 ? `×${recipe.Qty3}` : 'ingredient'}
      ].filter(x => x.name);
      const strip = document.createElement('div'); strip.className = 'visual-recipe-strip';
      targets.forEach(target => {
        const item = exactItem(idx, target.name); if (item) strip.appendChild(assetCard('item', item, target.name, target.note));
      });
      if (strip.children.length) card.insertBefore(strip, card.children[1] || null);
    });
  }

  function enhanceClassicDb() {
    const dataset = document.getElementById('db-dataset')?.value;
    if (dataset !== 'monsters') return;
    document.querySelectorAll('#db-results .db-card').forEach(card => {
      const thumb = card.querySelector('.db-thumb-empty'); if (!thumb || thumb.dataset.visualized) return;
      const rawId = card.querySelector('code')?.textContent?.replace(/\D/g,'');
      const id = Number(rawId); if (!Number.isFinite(id)) return;
      thumb.textContent = '';
      thumb.classList.remove('db-thumb-empty');
      thumb.dataset.visualized = '1';
      const label = card.querySelector('h3')?.textContent || `Monster ${id}`;
      thumb.appendChild(imageNode(`https://maplestory.io/api/GMS/83/mob/${id}/render/stand`, label, 'mob'));
      thumb.title = 'Historical v83 visual reference; gameplay metadata remains COT2.';
    });
  }

  async function enhanceAll() {
    document.documentElement.classList.add('visual-layer-ready');
    enhanceClassicDb();
    await Promise.allSettled([
      enhanceRoutes(),
      enhanceLevelDetail(),
      enhanceEtc(),
      enhanceQuests(),
      enhanceRecipes()
    ]);
  }

  function schedule() {
    clearTimeout(observerTimer);
    observerTimer = setTimeout(enhanceAll, 90);
  }

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, {childList:true, subtree:true});
  document.addEventListener('change', schedule, true);
  document.addEventListener('click', schedule, true);
  enhanceAll();
})();
