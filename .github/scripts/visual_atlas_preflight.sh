#!/usr/bin/env bash
set -euo pipefail
python3 - <<'PY'
from pathlib import Path
p=Path('.github/scripts/finalize_map_atlas.py')
s=p.read_text()
old="for(const point of meta.markers){const cid=atlasContinentFor(point);if(cid==='other')continue;const c=continentConfig(cid),map=atlasMapFor(point),label=point.label||map?.name||c.name;"
new="for(const point of meta.markers){const cid=atlasContinentFor(point);const c=continentConfig(cid),map=atlasMapFor(point),label=point.label||map?.name||c.name;"
assert old in s, 'world point filter target missing'
s=s.replace(old,new,1)
p.write_text(s)
print('preflight: all WZ Maple World points will render')
PY
