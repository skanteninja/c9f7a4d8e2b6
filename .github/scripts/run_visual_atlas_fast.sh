#!/usr/bin/env bash
set -euo pipefail

echo '[atlas-fast] use already bundled MapleStory WZ sheets + metadata'
for f in maple-world maple-island victoria-island orbis-el-nath ludus-lake aqua-road minar-forest mu-lung-garden nihal-desert temple-of-time ereve rien masteria; do
  test -s "public/assets/map-atlas/sheets/$f.png"
done
for f in WorldMap WorldMap010 WorldMap020; do test -s "public/assets/map-atlas/data/$f.json"; done

rm -rf /tmp/atlas-json
mkdir -p /tmp/atlas-json public/assets/map-atlas/{markers,marks}
cp public/assets/map-atlas/data/WorldMap*.json /tmp/atlas-json/
# Full API responses are build inputs only; the shipped atlas keeps the compact marker index.
rm -f public/assets/map-atlas/data/WorldMap*.json

# Original WZ world-map marker sprites: verified types 0-3.
base='https://maplestory.io/api/wz/img/GMS/83/Map/MapHelper.img/worldMap/mapImage'
for type in 0 1 2 3; do
  (
    curl --retry 4 --retry-delay 1 --retry-all-errors -fsSL --max-time 25 "$base/$type" -o "public/assets/map-atlas/markers/wz-$type.png"
    test "$(wc -c < "public/assets/map-atlas/markers/wz-$type.png")" -gt 500
  ) &
done
wait

# MapleStory town/map-mark logos, all from original GMS83 MapHelper WZ.
cat > /tmp/atlas-fast-marks.txt <<'EOF'
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
EOF
markbase='https://maplestory.io/api/wz/img/GMS/83/Map/MapHelper.img/mark'
while read -r slug mark; do
  (
    if curl --retry 3 --retry-delay 1 --retry-all-errors -fsSL --max-time 25 "$markbase/$mark" -o "public/assets/map-atlas/marks/$slug.png"; then
      test "$(wc -c < "public/assets/map-atlas/marks/$slug.png")" -gt 500 || rm -f "public/assets/map-atlas/marks/$slug.png"
    fi
  ) &
done < /tmp/atlas-fast-marks.txt
wait

# Preserve current-Classic Victoria art + its marker sprites if available; WZ visual is the fallback.
(
  curl --retry 3 --retry-delay 1 --retry-all-errors -fsSL --max-time 25 'https://meowdb.com/msclassic/worldmap/victoria-island.webp' -o public/assets/map-atlas/sheets/victoria-current.webp || true
  test "$(wc -c < public/assets/map-atlas/sheets/victoria-current.webp 2>/dev/null || echo 0)" -gt 5000 || rm -f public/assets/map-atlas/sheets/victoria-current.webp
) &
for kind in town spot cluster; do
  (
    curl --retry 3 --retry-delay 1 --retry-all-errors -fsSL --max-time 25 "https://meowdb.com/msclassic/worldmap/marker-$kind.png" -o "public/assets/map-atlas/markers/current-$kind.png" || true
    test "$(wc -c < "public/assets/map-atlas/markers/current-$kind.png" 2>/dev/null || echo 0)" -gt 100 || rm -f "public/assets/map-atlas/markers/current-$kind.png"
  ) &
done
wait

python3 .github/scripts/finalize_map_atlas.py
node --check public/maps-tab.js

echo '[atlas-fast] build product with owned visual assets'
node build.cjs
test "$(wc -c < dist/assets/map-atlas/sheets/maple-world.png)" -gt 100000
test "$(wc -c < dist/assets/map-atlas/sheets/orbis-el-nath.png)" -gt 5000
test -s dist/assets/map-atlas/data/markers.json
for type in 0 1 2 3; do test "$(wc -c < "dist/assets/map-atlas/markers/wz-$type.png")" -gt 500; done

cat > dist/ci-visual-atlas.html <<'HTML'
<!doctype html><meta charset="utf-8"><body><iframe id="app" src="/"></iframe><div id="ci-result">pending</div><script>
const delay=ms=>new Promise(r=>setTimeout(r,ms)),frame=document.getElementById('app'),result=document.getElementById('ci-result');
frame.addEventListener('load',async()=>{try{const d=frame.contentDocument;const wait=async(fn,label,n=180)=>{for(let i=0;i<n;i++){if(fn())return;await delay(250)}throw Error('timeout '+label)};
await wait(()=>d.documentElement.classList.contains('maps-tab-ready'),'maps tab');d.querySelector('#nav .nav-btn[data-page="maps"]')?.click();
await wait(()=>d.documentElement.classList.contains('maps-atlas-visual-ready'),'visual atlas');const img=d.getElementById('maps-full-world-image');if(!img?.complete||img.naturalWidth<200)throw Error('world art');if(d.querySelectorAll('.maps-atlas-world-point').length<10)throw Error('world icons');if(d.querySelectorAll('.maps-continent-art-image').length<9)throw Error('continent art');
const markerImgs=[...d.querySelectorAll('.maps-atlas-world-point img')];await wait(()=>markerImgs.some(x=>x.complete&&x.naturalWidth>0),'marker sprites');
const vic=d.querySelector('.maps-continent-card[data-continent="victoria"]');if(!vic)throw Error('victoria card');vic.click();await wait(()=>d.getElementById('maps-sheet-image')?.complete&&d.getElementById('maps-sheet-image').naturalWidth>200,'victoria art');await wait(()=>d.querySelectorAll('.world-map-marker,.atlas-map-point').length>=50,'victoria points');
d.getElementById('maps-local-back')?.click();await wait(()=>d.getElementById('maps-world')?.classList.contains('active'),'world back');d.querySelector('.maps-continent-card[data-continent="ossyria"]')?.click();await wait(()=>d.getElementById('maps-sheet-image')?.complete&&d.getElementById('maps-sheet-image').naturalWidth>200,'ossyria art');await wait(()=>d.querySelectorAll('.atlas-map-point').length>=20,'ossyria points');
result.textContent='visual-atlas-ok';}catch(e){result.textContent='visual-atlas-failed: '+e.message;}});
</script></body>
HTML
python3 .github/ci_static_proxy.py --directory dist --port 4173 >/tmp/atlas-fast-http.log 2>&1 &
server=$!; trap 'kill "$server" 2>/dev/null || true' EXIT
for i in {1..40}; do curl -fsS http://127.0.0.1:4173/ >/dev/null && break; sleep .25; done
chrome="$(command -v google-chrome || command -v google-chrome-stable || command -v chromium || command -v chromium-browser || true)"; test -n "$chrome"
"$chrome" --headless --no-sandbox --disable-gpu --window-size=1440,1050 --virtual-time-budget=55000 --dump-dom http://127.0.0.1:4173/ci-visual-atlas.html >/tmp/atlas-fast-test.html
grep -o 'visual-atlas-[^<]*' /tmp/atlas-fast-test.html || true
grep -q '>visual-atlas-ok<' /tmp/atlas-fast-test.html
rm -f dist/ci-visual-atlas.html
kill "$server" 2>/dev/null || true; trap - EXIT
echo '[atlas-fast] LOCAL BROWSER VISUAL CHECKPOINT PASSED'

rm -rf site; mv dist site
rm -f \
 .github/workflows/finalize-visual-map-atlas.yml \
 .github/workflows/install-map-atlas-assets.yml \
 .github/workflows/diag-world-entry.yml \
 .github/workflows/diag-mapmark-icons.yml \
 .github/workflows/diag-world-labels.yml \
 .github/workflows/diag-world-list.yml \
 .github/workflows/diag-live-maps.yml \
 .github/workflows/patch-map-world-ui.yml
rm -f .github/scripts/finalize_map_atlas.py .github/scripts/run_visual_atlas_finalize.sh .github/scripts/run_visual_atlas_fast.sh

git config user.name 'github-actions[bot]'; git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git add -A; git add -f public/assets/map-atlas site
git commit -m 'Maps: ship visual Maple World atlas'
git fetch origin main
if ! git merge-base --is-ancestor origin/main HEAD; then git rebase origin/main; fi
git push origin HEAD:main
echo '[atlas-fast] VERIFIED SOURCE + SITE PUSHED'

BASE='https://maplestory-classic.ofri505.workers.dev'; ready=0
for i in {1..70}; do
 js="$(curl -fsSL --max-time 15 "$BASE/maps-tab.js?visual=$GITHUB_RUN_ID" || true)"
 wb="$(curl -fsSL --max-time 20 "$BASE/assets/map-atlas/sheets/maple-world.png?visual=$GITHUB_RUN_ID" 2>/dev/null | wc -c || true)"
 mb="$(curl -fsSL --max-time 20 "$BASE/assets/map-atlas/markers/wz-0.png?visual=$GITHUB_RUN_ID" 2>/dev/null | wc -c || true)"
 data="$(curl -fsSL --max-time 20 "$BASE/assets/map-atlas/data/markers.json?visual=$GITHUB_RUN_ID" || true)"
 if printf '%s' "$js" | grep -q 'maps-atlas-visual-ready' && [ "${wb:-0}" -gt 100000 ] && [ "${mb:-0}" -gt 500 ] && printf '%s' "$data" | grep -q '"ossyria"'; then ready=1; break; fi
 sleep 5
done
test "$ready" -eq 1
"$chrome" --headless --no-sandbox --disable-gpu --window-size=1440,1050 --virtual-time-budget=60000 --dump-dom "$BASE/?visual=$GITHUB_RUN_ID" >/tmp/live-atlas-fast.html
grep -q 'maps-atlas-visual-ready' /tmp/live-atlas-fast.html
grep -q 'maps-continent-art-image' /tmp/live-atlas-fast.html
grep -q 'maps-atlas-world-point' /tmp/live-atlas-fast.html
echo '[atlas-fast] LIVE VISUAL ATLAS VERIFIED'
