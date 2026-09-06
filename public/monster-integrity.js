(() => {
  const ROOT='/game-data/data/current/';
  let dataPromise=null,timer=null;
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const norm=v=>String(v??'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const idOfCard=card=>{const raw=card.dataset.recordId || card.querySelector('code')?.textContent?.replace(/\D/g,'');const n=Number(raw);return Number.isFinite(n)?n:null};
  function collectRows(raw,key){
    if(Array.isArray(raw?.[key]))return raw[key];
    if(Array.isArray(raw))return raw;
    return [];
  }
  function load(){
    if(!dataPromise)dataPromise=Promise.all([
      fetch(`${ROOT}monsters.json`,{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error(`monsters ${r.status}`);return r.json()}),
      fetch(`${ROOT}maps.json`,{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error(`maps ${r.status}`);return r.json()}),
      fetch(`${ROOT}items.json`,{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error(`items ${r.status}`);return r.json()})
    ]).then(([mobsRaw,mapsRaw,itemsRaw])=>{
      const mobs=collectRows(mobsRaw,'monsters');
      const maps=collectRows(mapsRaw,'maps');
      const items=collectRows(itemsRaw,'items');
      const itemByName=new Map();
      items.forEach(item=>{const key=norm(item?.name||item?.item_name);if(key&&!itemByName.has(key))itemByName.set(key,item)});
      return {
        mobs:new Map(mobs.map(x=>[Number(x.id),x])),
        maps:new Map(maps.map(x=>[Number(x.id),x])),
        itemByName,
        mobCount:mobs.length,mapCount:maps.length,itemCount:items.length
      };
    });
    return dataPromise;
  }
  function spriteState(mob){
    const primary=mob?.gif||mob?.gifs?.move||mob?.gifs?.stand;
    if(primary&&mob?.thumbnail)return {label:'Primary + fallback',cls:''};
    if(primary)return {label:'Primary sprite only',cls:'warn'};
    if(mob?.thumbnail)return {label:'Fallback thumbnail only',cls:'warn'};
    return {label:'No artwork reference',cls:'bad'};
  }
  function mapState(mob,maps){
    const refs=Array.isArray(mob?.maps)?mob.maps:[];
    const valid=refs.filter(r=>maps.has(Number(r.id))).length;
    const missing=Math.max(0,refs.length-valid);
    return {refs:refs.length,valid,missing,label:refs.length?`${valid}/${refs.length} resolved`:'No spawn refs',cls:missing?'warn':refs.length?'':'warn'};
  }
  function evidenceState(mob,itemByName){
    const reg=window.TCW_MONSTER_DROP_EVIDENCE;
    const entries=reg?.get?.(mob?.name)||[];
    if(!entries.length)return {entries:[],resolved:[],missing:[],label:'No verified current drops',cls:'warn'};
    const resolved=[],missing=[];
    entries.forEach(entry=>{
      const item=itemByName.get(norm(entry.item));
      (item?resolved:missing).push(item?{entry,item}:{entry});
    });
    const label=missing.length?`${resolved.length}/${entries.length} evidence items resolved`:`${entries.length} Classic evidence ${entries.length===1?'drop':'drops'}`;
    return {entries,resolved,missing,label,cls:missing.length?'warn':''};
  }
  function itemImg(item){
    const id=Number(item?.id);return Number.isFinite(id)?`${ROOT}images/items/${String(Math.trunc(id)).padStart(8,'0')}.png`:'';
  }
  function renderEvidenceItems(box,state){
    if(!state.resolved.length)return;
    const strip=document.createElement('div');strip.className='tcw-monster-drop-evidence';
    state.resolved.forEach(({entry,item})=>{
      const chip=document.createElement('div');chip.className='tcw-monster-drop-chip';
      const url=itemImg(item);
      if(url){const img=document.createElement('img');img.src=url;img.alt=entry.item;img.loading='lazy';img.decoding='async';chip.appendChild(img)}
      const text=document.createElement('span');text.innerHTML=`<b>${esc(entry.item)}</b><small>${entry.status==='official-confirmed'?'Official Classic evidence':entry.status==='player-confirmed'?'Player-confirmed Classic':'Classic-specific community evidence'}</small>`;chip.appendChild(text);
      strip.appendChild(chip);
    });
    box.appendChild(strip);
  }
  function renderCard(card,mob,maps,itemByName){
    if(card.querySelector('.tcw-monster-integrity'))return;
    const sprite=spriteState(mob),spawn=mapState(mob,maps),drops=evidenceState(mob,itemByName);
    const box=document.createElement('section');box.className='tcw-monster-integrity';box.setAttribute('aria-label','Monster data integrity');
    box.innerHTML=`<div class="tcw-monster-integrity-head"><b>Monster integrity</b><span>Current Classic</span></div><div class="tcw-monster-integrity-grid"><div class="${sprite.cls}"><small>Artwork</small><b>${esc(sprite.label)}</b></div><div class="${spawn.cls}"><small>Spawn maps</small><b>${esc(spawn.label)}</b></div><div class="${drops.cls}"><small>Drop evidence</small><b>${esc(drops.label)}</b></div></div><small class="tcw-monster-integrity-note"><strong>Drop safety:</strong> the game client does not expose server drop tables. Only Classic-specific evidence is eligible here; older v83/GMS tables are excluded from current-drop claims.</small>`;
    renderEvidenceItems(box,drops);
    const rel=card.querySelector('.visual-db-relations');
    rel?rel.insertAdjacentElement('beforebegin',box):card.appendChild(box);
    card.dataset.tcwMonsterIntegrity='1';
  }
  async function enhance(){
    const dataset=document.getElementById('db-dataset')?.value;
    if(dataset!=='monsters')return;
    const cards=[...document.querySelectorAll('.page[data-page="classicdb"] .db-card')];
    if(!cards.length)return;
    try{
      const {mobs,maps,itemByName}=await load();
      let seen=0,missing=0,badArtwork=0,badMaps=0,evidenceMonsters=0,evidenceItems=0,evidenceItemMisses=0;
      cards.forEach(card=>{
        const id=idOfCard(card),mob=mobs.get(id);
        if(!mob){missing++;return}
        seen++;
        const sprite=spriteState(mob),spawn=mapState(mob,maps),drops=evidenceState(mob,itemByName);
        if(sprite.cls==='bad')badArtwork++;
        if(spawn.missing)badMaps++;
        if(drops.entries.length)evidenceMonsters++;
        evidenceItems+=drops.resolved.length;
        evidenceItemMisses+=drops.missing.length;
        renderCard(card,mob,maps,itemByName);
      });
      document.documentElement.classList.add('monster-integrity-ready');
      document.documentElement.dataset.monsterIntegrityVisible=String(seen);
      document.documentElement.dataset.monsterIntegrityMissing=String(missing);
      document.documentElement.dataset.monsterIntegrityArtworkIssues=String(badArtwork);
      document.documentElement.dataset.monsterIntegrityMapIssues=String(badMaps);
      document.documentElement.dataset.monsterDropEvidenceMonsters=String(evidenceMonsters);
      document.documentElement.dataset.monsterDropEvidenceItems=String(evidenceItems);
      document.documentElement.dataset.monsterDropEvidenceItemMisses=String(evidenceItemMisses);
    }catch(err){console.warn('Monster integrity audit unavailable',err);}
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(enhance,120)}
  new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true});
  document.addEventListener('change',e=>{if(e.target?.id==='db-dataset')schedule()},true);
  document.addEventListener('click',schedule,true);
  window.TCW_MONSTER_INTEGRITY={enhance,load,evidenceState};
  schedule();
})();

