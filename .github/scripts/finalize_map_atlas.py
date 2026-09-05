#!/usr/bin/env python3
from pathlib import Path
import json, re

ROOT = Path('.')
ATLAS = ROOT / 'public/assets/map-atlas'
META = Path('/tmp/atlas-json')

# Build a compact, owned marker dataset from MapleStory's WZ world-map metadata.
sheet_map = {
    'world':'WorldMap','maple-island':'WorldMap000','victoria':'WorldMap010','ossyria':'WorldMap020',
    'ludus':'WorldMap030','aqua':'WorldMap040','minar':'WorldMap050','mulung':'WorldMap060',
    'nihal':'WorldMap070','temple':'WorldMap080','ereve':'WorldMap090','rien':'WorldMap100','masteria':'WorldMap141'
}
out = {}
for slug, sheet in sheet_map.items():
    src = META / f'{sheet}.json'
    if not src.exists():
        continue
    try:
        doc = json.loads(src.read_text())
    except Exception:
        continue
    base = (doc.get('baseImage') or [{}])[0]
    origin = base.get('origin') or base.get('originOrZero') or {'x':320,'y':235}
    ox = float(origin.get('x',320) or 320); oy = float(origin.get('y',235) or 235)
    width = max(1, int(round(ox * 2))); height = max(1, int(round(oy * 2)))
    markers = []
    for row in doc.get('maps') or []:
        spot = row.get('spot') or {}
        if 'x' not in spot or 'y' not in spot:
            continue
        nums = []
        for n in row.get('mapNumbers') or []:
            try: nums.append(int(n))
            except Exception: pass
        markers.append({
            'x': round(ox + float(spot.get('x') or 0), 2),
            'y': round(oy + float(spot.get('y') or 0), 2),
            'type': int(row.get('type') or 0),
            'maps': nums[:16],
            'label': str(row.get('description') or row.get('title') or '').strip()
        })
    out[slug] = {'sheet': sheet, 'width': width, 'height': height, 'markers': markers}

(ATLAS / 'data').mkdir(parents=True, exist_ok=True)
(ATLAS / 'data/markers.json').write_text(json.dumps(out, separators=(',',':')))
assert len(out.get('world',{}).get('markers',[])) >= 10, 'Maple World WZ markers missing'
assert len(out.get('victoria',{}).get('markers',[])) >= 50, 'Victoria WZ markers missing'
assert len(out.get('ossyria',{}).get('markers',[])) >= 20, 'Ossyria WZ markers missing'
print('atlas marker counts:', {k:len(v['markers']) for k,v in out.items()})

# Patch Maps renderer.
p = ROOT / 'public/maps-tab.js'
s = p.read_text()
if "const ATLAS_ROOT='/assets/map-atlas/';" not in s:
    s = s.replace("  const LEGACY_INDEX='/game-data/legacy/maps.json';", "  const LEGACY_INDEX='/game-data/legacy/maps.json';\n  const ATLAS_ROOT='/assets/map-atlas/';")

has_current_victoria = (ATLAS / 'sheets/victoria-current.webp').exists()
victoria_file = 'victoria-current.webp' if has_current_victoria else 'victoria-island.png'
marks = ATLAS / 'marks'
def mark_expr(name):
    return f"`${{ATLAS_ROOT}}marks/{name}.png`" if (marks / f'{name}.png').exists() else "''"

continents = f"""  const CONTINENTS=[
    {{id:'maple-island',name:'Maple Island',subtitle:'Amherst · Southperry',image:`${{ATLAS_ROOT}}sheets/maple-island.png`,mark:'',aliases:'maple island amherst southperry beginner island'}},
    {{id:'victoria',name:'Victoria Island',subtitle:'Henesys · Ellinia · Perion · Kerning · Sleepywood',image:`${{ATLAS_ROOT}}sheets/{victoria_file}`,mark:{mark_expr('henesys')},currentMarkers:{str(has_current_victoria).lower()},aliases:'victoria henesys ellinia perion kerning lith sleepywood dungeon ant tunnel florina nautilus'}},
    {{id:'ossyria',name:'Orbis / El Nath Mts.',subtitle:'Orbis · El Nath · Dead Mine',image:`${{ATLAS_ROOT}}sheets/orbis-el-nath.png`,mark:{mark_expr('el-nath')},aliases:'ossyria orbis el nath elnath dead mine snow mountain zakum'}},
    {{id:'ludus',name:'Ludus Lake',subtitle:'Ludibrium · Omega Sector · Korean Folk Town',image:`${{ATLAS_ROOT}}sheets/ludus-lake.png`,mark:{mark_expr('ludibrium')},aliases:'ludus lake ludibrium omega sector korean folk town eos helios clocktower'}},
    {{id:'aqua',name:'Aqua Road',subtitle:'Aquarium · Deep Sea',image:`${{ATLAS_ROOT}}sheets/aqua-road.png`,mark:'',aliases:'aqua road aquarium deep sea ocean'}},
    {{id:'minar',name:'Minar Forest',subtitle:'Leafre · Dragon Forest',image:`${{ATLAS_ROOT}}sheets/minar-forest.png`,mark:{mark_expr('leafre')},aliases:'minar forest leafre dragon canyon'}},
    {{id:'mulung',name:'Mu Lung Garden',subtitle:'Mu Lung · Herb Town',image:`${{ATLAS_ROOT}}sheets/mu-lung-garden.png`,mark:'',aliases:'mu lung mulung herb town garden'}},
    {{id:'nihal',name:'Nihal Desert',subtitle:'Ariant · Magatia',image:`${{ATLAS_ROOT}}sheets/nihal-desert.png`,mark:{mark_expr('ariant')},aliases:'nihal desert ariant magatia alchemy'}},
    {{id:'temple',name:'Temple of Time',subtitle:'Three Doors · Time Lane',image:`${{ATLAS_ROOT}}sheets/temple-of-time.png`,mark:'',aliases:'temple of time three doors time lane memory road'}},
    {{id:'ereve',name:'Ereve',subtitle:'Cygnus Knights · Forest of Beginning',image:`${{ATLAS_ROOT}}sheets/ereve.png`,mark:{mark_expr('ereve')},aliases:'ereve cygnus knights forest of beginning'}},
    {{id:'rien',name:'Rien',subtitle:'Aran · Snow Island',image:`${{ATLAS_ROOT}}sheets/rien.png`,mark:{mark_expr('rien')},aliases:'rien aran snow island'}},
    {{id:'world-tour',name:'World Tour',subtitle:'Zipangu · Showa · Singapore and more',image:'',mark:{mark_expr('mushroom-shrine')},aliases:'world tour zipangu mushroom shrine showa singapore malaysia thailand taiwan'}},
    {{id:'masteria',name:'Masteria',subtitle:'New Leaf City · Haunted House',image:`${{ATLAS_ROOT}}sheets/masteria.png`,mark:{mark_expr('nlc')},aliases:'masteria new leaf city nlc haunted house crimsonwood'}},
    {{id:'other',name:'Other / Event',subtitle:'PQ · event · special maps',image:'',mark:'',aliases:'event pq party quest hidden special'}}
  ];"""
s, n = re.subn(r"  const CONTINENTS=\[[\s\S]*?\n  \];", continents, s, count=1)
assert n == 1, 'CONTINENTS replacement failed'

if 'atlasLoading:null' not in s:
    s = s.replace('explorerLimit:120};', 'explorerLimit:120,atlas:null,atlasLoading:null};')

anchor = "  const continentConfig=id=>CONTINENTS.find(x=>x.id===id)||CONTINENTS.at(-1);"
helpers = r'''  const atlasMarkerUrl=type=>`${ATLAS_ROOT}markers/wz-${Number(type)||0}.png`;
  async function loadAtlas(){
    if(state.atlas)return state.atlas;if(state.atlasLoading)return state.atlasLoading;
    state.atlasLoading=fetch(`${ATLAS_ROOT}data/markers.json`,{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error('atlas markers '+r.status);return r.json();}).then(x=>{state.atlas=x||{};return state.atlas;}).catch(()=>{state.atlas={};return state.atlas;});return state.atlasLoading;
  }
  function atlasMapFor(point){for(const raw of point?.maps||[]){const id=padMap(raw),cur=state.byId.get(id),old=state.byRef.get(`l:${id}`)||state.byRef.get(`l:${String(Number(raw))}`);if(cur)return cur;if(old)return old;}return null;}
  function atlasContinentFor(point){const hit=atlasMapFor(point);if(hit)return hit.__continent;const raw=point?.maps?.[0];return raw==null?'other':continentFor({id:String(raw),source:'legacy',name:'',street_name:''});}
  function setAtlasReady(){const img=q('#maps-full-world-image'),meta=state.atlas?.world;if(img?.complete&&img.naturalWidth>200&&meta?.markers?.length>=10)document.documentElement.classList.add('maps-atlas-visual-ready');}
  function renderWorldAtlasMarkers(){const host=q('#maps-continent-hotspots'),meta=state.atlas?.world;if(!host||!meta?.markers?.length)return;host.innerHTML='';for(const point of meta.markers){const cid=atlasContinentFor(point);if(cid==='other')continue;const c=continentConfig(cid),map=atlasMapFor(point),label=point.label||map?.name||c.name;const b=document.createElement('button');b.type='button';b.className=`maps-atlas-world-point type-${point.type}${Number(point.type)===3?' major':''}`;b.dataset.continent=cid;b.style.left=`${point.x/meta.width*100}%`;b.style.top=`${point.y/meta.height*100}%`;b.title=`${label} · ${c.name}`;b.innerHTML=`<img src="${atlasMarkerUrl(point.type)}" alt=""><span>${esc(label)}</span>`;const icon=b.querySelector('img');icon?.addEventListener('error',()=>{icon.remove();b.classList.add('sprite-fallback')});b.addEventListener('click',()=>openContinent(cid));host.appendChild(b);}setAtlasReady();}
  function renderAtlasSheetMarkers(id){const host=q('#maps-sheet-markers'),meta=state.atlas?.[id];if(!host||!meta?.markers?.length)return;host.innerHTML='';for(const point of meta.markers){const map=atlasMapFor(point);if(!map)continue;const b=document.createElement('button');b.type='button';b.className=`atlas-map-point type-${point.type}`;b.dataset.mapId=padMap(map.id);b.style.left=`${point.x/meta.width*100}%`;b.style.top=`${point.y/meta.height*100}%`;b.title=`${map.name} · #${map.id}`;b.innerHTML=`<img src="${atlasMarkerUrl(point.type)}" alt=""><span>${esc(map.name)}</span>`;const icon=b.querySelector('img');icon?.addEventListener('error',()=>{icon.remove();b.classList.add('sprite-fallback')});b.addEventListener('click',()=>showDetail(map.__ref,'continent',id));host.appendChild(b);}document.documentElement.classList.add('maps-sheet-markers-ready');}
  function continentArt(c){const art=c.image?`<img class="maps-continent-art-image" src="${c.image}" alt="${esc(c.name)} world map" loading="lazy">`:'';const logo=c.mark?`<img class="maps-continent-logo" src="${c.mark}" alt="" loading="lazy">`:'';return `<span class="maps-continent-art">${art}<span class="maps-continent-logo-shell">${logo}</span></span>`;}
'''
if 'function renderWorldAtlasMarkers()' not in s:
    s = s.replace(anchor, anchor + '\n\n' + helpers)

old_stage = '<div class="maps-full-world-stage"><img id="maps-full-world-image" src="/game-media/worldmap-legacy/maple-world.png" alt="Maple World"><div id="maps-continent-hotspots"></div></div>'
new_stage = '<div class="maps-full-world-stage"><div class="maps-world-canvas"><img id="maps-full-world-image" src="${ATLAS_ROOT}sheets/maple-world.png" alt="Maple World"><div id="maps-continent-hotspots"></div></div></div><div class="maps-world-visual-key"><span><b>Original Maple World sheet</b> · click a Maple marker to open its region</span><span>Current Classic records remain preferred wherever available.</span></div>'
assert old_stage in s, 'world-stage markup target missing'
s = s.replace(old_stage, new_stage, 1)

start = s.index('  function renderWorld(){')
end = s.index('\n\n  function renderVictoriaMarkers()', start)
new_render = r'''  function renderWorld(){
    setView('world');const count=q('#maps-world-count');if(count)count.textContent=`${state.current.length} current Classic records · ${state.legacy.length} old-school records · ${state.maps.length} merged maps`;
    const grid=q('#maps-continent-grid'),hot=q('#maps-continent-hotspots');if(!grid||!hot)return;grid.innerHTML='';hot.innerHTML='';
    for(const c of CONTINENTS){const rows=mapsForContinent(c.id);if(!rows.length&&c.id==='other')continue;const current=rows.filter(m=>m.source==='current').length,legacy=rows.filter(m=>m.source==='legacy').length;const card=document.createElement('button');card.type='button';card.className='maps-continent-card';card.dataset.continent=c.id;card.innerHTML=`${continentArt(c)}<span class="maps-continent-copy"><b>${esc(c.name)}</b><small>${esc(c.subtitle)}</small><em><strong>${rows.length}</strong> maps${current?` · ${current} current`:''}${legacy?` · ${legacy} legacy-only`:''}</em></span>`;card.querySelectorAll('img').forEach(im=>im.addEventListener('error',()=>im.remove()));card.addEventListener('click',()=>openContinent(c.id));grid.appendChild(card);}
    const worldImg=q('#maps-full-world-image');worldImg?.addEventListener('load',setAtlasReady,{once:true});worldImg?.addEventListener('error',()=>document.documentElement.classList.add('maps-atlas-image-error'),{once:true});loadAtlas().then(()=>{renderWorldAtlasMarkers();setAtlasReady();});document.documentElement.classList.add('maps-world-ready');
  }'''
s = s[:start] + new_render + s[end:]

# Current Victoria marker function becomes entirely local and has a CSS fallback if a sprite is absent.
vs = s.index('  function renderVictoriaMarkers(){')
ve = s.index('\n  function renderMapRows(', vs)
new_victoria = r'''  function renderVictoriaMarkers(){const host=q('#maps-sheet-markers');if(!host)return;host.innerHTML='';for(const [id,x,y,type] of VICTORIA_MARKERS){const map=state.byId.get(id),name=map?.name||`Map #${id}`;const btn=document.createElement('button');btn.type='button';btn.className=`world-map-marker ${type}`;btn.dataset.mapId=id;btn.style.left=`${x/WORLD_W*100}%`;btn.style.top=`${y/WORLD_H*100}%`;btn.title=`${name} · #${id}`;btn.setAttribute('aria-label',`Open ${name}`);const kind=type==='cluster'?'cluster':type==='town'?'town':'spot';btn.innerHTML=`<img src="${ATLAS_ROOT}markers/current-${kind}.png" alt="">${type==='town'?`<span>${esc(name)}</span>`:''}`;const im=btn.querySelector('img');im?.addEventListener('error',()=>{im.remove();btn.classList.add('sprite-fallback')});btn.addEventListener('click',()=>showDetail(map?map.__ref:`c:${id}`,'continent','victoria'));host.appendChild(btn);}document.documentElement.classList.toggle('victoria-world-markers-ready',host.children.length>=50);}'''
s = s[:vs] + new_victoria + s[ve:]

# Visual search rows with map thumbnails.
rs = s.index('  function renderMapRows(')
re_ = s.index('\n  function renderContinentList()', rs)
new_rows = r'''  function renderMapRows(host,rows,limit=180){host.innerHTML='';for(const map of rows.slice(0,limit)){const b=document.createElement('button');b.type='button';b.className='maps-db-row';b.dataset.mapRef=map.__ref;const thumb=mapImage(map);b.innerHTML=`<span class="maps-db-thumb"><img src="${thumb}" alt="" loading="lazy"></span><span class="maps-db-main"><b>${esc(map.name)}</b><small>${esc(map.street_name||continentConfig(map.__continent).name)}</small></span><span class="map-source-pill ${sourceClass(map)}">${sourceLabel(map)}</span><code>#${esc(String(map.id))}</code>`;const im=b.querySelector('.maps-db-thumb img');im?.addEventListener('error',()=>{im.remove();b.querySelector('.maps-db-thumb')?.classList.add('empty')});b.addEventListener('click',()=>showDetail(map.__ref,state.view,state.continent));host.appendChild(b);}}'''
s = s[:rs] + new_rows + s[re_:]

# Region sheets: exact current markers on the bundled current Victoria sheet; WZ map points everywhere else.
pattern = re.compile(r"if\(id==='victoria'\)\{renderVictoriaMarkers\(\);note\.innerHTML='[^']*';\}else\{q\('#maps-sheet-markers'\)\.innerHTML='';note\.innerHTML='[^']*';\}")
replacement = "if(id==='victoria'&&c.currentMarkers){renderVictoriaMarkers();note.innerHTML='<span><i class=\"town\"></i>Town</span><span><i class=\"spot\"></i>Field / route</span><span><i class=\"cluster\"></i>Dungeon cluster</span><small>Victoria keeps the exact clickable current-Classic markers.</small>';}else{q('#maps-sheet-markers').innerHTML='';loadAtlas().then(()=>renderAtlasSheetMarkers(id));note.innerHTML='<small>Original old-school world sheet with clickable WZ map points. Current Classic records are preferred wherever available.</small>';}"
s, n = pattern.subn(replacement, s, count=1)
assert n == 1, 'openContinent marker branch replacement failed'
s = s.replace("img.src=c.image||'/game-media/worldmap-legacy/maple-world.png';", "img.src=c.image||`${ATLAS_ROOT}sheets/maple-world.png`;")
p.write_text(s)

# CSS: override the old empty-canvas layout with an artwork-led atlas.
css_path = ROOT / 'public/maps-tab.css'
css = css_path.read_text()
marker = '/* MAP ATLAS VISUAL V2 */'
if marker in css:
    css = css.split(marker)[0].rstrip() + '\n'
css += r'''
/* MAP ATLAS VISUAL V2 */
.maps-full-world{padding:16px}.maps-full-world-stage{display:grid;place-items:center;min-height:0;padding:14px;overflow:auto;border-color:rgba(123,183,255,.16);background:radial-gradient(circle at 50% 35%,rgba(74,142,190,.12),transparent 58%),linear-gradient(180deg,#070b14,#04070e)}
.maps-world-canvas{position:relative;width:min(100%,900px);aspect-ratio:640/470;margin:auto}.maps-world-canvas>#maps-full-world-image{display:block;width:100%;height:100%;min-height:0;max-height:none;object-fit:contain;opacity:1;filter:drop-shadow(0 20px 35px rgba(0,0,0,.46))}.maps-world-canvas>#maps-continent-hotspots{position:absolute;inset:0}
.maps-world-visual-key{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:10px auto 0;max-width:900px;color:var(--dim);font-size:9px}.maps-world-visual-key b{color:var(--muted);font-size:10px}
.maps-atlas-world-point{position:absolute;z-index:4;display:grid;place-items:center;width:28px;height:32px;padding:0;border:0;background:transparent;transform:translate(-50%,-50%);cursor:pointer;filter:drop-shadow(0 3px 5px rgba(0,0,0,.88));transition:transform .12s ease,filter .12s ease}.maps-atlas-world-point img{display:block;max-width:26px;max-height:30px;image-rendering:auto}.maps-atlas-world-point.sprite-fallback:before{content:'';width:11px;height:11px;border:2px solid #fff;border-radius:50%;background:var(--map-cyan);box-shadow:0 0 0 3px rgba(5,10,18,.75)}.maps-atlas-world-point span{position:absolute;left:50%;top:calc(100% + 2px);display:none;min-width:max-content;max-width:150px;transform:translateX(-50%);padding:3px 6px;border:1px solid rgba(255,255,255,.2);border-radius:6px;background:rgba(4,8,15,.93);color:#fff;font-size:9px;font-weight:900;line-height:1.1;text-align:center;white-space:nowrap}.maps-atlas-world-point.major span,.maps-atlas-world-point:hover span,.maps-atlas-world-point:focus-visible span{display:block}.maps-atlas-world-point:hover,.maps-atlas-world-point:focus-visible{z-index:20;transform:translate(-50%,-50%) scale(1.32);filter:drop-shadow(0 0 9px rgba(86,217,255,.9));outline:none}
.maps-continent-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:11px;margin-top:14px}.maps-continent-card{display:grid;grid-template-columns:132px minmax(0,1fr);align-items:center;gap:12px;min-height:104px;padding:9px;overflow:hidden;border-color:rgba(255,255,255,.09);background:linear-gradient(145deg,rgba(255,255,255,.03),rgba(255,255,255,.012))}.maps-continent-card:hover{transform:translateY(-1px);box-shadow:0 10px 26px rgba(0,0,0,.24)}.maps-continent-art{position:relative;display:grid;place-items:center;overflow:hidden;width:132px;height:84px;border:1px solid rgba(255,255,255,.08);border-radius:10px;background:radial-gradient(circle,rgba(86,217,255,.08),transparent 65%),#050914}.maps-continent-art-image{width:100%;height:100%;object-fit:cover;filter:saturate(.94) contrast(1.03)}.maps-continent-logo-shell{position:absolute;right:5px;bottom:5px;display:grid;place-items:center;min-width:35px;min-height:35px;padding:3px;border:1px solid rgba(255,255,255,.2);border-radius:9px;background:rgba(3,7,13,.86);box-shadow:0 4px 13px rgba(0,0,0,.45)}.maps-continent-logo-shell:empty{display:none}.maps-continent-logo{max-width:38px;max-height:32px;object-fit:contain;image-rendering:auto}.maps-continent-copy{display:grid;gap:4px;min-width:0}.maps-continent-copy b{font-size:13px}.maps-continent-copy small{overflow:hidden;color:var(--muted);font-size:9px;text-overflow:ellipsis;white-space:nowrap}.maps-continent-copy em{color:var(--dim);font-size:8px;font-style:normal}.maps-continent-copy em strong{color:var(--map-cyan);font-size:10px}
.maps-sheet-scroll{display:grid;place-items:start center;min-height:0;padding:8px}.maps-sheet-stage{position:relative;display:block;width:max-content;max-width:100%;min-height:0;margin:auto}.maps-sheet-stage>img{display:block;width:auto;max-width:100%;height:auto;margin:auto}.maps-sheet-stage>#maps-sheet-markers{position:absolute;inset:0;margin:0;max-width:none}.maps-sheet-stage.victoria-sheet{min-width:min(954px,100%)}.maps-sheet-stage.victoria-sheet>img{width:954px;max-width:none}
.atlas-map-point{position:absolute;z-index:4;width:24px;height:28px;padding:0;border:0;background:transparent;transform:translate(-50%,-60%);cursor:pointer;filter:drop-shadow(0 2px 4px rgba(0,0,0,.82));transition:transform .1s ease,filter .1s ease}.atlas-map-point img{display:block;max-width:22px;max-height:26px;margin:auto}.atlas-map-point.sprite-fallback:before{content:'';display:block;width:9px;height:9px;margin:auto;border:2px solid #fff;border-radius:50%;background:var(--map-cyan)}.atlas-map-point span{position:absolute;left:50%;top:100%;display:none;transform:translateX(-50%);min-width:max-content;max-width:150px;padding:3px 5px;border:1px solid rgba(255,255,255,.18);border-radius:5px;background:rgba(3,7,13,.94);color:#fff;font-size:8px;font-weight:900;white-space:nowrap}.atlas-map-point.type-0 span,.atlas-map-point:hover span,.atlas-map-point:focus-visible span{display:block}.atlas-map-point:hover,.atlas-map-point:focus-visible{z-index:18;transform:translate(-50%,-60%) scale(1.28);filter:drop-shadow(0 0 7px rgba(86,217,255,.8));outline:none}
.world-map-marker.sprite-fallback:before{content:'';display:block;width:12px;height:12px;margin:8px auto 0;border:2px solid #fff;border-radius:50%;background:var(--map-cyan);box-shadow:0 0 0 3px rgba(3,8,15,.75)}
.maps-db-row{grid-template-columns:48px minmax(0,1fr) auto auto;padding:7px 9px}.maps-db-thumb{display:grid;place-items:center;overflow:hidden;width:44px;height:36px;border:1px solid rgba(255,255,255,.07);border-radius:7px;background:#050914}.maps-db-thumb img{max-width:100%;max-height:100%;object-fit:contain}.maps-db-thumb.empty:after{content:'MAP';color:rgba(255,255,255,.22);font-size:7px;font-weight:1000;letter-spacing:.1em}
@media(max-width:1150px){.maps-continent-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.maps-continent-card{grid-template-columns:120px minmax(0,1fr)}.maps-continent-art{width:120px}}
@media(max-width:700px){.maps-full-world-stage{padding:5px}.maps-world-visual-key{display:grid}.maps-continent-grid{grid-template-columns:1fr}.maps-continent-card{grid-template-columns:108px minmax(0,1fr)}.maps-continent-art{width:108px;height:72px}.maps-atlas-world-point{width:22px;height:26px}.maps-atlas-world-point.major span{display:none}.maps-atlas-world-point:hover span{display:block}.maps-db-row{grid-template-columns:42px minmax(0,1fr) auto}.maps-db-row code{display:none}}
'''
css_path.write_text(css)

# Static build must actually carry the local asset pack into site/.
b = ROOT / 'build.cjs'
t = b.read_text()
needle = "fs.writeFileSync(path.join(out, 'index.html'), html);"
copy = "fs.writeFileSync(path.join(out, 'index.html'), html);\nconst atlasAssets = path.join(source, 'assets', 'map-atlas');\nif (fs.existsSync(atlasAssets)) fs.cpSync(atlasAssets, path.join(out, 'assets', 'map-atlas'), { recursive: true });"
if 'const atlasAssets =' not in t:
    assert needle in t, 'build asset-copy insertion missing'
    t = t.replace(needle, copy, 1)
b.write_text(t)

# Permanent live gate now protects the visual asset contract instead of only the data shell.
v = ROOT / '.github/workflows/verify-live.yml'
if v.exists():
    x = v.read_text()
    x = x.replace("$BASE_URL/game-media/worldmap-legacy/maple-world.png?ci=$GITHUB_RUN_ID", "$BASE_URL/assets/map-atlas/sheets/maple-world.png?ci=$GITHUB_RUN_ID")
    if 'maps-atlas-visual-ready' not in x:
        x = x.replace('maps-legacy-data-ready etc-lifetime-data-ready', 'maps-legacy-data-ready maps-atlas-visual-ready etc-lifetime-data-ready')
    if "assets/map-atlas/data/markers.json" not in x:
        x = x.replace("test \"$(curl -fsSL --max-time 15 \"$BASE_URL/maps-tab.css?ci=$GITHUB_RUN_ID\" | wc -c)\" -gt 4000", "test \"$(curl -fsSL --max-time 15 \"$BASE_URL/maps-tab.css?ci=$GITHUB_RUN_ID\" | wc -c)\" -gt 4000\n          test \"$(curl -fsSL --max-time 15 \"$BASE_URL/assets/map-atlas/data/markers.json?ci=$GITHUB_RUN_ID\" | wc -c)\" -gt 1000")
    v.write_text(x)

print('visual atlas source patch complete')
