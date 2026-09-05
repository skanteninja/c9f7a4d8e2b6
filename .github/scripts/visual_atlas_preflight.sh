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
assert old_resolver in s, 'atlas map resolver target missing'
s=s.replace(old_resolver,new_resolver,1)
p.write_text(s)
print('preflight: all WZ world points render + numeric map resolver enabled')
PY
