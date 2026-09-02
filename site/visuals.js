(() => {
  const D = window.GUIDE_DATA;
  if (!D) return;

  const REPO_RAW = 'https://raw.githubusercontent.com/ohmi69/osms_datamine_dashboard/main/';
  const RAW = `${REPO_RAW}data/current/`;
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
        const byId = new Map();
        rows.forEach(row => {
          const name = norm(entityName(row));
          const id = idNum(row);
          if (name && !exact.has(name)) exact.set(name, row);
          if (id != null && !byId.has(id)) byId.set(id, row);
        });
        return {rows, exact, byId};
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
    const hash = row?.gif || row?.gifs?.move || row?.gifs?.stand;
    return hash ? `${REPO_RAW}data/images/monsters/${hash}.webp` : '';
  }
  function mobFallback(row) {
    return row?.thumbnail ? `${REPO_RAW}data/images/monsters/${row.thumbnail}.png` : '';
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
    const fallback = kind === 'mob' ? mobFallback(row) : '';
    if (url) wrap.appendChild(imageNode(url, label, kind, fallback));
    const copy = document.createElement('span');
    copy.innerHTML = `<b>${esc(label)}</b>${note ? `<small>${esc(note)}</small>` : ''}`;
    wrap.appendChild(copy);
    return wrap;
  }

  function miniAsset(kind, row, label) {
    const wrap = document.createElement('span');
    wrap.className = `visual-mini visual-asset visual-${kind}`;
    wrap.title = label;
    const url = kind === 'map' ? mapImage(row) : kind === 'mob' ? mobImage(row) : itemImage(row);
    const fallback = kind === 'mob' ? mobFallback(row) : '';
    if (url) wrap.appendChild(imageNode(url, label, kind, fallback));
    return wrap;
  }

  function makeMedia(maps, mobs, compact = false) {
    if (!maps.length && !mobs.length) return null;
    const media = document.createElement('div');
    media.className = `visual-media-strip${compact ? ' compact' : ''}`;
    maps.forEach(row => media.appendChild(assetCard('map', row, entityName(row), 'COT2 map')));
    mobs.forEach(row => media.appendChild(assetCard('mob', row, entityName(row), 'COT2 monster')));
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

  async function enhanceDashboardTargets() {
    const root = document.querySelector('#dashboard-actions .train-action');
    if (!root || root.querySelector('.visual-train-assets')) return;
    const level = Number(document.getElementById('hero-level')?.textContent || 1);
    const row = D.leveling?.find(x => Number(x.Lv) === level); if (!row) return;
    const [mapsIdx, mobsIdx] = await Promise.all([index('maps.json'), index('monsters.json')]);
    const maps = contained(mapsIdx, row['Primary Route'] || '', 1, 5);
    const mobs = contained(mobsIdx, row['Main Monsters'] || '', 3, 3);
    if (!maps.length && !mobs.length) return;
    const holder = document.createElement('div'); holder.className = 'visual-train-assets';
    maps.forEach(x => holder.appendChild(miniAsset('map', x, entityName(x))));
    mobs.forEach(x => holder.appendChild(miniAsset('mob', x, entityName(x))));
    root.appendChild(holder);
  }

  async function enhanceTimeline() {
    const buttons = [...document.querySelectorAll('#level-timeline [data-set-level]')];
    if (!buttons.length) return;
    const [mapsIdx, mobsIdx] = await Promise.all([index('maps.json'), index('monsters.json')]);
    buttons.forEach(button => {
      if (button.querySelector('.visual-timeline-assets')) return;
      const level = Number(button.dataset.setLevel);
      const row = D.leveling?.find(x => Number(x.Lv) === level); if (!row) return;
      const maps = contained(mapsIdx, row['Primary Route'] || '', 1, 5);
      const mobs = contained(mobsIdx, row['Main Monsters'] || '', 2, 3);
      if (!maps.length && !mobs.length) return;
      const holder = document.createElement('span'); holder.className = 'visual-timeline-assets';
      maps.forEach(x => holder.appendChild(miniAsset('map', x, entityName(x))));
      mobs.forEach(x => holder.appendChild(miniAsset('mob', x, entityName(x))));
      button.appendChild(holder);
    });
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
    const [itemsIdx, questsIdx, mobsIdx] = await Promise.all([index('items.json'), index('quests.json'), index('monsters.json')]);
    rows.forEach(row => {
      const title = row.querySelector('.quest-name')?.textContent?.trim(); if (!title) return;
      const guideQuest = D.quests?.find(q => String(q.Quest).trim() === title);
      if (guideQuest && !row.querySelector('.visual-quest-items')) {
        const raw = guideQuest['ETC / Item To Save'];
        const found = [];
        for (const name of splitItems(raw)) {
          const item = exactItem(itemsIdx, name);
          if (item && !found.some(x => idNum(x.item) === idNum(item))) found.push({name, item});
        }
        if (!found.length && raw) {
          const item = exactItem(itemsIdx, raw); if (item) found.push({name:entityName(item), item});
        }
        if (found.length) {
          const strip = document.createElement('div'); strip.className = 'visual-quest-items';
          const label = document.createElement('small'); label.className = 'visual-section-label'; label.textContent = 'Guide save'; strip.appendChild(label);
          found.forEach(({name,item}) => strip.appendChild(assetCard('item', item, name, 'save')));
          const why = row.querySelector('.quest-why'); why ? why.before(strip) : row.appendChild(strip);
        }
      }

      if (row.querySelector('.visual-quest-cot2')) return;
      const cot2 = questsIdx.exact.get(norm(title)); if (!cot2) return;
      const requirements = Array.isArray(cot2.requirements_list) ? cot2.requirements_list : [];
      const rewards = Array.isArray(cot2.rewards) ? cot2.rewards.filter(x => x?.type === 'item') : [];
      if (!requirements.length && !rewards.length) return;
      const panel = document.createElement('div'); panel.className = 'visual-quest-cot2';
      if (requirements.length) {
        const block = document.createElement('div'); block.className = 'visual-quest-block';
        const label = document.createElement('small'); label.className = 'visual-section-label'; label.textContent = 'COT2 needs'; block.appendChild(label);
        requirements.forEach(req => {
          const source = req.type === 'mob' ? mobsIdx.byId.get(Number(req.id)) : req.type === 'item' ? itemsIdx.byId.get(Number(req.id)) : null;
          if (source) block.appendChild(assetCard(req.type === 'mob' ? 'mob' : 'item', source, req.name || entityName(source), `×${req.count || 1}`));
        });
        if (block.children.length > 1) panel.appendChild(block);
      }
      if (rewards.length) {
        const block = document.createElement('div'); block.className = 'visual-quest-block';
        const label = document.createElement('small'); label.className = 'visual-section-label'; label.textContent = 'COT2 rewards'; block.appendChild(label);
        rewards.forEach(reward => {
          const item = itemsIdx.byId.get(Number(reward.id));
          if (item) block.appendChild(assetCard('item', item, reward.name || entityName(item), `×${reward.count || 1}`));
        });
        if (block.children.length > 1) panel.appendChild(block);
      }
      if (panel.children.length) row.appendChild(panel);
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

  async function enhanceClassicDb() {
    const dataset = document.getElementById('db-dataset')?.value;
    if (dataset !== 'monsters') return;
    const idx = await index('monsters.json');
    document.querySelectorAll('#db-results .db-card').forEach(card => {
      const thumb = card.querySelector('.db-thumb-empty'); if (!thumb || thumb.dataset.visualized) return;
      const rawId = card.querySelector('code')?.textContent?.replace(/\D/g,'');
      const id = Number(rawId); if (!Number.isFinite(id)) return;
      const monster = idx.byId.get(id); if (!monster) return;
      const label = card.querySelector('h3')?.textContent || entityName(monster);
      thumb.textContent = '';
      thumb.classList.remove('db-thumb-empty');
      thumb.dataset.visualized = '1';
      thumb.appendChild(imageNode(mobImage(monster), label, 'mob', mobFallback(monster)));
      thumb.title = 'Current COT2 client visual via OSMS.';
    });
  }

  async function enhanceAll() {
    document.documentElement.classList.add('visual-layer-ready');
    await Promise.allSettled([
      enhanceClassicDb(),
      enhanceRoutes(),
      enhanceLevelDetail(),
      enhanceDashboardTargets(),
      enhanceTimeline(),
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
