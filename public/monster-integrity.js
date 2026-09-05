(() => {
  const ROOT='/game-data/data/current/';
  let dataPromise=null,timer=null;
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const idOfCard=card=>{const raw=card.querySelector('code')?.textContent?.replace(/\D/g,'');const n=Number(raw);return Number.isFinite(n)?n:null};
  function load(){
    if(!dataPromise)dataPromise=Promise.all([
      fetch(`${ROOT}monsters.json`,{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error(`monsters ${r.status}`);return r.json()}),
      fetch(`${ROOT}maps.json`,{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error(`maps ${r.status}`);return r.json()})
    ]).then(([mobsRaw,mapsRaw])=>{
      const mobs=Array.isArray(mobsRaw?.monsters)?mobsRaw.monsters:[];
      const maps=Array.isArray(mapsRaw?.maps)?mapsRaw.maps:[];
      return {mobs:new Map(mobs.map(x=>[Number(x.id),x])),maps:new Map(maps.map(x=>[Number(x.id),x])),mobCount:mobs.length,mapCount:maps.length};
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
  function renderCard(card,mob,maps){
    if(card.querySelector('.tcw-monster-integrity'))return;
    const sprite=spriteState(mob),spawn=mapState(mob,maps);
    const box=document.createElement('section');box.className='tcw-monster-integrity';box.setAttribute('aria-label','Monster data integrity');
    box.innerHTML=`<div class="tcw-monster-integrity-head"><b>Monster integrity</b><span>Current Classic</span></div><div class="tcw-monster-integrity-grid"><div class="${sprite.cls}"><small>Artwork</small><b>${esc(sprite.label)}</b></div><div class="${spawn.cls}"><small>Spawn maps</small><b>${esc(spawn.label)}</b></div><div class="warn"><small>Drop table</small><b>Not in current export</b></div></div><small class="tcw-monster-integrity-note"><strong>Drop safety:</strong> this monster record does not claim legacy/v83 drops as current Classic data. Drops stay unverified until a Classic-specific source is attached.</small>`;
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
      const {mobs,maps}=await load();
      let seen=0,missing=0,badArtwork=0,badMaps=0;
      cards.forEach(card=>{
        const id=idOfCard(card),mob=mobs.get(id);
        if(!mob){missing++;return}
        seen++;
        const sprite=spriteState(mob),spawn=mapState(mob,maps);
        if(sprite.cls==='bad')badArtwork++;
        if(spawn.missing)badMaps++;
        renderCard(card,mob,maps);
      });
      document.documentElement.classList.add('monster-integrity-ready');
      document.documentElement.dataset.monsterIntegrityVisible=String(seen);
      document.documentElement.dataset.monsterIntegrityMissing=String(missing);
      document.documentElement.dataset.monsterIntegrityArtworkIssues=String(badArtwork);
      document.documentElement.dataset.monsterIntegrityMapIssues=String(badMaps);
    }catch(err){console.warn('Monster integrity audit unavailable',err);}
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(enhance,120)}
  new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true});
  document.addEventListener('change',e=>{if(e.target?.id==='db-dataset')schedule()},true);
  document.addEventListener('click',schedule,true);
  window.TCW_MONSTER_INTEGRITY={enhance,load};
  schedule();
})();
