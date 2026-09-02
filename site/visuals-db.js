(() => {
  const REPO_RAW = 'https://raw.githubusercontent.com/ohmi69/osms_datamine_dashboard/main/';
  const RAW = `${REPO_RAW}data/current/`;
  const cache = new Map();
  const indices = new Map();
  let timer = null;
  let monstersByMapPromise = null;
  let itemQuestLinksPromise = null;
  let itemCraftLinksPromise = null;
  let npcLookupPromise = null;

  const norm = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const nameOf = row => row?.name || row?.title || row?.quest_name || row?.map_name || row?.monster_name || row?.item_name || row?.result_item_name || '';
  const idOf = row => { const n = Number(row?.id); return Number.isFinite(n) ? Math.trunc(n) : null; };

  function collect(value, out = [], depth = 0) {
    if (depth > 7 || value == null) return out;
    if (Array.isArray(value)) { value.forEach(v => collect(v, out, depth + 1)); return out; }
    if (typeof value !== 'object') return out;
    if (value.id !== undefined && nameOf(value)) out.push(value);
    Object.values(value).forEach(v => { if (v && typeof v === 'object') collect(v, out, depth + 1); });
    return out;
  }

  function load(file) {
    if (!cache.has(file)) {
      cache.set(file, fetch(`${RAW}${file}`, {cache:'force-cache'})
        .then(r => { if (!r.ok) throw new Error(`${file} HTTP ${r.status}`); return r.json(); })
        .catch(() => null));
    }
    return cache.get(file);
  }

  function index(file) {
    if (!indices.has(file)) {
      indices.set(file, load(file).then(data => {
        const rows = collect(data || {});
        const byId = new Map(), exact = new Map();
        rows.forEach(row => {
          const id = idOf(row), name = norm(nameOf(row));
          if (id != null && !byId.has(id)) byId.set(id,row);
          if (name && !exact.has(name)) exact.set(name,row);
        });
        return {rows, byId, exact};
      }));
    }
    return indices.get(file);
  }

  function itemUrl(row) {
    const id = idOf(row); return id == null ? '' : `${RAW}images/items/${String(id).padStart(8,'0')}.png`;
  }
  function mapUrl(row) {
    const id = idOf(row); return id == null ? '' : `${RAW}images/maps/${String(id).padStart(9,'0')}.png`;
  }
  function mobUrl(row) {
    const hash = row?.gif || row?.gifs?.move || row?.gifs?.stand;
    return hash ? `${REPO_RAW}data/images/monsters/${hash}.webp` : '';
  }
  function mobFallback(row) {
    return row?.thumbnail ? `${REPO_RAW}data/images/monsters/${row.thumbnail}.png` : '';
  }
  function npcUrl(id) {
    const n = Number(id); return Number.isFinite(n) ? `${RAW}images/npcs/${String(Math.trunc(n)).padStart(7,'0')}.png` : '';
  }

  function image(url, alt, fallback = '') {
    const img = document.createElement('img');
    img.src = url; img.alt = alt; img.loading = 'lazy'; img.decoding = 'async';
    if (fallback) img.dataset.fallback = fallback;
    img.addEventListener('error', () => {
      if (img.dataset.fallback && !img.dataset.usedFallback) {
        img.dataset.usedFallback = '1'; img.src = img.dataset.fallback; return;
      }
      img.closest('.visual-db-asset')?.classList.add('visual-db-missing');
    });
    return img;
  }

  function asset(kind,row,note='') {
    const wrap = document.createElement('div'); wrap.className = `visual-db-asset visual-db-${kind}`;
    const label = nameOf(row) || `#${idOf(row)}`;
    const url = kind === 'item' ? itemUrl(row) : kind === 'map' ? mapUrl(row) : mobUrl(row);
    const fallback = kind === 'mob' ? mobFallback(row) : '';
    if (url) wrap.appendChild(image(url,label,fallback));
    const text = document.createElement('span'); text.innerHTML = `<b>${label.replace(/[&<>"']/g,'')}</b>${note ? `<small>${String(note).replace(/[&<>"']/g,'')}</small>` : ''}`;
    wrap.appendChild(text); return wrap;
  }

  function questAsset(quest,npcByName,note='') {
    const wrap = document.createElement('div'); wrap.className = 'visual-db-asset visual-db-quest';
    const npc = npcByName.get(norm(quest?.npc_name));
    if (npc?.id) {
      const img = document.createElement('img'); img.src = npcUrl(npc.id); img.alt = npc.name; img.loading = 'lazy'; img.decoding = 'async';
      img.addEventListener('error',()=>img.remove()); wrap.appendChild(img);
    } else {
      const badge = document.createElement('i'); badge.className = 'visual-db-quest-badge'; badge.textContent = 'Q'; wrap.appendChild(badge);
    }
    const text = document.createElement('span');
    text.innerHTML = `<b>${String(quest?.name || quest?.quest_name || `Quest #${quest?.id ?? '—'}`).replace(/[&<>"']/g,'')}</b><small>${String(note || quest?.npc_name || 'COT2 quest').replace(/[&<>"']/g,'')}</small>`;
    wrap.appendChild(text); return wrap;
  }

  function relation(label, assets, total = assets.length) {
    if (!assets.length) return null;
    const row = document.createElement('div'); row.className = 'visual-db-relation';
    const head = document.createElement('div'); head.className = 'visual-db-relation-head';
    head.innerHTML = `<b>${label}</b><small>${total} linked</small>`; row.appendChild(head);
    const strip = document.createElement('div'); strip.className = 'visual-db-strip';
    assets.forEach(x => strip.appendChild(x)); row.appendChild(strip);
    return row;
  }

  function panel(card) {
    let p = card.querySelector('.visual-db-relations');
    if (!p) { p = document.createElement('div'); p.className = 'visual-db-relations'; card.appendChild(p); }
    return p;
  }

  function cardId(card) {
    const raw = card.querySelector('code')?.textContent?.replace(/\D/g,'');
    const n = Number(raw); return Number.isFinite(n) ? n : null;
  }

  async function monstersByMap() {
    if (!monstersByMapPromise) {
      monstersByMapPromise = index('monsters.json').then(idx => {
        const map = new Map();
        idx.rows.forEach(mob => (mob.maps || []).forEach(ref => {
          const id = Number(ref.id); if (!Number.isFinite(id)) return;
          if (!map.has(id)) map.set(id,[]);
          map.get(id).push(mob);
        }));
        return map;
      });
    }
    return monstersByMapPromise;
  }

  async function npcLookup() {
    if (!npcLookupPromise) {
      npcLookupPromise = load('lookups.json').then(data => {
        const byName = new Map();
        Object.entries(data?.npc_names || {}).forEach(([id,name]) => {
          const key = norm(name); if (key && !byName.has(key)) byName.set(key,{id:Number(id),name});
        });
        return byName;
      });
    }
    return npcLookupPromise;
  }

  async function itemQuestLinks() {
    if (!itemQuestLinksPromise) {
      itemQuestLinksPromise = index('quests.json').then(quests => {
        const requiredBy = new Map(), rewardedBy = new Map();
        quests.rows.forEach(q => {
          (q.requirements_list || []).filter(r=>r?.type==='item').forEach(req => {
            const id=Number(req.id); if(!Number.isFinite(id)) return;
            if(!requiredBy.has(id)) requiredBy.set(id,[]);
            requiredBy.get(id).push({quest:q,count:Number(req.count)||1});
          });
          (q.rewards || []).filter(r=>r?.type==='item').forEach(reward => {
            const id=Number(reward.id); if(!Number.isFinite(id)) return;
            if(!rewardedBy.has(id)) rewardedBy.set(id,[]);
            rewardedBy.get(id).push({quest:q,count:Number(reward.count)||1});
          });
        });
        return {requiredBy,rewardedBy};
      });
    }
    return itemQuestLinksPromise;
  }

  async function itemCraftLinks() {
    if (!itemCraftLinksPromise) {
      itemCraftLinksPromise = Promise.all([index('crafting.json'),index('items.json')]).then(([crafting,items]) => {
        const producedBy = new Map(), consumedByName = new Map();
        crafting.rows.forEach(recipe => {
          const outId=Number(recipe.output_id);
          if(Number.isFinite(outId)) {
            if(!producedBy.has(outId)) producedBy.set(outId,[]);
            producedBy.get(outId).push(recipe);
          }
          (recipe.ingredients || []).forEach(ing => {
            const key=norm(ing.item_name); if(!key) return;
            if(!consumedByName.has(key)) consumedByName.set(key,[]);
            consumedByName.get(key).push({recipe,count:Number(ing.count)||1});
          });
        });
        return {producedBy,consumedByName,items};
      });
    }
    return itemCraftLinksPromise;
  }

  async function enhanceMonsters(cards) {
    const [mobs,maps] = await Promise.all([index('monsters.json'),index('maps.json')]);
    cards.forEach(card => {
      if (card.dataset.visualDbDone === 'monsters') return;
      const id = cardId(card), mob = mobs.byId.get(id); if (!mob) return;
      const thumb = card.querySelector('.db-thumb-empty');
      if (thumb && mobUrl(mob)) {
        thumb.textContent = ''; thumb.classList.remove('db-thumb-empty');
        thumb.appendChild(image(mobUrl(mob),nameOf(mob),mobFallback(mob)));
      }
      const refs = (mob.maps || []).map(ref => maps.byId.get(Number(ref.id))).filter(Boolean);
      const assets = refs.slice(0,10).map(row => asset('map',row));
      const rel = relation('Spawn maps',assets,refs.length); if (rel) panel(card).appendChild(rel);
      card.dataset.visualDbDone = 'monsters';
    });
  }

  async function enhanceMaps(cards) {
    const [maps,mobsByMap,portals] = await Promise.all([index('maps.json'),monstersByMap(),load('portals.json')]);
    cards.forEach(card => {
      if (card.dataset.visualDbDone === 'maps') return;
      const id = cardId(card), map = maps.byId.get(id); if (!map) return;
      const p = panel(card);
      const mobs = mobsByMap.get(id) || [];
      const mobRel = relation('Monsters here',mobs.slice(0,14).map(row => asset('mob',row)),mobs.length); if (mobRel) p.appendChild(mobRel);
      const key = String(id).padStart(9,'0');
      const seen = new Set();
      const dests = (portals?.[key] || []).map(x => Number(x.dest_map)).filter(x => Number.isFinite(x) && x !== 999999999 && x !== id && !seen.has(x) && seen.add(x)).map(x => maps.byId.get(x)).filter(Boolean);
      const portalRel = relation('Portal destinations',dests.slice(0,10).map(row => asset('map',row)),dests.length); if (portalRel) p.appendChild(portalRel);
      card.dataset.visualDbDone = 'maps';
    });
  }

  async function enhanceQuests(cards) {
    const [quests,items,mobs] = await Promise.all([index('quests.json'),index('items.json'),index('monsters.json')]);
    cards.forEach(card => {
      if (card.dataset.visualDbDone === 'quests') return;
      const q = quests.byId.get(cardId(card)); if (!q) return;
      const p = panel(card);
      const needs = (q.requirements_list || []).map(req => {
        const row = req.type === 'item' ? items.byId.get(Number(req.id)) : req.type === 'mob' ? mobs.byId.get(Number(req.id)) : null;
        return row ? asset(req.type === 'mob' ? 'mob' : 'item',row,`×${req.count || 1}`) : null;
      }).filter(Boolean);
      const needRel = relation('Requirements',needs,needs.length); if (needRel) p.appendChild(needRel);
      const rewardRows = (q.rewards || []).filter(r => r?.type === 'item').map(r => ({reward:r,row:items.byId.get(Number(r.id))})).filter(x => x.row);
      const rewardRel = relation('Item rewards',rewardRows.slice(0,12).map(x => asset('item',x.row,`×${x.reward.count || 1}`)),rewardRows.length); if (rewardRel) p.appendChild(rewardRel);
      card.dataset.visualDbDone = 'quests';
    });
  }

  async function enhanceCrafting(cards) {
    const [crafting,items] = await Promise.all([index('crafting.json'),index('items.json')]);
    cards.forEach(card => {
      if (card.dataset.visualDbDone === 'crafting') return;
      const recipe = crafting.byId.get(cardId(card)); if (!recipe) return;
      const p = panel(card);
      const output = items.byId.get(Number(recipe.output_id));
      if (output) { const rel = relation('Craft result',[asset('item',output,`×${recipe.result_count || 1}`)],1); if (rel) p.appendChild(rel); }
      const ingredients = (recipe.ingredients || []).map(ing => {
        const row = items.exact.get(norm(ing.item_name)); return row ? asset('item',row,`×${ing.count || 1}`) : null;
      }).filter(Boolean);
      const rel = relation('Ingredients',ingredients,ingredients.length); if (rel) p.appendChild(rel);
      card.dataset.visualDbDone = 'crafting';
    });
  }

  async function enhanceItems(cards,dataset) {
    const [items,questLinks,craftLinks,npcs] = await Promise.all([index('items.json'),itemQuestLinks(),itemCraftLinks(),npcLookup()]);
    cards.forEach(card => {
      if (card.dataset.visualDbDone === dataset) return;
      const id=cardId(card), item=items.byId.get(id); if(!item) return;
      const p=panel(card);
      const required=questLinks.requiredBy.get(id)||[];
      const reqRel=relation('COT2 quest requirements',required.slice(0,12).map(x=>questAsset(x.quest,npcs,`needs ×${x.count}`)),required.length); if(reqRel)p.appendChild(reqRel);
      const rewarded=questLinks.rewardedBy.get(id)||[];
      const rewRel=relation('COT2 quest rewards',rewarded.slice(0,12).map(x=>questAsset(x.quest,npcs,`rewards ×${x.count}`)),rewarded.length); if(rewRel)p.appendChild(rewRel);
      const produced=craftLinks.producedBy.get(id)||[];
      const producedAssets=produced.slice(0,8).flatMap(recipe=>(recipe.ingredients||[]).map(ing=>({ing,row:items.exact.get(norm(ing.item_name))})).filter(x=>x.row).slice(0,6).map(x=>asset('item',x.row,`×${x.ing.count||1}`)));
      const prodRel=relation('Crafted from',producedAssets,producedAssets.length); if(prodRel)p.appendChild(prodRel);
      const consumed=craftLinks.consumedByName.get(norm(nameOf(item)))||[];
      const consumeAssets=consumed.slice(0,12).map(x=>items.byId.get(Number(x.recipe.output_id))).filter(Boolean).map(row=>asset('item',row,'craft result'));
      const consumeRel=relation('Used to craft',consumeAssets,consumed.length); if(consumeRel)p.appendChild(consumeRel);
      if(p.children.length){
        const note=document.createElement('small');note.className='visual-db-evidence-note';note.textContent='Relationships shown from the COT2 client export; they do not prove live server drops or shop inventory.';p.appendChild(note);
      }
      card.dataset.visualDbDone=dataset;
    });
  }

  async function enhance() {
    document.documentElement.classList.add('visual-db-layer-ready');
    const dataset = document.getElementById('db-dataset')?.value;
    const cards = [...document.querySelectorAll('#db-results .db-card')];
    if (!dataset || !cards.length) return;
    if (dataset === 'monsters') await enhanceMonsters(cards);
    if (dataset === 'maps') await enhanceMaps(cards);
    if (dataset === 'quests') await enhanceQuests(cards);
    if (dataset === 'crafting') await enhanceCrafting(cards);
    if (dataset === 'items' || dataset === 'equipment') await enhanceItems(cards,dataset);
  }

  function schedule() { clearTimeout(timer); timer = setTimeout(enhance,120); }
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('change',schedule,true);
  document.addEventListener('input',schedule,true);
  document.addEventListener('click',schedule,true);
  enhance();
})();
