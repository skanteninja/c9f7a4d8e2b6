(() => {
  const DATA_ROOT='/game-data/data/current/';
  const WORLD_W=954,WORLD_H=699;
  const WORLD_MARKERS=[
    ['010000000',151.5,561,'town'],['010000010',157.5,496.5,'spot'],['010000011',187.5,477,'spot'],['010000012',222,480,'spot'],['010000013',258,466.5,'spot'],['010000020',276,436.5,'spot'],
    ['010005030',406.5,387,'cluster'],['010001030',291,480,'spot'],['010001020',310.5,526.5,'spot'],['010001010',355.5,558,'spot'],['010001000',436.5,562.5,'town'],['010001090',427.5,504,'spot'],['010001100',414,471,'spot'],['010001060',513,555,'spot'],['010001070',528,526.5,'spot'],['010001080',537,487.5,'spot'],
    ['010002030',558,465,'spot'],['010002020',591,450,'spot'],['010002010',621,433.5,'spot'],['010002000',663,381,'town'],['010002050',586.5,387,'spot'],['010002060',558,376.5,'spot'],['010002070',541.5,339,'spot'],
    ['010003050',238.5,420,'spot'],['010003040',195,429,'spot'],['010003030',166.5,402,'spot'],['010003020',174,360,'spot'],['010003010',174,324,'spot'],['010003000',144,276,'town'],['010003070',198,228,'spot'],['010003080',237,229.5,'spot'],['010003090',213,279,'spot'],['010003091',255,288,'spot'],['010003092',280.5,327,'spot'],['010003093',292.5,363,'spot'],['010003094',322.5,384,'spot'],
    ['010004000',366,129,'town'],['010004010',304.5,171,'spot'],['010004020',300,204,'spot'],['010004030',277.5,228,'spot'],['010004040',426,163.5,'spot'],['010004050',453,177,'spot'],['010004060',486,189,'spot'],['010004070',510,220.5,'spot'],['010004080',540,255,'spot'],['010004090',543,301.5,'spot'],['010004100',358.5,205.5,'spot'],['010004110',340.5,234,'spot'],['010004120',325.5,280.5,'spot'],['010004121',354,310.5,'spot'],
    ['010006000',519,379.5,'cluster'],['010007000',789,556.5,'town'],['010007010',826.5,547.5,'spot'],['010007020',852,523.5,'spot'],['010007030',846,484.5,'spot'],['010007040',807,478.5,'spot']
  ];
  const state={loaded:false,loading:null,maps:[],victoria:[],byId:new Map(),npcNames:{},mobNames:{},portals:{},monsters:new Map(),view:'overview',selected:'010001000',zoom:1,showNpcs:true,showMobs:true,showPortals:true};
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const padMap=v=>String(v??'').replace(/\D/g,'').padStart(9,'0');
  const padNpc=v=>String(v??'').replace(/\D/g,'').padStart(7,'0');
  const norm=v=>String(v??'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const page=()=>document.querySelector('section[data-page="maps"]');
  const q=s=>page()?.querySelector(s);

  function flattenMaps(data){
    const rows=[];
    for(const region of data?.regions||[])for(const map of region.maps||[])rows.push({...map,__region:region.region});
    return rows;
  }
  function flattenMonsters(data,out=[]){
    if(Array.isArray(data)){data.forEach(x=>flattenMonsters(x,out));return out;}
    if(!data||typeof data!=='object')return out;
    if(data.id!=null&&data.name&&(data.thumbnail||data.gif))out.push(data);
    Object.values(data).forEach(v=>{if(v&&typeof v==='object')flattenMonsters(v,out);});
    return out;
  }
  async function loadData(){
    if(state.loaded)return state;
    if(state.loading)return state.loading;
    state.loading=Promise.all([
      fetch(`${DATA_ROOT}maps.json`,{cache:'force-cache'}).then(r=>r.json()),
      fetch(`${DATA_ROOT}lookups.json`,{cache:'force-cache'}).then(r=>r.json()),
      fetch(`${DATA_ROOT}portals.json`,{cache:'force-cache'}).then(r=>r.json()),
      fetch(`${DATA_ROOT}monsters.json`,{cache:'force-cache'}).then(r=>r.json())
    ]).then(([maps,lookups,portals,monsters])=>{
      state.maps=flattenMaps(maps);
      state.victoria=state.maps.filter(m=>String(m.__region||m.region)==='Victoria Island');
      state.byId=new Map(state.maps.map(m=>[padMap(m.id),m]));
      state.npcNames=lookups?.npc_names||{};state.mobNames=lookups?.mob_names||{};state.portals=portals||{};
      state.monsters=new Map(flattenMonsters(monsters).map(m=>[String(m.id),m]));
      state.loaded=true;document.documentElement.classList.add('maps-data-ready');
      return state;
    }).catch(err=>{state.loading=null;throw err;});
    return state.loading;
  }
  function mapName(id){const m=state.byId.get(padMap(id));return m?.name||`Map #${padMap(id)}`;}
  function npcName(id){return state.npcNames?.[String(Number(id))]||state.npcNames?.[padNpc(id)]||`NPC #${padNpc(id)}`;}
  function mobName(id){return state.mobNames?.[String(Number(id))]||state.mobNames?.[String(id)]||state.monsters.get(String(id))?.name||`Mob #${id}`;}
  function mapImage(map){return map?.minimap?`${DATA_ROOT}${String(map.minimap).replace(/^\/+/, '')}`:`${DATA_ROOT}images/maps/${padMap(map?.id)}.png`;}
  function monsterImage(id){
    const m=state.monsters.get(String(id));if(!m)return '';
    const rel=m.gif||m.thumbnail;return rel?`${DATA_ROOT}${String(rel).replace(/^\/+/, '')}`:'';
  }

  function ensureShell(){
    const root=page();if(!root||root.dataset.mapsShell==='1')return;
    root.dataset.mapsShell='1';
    root.innerHTML=`
      <div class="maps-hero">
        <div><span class="eyebrow">VICTORIA ISLAND ATLAS</span><h2>Maps</h2><p>Travel from the island overview into every current Victoria Island map, then inspect NPCs, monsters, portals and connected maps.</p></div>
        <div class="maps-view-switch" role="tablist"><button type="button" data-map-view="overview" class="active">Island overview</button><button type="button" data-map-view="detail">Detailed view</button></div>
      </div>
      <div class="maps-toolbar panel">
        <div class="maps-search-wrap"><input id="maps-search" type="search" placeholder="Search 252 Victoria maps, NPCs or monsters..." autocomplete="off"><div id="maps-search-results" class="maps-search-results" hidden></div></div>
        <div class="maps-toolbar-actions"><button type="button" id="maps-back-overview" class="mini-btn">Victoria overview</button><button type="button" id="maps-random" class="mini-btn">Random map</button></div>
      </div>
      <div id="maps-overview" class="maps-view active">
        <div class="maps-overview-head"><div><b>Victoria Island</b><span id="maps-overview-count">Loading map data…</span></div><div class="maps-zoom"><button type="button" data-world-zoom="-">−</button><span id="maps-zoom-label">100%</span><button type="button" data-world-zoom="+">+</button><button type="button" data-world-zoom="reset">Reset</button></div></div>
        <div class="maps-world-scroll"><div id="maps-world-stage" class="maps-world-stage"><img id="maps-world-image" src="/game-media/worldmap/victoria-island.webp" alt="Victoria Island world map"><div id="maps-world-markers" class="maps-world-markers"></div></div></div>
        <div class="maps-world-legend"><span><i class="town"></i>Town</span><span><i class="spot"></i>Field / route</span><span><i class="cluster"></i>Dungeon cluster</span><small>Click a marker to jump directly into that map.</small></div>
      </div>
      <div id="maps-detail" class="maps-view">
        <div class="maps-detail-top panel">
          <div><span class="eyebrow" id="map-detail-region">VICTORIA ISLAND</span><h2 id="map-detail-name">Select a map</h2><div id="map-detail-meta" class="map-detail-meta"></div></div>
          <div class="maps-detail-picker"><label for="map-detail-select">JUMP TO MAP</label><select id="map-detail-select"></select></div>
        </div>
        <div class="maps-detail-layout">
          <section class="panel maps-canvas-panel">
            <div class="maps-layer-controls"><label><input type="checkbox" data-map-layer="npcs" checked> NPCs</label><label><input type="checkbox" data-map-layer="mobs" checked> Monsters</label><label><input type="checkbox" data-map-layer="portals" checked> Portals</label><button type="button" id="map-full-image" class="mini-btn">Open image</button></div>
            <div id="map-canvas-scroll" class="map-canvas-scroll"><div id="map-canvas" class="map-canvas"><img id="map-detail-image" alt="Selected map"></div></div>
          </section>
          <aside class="maps-detail-side"><section class="panel"><div class="maps-side-head"><h3>NPCs</h3><b id="map-npc-count">0</b></div><div id="map-npc-list" class="map-entity-list"></div></section><section class="panel"><div class="maps-side-head"><h3>Monsters</h3><b id="map-mob-count">0</b></div><div id="map-mob-list" class="map-entity-list"></div></section><section class="panel"><div class="maps-side-head"><h3>Connections</h3><b id="map-exit-count">0</b></div><div id="map-exit-list" class="map-exit-list"></div></section></aside>
        </div>
      </div>`;
    bindShell();
  }

  function setWorldZoom(next){
    state.zoom=Math.max(.65,Math.min(1.65,next));
    const stage=q('#maps-world-stage');if(stage){stage.style.width=`${WORLD_W*state.zoom}px`;stage.style.height=`${WORLD_H*state.zoom}px`;}
    const label=q('#maps-zoom-label');if(label)label.textContent=`${Math.round(state.zoom*100)}%`;
  }
  function renderWorldMarkers(){
    const host=q('#maps-world-markers');if(!host)return;host.innerHTML='';
    for(const [id,x,y,type] of WORLD_MARKERS){
      const map=state.byId.get(id),name=map?.name||`Map #${id}`;
      const btn=document.createElement('button');btn.type='button';btn.className=`world-map-marker ${type}`;btn.dataset.mapId=id;btn.style.left=`${x/WORLD_W*100}%`;btn.style.top=`${y/WORLD_H*100}%`;btn.title=`${name} · #${id}`;btn.setAttribute('aria-label',`Open ${name}`);
      const icon=document.createElement('img');icon.src=`/game-media/worldmap/marker-${type==='cluster'?'cluster':type==='town'?'town':'spot'}.png`;icon.alt='';btn.appendChild(icon);
      if(type==='town'){const label=document.createElement('span');label.textContent=name;btn.appendChild(label);}
      btn.addEventListener('click',()=>showDetail(id));host.appendChild(btn);
    }
    document.documentElement.classList.toggle('victoria-world-markers-ready',host.children.length>=50);
  }
  function populateSelect(){
    const sel=q('#map-detail-select');if(!sel)return;sel.innerHTML='';
    const groups=new Map();for(const map of state.victoria){const street=map.street_name||'Other';if(!groups.has(street))groups.set(street,[]);groups.get(street).push(map);}
    [...groups.entries()].sort((a,b)=>a[0].localeCompare(b[0])).forEach(([street,maps])=>{const g=document.createElement('optgroup');g.label=street;maps.sort((a,b)=>String(a.name).localeCompare(String(b.name))).forEach(map=>{const o=document.createElement('option');o.value=padMap(map.id);o.textContent=`${map.name} · #${padMap(map.id)}`;g.appendChild(o);});sel.appendChild(g);});
  }
  function switchView(view){
    state.view=view==='detail'?'detail':'overview';
    q('#maps-overview')?.classList.toggle('active',state.view==='overview');q('#maps-detail')?.classList.toggle('active',state.view==='detail');
    page()?.querySelectorAll('[data-map-view]').forEach(b=>b.classList.toggle('active',b.dataset.mapView===state.view));
  }
  function searchMatches(value){
    const needle=norm(value);if(!needle)return [];
    return state.victoria.map(map=>{
      const npcText=(map.npcs||[]).map(npcName).join(' ');const mobText=(map.mob_positions||[]).map(p=>mobName(p.id)).join(' ');const hay=norm(`${map.name} ${map.street_name||''} ${padMap(map.id)} ${npcText} ${mobText}`);let score=0;if(norm(map.name)===needle)score+=100;if(norm(map.name).startsWith(needle))score+=45;if(hay.includes(needle))score+=10;return{map,score};
    }).filter(x=>x.score).sort((a,b)=>b.score-a.score||String(a.map.name).localeCompare(String(b.map.name))).slice(0,24).map(x=>x.map);
  }
  function renderSearch(value){
    const host=q('#maps-search-results');if(!host)return;const rows=searchMatches(value);host.innerHTML='';host.hidden=!value||!rows.length;
    for(const map of rows){const b=document.createElement('button');b.type='button';b.innerHTML=`<span><b>${esc(map.name)}</b><small>${esc(map.street_name||map.__region||'Victoria Island')}</small></span><code>#${padMap(map.id)}</code>`;b.addEventListener('click',()=>{q('#maps-search').value='';host.hidden=true;showDetail(padMap(map.id));});host.appendChild(b);}
  }
  function portalRows(map){return state.portals?.[padMap(map.id)]||state.portals?.[String(map.id)]||[];}
  function groupedMobs(map){
    const groups=new Map();for(const pos of map.mob_positions||[]){const id=String(pos.id);const row=groups.get(id)||{id,count:0,positions:[]};row.count++;row.positions.push(pos);groups.set(id,row);}return [...groups.values()];
  }
  function currentNpcPositions(map,id){return (map.npc_positions||[]).filter(p=>Number(p.id)===Number(id));}
  function addOverlay(host,kind,pos,label,click){
    const img=q('#map-detail-image');if(!img?.naturalWidth||!img.naturalHeight)return;
    const b=document.createElement('button');b.type='button';b.className=`map-overlay map-overlay-${kind}`;b.dataset.layer=kind;b.title=label;b.setAttribute('aria-label',label);b.style.left=`${Math.max(0,Math.min(100,Number(pos.x)/img.naturalWidth*100))}%`;b.style.top=`${Math.max(0,Math.min(100,Number(pos.y)/img.naturalHeight*100))}%`;b.innerHTML=kind==='portals'?'↗':kind==='npcs'?'N':'●';if(click)b.addEventListener('click',click);host.appendChild(b);
  }
  function renderOverlays(map){
    const host=q('#map-canvas');if(!host)return;host.querySelectorAll('.map-overlay').forEach(x=>x.remove());
    if(state.showNpcs)for(const id of map.npcs||[])for(const pos of currentNpcPositions(map,id))addOverlay(host,'npcs',pos,npcName(id),()=>document.querySelector(`[data-npc-row="${id}"]`)?.scrollIntoView({behavior:'smooth',block:'nearest'}));
    if(state.showMobs)for(const mob of groupedMobs(map))for(const pos of mob.positions)addOverlay(host,'mobs',pos,`${mobName(mob.id)} ×${mob.count}`);
    if(state.showPortals)for(const p of portalRows(map)){if(!Number.isFinite(Number(p.x))||!Number.isFinite(Number(p.y)))continue;const dest=padMap(p.dest_map);const special=dest==='999999999';addOverlay(host,'portals',p,special?(p.name||'Script / special portal'):`${p.name||'Portal'} → ${mapName(dest)}`,special?null:()=>showDetail(dest));}
  }
  function renderNpcs(map){
    const host=q('#map-npc-list');if(!host)return;host.innerHTML='';const ids=[...new Set(map.npcs||[])];q('#map-npc-count').textContent=String(ids.length);
    if(!ids.length){host.innerHTML='<div class="maps-empty">No NPCs on this map.</div>';return;}
    for(const id of ids){const row=document.createElement('div');row.className='map-entity-row';row.dataset.npcRow=String(id);const im=document.createElement('img');im.loading='lazy';im.src=`${DATA_ROOT}images/npcs/${padNpc(id)}.png`;im.alt=npcName(id);im.onerror=()=>im.remove();const pos=currentNpcPositions(map,id)[0];row.append(im);row.insertAdjacentHTML('beforeend',`<span><b>${esc(npcName(id))}</b><small>NPC #${padNpc(id)}${pos?` · ${Math.round(pos.x)}, ${Math.round(pos.y)}`:''}</small></span>`);host.appendChild(row);}
  }
  function renderMobs(map){
    const host=q('#map-mob-list');if(!host)return;host.innerHTML='';const mobs=groupedMobs(map);q('#map-mob-count').textContent=String(mobs.length);
    if(!mobs.length){host.innerHTML='<div class="maps-empty">No monster spawns on this map.</div>';return;}
    for(const mob of mobs){const row=document.createElement('div');row.className='map-entity-row';const src=monsterImage(mob.id);if(src){const im=document.createElement('img');im.loading='lazy';im.src=src;im.alt=mobName(mob.id);im.onerror=()=>im.remove();row.appendChild(im);}row.insertAdjacentHTML('beforeend',`<span><b>${esc(mobName(mob.id))}</b><small>${mob.count} spawn point${mob.count===1?'':'s'} · Mob #${esc(mob.id)}</small></span>`);host.appendChild(row);}
  }
  function renderConnections(map){
    const host=q('#map-exit-list');if(!host)return;host.innerHTML='';const exits=Array.isArray(map.exit_names)?map.exit_names:[];const portals=portalRows(map).filter(p=>padMap(p.dest_map)!=='999999999');const ids=new Map();
    exits.forEach(x=>ids.set(padMap(x.id),x.name||mapName(x.id)));portals.forEach(p=>ids.set(padMap(p.dest_map),mapName(p.dest_map)));q('#map-exit-count').textContent=String(ids.size);
    if(!ids.size){host.innerHTML='<div class="maps-empty">No connected map exported.</div>';return;}
    for(const [id,name] of ids){const b=document.createElement('button');b.type='button';b.innerHTML=`<span><b>${esc(name)}</b><small>#${id}</small></span><i>→</i>`;b.addEventListener('click',()=>showDetail(id));host.appendChild(b);}
  }
  function renderDetail(id){
    const map=state.byId.get(padMap(id));if(!map)return;state.selected=padMap(map.id);switchView('detail');
    q('#map-detail-name').textContent=map.name||state.selected;q('#map-detail-region').textContent=String(map.__region||map.region||'Victoria Island').toUpperCase();
    const meta=q('#map-detail-meta');meta.innerHTML='';[['ID',`#${state.selected}`],['Street',map.street_name],['BGM',map.bgm?.replace(/^Bgm[^/]*\//,'')],['Return',map.return_map_name],['Type',map.is_town?'Town':'Field']].filter(([,v])=>v!==undefined&&v!==null&&v!=='').forEach(([k,v])=>meta.insertAdjacentHTML('beforeend',`<span><small>${esc(k)}</small><b>${esc(v)}</b></span>`));
    const sel=q('#map-detail-select');if(sel&&[...sel.options].some(o=>o.value===state.selected))sel.value=state.selected;
    const img=q('#map-detail-image');const canvas=q('#map-canvas');canvas?.querySelectorAll('.map-overlay').forEach(x=>x.remove());img.classList.remove('loaded');img.src=mapImage(map);img.alt=`${map.name} map`;img.onload=()=>{img.classList.add('loaded');renderOverlays(map);document.documentElement.classList.add('maps-detail-image-ready');};img.onerror=()=>{img.classList.remove('loaded');};
    renderNpcs(map);renderMobs(map);renderConnections(map);document.documentElement.classList.add('maps-detail-ready');
  }
  async function showDetail(id){await loadData();renderDetail(id);page()?.scrollIntoView({block:'start'});}

  function bindShell(){
    page()?.querySelectorAll('[data-map-view]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.mapView==='detail')showDetail(state.selected);else switchView('overview');}));
    q('#maps-back-overview')?.addEventListener('click',()=>switchView('overview'));
    q('#maps-random')?.addEventListener('click',()=>{if(state.victoria.length)showDetail(padMap(state.victoria[Math.floor(Math.random()*state.victoria.length)].id));});
    q('#maps-search')?.addEventListener('input',e=>renderSearch(e.target.value));
    q('#maps-search')?.addEventListener('keydown',e=>{if(e.key==='Enter'){const first=searchMatches(e.target.value)[0];if(first){e.preventDefault();showDetail(padMap(first.id));}}});
    q('#map-detail-select')?.addEventListener('change',e=>showDetail(e.target.value));
    page()?.querySelectorAll('[data-world-zoom]').forEach(b=>b.addEventListener('click',()=>{const v=b.dataset.worldZoom;if(v==='reset')setWorldZoom(1);else setWorldZoom(state.zoom+(v==='+'?.15:-.15));}));
    page()?.querySelectorAll('[data-map-layer]').forEach(box=>box.addEventListener('change',()=>{state.showNpcs=q('[data-map-layer="npcs"]')?.checked!==false;state.showMobs=q('[data-map-layer="mobs"]')?.checked!==false;state.showPortals=q('[data-map-layer="portals"]')?.checked!==false;const map=state.byId.get(state.selected);if(map)renderOverlays(map);}));
    q('#map-full-image')?.addEventListener('click',()=>{const src=q('#map-detail-image')?.src;if(src)window.open(src,'_blank','noopener');});
  }
  async function initMaps(){
    ensureShell();try{await loadData();populateSelect();renderWorldMarkers();setWorldZoom(1);const count=q('#maps-overview-count');if(count)count.textContent=`${state.victoria.length} current Victoria Island maps · ${WORLD_MARKERS.length} world-map travel points`;document.documentElement.classList.add('maps-tab-ready');}catch(err){const count=q('#maps-overview-count');if(count)count.textContent='Map data could not be loaded.';console.error('Maps tab:',err);}
  }
  function openMaps(){
    document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x===page()));document.querySelectorAll('#nav .nav-btn').forEach(x=>x.classList.toggle('active',x.dataset.page==='maps'));
    const title=document.getElementById('page-title'),sub=document.getElementById('page-subtitle'),back=document.getElementById('page-back');if(title)title.textContent='Maps';if(sub)sub.textContent='Victoria Island overview, full maps, NPCs, monsters and portal travel.';if(back)back.hidden=true;window.scrollTo(0,0);initMaps();
  }
  function ensureNav(){
    const nav=document.getElementById('nav'),equipment=nav?.querySelector('.nav-btn[data-page="equipment"]');if(!nav||!equipment)return;
    let btn=nav.querySelector('.nav-btn[data-page="maps"]');if(!btn){btn=document.createElement('button');btn.className='nav-btn';btn.dataset.page='maps';btn.innerHTML='<span>⌖</span> Maps';nav.insertBefore(btn,equipment);}else if(btn.nextElementSibling!==equipment)nav.insertBefore(btn,equipment);
    if(!btn.dataset.mapsBound){btn.dataset.mapsBound='1';btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();openMaps();},true);}
    document.documentElement.classList.add('maps-nav-ready');
  }
  ensureNav();ensureShell();initMaps();
  new MutationObserver(()=>{ensureNav();ensureShell();}).observe(document.body,{childList:true,subtree:true});
  window.TCW_MAPS={showDetail,open:openMaps,get state(){return state;}};
})();
