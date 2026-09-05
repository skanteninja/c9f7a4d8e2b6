(() => {
  const DATA_ROOT='/game-data/data/current/';
  const LEGACY_INDEX='/game-data/legacy/maps.json';
  const ATLAS_ROOT='/assets/map-atlas/';
  const WORLD_W=954,WORLD_H=699;
  const VICTORIA_MARKERS=[
    ['010000000',151.5,561,'town'],['010000010',157.5,496.5,'spot'],['010000011',187.5,477,'spot'],['010000012',222,480,'spot'],['010000013',258,466.5,'spot'],['010000020',276,436.5,'spot'],
    ['010005030',406.5,387,'cluster'],['010001030',291,480,'spot'],['010001020',310.5,526.5,'spot'],['010001010',355.5,558,'spot'],['010001000',436.5,562.5,'town'],['010001090',427.5,504,'spot'],['010001100',414,471,'spot'],['010001060',513,555,'spot'],['010001070',528,526.5,'spot'],['010001080',537,487.5,'spot'],
    ['010002030',558,465,'spot'],['010002020',591,450,'spot'],['010002010',621,433.5,'spot'],['010002000',663,381,'town'],['010002050',586.5,387,'spot'],['010002060',558,376.5,'spot'],['010002070',541.5,339,'spot'],
    ['010003050',238.5,420,'spot'],['010003040',195,429,'spot'],['010003030',166.5,402,'spot'],['010003020',174,360,'spot'],['010003010',174,324,'spot'],['010003000',144,276,'town'],['010003070',198,228,'spot'],['010003080',237,229.5,'spot'],['010003090',213,279,'spot'],['010003091',255,288,'spot'],['010003092',280.5,327,'spot'],['010003093',292.5,363,'spot'],['010003094',322.5,384,'spot'],
    ['010004000',366,129,'town'],['010004010',304.5,171,'spot'],['010004020',300,204,'spot'],['010004030',277.5,228,'spot'],['010004040',426,163.5,'spot'],['010004050',453,177,'spot'],['010004060',486,189,'spot'],['010004070',510,220.5,'spot'],['010004080',540,255,'spot'],['010004090',543,301.5,'spot'],['010004100',358.5,205.5,'spot'],['010004110',340.5,234,'spot'],['010004120',325.5,280.5,'spot'],['010004121',354,310.5,'spot'],
    ['010006000',519,379.5,'cluster'],['010007000',789,556.5,'town'],['010007010',826.5,547.5,'spot'],['010007020',852,523.5,'spot'],['010007030',846,484.5,'spot'],['010007040',807,478.5,'spot']
  ];
  const CONTINENTS=[
    {id:'maple-island',name:'Maple Island',subtitle:'Amherst · Southperry',image:`${ATLAS_ROOT}sheets/maple-island.png`,mark:'',aliases:'maple island amherst southperry beginner island'},
    {id:'victoria',name:'Victoria Island',subtitle:'Henesys · Ellinia · Perion · Kerning · Sleepywood',image:`${ATLAS_ROOT}sheets/victoria-island.png`,mark:'',currentMarkers:false,aliases:'victoria henesys ellinia perion kerning lith sleepywood dungeon ant tunnel florina nautilus'},
    {id:'ossyria',name:'Orbis / El Nath Mts.',subtitle:'Orbis · El Nath · Dead Mine',image:`${ATLAS_ROOT}sheets/orbis-el-nath.png`,mark:'',aliases:'ossyria orbis el nath elnath dead mine snow mountain zakum'},
    {id:'ludus',name:'Ludus Lake',subtitle:'Ludibrium · Omega Sector · Korean Folk Town',image:`${ATLAS_ROOT}sheets/ludus-lake.png`,mark:'',aliases:'ludus lake ludibrium omega sector korean folk town eos helios clocktower'},
    {id:'aqua',name:'Aqua Road',subtitle:'Aquarium · Deep Sea',image:`${ATLAS_ROOT}sheets/aqua-road.png`,mark:'',aliases:'aqua road aquarium deep sea ocean'},
    {id:'minar',name:'Minar Forest',subtitle:'Leafre · Dragon Forest',image:`${ATLAS_ROOT}sheets/minar-forest.png`,mark:'',aliases:'minar forest leafre dragon canyon'},
    {id:'mulung',name:'Mu Lung Garden',subtitle:'Mu Lung · Herb Town',image:`${ATLAS_ROOT}sheets/mu-lung-garden.png`,mark:'',aliases:'mu lung mulung herb town garden'},
    {id:'nihal',name:'Nihal Desert',subtitle:'Ariant · Magatia',image:`${ATLAS_ROOT}sheets/nihal-desert.png`,mark:'',aliases:'nihal desert ariant magatia alchemy'},
    {id:'temple',name:'Temple of Time',subtitle:'Three Doors · Time Lane',image:`${ATLAS_ROOT}sheets/temple-of-time.png`,mark:'',aliases:'temple of time three doors time lane memory road'},
    {id:'ereve',name:'Ereve',subtitle:'Cygnus Knights · Forest of Beginning',image:`${ATLAS_ROOT}sheets/ereve.png`,mark:'',aliases:'ereve cygnus knights forest of beginning'},
    {id:'rien',name:'Rien',subtitle:'Aran · Snow Island',image:`${ATLAS_ROOT}sheets/rien.png`,mark:'',aliases:'rien aran snow island'},
    {id:'world-tour',name:'World Tour',subtitle:'Zipangu · Showa · Singapore and more',image:'',mark:'',aliases:'world tour zipangu mushroom shrine showa singapore malaysia thailand taiwan'},
    {id:'masteria',name:'Masteria',subtitle:'New Leaf City · Haunted House',image:`${ATLAS_ROOT}sheets/masteria.png`,mark:'',aliases:'masteria new leaf city nlc haunted house crimsonwood'},
    {id:'other',name:'Other / Event',subtitle:'PQ · event · special maps',image:'',mark:'',aliases:'event pq party quest hidden special'}
  ];
  const WORLD_HOTSPOTS={
    'maple-island':[17,72],'victoria':[34,62],'ossyria':[58,26],'ludus':[74,44],'aqua':[71,64],'minar':[88,32],'mulung':[84,52],'nihal':[51,74],'temple':[91,13],'ereve':[68,12],'rien':[48,12],'world-tour':[13,34],'masteria':[28,18]
  };
  const state={loaded:false,loading:null,current:[],legacy:[],maps:[],byRef:new Map(),byId:new Map(),npcNames:{},mobNames:{},portals:{},monsters:new Map(),view:'world',continent:null,selected:null,returnView:'world',returnContinent:null,zoom:1,showNpcs:true,showMobs:true,showPortals:true,explorerLimit:120,atlas:null,atlasLoading:null};
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const norm=v=>String(v??'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const padMap=v=>String(v??'').replace(/\D/g,'').padStart(9,'0');
  const padNpc=v=>String(v??'').replace(/\D/g,'').padStart(7,'0');
  const page=()=>document.querySelector('section[data-page="maps"]');
  const q=s=>page()?.querySelector(s);
  const continentConfig=id=>CONTINENTS.find(x=>x.id===id)||CONTINENTS.at(-1);

  const atlasMarkerUrl=type=>`/game-media/worldmap/marker-${Number(type)===3?'town':Number(type)===2?'cluster':'spot'}.png`;
  const ATLAS_CURRENT_ID_ALIASES={'100000000':'010001000'};
  async function loadAtlas(){
    if(state.atlas)return state.atlas;if(state.atlasLoading)return state.atlasLoading;
    state.atlasLoading=fetch(`${ATLAS_ROOT}data/markers.json`,{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error('atlas markers '+r.status);return r.json();}).then(x=>{state.atlas=x||{};return state.atlas;}).catch(()=>{state.atlas={};return state.atlas;});return state.atlasLoading;
  }
  function atlasMapFor(point){for(const raw of point?.maps||[]){const digits=String(raw??'').replace(/\D/g,''),id=padMap(digits),numeric=String(Number(digits)),alias=ATLAS_CURRENT_ID_ALIASES[numeric];if(alias){const currentAlias=state.byId.get(alias);if(currentAlias)return currentAlias;}const cur=state.byId.get(id);if(cur)return cur;const direct=state.byRef.get(`l:${id}`)||state.byRef.get(`l:${numeric}`);if(direct)return direct;const any=state.maps.find(m=>String(Number(String(m.id||'').replace(/\D/g,'')))===numeric||(m.legacy_ids||[]).some(x=>String(Number(String(x).replace(/\D/g,'')))===numeric));if(any)return any;}const label=norm(point?.label||'');if(label){const current=state.current.find(m=>norm(m.name)===label);if(current)return state.byRef.get(refFor(current))||current;const legacy=state.legacy.find(m=>norm(m.name)===label);if(legacy)return state.byRef.get(refFor(legacy))||legacy;}return null;}
  function atlasContinentFor(point){const hit=atlasMapFor(point);if(hit)return hit.__continent;const raw=point?.maps?.[0];return raw==null?'other':continentFor({id:String(raw),source:'legacy',name:'',street_name:''});}
  function setAtlasReady(){const img=q('#maps-full-world-image'),meta=state.atlas?.world;if(img?.complete&&img.naturalWidth>200&&meta?.markers?.length>=10)document.documentElement.classList.add('maps-atlas-visual-ready');}
  function renderWorldAtlasMarkers(){const host=q('#maps-continent-hotspots'),meta=state.atlas?.world;if(!host||!meta?.markers?.length)return;host.innerHTML='';for(const point of meta.markers){const cid=atlasContinentFor(point);const c=continentConfig(cid),map=atlasMapFor(point),label=point.label||map?.name||c.name;const b=document.createElement('button');b.type='button';b.className=`maps-atlas-world-point type-${point.type}${Number(point.type)===3?' major':''}`;b.dataset.continent=cid;b.style.left=`${point.x/meta.width*100}%`;b.style.top=`${point.y/meta.height*100}%`;b.title=`${label} · ${c.name}`;b.innerHTML=`<img src="${atlasMarkerUrl(point.type)}" alt=""><span>${esc(label)}</span>`;const icon=b.querySelector('img');icon?.addEventListener('error',()=>{icon.remove();b.classList.add('sprite-fallback')});b.addEventListener('click',()=>openContinent(cid));host.appendChild(b);}setAtlasReady();}
  function renderAtlasSheetMarkers(id){const host=q('#maps-sheet-markers'),meta=state.atlas?.[id];if(!host||!meta?.markers?.length)return;host.innerHTML='';for(const point of meta.markers){const map=atlasMapFor(point),label=point.label||map?.name||'Map point';const b=document.createElement('button');b.type='button';b.className=`atlas-map-point type-${point.type}${map?'':' unresolved'}`;if(map)b.dataset.mapId=padMap(map.id);b.style.left=`${point.x/meta.width*100}%`;b.style.top=`${point.y/meta.height*100}%`;b.title=map?`${map.name} · #${map.id}`:label;b.innerHTML=`<img src="${atlasMarkerUrl(point.type)}" alt=""><span>${esc(label)}</span>`;const icon=b.querySelector('img');icon?.addEventListener('error',()=>{icon.remove();b.classList.add('sprite-fallback')});b.addEventListener('click',()=>{if(map){showDetail(map.__ref,'continent',id);return;}openExplorer();const search=q('#maps-explorer-search');if(search){search.value=label;renderExplorer();}});host.appendChild(b);}document.documentElement.classList.add('maps-sheet-markers-ready');}
  function continentArt(c){const art=c.image?`<img class="maps-continent-art-image" src="${c.image}" alt="${esc(c.name)} world map" loading="lazy">`:'';const logo=c.mark?`<img class="maps-continent-logo" src="${c.mark}" alt="" loading="lazy">`:'';return `<span class="maps-continent-art">${art}<span class="maps-continent-logo-shell">${logo}</span></span>`;}


  function flattenMaps(data){const rows=[];for(const region of data?.regions||[])for(const map of region.maps||[])rows.push({...map,__region:region.region,source:'current'});return rows;}
  function flattenMonsters(data,out=[]){if(Array.isArray(data)){data.forEach(x=>flattenMonsters(x,out));return out;}if(!data||typeof data!=='object')return out;if(data.id!=null&&data.name&&(data.thumbnail||data.gif))out.push(data);Object.values(data).forEach(v=>{if(v&&typeof v==='object')flattenMonsters(v,out);});return out;}
  function legacyRow(x){return{...x,id:String(x.id||''),name:x.name||x.map_name||'Unknown map',street_name:x.street_name||x.street||'',description:x.description||'',bgm:x.bgm||'',return_map_id:x.return_map||x.return_map_id||'',map_mark:x.map_mark||'',source:'legacy'};}
  function refFor(map){return `${map.source==='legacy'?'l':'c'}:${String(map.id)}`;}
  function identityKey(map){return `${norm(map.name)}|${norm(map.street_name||map.__region||'')}`;}

  function legacySubregion(map){
    const id=String(map.id||'');const t=norm(`${map.name} ${map.street_name||''} ${map.map_mark||''}`);
    if(/^105/.test(id)||/sleepywood|ant tunnel|deep valley|dungeon/.test(t))return 'sleepywood';
    if(/^200/.test(id)||/orbis/.test(t))return 'orbis';
    if(/^211/.test(id)||/el nath|elnath|snowy|dead mine|zakum/.test(t))return 'el nath';
    if(/^220/.test(id)||/ludibrium|clocktower|eos tower|helios/.test(t))return 'ludibrium';
    if(/^221/.test(id)||/omega sector/.test(t))return 'omega sector';
    if(/^222/.test(id)||/korean folk/.test(t))return 'korean folk town';
    if(/^230/.test(id)||/aqua|aquarium|sea/.test(t))return 'aqua road';
    if(/^240/.test(id)||/leafre|minar|dragon forest/.test(t))return 'leafre';
    if(/^250/.test(id)||/mu lung|mulung/.test(t))return 'mu lung';
    if(/^251/.test(id)||/herb town/.test(t))return 'herb town';
    if(/^260/.test(id)||/ariant/.test(t))return 'ariant';
    if(/^261/.test(id)||/magatia/.test(t))return 'magatia';
    if(/^270/.test(id)||/temple of time|time lane|three doors/.test(t))return 'temple of time';
    if(/^600/.test(id)||/new leaf|masteria|crimsonwood/.test(t))return 'masteria';
    if(/^800/.test(id)||/zipangu|showa|mushroom shrine|singapore|malaysia/.test(t))return 'world tour';
    return '';
  }
  function continentFor(map){
    const id=String(map.id||''),t=norm(`${map.__region||''} ${map.region||''} ${map.name||''} ${map.street_name||''} ${map.map_mark||''}`);
    if(map.source==='current'){
      if(/maple island/.test(t))return'maple-island';
      if(/victoria island/.test(t)||/^0100/.test(id))return'victoria';
      if(/el nath|orbis|ossyria|dead mine/.test(t))return'ossyria';
      if(/ludibrium|ludus|omega sector|korean folk/.test(t))return'ludus';
      if(/aqua road|aquarium/.test(t))return'aqua';
      if(/minar|leafre/.test(t))return'minar';
      if(/mu lung|herb town/.test(t))return'mulung';
      if(/nihal|ariant|magatia/.test(t))return'nihal';
      if(/temple of time/.test(t))return'temple';
      if(/masteria|new leaf/.test(t))return'masteria';
      if(/ereve|cygnus/.test(t))return'ereve';
      if(/rien|aran/.test(t))return'rien';
      if(/world tour|zipangu|showa|singapore|malaysia/.test(t))return'world-tour';
    }
    const n=Number(id);
    if(n>=0&&n<100000000)return'maple-island';
    if(n>=130000000&&n<140000000)return'ereve';
    if(n>=140000000&&n<150000000)return'rien';
    if(n>=100000000&&n<200000000)return'victoria';
    if(n>=200000000&&n<220000000||n>=280000000&&n<290000000)return'ossyria';
    if(n>=220000000&&n<230000000)return'ludus';
    if(n>=230000000&&n<240000000)return'aqua';
    if(n>=240000000&&n<250000000)return'minar';
    if(n>=250000000&&n<260000000)return'mulung';
    if(n>=260000000&&n<270000000)return'nihal';
    if(n>=270000000&&n<280000000)return'temple';
    if(n>=600000000&&n<700000000)return'masteria';
    if(n>=800000000&&n<900000000)return'world-tour';
    return'other';
  }
  function searchable(map){
    const c=continentConfig(continentFor(map));const sub=map.source==='legacy'?legacySubregion(map):(/^010005|^010006/.test(String(map.id))?'sleepywood':'');
    const legacy=(map.legacy_ids||[]).join(' ');
    return norm(`${map.name} ${map.street_name||''} ${map.__region||map.region||''} ${map.id} ${legacy} ${c.name} ${c.aliases} ${sub} ${map.description||''} ${map.map_mark||''}`);
  }

  async function loadData(){
    if(state.loaded)return state;if(state.loading)return state.loading;
    const legacyFetch=fetch(LEGACY_INDEX,{cache:'force-cache'}).then(r=>r.ok?r.json():[]).catch(()=>[]);
    state.loading=Promise.all([
      fetch(`${DATA_ROOT}maps.json`,{cache:'force-cache'}).then(r=>r.json()),
      fetch(`${DATA_ROOT}lookups.json`,{cache:'force-cache'}).then(r=>r.json()),
      fetch(`${DATA_ROOT}portals.json`,{cache:'force-cache'}).then(r=>r.json()),
      fetch(`${DATA_ROOT}monsters.json`,{cache:'force-cache'}).then(r=>r.json()),legacyFetch
    ]).then(([maps,lookups,portals,monsters,legacy])=>{
      state.current=flattenMaps(maps);state.legacy=(Array.isArray(legacy)?legacy:legacy?.maps||[]).map(legacyRow);
      state.npcNames=lookups?.npc_names||{};state.mobNames=lookups?.mob_names||{};state.portals=portals||{};state.monsters=new Map(flattenMonsters(monsters).map(m=>[String(m.id),m]));
      const currentKeys=new Map();for(const m of state.current){const k=identityKey(m);if(k!=='|'&&!currentKeys.has(k))currentKeys.set(k,m);}
      const merged=[...state.current];for(const old of state.legacy){const hit=currentKeys.get(identityKey(old));if(hit){hit.legacy_ids=hit.legacy_ids||[];if(!hit.legacy_ids.includes(String(old.id)))hit.legacy_ids.push(String(old.id));hit.legacy=true;}else merged.push(old);}
      for(const m of merged){m.__continent=continentFor(m);m.__search=searchable(m);m.__ref=refFor(m);}
      state.maps=merged.sort((a,b)=>String(a.name).localeCompare(String(b.name))||String(a.id).localeCompare(String(b.id)));
      state.byRef=new Map(state.maps.map(m=>[m.__ref,m]));state.byId=new Map(state.current.map(m=>[padMap(m.id),m]));
      state.loaded=true;document.documentElement.classList.add('maps-data-ready');if(state.legacy.length)document.documentElement.classList.add('maps-legacy-data-ready');
      return state;
    }).catch(err=>{state.loading=null;throw err;});return state.loading;
  }

  function mapName(id){const m=state.byId.get(padMap(id));return m?.name||`Map #${padMap(id)}`;}
  function npcName(id){return state.npcNames?.[String(Number(id))]||state.npcNames?.[padNpc(id)]||`NPC #${padNpc(id)}`;}
  function mobName(id){return state.mobNames?.[String(Number(id))]||state.mobNames?.[String(id)]||state.monsters.get(String(id))?.name||`Mob #${id}`;}
  function mapImage(map){if(map.source==='legacy')return`/game-media/legacy-map/${String(map.id).replace(/\D/g,'')}/minimap`;return map?.minimap?`${DATA_ROOT}${String(map.minimap).replace(/^\/+/, '')}`:`${DATA_ROOT}images/maps/${padMap(map?.id)}.png`;}
  function monsterImage(id){const m=state.monsters.get(String(id));if(!m)return'';const rel=m.gif||m.thumbnail;return rel?`${DATA_ROOT}${String(rel).replace(/^\/+/, '')}`:'';}
  function sourceLabel(map){return map.source==='current'?(map.legacy?'CURRENT + OLD SCHOOL':'CURRENT CLASSIC'):'OLD SCHOOL';}
  function sourceClass(map){return map.source==='current'?'current':'legacy';}

  function ensureShell(){
    const root=page();if(!root||root.dataset.mapsShell==='2')return;root.dataset.mapsShell='2';
    root.innerHTML=`
      <div class="maps-hero">
        <div><span class="eyebrow">MAPLE WORLD ATLAS</span><h2>Maps</h2><p>Browse the whole world, drill into a continent, or search every current Classic and old-school map in one place.</p></div>
        <div class="maps-view-switch" role="tablist"><button type="button" data-map-view="world" class="active">World</button><button type="button" data-map-view="explorer">All maps</button></div>
      </div>
      <div class="maps-breadcrumb panel"><button type="button" id="maps-local-back" class="mini-btn" hidden>← Back</button><div id="maps-crumbs"><b>Maple World</b><span>Choose a continent or open the full map database.</span></div></div>
      <div id="maps-world" class="maps-view active">
        <section class="maps-full-world panel">
          <div class="maps-overview-head"><div><b>Maple World</b><span id="maps-world-count">Loading current + old-school maps…</span></div><button type="button" id="maps-open-explorer" class="mini-btn">Search every map</button></div>
          <div class="maps-full-world-stage"><div class="maps-world-canvas"><img id="maps-full-world-image" src="${ATLAS_ROOT}sheets/maple-world.png" alt="Maple World"><div id="maps-continent-hotspots"></div></div></div><div class="maps-world-visual-key"><span><b>Original Maple World sheet</b> · click a Maple marker to open its region</span><span>Current Classic records remain preferred wherever available.</span></div>
          <div id="maps-continent-grid" class="maps-continent-grid"></div>
        </section>
      </div>
      <div id="maps-continent" class="maps-view">
        <div class="maps-continent-head panel"><div><span class="eyebrow" id="maps-continent-kicker">CONTINENT</span><h2 id="maps-continent-title">Victoria Island</h2><p id="maps-continent-subtitle"></p></div><div class="maps-continent-search"><input id="maps-continent-search" type="search" placeholder="Filter this continent…"><span id="maps-continent-count"></span></div></div>
        <div class="maps-continent-layout">
          <section class="panel maps-sheet-panel"><div class="maps-sheet-scroll"><div id="maps-sheet-stage" class="maps-sheet-stage"><img id="maps-sheet-image" alt="Selected continent"><div id="maps-sheet-markers"></div></div></div><div id="maps-sheet-note" class="maps-world-legend"></div></section>
          <section class="panel maps-continent-list-panel"><div class="maps-list-head"><div><b>Maps in this region</b><small>Click any row for the detailed view.</small></div><button id="maps-continent-all" type="button" class="mini-btn">All maps</button></div><div id="maps-continent-list" class="maps-database-list"></div></section>
        </div>
      </div>
      <div id="maps-explorer" class="maps-view">
        <section class="panel maps-explorer-panel">
          <div class="maps-explorer-head"><div><span class="eyebrow">ALL MAPS</span><h2>Map Database</h2><p>Search by map name, street, ID, continent, or area keyword. Try <b>sleepywood</b>, <b>orbis</b>, <b>el nath</b>, <b>ludibrium</b>, <b>leafre</b>…</p></div><div class="maps-explorer-count"><b id="maps-explorer-total">0</b><span>maps indexed</span></div></div>
          <div class="maps-explorer-search-row"><input id="maps-explorer-search" type="search" placeholder="Search maps: sleepywood, orbis, el nath, ant tunnel, 211000000…" autocomplete="off"><select id="maps-explorer-continent"><option value="all">All continents</option>${CONTINENTS.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div>
          <div class="maps-keyword-chips">${['sleepywood','orbis','el nath','ludibrium','aqua road','leafre','mu lung','ariant','magatia','temple of time'].map(x=>`<button type="button" data-map-keyword="${x}">${x}</button>`).join('')}</div>
          <div id="maps-explorer-status" class="maps-explorer-status"></div><div id="maps-explorer-list" class="maps-database-list maps-database-all"></div><button id="maps-explorer-more" type="button" class="mini-btn maps-more" hidden>Show more</button>
        </section>
      </div>
      <div id="maps-detail" class="maps-view">
        <div class="maps-detail-top panel"><div><span class="eyebrow" id="map-detail-region">MAP</span><h2 id="map-detail-name">Select a map</h2><div id="map-detail-meta" class="map-detail-meta"></div></div><div class="maps-detail-source"><span id="map-detail-source" class="map-source-pill"></span></div></div>
        <div class="maps-detail-layout"><section class="panel maps-canvas-panel"><div class="maps-layer-controls" id="map-layer-controls"><label><input type="checkbox" data-map-layer="npcs" checked> NPCs</label><label><input type="checkbox" data-map-layer="mobs" checked> Monsters</label><label><input type="checkbox" data-map-layer="portals" checked> Portals</label><button type="button" id="map-full-image" class="mini-btn">Open image</button></div><div id="map-canvas-scroll" class="map-canvas-scroll"><div id="map-canvas" class="map-canvas"><img id="map-detail-image" alt="Selected map"></div></div><div id="map-legacy-note" class="map-legacy-note" hidden></div></section><aside class="maps-detail-side"><section class="panel"><div class="maps-side-head"><h3>NPCs</h3><b id="map-npc-count">0</b></div><div id="map-npc-list" class="map-entity-list"></div></section><section class="panel"><div class="maps-side-head"><h3>Monsters</h3><b id="map-mob-count">0</b></div><div id="map-mob-list" class="map-entity-list"></div></section><section class="panel"><div class="maps-side-head"><h3>Connections</h3><b id="map-exit-count">0</b></div><div id="map-exit-list" class="map-exit-list"></div></section></aside></div>
      </div>`;
    bindShell();
  }

  function setView(view){state.view=view;for(const v of ['world','continent','explorer','detail'])q(`#maps-${v}`)?.classList.toggle('active',v===view);page()?.querySelectorAll('[data-map-view]').forEach(b=>b.classList.toggle('active',b.dataset.mapView===view||(view==='continent'||view==='detail')&&b.dataset.mapView==='world'));updateBreadcrumb();}
  function updateBreadcrumb(){const back=q('#maps-local-back'),crumb=q('#maps-crumbs');if(!back||!crumb)return;if(state.view==='world'){back.hidden=true;crumb.innerHTML='<b>Maple World</b><span>Choose a continent or open the full map database.</span>';}else if(state.view==='continent'){back.hidden=false;const c=continentConfig(state.continent);back.textContent='← Maple World';crumb.innerHTML=`<b>Maple World › ${esc(c.name)}</b><span>${esc(c.subtitle)}</span>`;}else if(state.view==='explorer'){back.hidden=false;back.textContent='← Maple World';crumb.innerHTML='<b>Maple World › All Maps</b><span>Search the combined current Classic + old-school map index.</span>';}else{back.hidden=false;const map=state.selected&&state.byRef.get(state.selected);const label=state.returnView==='continent'?continentConfig(state.returnContinent).name:state.returnView==='explorer'?'All Maps':'Maple World';back.textContent=`← ${label}`;crumb.innerHTML=`<b>Maple World › ${esc(label)} › ${esc(map?.name||'Map')}</b><span>Escape returns one level.</span>`;}}
  function goBack(){if(state.view==='detail'){if(state.returnView==='continent')openContinent(state.returnContinent,false);else if(state.returnView==='explorer')openExplorer(false);else openWorld(false);}else if(state.view==='continent'||state.view==='explorer')openWorld(false);else document.querySelector('#nav .nav-btn[data-page="dashboard"]')?.click();}

  function mapsForContinent(id){return state.maps.filter(m=>m.__continent===id);}
  function renderWorld(){
    setView('world');const count=q('#maps-world-count');if(count)count.textContent=`${state.current.length} current Classic records · ${state.legacy.length} old-school records · ${state.maps.length} merged maps`;
    const grid=q('#maps-continent-grid'),hot=q('#maps-continent-hotspots');if(!grid||!hot)return;grid.innerHTML='';hot.innerHTML='';
    for(const c of CONTINENTS){const rows=mapsForContinent(c.id);if(!rows.length&&c.id==='other')continue;const current=rows.filter(m=>m.source==='current').length,legacy=rows.filter(m=>m.source==='legacy').length;const card=document.createElement('button');card.type='button';card.className='maps-continent-card';card.dataset.continent=c.id;card.innerHTML=`${continentArt(c)}<span class="maps-continent-copy"><b>${esc(c.name)}</b><small>${esc(c.subtitle)}</small><em><strong>${rows.length}</strong> maps${current?` · ${current} current`:''}${legacy?` · ${legacy} legacy-only`:''}</em></span>`;card.querySelectorAll('img').forEach(im=>im.addEventListener('error',()=>im.remove()));card.addEventListener('click',()=>openContinent(c.id));grid.appendChild(card);}
    const worldImg=q('#maps-full-world-image');worldImg?.addEventListener('load',setAtlasReady,{once:true});worldImg?.addEventListener('error',()=>document.documentElement.classList.add('maps-atlas-image-error'),{once:true});loadAtlas().then(()=>{renderWorldAtlasMarkers();setAtlasReady();});document.documentElement.classList.add('maps-world-ready');
  }

  function renderVictoriaMarkers(){const host=q('#maps-sheet-markers');if(!host)return;host.innerHTML='';for(const [id,x,y,type] of VICTORIA_MARKERS){const map=state.byId.get(id),name=map?.name||`Map #${id}`;const btn=document.createElement('button');btn.type='button';btn.className=`world-map-marker ${type}`;btn.dataset.mapId=id;btn.style.left=`${x/WORLD_W*100}%`;btn.style.top=`${y/WORLD_H*100}%`;btn.title=`${name} · #${id}`;btn.setAttribute('aria-label',`Open ${name}`);const kind=type==='cluster'?'cluster':type==='town'?'town':'spot';btn.innerHTML=`<img src="${ATLAS_ROOT}markers/current-${kind}.png" alt="">${type==='town'?`<span>${esc(name)}</span>`:''}`;const im=btn.querySelector('img');im?.addEventListener('error',()=>{im.remove();btn.classList.add('sprite-fallback')});btn.addEventListener('click',()=>showDetail(map?map.__ref:`c:${id}`,'continent','victoria'));host.appendChild(btn);}document.documentElement.classList.toggle('victoria-world-markers-ready',host.children.length>=50);}
  function renderMapRows(host,rows,limit=180){host.innerHTML='';for(const map of rows.slice(0,limit)){const b=document.createElement('button');b.type='button';b.className='maps-db-row';b.dataset.mapRef=map.__ref;const thumb=mapImage(map);b.innerHTML=`<span class="maps-db-thumb"><img src="${thumb}" alt="" loading="lazy"></span><span class="maps-db-main"><b>${esc(map.name)}</b><small>${esc(map.street_name||continentConfig(map.__continent).name)}</small></span><span class="map-source-pill ${sourceClass(map)}">${sourceLabel(map)}</span><code>#${esc(String(map.id))}</code>`;const im=b.querySelector('.maps-db-thumb img');im?.addEventListener('error',()=>{im.remove();b.querySelector('.maps-db-thumb')?.classList.add('empty')});b.addEventListener('click',()=>showDetail(map.__ref,state.view,state.continent));host.appendChild(b);}}
  function renderContinentList(){const host=q('#maps-continent-list');if(!host)return;const value=norm(q('#maps-continent-search')?.value||'');let rows=mapsForContinent(state.continent);if(value)rows=rows.filter(m=>m.__search.includes(value));renderMapRows(host,rows,250);const count=q('#maps-continent-count');if(count)count.textContent=`${rows.length} / ${mapsForContinent(state.continent).length} maps`;}
  function openContinent(id,push=true){state.continent=id;const c=continentConfig(id);setView('continent');q('#maps-continent-title').textContent=c.name;q('#maps-continent-subtitle').textContent=c.subtitle;q('#maps-continent-kicker').textContent=id==='victoria'?'CURRENT CLASSIC + OLD SCHOOL':'CURRENT CLASSIC + OLD-SCHOOL INDEX';const img=q('#maps-sheet-image');img.src=c.image||`${ATLAS_ROOT}sheets/maple-world.png`;img.alt=`${c.name} world map`;const stage=q('#maps-sheet-stage');stage.classList.toggle('victoria-sheet',id==='victoria');const note=q('#maps-sheet-note');if(id==='victoria'&&c.currentMarkers){renderVictoriaMarkers();note.innerHTML='<span><i class="town"></i>Town</span><span><i class="spot"></i>Field / route</span><span><i class="cluster"></i>Dungeon cluster</span><small>Victoria keeps the exact clickable current-Classic markers.</small>';}else{q('#maps-sheet-markers').innerHTML='';loadAtlas().then(()=>renderAtlasSheetMarkers(id));note.innerHTML='<small>Original old-school world sheet with clickable WZ map points. Current Classic records are preferred wherever available.</small>';}q('#maps-continent-search').value='';renderContinentList();page()?.scrollIntoView({block:'start'});document.documentElement.classList.add('maps-continent-ready');}

  function explorerMatches(){const needle=norm(q('#maps-explorer-search')?.value||''),continent=q('#maps-explorer-continent')?.value||'all';let rows=state.maps;if(continent!=='all')rows=rows.filter(m=>m.__continent===continent);if(needle)rows=rows.map(m=>{let score=0;const name=norm(m.name),street=norm(m.street_name);if(name===needle)score+=100;if(name.startsWith(needle))score+=50;if(street===needle)score+=45;if(m.__search.includes(needle))score+=15;if(continentConfig(m.__continent).aliases.includes(needle))score+=5;return{m,score};}).filter(x=>x.score).sort((a,b)=>b.score-a.score||String(a.m.name).localeCompare(String(b.m.name))).map(x=>x.m);return rows;}
  function renderExplorer(){const rows=explorerMatches(),host=q('#maps-explorer-list');if(!host)return;renderMapRows(host,rows,state.explorerLimit);q('#maps-explorer-total').textContent=String(state.maps.length);const status=q('#maps-explorer-status');if(status)status.textContent=`Showing ${Math.min(rows.length,state.explorerLimit)} of ${rows.length} matching maps · ${state.current.length} current Classic + ${state.legacy.length} old-school records before deduping`;const more=q('#maps-explorer-more');if(more){more.hidden=rows.length<=state.explorerLimit;more.textContent=`Show more (${rows.length-state.explorerLimit} remaining)`;}document.documentElement.classList.add('maps-explorer-ready');}
  function openExplorer(){state.explorerLimit=120;setView('explorer');renderExplorer();q('#maps-explorer-search')?.focus({preventScroll:true});page()?.scrollIntoView({block:'start'});}
  function openWorld(){renderWorld();page()?.scrollIntoView({block:'start'});}

  function portalRows(map){return state.portals?.[padMap(map.id)]||state.portals?.[String(map.id)]||[];}
  function groupedMobs(map){const groups=new Map();for(const pos of map.mob_positions||[]){const id=String(pos.id);const row=groups.get(id)||{id,count:0,positions:[]};row.count++;row.positions.push(pos);groups.set(id,row);}return[...groups.values()];}
  function currentNpcPositions(map,id){return(map.npc_positions||[]).filter(p=>Number(p.id)===Number(id));}
  function addOverlay(host,kind,pos,label,click){const img=q('#map-detail-image');if(!img?.naturalWidth||!img.naturalHeight)return;const b=document.createElement('button');b.type='button';b.className=`map-overlay map-overlay-${kind}`;b.dataset.layer=kind;b.title=label;b.style.left=`${Math.max(0,Math.min(100,Number(pos.x)/img.naturalWidth*100))}%`;b.style.top=`${Math.max(0,Math.min(100,Number(pos.y)/img.naturalHeight*100))}%`;b.innerHTML=kind==='portals'?'↗':kind==='npcs'?'N':'●';if(click)b.addEventListener('click',click);host.appendChild(b);}
  function renderOverlays(map){const host=q('#map-canvas');if(!host||map.source==='legacy')return;host.querySelectorAll('.map-overlay').forEach(x=>x.remove());if(state.showNpcs)for(const id of map.npcs||[])for(const pos of currentNpcPositions(map,id))addOverlay(host,'npcs',pos,npcName(id),()=>document.querySelector(`[data-npc-row="${id}"]`)?.scrollIntoView({behavior:'smooth',block:'nearest'}));if(state.showMobs)for(const mob of groupedMobs(map))for(const pos of mob.positions)addOverlay(host,'mobs',pos,`${mobName(mob.id)} ×${mob.count}`);if(state.showPortals)for(const p of portalRows(map)){if(!Number.isFinite(Number(p.x))||!Number.isFinite(Number(p.y)))continue;const dest=padMap(p.dest_map),special=dest==='999999999';addOverlay(host,'portals',p,special?(p.name||'Script / special portal'):`${p.name||'Portal'} → ${mapName(dest)}`,special?null:()=>{const m=state.byId.get(dest);if(m)showDetail(m.__ref,'detail',state.returnContinent);});}}
  function renderNpcs(map){const host=q('#map-npc-list');host.innerHTML='';if(map.source==='legacy'){q('#map-npc-count').textContent='—';host.innerHTML='<div class="maps-empty">Legacy-only map: current Classic NPC export is not attached to this record.</div>';return;}const ids=[...new Set(map.npcs||[])];q('#map-npc-count').textContent=String(ids.length);if(!ids.length){host.innerHTML='<div class="maps-empty">No NPCs on this map.</div>';return;}for(const id of ids){const row=document.createElement('div');row.className='map-entity-row';row.dataset.npcRow=String(id);const im=document.createElement('img');im.loading='lazy';im.src=`${DATA_ROOT}images/npcs/${padNpc(id)}.png`;im.alt=npcName(id);im.onerror=()=>im.remove();const pos=currentNpcPositions(map,id)[0];row.append(im);row.insertAdjacentHTML('beforeend',`<span><b>${esc(npcName(id))}</b><small>NPC #${padNpc(id)}${pos?` · ${Math.round(pos.x)}, ${Math.round(pos.y)}`:''}</small></span>`);host.appendChild(row);}}
  function renderMobs(map){const host=q('#map-mob-list');host.innerHTML='';if(map.source==='legacy'){q('#map-mob-count').textContent='—';host.innerHTML='<div class="maps-empty">Legacy-only map: use the old-school map image and metadata for reference.</div>';return;}const mobs=groupedMobs(map);q('#map-mob-count').textContent=String(mobs.length);if(!mobs.length){host.innerHTML='<div class="maps-empty">No monster spawns on this map.</div>';return;}for(const mob of mobs){const row=document.createElement('div');row.className='map-entity-row';const src=monsterImage(mob.id);if(src){const im=document.createElement('img');im.loading='lazy';im.src=src;im.alt=mobName(mob.id);im.onerror=()=>im.remove();row.appendChild(im);}row.insertAdjacentHTML('beforeend',`<span><b>${esc(mobName(mob.id))}</b><small>${mob.count} spawn point${mob.count===1?'':'s'} · Mob #${esc(mob.id)}</small></span>`);host.appendChild(row);}}
  function renderConnections(map){const host=q('#map-exit-list');host.innerHTML='';if(map.source==='legacy'){q('#map-exit-count').textContent='—';host.innerHTML='<div class="maps-empty">Portal graph is shown for current Classic maps. Legacy-only maps stay searchable and viewable without pretending their connections are current.</div>';return;}const exits=Array.isArray(map.exit_names)?map.exit_names:[],portals=portalRows(map).filter(p=>padMap(p.dest_map)!=='999999999'),ids=new Map();exits.forEach(x=>ids.set(padMap(x.id),x.name||mapName(x.id)));portals.forEach(p=>ids.set(padMap(p.dest_map),mapName(p.dest_map)));q('#map-exit-count').textContent=String(ids.size);if(!ids.size){host.innerHTML='<div class="maps-empty">No connected map exported.</div>';return;}for(const [id,name] of ids){const b=document.createElement('button');b.type='button';b.innerHTML=`<span><b>${esc(name)}</b><small>#${id}</small></span><i>→</i>`;b.addEventListener('click',()=>{const m=state.byId.get(id);if(m)showDetail(m.__ref,'detail',state.returnContinent);});host.appendChild(b);}}
  function renderDetail(map){state.selected=map.__ref;setView('detail');q('#map-detail-name').textContent=map.name||String(map.id);q('#map-detail-region').textContent=continentConfig(map.__continent).name.toUpperCase();const source=q('#map-detail-source');source.textContent=sourceLabel(map);source.className=`map-source-pill ${sourceClass(map)}`;const meta=q('#map-detail-meta');meta.innerHTML='';[['ID',`#${map.id}`],['Street',map.street_name],['Region',continentConfig(map.__continent).name],['BGM',String(map.bgm||'').replace(/^Bgm[^/]*\//,'')],['Return',map.return_map_name||map.return_map_id],['Type',map.is_town?'Town':map.source==='legacy'?'Old-school map':'Field']].filter(([,v])=>v!==undefined&&v!==null&&v!=='').forEach(([k,v])=>meta.insertAdjacentHTML('beforeend',`<span><small>${esc(k)}</small><b>${esc(v)}</b></span>`));const img=q('#map-detail-image'),canvas=q('#map-canvas');canvas?.querySelectorAll('.map-overlay').forEach(x=>x.remove());img.classList.remove('loaded');img.src=mapImage(map);img.alt=`${map.name} map`;img.onload=()=>{img.classList.add('loaded');if(map.source==='current')renderOverlays(map);document.documentElement.classList.add('maps-detail-image-ready');};img.onerror=()=>img.classList.remove('loaded');const controls=q('#map-layer-controls');controls.classList.toggle('legacy-disabled',map.source==='legacy');controls.querySelectorAll('label').forEach(x=>x.hidden=map.source==='legacy');const note=q('#map-legacy-note');if(map.source==='legacy'){note.hidden=false;note.innerHTML=`<b>OLD-SCHOOL REFERENCE</b><span>This map comes from the GMS v83 map catalog because there is no matching current Classic record in the merged index. Search and navigation include it, but current-only NPC / monster / portal claims are intentionally not invented.</span>${map.description?`<p>${esc(map.description)}</p>`:''}`;}else note.hidden=true;renderNpcs(map);renderMobs(map);renderConnections(map);document.documentElement.classList.add('maps-detail-ready');}
  async function showDetail(ref,returnView=state.view,returnContinent=state.continent){await loadData();let map=state.byRef.get(ref);if(!map&&String(ref).startsWith('c:'))map=state.byId.get(padMap(String(ref).slice(2)));if(!map)return;state.returnView=returnView==='detail'?state.returnView:returnView;state.returnContinent=returnContinent;renderDetail(map);page()?.scrollIntoView({block:'start'});}

  function bindShell(){
    page()?.querySelectorAll('[data-map-view]').forEach(b=>b.addEventListener('click',()=>b.dataset.mapView==='explorer'?openExplorer():openWorld()));
    q('#maps-local-back')?.addEventListener('click',goBack);q('#maps-open-explorer')?.addEventListener('click',openExplorer);q('#maps-continent-all')?.addEventListener('click',openExplorer);
    q('#maps-continent-search')?.addEventListener('input',renderContinentList);
    q('#maps-explorer-search')?.addEventListener('input',()=>{state.explorerLimit=120;renderExplorer();});q('#maps-explorer-continent')?.addEventListener('change',()=>{state.explorerLimit=120;renderExplorer();});
    q('#maps-explorer-more')?.addEventListener('click',()=>{state.explorerLimit+=180;renderExplorer();});page()?.querySelectorAll('[data-map-keyword]').forEach(b=>b.addEventListener('click',()=>{q('#maps-explorer-search').value=b.dataset.mapKeyword;state.explorerLimit=120;renderExplorer();}));
    page()?.querySelectorAll('[data-map-layer]').forEach(box=>box.addEventListener('change',()=>{state.showNpcs=q('[data-map-layer="npcs"]')?.checked!==false;state.showMobs=q('[data-map-layer="mobs"]')?.checked!==false;state.showPortals=q('[data-map-layer="portals"]')?.checked!==false;const map=state.selected&&state.byRef.get(state.selected);if(map)renderOverlays(map);}));
    q('#map-full-image')?.addEventListener('click',()=>{const src=q('#map-detail-image')?.src;if(src)window.open(src,'_blank','noopener');});
    document.addEventListener('keydown',e=>{if(e.key!=='Escape'||!page()?.classList.contains('active'))return;if(state.view!=='world'){e.preventDefault();e.stopPropagation();goBack();}},true);
  }
  async function initMaps(){ensureShell();try{await loadData();renderWorld();document.documentElement.classList.add('maps-tab-ready');}catch(err){const count=q('#maps-world-count');if(count)count.textContent='Map data could not be loaded.';console.error('Maps tab:',err);}}
  function openMaps(){document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x===page()));document.querySelectorAll('#nav .nav-btn').forEach(x=>x.classList.toggle('active',x.dataset.page==='maps'));const title=document.getElementById('page-title'),sub=document.getElementById('page-subtitle'),back=document.getElementById('page-back');if(title)title.textContent='Maps';if(sub)sub.textContent='Maple World → continent → map, plus a searchable current + old-school map database.';if(back)back.hidden=true;window.scrollTo(0,0);initMaps();}
  function ensureNav(){const nav=document.getElementById('nav'),equipment=nav?.querySelector('.nav-btn[data-page="equipment"]');if(!nav||!equipment)return;let btn=nav.querySelector('.nav-btn[data-page="maps"]');if(!btn){btn=document.createElement('button');btn.className='nav-btn';btn.dataset.page='maps';btn.innerHTML='<span>⌖</span> Maps';nav.insertBefore(btn,equipment);}else if(btn.nextElementSibling!==equipment)nav.insertBefore(btn,equipment);if(!btn.dataset.mapsBound){btn.dataset.mapsBound='1';btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();openMaps();},true);}document.documentElement.classList.add('maps-nav-ready');}
  ensureNav();ensureShell();initMaps();new MutationObserver(()=>{ensureNav();ensureShell();}).observe(document.body,{childList:true,subtree:true});window.TCW_MAPS={showDetail,open:openMaps,openWorld,openContinent,openExplorer,goBack,get state(){return state;}};
})();
