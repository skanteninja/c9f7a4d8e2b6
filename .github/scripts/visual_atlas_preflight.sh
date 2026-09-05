#!/usr/bin/env bash
set -euo pipefail
python3 - <<'PY'
from pathlib import Path
p=Path('.github/scripts/finalize_map_atlas.py')
s=p.read_text()
old="for(const point of meta.markers){const cid=atlasContinentFor(point);if(cid==='other')continue;const c=continentConfig(cid),map=atlasMapFor(point),label=point.label||map?.name||c.name;"
new="for(const point of meta.markers){const cid=atlasContinentFor(point);const c=continentConfig(cid),map=atlasMapFor(point),label=point.label||map?.name||c.name;"
if old in s:s=s.replace(old,new,1)
old_resolver="  function atlasMapFor(point){for(const raw of point?.maps||[]){const id=padMap(raw),cur=state.byId.get(id),old=state.byRef.get(`l:${id}`)||state.byRef.get(`l:${String(Number(raw))}`);if(cur)return cur;if(old)return old;}return null;}"
new_resolver="  function atlasMapFor(point){for(const raw of point?.maps||[]){const digits=String(raw??'').replace(/\\D/g,''),id=padMap(digits),numeric=String(Number(digits));const cur=state.byId.get(id);if(cur)return cur;const direct=state.byRef.get(`l:${id}`)||state.byRef.get(`l:${numeric}`);if(direct)return direct;const any=state.maps.find(m=>String(Number(String(m.id||'').replace(/\\D/g,'')))===numeric||(m.legacy_ids||[]).some(x=>String(Number(String(x).replace(/\\D/g,'')))===numeric));if(any)return any;}return null;}"
if old_resolver in s:s=s.replace(old_resolver,new_resolver,1)
old_sheet="  function renderAtlasSheetMarkers(id){const host=q('#maps-sheet-markers'),meta=state.atlas?.[id];if(!host||!meta?.markers?.length)return;host.innerHTML='';for(const point of meta.markers){const map=atlasMapFor(point);if(!map)continue;const b=document.createElement('button');b.type='button';b.className=`atlas-map-point type-${point.type}`;b.dataset.mapId=padMap(map.id);b.style.left=`${point.x/meta.width*100}%`;b.style.top=`${point.y/meta.height*100}%`;b.title=`${map.name} · #${map.id}`;b.innerHTML=`<img src=\"${atlasMarkerUrl(point.type)}\" alt=\"\"><span>${esc(map.name)}</span>`;const icon=b.querySelector('img');icon?.addEventListener('error',()=>{icon.remove();b.classList.add('sprite-fallback')});b.addEventListener('click',()=>showDetail(map.__ref,'continent',id));host.appendChild(b);}document.documentElement.classList.add('maps-sheet-markers-ready');}"
new_sheet="  function renderAtlasSheetMarkers(id){const host=q('#maps-sheet-markers'),meta=state.atlas?.[id];if(!host||!meta?.markers?.length)return;host.innerHTML='';for(const point of meta.markers){const map=atlasMapFor(point),label=point.label||map?.name||'Map point';const b=document.createElement('button');b.type='button';b.className=`atlas-map-point type-${point.type}${map?'':' unresolved'}`;if(map)b.dataset.mapId=padMap(map.id);b.style.left=`${point.x/meta.width*100}%`;b.style.top=`${point.y/meta.height*100}%`;b.title=map?`${map.name} · #${map.id}`:label;b.innerHTML=`<img src=\"${atlasMarkerUrl(point.type)}\" alt=\"\"><span>${esc(label)}</span>`;const icon=b.querySelector('img');icon?.addEventListener('error',()=>{icon.remove();b.classList.add('sprite-fallback')});b.addEventListener('click',()=>{if(map){showDetail(map.__ref,'continent',id);return;}openExplorer();const search=q('#maps-explorer-search');if(search){search.value=label;renderExplorer();}});host.appendChild(b);}document.documentElement.classList.add('maps-sheet-markers-ready');}"
assert old_sheet in s, 'continent marker renderer target missing'
s=s.replace(old_sheet,new_sheet,1)
p.write_text(s)
print('preflight: all WZ world + continent points preserved')
PY
