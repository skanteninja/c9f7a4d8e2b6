(() => {
  const REPO_RAW = '/game-data/';
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
    if (hash) return `${REPO_RAW}data/images/monsters/${hash}.webp`;
    const id = idOf(row);
    return id == null ? '' : `/game-media/monsters/${id}/render/stand?format=png&resize=2`;
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

// Production-shipped monster integrity + Classic-only drop evidence layer.
(() => {
  const ROOT='/game-data/data/current/';
  const normal=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const evidenceRows=[
    {monster:'Snail',item:'Snail Shell',status:'community-documented'},
    {monster:'Blue Snail',item:'Blue Snail Shell',status:'community-documented'},
    {monster:'Red Snail',item:'Red Snail Shell',status:'community-documented'}
  ];
  const evidenceByMonster=new Map();
  evidenceRows.forEach(row=>{const k=normal(row.monster);if(!evidenceByMonster.has(k))evidenceByMonster.set(k,[]);evidenceByMonster.get(k).push(row)});
  window.TCW_MONSTER_DROP_EVIDENCE=Object.freeze({
    version:'2026-09-05.2',
    currentClientHasDropTable:false,
    legacyTablesAllowedAsCurrent:false,
    rows:Object.freeze(evidenceRows.map(x=>Object.freeze({...x}))),
    get(name){return evidenceByMonster.get(normal(name))||[]}
  });
  document.documentElement.classList.add('monster-drop-evidence-ready');

  const style=document.createElement('style');
  style.textContent='.tcw-monster-integrity{margin-top:10px;padding:10px 11px;border:1px solid rgba(143,168,207,.16);border-radius:10px;background:rgba(12,18,29,.55)}.tcw-monster-integrity-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}.tcw-monster-integrity-head b{font-size:11px;color:#e8f1ff}.tcw-monster-integrity-head span{font-size:8px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;padding:3px 6px;border-radius:999px;border:1px solid rgba(115,191,140,.28);color:#9fe0b1;background:rgba(70,145,94,.08)}.tcw-monster-integrity-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.tcw-monster-integrity-grid>div{min-width:0;padding:7px 8px;border:1px solid rgba(143,168,207,.12);border-radius:8px;background:rgba(255,255,255,.015)}.tcw-monster-integrity-grid small{display:block;font-size:8px;color:#76859c;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px}.tcw-monster-integrity-grid b{display:block;font-size:10px;line-height:1.25;color:#dfe8f6;overflow-wrap:anywhere}.tcw-monster-integrity-grid .warn b{color:#efc07b}.tcw-monster-integrity-grid .bad b{color:#f08c95}.tcw-monster-integrity-note{display:block;margin-top:8px;font-size:8px;line-height:1.4;color:#7f8ba0}.tcw-monster-integrity-note strong{color:#c8d4e6}.tcw-monster-drop-evidence{display:flex;flex-wrap:wrap;gap:7px;margin-top:8px}.tcw-monster-drop-chip{display:flex;align-items:center;gap:7px;padding:6px 8px;border:1px solid rgba(120,191,146,.17);border-radius:8px;background:rgba(73,140,95,.045)}.tcw-monster-drop-chip img{width:28px;height:28px;object-fit:contain}.tcw-monster-drop-chip span{display:grid;gap:1px}.tcw-monster-drop-chip b{font-size:9px;color:#dff2e5}.tcw-monster-drop-chip small{font-size:7px;color:#83a18d}@media(max-width:620px){.tcw-monster-integrity-grid{grid-template-columns:1fr}.tcw-monster-integrity{padding:9px}}';
  document.head.appendChild(style);

  let dataPromise=null,timer=null;
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const cardId=card=>{const raw=card.querySelector('code')?.textContent?.replace(/\D/g,'');const n=Number(raw);return Number.isFinite(n)?n:null};
  const rows=(raw,key)=>Array.isArray(raw?.[key])?raw[key]:Array.isArray(raw)?raw:[];
  function load(){
    if(!dataPromise)dataPromise=Promise.all([
      fetch(`${ROOT}monsters.json`,{cache:'force-cache'}).then(r=>r.ok?r.json():Promise.reject(Error(`monsters ${r.status}`))),
      fetch(`${ROOT}maps.json`,{cache:'force-cache'}).then(r=>r.ok?r.json():Promise.reject(Error(`maps ${r.status}`))),
      fetch(`${ROOT}items.json`,{cache:'force-cache'}).then(r=>r.ok?r.json():Promise.reject(Error(`items ${r.status}`)))
    ]).then(([mr,mar,ir])=>{
      const mobs=rows(mr,'monsters'),maps=rows(mar,'maps'),items=rows(ir,'items');
      const itemByName=new Map();items.forEach(i=>{const k=normal(i?.name||i?.item_name);if(k&&!itemByName.has(k))itemByName.set(k,i)});
      return {mobs:new Map(mobs.map(x=>[Number(x.id),x])),maps:new Map(maps.map(x=>[Number(x.id),x])),itemByName};
    });
    return dataPromise;
  }
  function spriteState(mob){const p=mob?.gif||mob?.gifs?.move||mob?.gifs?.stand;if(p&&mob?.thumbnail)return ['Primary + fallback',''];if(p)return ['Primary sprite only','warn'];if(mob?.thumbnail)return ['Fallback thumbnail only','warn'];return ['No artwork reference','bad']}
  function spawnState(mob,maps){const refs=Array.isArray(mob?.maps)?mob.maps:[];const valid=refs.filter(r=>maps.has(Number(r.id))).length;const miss=Math.max(0,refs.length-valid);return [`${valid}/${refs.length} resolved`,miss?'warn':refs.length?'':'warn',miss]}
  function itemImg(item){const id=Number(item?.id);return Number.isFinite(id)?`${ROOT}images/items/${String(Math.trunc(id)).padStart(8,'0')}.png`:''}
  function render(card,mob,maps,itemByName){
    if(card.querySelector('.tcw-monster-integrity'))return;
    const [art,artCls]=spriteState(mob),[spawn,spawnCls,miss]=spawnState(mob,maps),evidence=window.TCW_MONSTER_DROP_EVIDENCE.get(mob?.name),resolved=evidence.map(e=>({e,item:itemByName.get(normal(e.item))})).filter(x=>x.item);
    const box=document.createElement('section');box.className='tcw-monster-integrity';
    box.innerHTML=`<div class="tcw-monster-integrity-head"><b>Monster integrity</b><span>Current Classic</span></div><div class="tcw-monster-integrity-grid"><div class="${artCls}"><small>Artwork</small><b>${esc(art)}</b></div><div class="${spawnCls}"><small>Spawn maps</small><b>${esc(spawn)}</b></div><div class="${evidence.length?'':'warn'}"><small>Drop evidence</small><b>${evidence.length?`${resolved.length}/${evidence.length} Classic evidence resolved`:'No verified current drops'}</b></div></div><small class="tcw-monster-integrity-note"><strong>Drop safety:</strong> the client does not expose server drop tables. Only Classic-specific evidence is shown here; older v83/GMS tables are excluded from current-drop claims.</small>`;
    if(resolved.length){const strip=document.createElement('div');strip.className='tcw-monster-drop-evidence';resolved.forEach(({e,item})=>{const chip=document.createElement('div');chip.className='tcw-monster-drop-chip';const img=document.createElement('img');img.src=itemImg(item);img.alt=e.item;img.loading='lazy';chip.appendChild(img);const text=document.createElement('span');text.innerHTML=`<b>${esc(e.item)}</b><small>Classic-specific community evidence</small>`;chip.appendChild(text);strip.appendChild(chip)});box.appendChild(strip)}
    const rel=card.querySelector('.visual-db-relations');rel?rel.insertAdjacentElement('beforebegin',box):card.appendChild(box);
    card.dataset.tcwMonsterIntegrity='1';
    return {miss,evidence:resolved.length,evidenceMiss:evidence.length-resolved.length};
  }
  async function enhance(){
    if(document.getElementById('db-dataset')?.value!=='monsters')return;
    const cards=[...document.querySelectorAll('#db-results .db-card')];if(!cards.length)return;
    try{const {mobs,maps,itemByName}=await load();let seen=0,mapIssues=0,evidenceItems=0,evidenceMisses=0;cards.forEach(card=>{const mob=mobs.get(cardId(card));if(!mob)return;seen++;const r=render(card,mob,maps,itemByName);if(r){if(r.miss)mapIssues++;evidenceItems+=r.evidence;evidenceMisses+=r.evidenceMiss}});document.documentElement.classList.add('monster-integrity-ready');document.documentElement.dataset.monsterIntegrityVisible=String(seen);document.documentElement.dataset.monsterIntegrityMapIssues=String(mapIssues);document.documentElement.dataset.monsterDropEvidenceItems=String(evidenceItems);document.documentElement.dataset.monsterDropEvidenceItemMisses=String(evidenceMisses)}catch(err){console.warn('Monster integrity audit unavailable',err)}
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(enhance,120)}
  new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true});
  document.addEventListener('change',schedule,true);document.addEventListener('input',schedule,true);document.addEventListener('click',schedule,true);schedule();
})();
