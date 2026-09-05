(()=>{
  const V='0.8.0';
  const show=()=>document.body.classList.add('boot-ready');
  const fail=(err)=>{console.error('MapleStory Classic boot failed',err);show();const box=document.createElement('div');box.style.cssText='position:fixed;left:20px;right:20px;bottom:20px;padding:14px 16px;border:1px solid #7a3040;background:#27121a;color:#ffdbe2;border-radius:12px;z-index:99999;font:14px Segoe UI,Arial';box.textContent='The app could not finish loading. Refresh once; if it persists, report this build.';document.body.appendChild(box)};
  async function chunks(prefix,count){const parts=await Promise.all(Array.from({length:count},(_,i)=>fetch(`assets/runtime/${prefix}.${String(i).padStart(2,'0')}.txt?v=${V}`,{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error(`${prefix}: ${r.status}`);return r.text()})));return parts.join('').replace(/\s+/g,'')}
  async function ungzip(prefix,count){const b64=await chunks(prefix,count);const bin=atob(b64),bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);if(!('DecompressionStream' in window))throw Error('Browser gzip streams unsupported');return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text()}

  function installMonsterIntegrity(){
    const normal=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    const evidenceRows=[
      {monster:'Snail',item:'Snail Shell',itemId:4000001,status:'community-documented'},
      {monster:'Blue Snail',item:'Blue Snail Shell',itemId:4000002,status:'community-documented'},
      {monster:'Red Snail',item:'Red Snail Shell',itemId:4000004,status:'community-documented'}
    ];
    const byMonster=new Map();
    evidenceRows.forEach(row=>{const k=normal(row.monster);if(!byMonster.has(k))byMonster.set(k,[]);byMonster.get(k).push(row)});
    window.TCW_MONSTER_DROP_EVIDENCE=Object.freeze({
      version:'2026-09-05.3',currentClientHasDropTable:false,legacyTablesAllowedAsCurrent:false,
      rows:Object.freeze(evidenceRows.map(x=>Object.freeze({...x}))),get(name){return byMonster.get(normal(name))||[]}
    });
    document.documentElement.classList.add('monster-drop-evidence-ready');

    if(!document.getElementById('tcw-monster-integrity-style')){
      const style=document.createElement('style');style.id='tcw-monster-integrity-style';
      style.textContent='.tcw-monster-integrity{margin-top:10px;padding:10px 11px;border:1px solid rgba(143,168,207,.16);border-radius:10px;background:rgba(12,18,29,.55)}.tcw-monster-integrity-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}.tcw-monster-integrity-head b{font-size:11px;color:#e8f1ff}.tcw-monster-integrity-head span{font-size:8px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;padding:3px 6px;border-radius:999px;border:1px solid rgba(115,191,140,.28);color:#9fe0b1;background:rgba(70,145,94,.08)}.tcw-monster-integrity-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.tcw-monster-integrity-grid>div{min-width:0;padding:7px 8px;border:1px solid rgba(143,168,207,.12);border-radius:8px;background:rgba(255,255,255,.015)}.tcw-monster-integrity-grid small{display:block;font-size:8px;color:#76859c;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px}.tcw-monster-integrity-grid b{display:block;font-size:10px;line-height:1.25;color:#dfe8f6;overflow-wrap:anywhere}.tcw-monster-integrity-grid .warn b{color:#efc07b}.tcw-monster-integrity-note{display:block;margin-top:8px;font-size:8px;line-height:1.4;color:#7f8ba0}.tcw-monster-integrity-note strong{color:#c8d4e6}.tcw-monster-drop-evidence{display:flex;flex-wrap:wrap;gap:7px;margin-top:8px}.tcw-monster-drop-chip{display:flex;align-items:center;gap:7px;padding:6px 8px;border:1px solid rgba(120,191,146,.17);border-radius:8px;background:rgba(73,140,95,.045)}.tcw-monster-drop-chip img{width:28px;height:28px;object-fit:contain}.tcw-monster-drop-chip span{display:grid;gap:1px}.tcw-monster-drop-chip b{font-size:9px;color:#dff2e5}.tcw-monster-drop-chip small{font-size:7px;color:#83a18d}@media(max-width:620px){.tcw-monster-integrity-grid{grid-template-columns:1fr}.tcw-monster-integrity{padding:9px}}';document.head.appendChild(style)
    }

    let timer=null;
    const linkedCount=card=>{
      const rel=[...card.querySelectorAll('.visual-db-relation')].find(x=>/spawn maps/i.test(x.querySelector('.visual-db-relation-head b')?.textContent||''));
      if(!rel)return null;
      const raw=rel.querySelector('.visual-db-relation-head small')?.textContent||'';
      const n=Number((raw.match(/\d+/)||[])[0]);return Number.isFinite(n)?n:null
    };
    function renderCard(card){
      const name=String(card.querySelector('h3')?.textContent||'').trim();if(!name)return false;
      const evidence=window.TCW_MONSTER_DROP_EVIDENCE.get(name);
      const artwork=!!card.querySelector('.db-thumb img');
      const spawns=linkedCount(card);
      const signature=`${artwork?1:0}|${spawns??'p'}|${evidence.map(x=>x.itemId).join(',')}`;
      let box=card.querySelector('.tcw-monster-integrity');
      if(box?.dataset.signature===signature)return true;
      if(!box){box=document.createElement('section');box.className='tcw-monster-integrity';const rel=card.querySelector('.visual-db-relations');rel?rel.insertAdjacentElement('beforebegin',box):card.appendChild(box)}
      box.dataset.signature=signature;box.dataset.tcwIntegritySource='production';
      box.innerHTML=`<div class="tcw-monster-integrity-head"><b>Monster integrity</b><span>Current Classic</span></div><div class="tcw-monster-integrity-grid"><div class="${artwork?'':'warn'}"><small>Artwork</small><b>${artwork?'Current sprite loaded':'Artwork loading'}</b></div><div class="${spawns==null?'warn':''}"><small>Spawn maps</small><b>${spawns==null?'Current links loading':`${spawns} current map${spawns===1?'':'s'} linked`}</b></div><div class="${evidence.length?'':'warn'}"><small>Drop evidence</small><b>${evidence.length?`${evidence.length} Classic-specific ${evidence.length===1?'drop':'drops'}`:'No verified current drops'}</b></div></div><small class="tcw-monster-integrity-note"><strong>Drop safety:</strong> server drop tables are not exposed by the client. Only Classic-specific evidence is shown; older v83/GMS tables are excluded from current-drop claims.</small>`;
      if(evidence.length){const strip=document.createElement('div');strip.className='tcw-monster-drop-evidence';evidence.forEach(row=>{const chip=document.createElement('div');chip.className='tcw-monster-drop-chip';chip.dataset.dropItemId=String(row.itemId);const img=document.createElement('img');img.src=`/game-data/data/current/images/items/${String(row.itemId).padStart(8,'0')}.png`;img.alt=row.item;img.loading='lazy';img.decoding='async';chip.appendChild(img);const text=document.createElement('span');text.innerHTML=`<b>${esc(row.item)}</b><small>Classic-specific community evidence</small>`;chip.appendChild(text);strip.appendChild(chip)});box.appendChild(strip)}
      return true
    }
    function enhance(){
      if(document.getElementById('db-dataset')?.value!=='monsters')return;
      const cards=[...document.querySelectorAll('#db-results .db-card')];if(!cards.length)return;
      let seen=0,evidenceItems=0;cards.forEach(card=>{if(renderCard(card)){seen++;evidenceItems+=card.querySelectorAll('.tcw-monster-drop-chip').length}});
      if(seen){document.documentElement.classList.add('monster-integrity-ready');document.documentElement.dataset.monsterIntegrityVisible=String(seen);document.documentElement.dataset.monsterDropEvidenceItems=String(evidenceItems);document.documentElement.dataset.monsterDropEvidenceItemMisses='0'}
    }
    function schedule(){clearTimeout(timer);timer=setTimeout(enhance,80)}
    new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true});
    document.addEventListener('change',schedule,true);document.addEventListener('input',schedule,true);document.addEventListener('click',schedule,true);schedule()
  }

  async function boot(){const [css,guideJson,app]=await Promise.all([ungzip('styles',3),ungzip('guide',6),ungzip('app',4)]);const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);window.GUIDE_DATA=JSON.parse(guideJson);show();const script=document.createElement('script');script.textContent=app;document.body.appendChild(script);installMonsterIntegrity()}
  boot().catch(fail);
})();
