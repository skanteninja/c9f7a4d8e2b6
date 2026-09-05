#!/usr/bin/env bash
set -euo pipefail

mkdir -p public/assets/map-atlas/{sheets,markers,marks,data} /tmp/atlas-json
rm -rf public/assets/map-atlas/* /tmp/atlas-json/*
mkdir -p public/assets/map-atlas/{sheets,markers,marks,data}

cat > /tmp/atlas-sheets.txt <<'EOF'
maple-world WorldMap
maple-island WorldMap000
victoria-island WorldMap010
nautilus WorldMap011
sleepywood WorldMap012
orbis-el-nath WorldMap020
dead-mine WorldMap021
ludus-lake WorldMap030
clocktower WorldMap031
aqua-road WorldMap040
minar-forest WorldMap050
mu-lung-garden WorldMap060
nihal-desert WorldMap070
temple-of-time WorldMap080
ereve WorldMap090
rien WorldMap100
masteria WorldMap141
haunted-house WorldMap142
EOF

export WZ_SHEET_BASE='https://maplestory.io/api/wz/img/GMS/83/Map/WorldMap'
echo '[atlas] downloading local world sheets'
cat /tmp/atlas-sheets.txt | xargs -n2 -P6 bash -c '
  slug="$0"; sheet="$1"
  curl --retry 5 --retry-delay 2 --retry-all-errors -fsSL --max-time 100 "$WZ_SHEET_BASE/$sheet.img/BaseImg/0" -o "public/assets/map-atlas/sheets/$slug.png"
  bytes=$(wc -c < "public/assets/map-atlas/sheets/$slug.png")
  echo "sheet $slug $bytes bytes"
  test "$bytes" -gt 5000
'

# Exact current-Classic Victoria art/markers are optional; the WZ sheet is the verified fallback.
curl --retry 5 --retry-delay 2 --retry-all-errors -fsSL --max-time 90 'https://meowdb.com/msclassic/worldmap/victoria-island.webp' -o public/assets/map-atlas/sheets/victoria-current.webp || true
if [ "$(wc -c < public/assets/map-atlas/sheets/victoria-current.webp 2>/dev/null || echo 0)" -le 5000 ]; then rm -f public/assets/map-atlas/sheets/victoria-current.webp; fi
for kind in town spot cluster; do
  curl --retry 4 --retry-delay 2 --retry-all-errors -fsSL --max-time 45 "https://meowdb.com/msclassic/worldmap/marker-$kind.png" -o "public/assets/map-atlas/markers/current-$kind.png" || true
  if [ "$(wc -c < "public/assets/map-atlas/markers/current-$kind.png" 2>/dev/null || echo 0)" -le 100 ]; then rm -f "public/assets/map-atlas/markers/current-$kind.png"; fi
done

export MAP_API='https://maplestory.io/api/GMS/83/map/worldmap'
echo '[atlas] downloading compact marker metadata in parallel'
for pair in \
  'world WorldMap' 'maple-island WorldMap000' 'victoria WorldMap010' 'ossyria WorldMap020' \
  'ludus WorldMap030' 'aqua WorldMap040' 'minar WorldMap050' 'mulung WorldMap060' \
  'nihal WorldMap070' 'temple WorldMap080' 'ereve WorldMap090' 'rien WorldMap100' 'masteria WorldMap141'; do
  set -- $pair; slug=$1; sheet=$2
  (
    ok=0
    for attempt in 1 2 3 4 5; do
      if curl -fsSL --max-time 120 "$MAP_API/$sheet" -o "/tmp/atlas-json/$sheet.json"; then ok=1; break; fi
      sleep $((attempt*2))
    done
    if [ "$ok" -eq 0 ]; then echo "metadata unavailable: $sheet" >&2; fi
  ) &
done
wait

# Core visual contract must have these three metadata sheets.
for sheet in WorldMap WorldMap010 WorldMap020; do
  if [ ! -s "/tmp/atlas-json/$sheet.json" ]; then
    curl --retry 7 --retry-delay 3 --retry-all-errors -fsSL --max-time 180 "$MAP_API/$sheet" -o "/tmp/atlas-json/$sheet.json"
  fi
done

# Original world-map marker sprites. CSS fallbacks remain if a type is absent.
for type in 0 1 2 3 4 5; do
  curl --retry 4 --retry-delay 1 --retry-all-errors -fsSL --max-time 45 "https://maplestory.io/api/wz/img/GMS/83/Map/MapHelper.img/worldMap/mapImage/$type" -o "public/assets/map-atlas/markers/wz-$type.png" || true
  if [ "$(wc -c < "public/assets/map-atlas/markers/wz-$type.png" 2>/dev/null || echo 0)" -le 100 ]; then rm -f "public/assets/map-atlas/markers/wz-$type.png"; fi
done

# Representative MapleStory map-mark logos for the cards.
cat > /tmp/atlas-marks.txt <<'EOF'
henesys Henesys
ellinia Ellinia
perion Perion
kerning KerningCity
el-nath ElNath
ludibrium Ludibrium
leafre Leafre
ariant Ariant
magatia Magatia
nlc NLC
mushroom-shrine MushroomShrine
ereve Ereve
rien Rien
EOF
export MARK_BASE='https://maplestory.io/api/wz/img/GMS/83/Map/MapHelper.img/mark'
cat /tmp/atlas-marks.txt | xargs -n2 -P5 bash -c '
  slug="$0"; mark="$1"
  if curl --retry 4 --retry-delay 2 --retry-all-errors -fsSL --max-time 60 "$MARK_BASE/$mark" -o "public/assets/map-atlas/marks/$slug.png"; then
    bytes=$(wc -c < "public/assets/map-atlas/marks/$slug.png")
    if [ "$bytes" -le 500 ]; then rm -f "public/assets/map-atlas/marks/$slug.png"; fi
  else rm -f "public/assets/map-atlas/marks/$slug.png"; fi
'

python3 .github/scripts/finalize_map_atlas.py
node --check public/maps-tab.js
grep -q 'maps-atlas-visual-ready' public/maps-tab.js
grep -q 'MAP ATLAS VISUAL V2' public/maps-tab.css
grep -q 'const atlasAssets' build.cjs

echo '[atlas] rebuilding static product'
node build.cjs
test "$(wc -c < dist/assets/map-atlas/sheets/maple-world.png)" -gt 100000
test "$(wc -c < dist/assets/map-atlas/sheets/orbis-el-nath.png)" -gt 5000
test -s dist/assets/map-atlas/data/markers.json
python3 - <<'PY'
import json
x=json.load(open('dist/assets/map-atlas/data/markers.json'))
assert len(x['world']['markers'])>=10
assert len(x['victoria']['markers'])>=50
assert len(x['ossyria']['markers'])>=20
print('dist marker contract ok')
PY

cat > dist/ci-visual-atlas.html <<'HTML'
<!doctype html><meta charset="utf-8"><body><iframe id="app" src="/"></iframe><div id="ci-result">pending</div><script>
const delay=ms=>new Promise(r=>setTimeout(r,ms)),frame=document.getElementById('app'),result=document.getElementById('ci-result');
frame.addEventListener('load',async()=>{try{const d=frame.contentDocument,w=frame.contentWindow;const wait=async(fn,label,n=220)=>{for(let i=0;i<n;i++){if(fn())return;await delay(250)}throw Error('timeout '+label)};
await wait(()=>d.documentElement.classList.contains('maps-tab-ready'),'maps tab');const nav=d.querySelector('#nav .nav-btn[data-page="maps"]');if(!nav)throw Error('maps nav');nav.click();
await wait(()=>d.documentElement.classList.contains('maps-atlas-visual-ready'),'atlas visual ready');const world=d.getElementById('maps-full-world-image');if(!world?.complete||world.naturalWidth<200)throw Error('world map artwork');
if(d.querySelectorAll('.maps-atlas-world-point').length<10)throw Error('world map marker icons');if(d.querySelectorAll('.maps-continent-card').length<10)throw Error('continent cards');if(d.querySelectorAll('.maps-continent-art-image').length<9)throw Error('continent art');
const vic=d.querySelector('.maps-continent-card[data-continent="victoria"]');vic.click();await wait(()=>d.getElementById('maps-continent')?.classList.contains('active'),'victoria open');await wait(()=>d.getElementById('maps-sheet-image')?.complete&&d.getElementById('maps-sheet-image').naturalWidth>200,'victoria image');
const currentMarkers=d.querySelectorAll('.world-map-marker').length,oldMarkers=d.querySelectorAll('.atlas-map-point').length;if(currentMarkers<50&&oldMarkers<50)throw Error('victoria visual markers');
d.getElementById('maps-local-back').click();await wait(()=>d.getElementById('maps-world')?.classList.contains('active'),'world back');const os=d.querySelector('.maps-continent-card[data-continent="ossyria"]');os.click();await wait(()=>d.getElementById('maps-sheet-image')?.complete&&d.getElementById('maps-sheet-image').naturalWidth>200,'ossyria image');await wait(()=>d.querySelectorAll('.atlas-map-point').length>=20,'ossyria marker icons');
result.textContent='visual-atlas-ok';}catch(e){result.textContent='visual-atlas-failed: '+e.message;}});
</script></body>
HTML

python3 .github/ci_static_proxy.py --directory dist --port 4173 >/tmp/atlas-http.log 2>&1 &
server=$!
trap 'kill "$server" 2>/dev/null || true' EXIT
for i in {1..50}; do curl -fsS http://127.0.0.1:4173/ >/dev/null && break; sleep .25; done
chrome="$(command -v google-chrome || command -v google-chrome-stable || command -v chromium || command -v chromium-browser || true)"
test -n "$chrome"
"$chrome" --headless --no-sandbox --disable-gpu --window-size=1440,1050 --virtual-time-budget=75000 --dump-dom http://127.0.0.1:4173/ci-visual-atlas.html >/tmp/atlas-test.html
grep -o 'visual-atlas-[^<]*' /tmp/atlas-test.html || true
grep -q '>visual-atlas-ok<' /tmp/atlas-test.html
rm -f dist/ci-visual-atlas.html
kill "$server" 2>/dev/null || true
trap - EXIT

echo '[atlas] browser visual checkpoint passed'

rm -rf site
mv dist site
# Remove every temporary research/installer workflow used for this repair.
rm -f \
  .github/workflows/finalize-visual-map-atlas.yml \
  .github/workflows/install-map-atlas-assets.yml \
  .github/workflows/diag-world-entry.yml \
  .github/workflows/diag-mapmark-icons.yml \
  .github/workflows/diag-world-labels.yml \
  .github/workflows/diag-world-list.yml \
  .github/workflows/diag-live-maps.yml \
  .github/workflows/patch-map-world-ui.yml
rm -f .github/scripts/finalize_map_atlas.py .github/scripts/run_visual_atlas_finalize.sh

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git add -A
git add -f public/assets/map-atlas site
git commit -m 'Maps: restore visual Maple World atlas'
git fetch origin main
if ! git merge-base --is-ancestor origin/main HEAD; then git rebase origin/main; fi
git push origin HEAD:main

echo '[atlas] source + generated site committed'

BASE_URL='https://maplestory-classic.ofri505.workers.dev'
ready=0
for i in {1..75}; do
  js="$(curl -fsSL --max-time 15 "$BASE_URL/maps-tab.js?atlas=$GITHUB_RUN_ID" || true)"
  world_bytes="$(curl -fsSL --max-time 25 "$BASE_URL/assets/map-atlas/sheets/maple-world.png?atlas=$GITHUB_RUN_ID" 2>/dev/null | wc -c || true)"
  markers="$(curl -fsSL --max-time 20 "$BASE_URL/assets/map-atlas/data/markers.json?atlas=$GITHUB_RUN_ID" || true)"
  if printf '%s' "$js" | grep -q 'maps-atlas-visual-ready' && [ "${world_bytes:-0}" -gt 100000 ] && printf '%s' "$markers" | grep -q '"ossyria"'; then ready=1; break; fi
  sleep 5
done
test "$ready" -eq 1
"$chrome" --headless --no-sandbox --disable-gpu --window-size=1440,1050 --virtual-time-budget=60000 --dump-dom "$BASE_URL/?atlas=$GITHUB_RUN_ID" >/tmp/live-atlas.html
grep -q 'maps-atlas-visual-ready' /tmp/live-atlas.html
grep -q 'maps-continent-art-image' /tmp/live-atlas.html
grep -q 'maps-atlas-world-point' /tmp/live-atlas.html

echo '[atlas] LIVE VISUAL ATLAS VERIFIED'
