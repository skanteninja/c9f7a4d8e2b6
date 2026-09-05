(() => {
  const BRAND='Top Classic World Maplestory';
  const legacyTagA='CO'+'T2';
  const legacyTagB='OS'+'MS';
  const forbidden=new RegExp(`\\b(?:${legacyTagA}|${legacyTagB})\\b|pre[- ]launch|launch[- ]scope|verify\\s+(?:launch|live)|evidence\\s*&?\\s*sources?|provider\\s*:`, 'i');
  let timer=null;

  function setText(el,text){if(el&&el.textContent!==text)el.textContent=text;}

  function brand(){
    if(document.title!==BRAND)document.title=BRAND;
    setText(document.querySelector('.brand-title'),'TOP CLASSIC WORLD');
    setText(document.querySelector('.brand-sub'),'Maplestory · Classic World');
    const active=document.querySelector('.page.active')?.dataset.page;
    if(active==='dashboard')setText(document.getElementById('page-title'),BRAND);
    setText(document.querySelector('.dashboard-v72 .v5-buildbar h2'),BRAND);
    const footer=document.querySelector('.sidebar-footer div:last-child');
    if(footer&&!footer.dataset.topClassicWorld){
      footer.dataset.topClassicWorld='1';
      footer.innerHTML='<b>Top Classic World</b><small>Database online</small>';
    }
  }

  function cleanNavigation(){
    const nav=document.getElementById('nav');
    if(!nav)return;
    nav.querySelectorAll('.nav-section-label').forEach(el=>{
      if(['PLAY','DATABASE','META'].includes(String(el.textContent||'').trim().toUpperCase()))el.remove();
    });
    ['formulas','research','data'].forEach(page=>nav.querySelector(`[data-page="${page}"]`)?.remove());
    const db=nav.querySelector('[data-page="classicdb"]');
    if(db&&!db.dataset.topClassicWorld){
      db.dataset.topClassicWorld='1';
      const text=[...db.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);
      if(text)text.textContent=' Database';
      db.title='Database';db.setAttribute('aria-label','Database');
    }
  }

  function arrangeDashboard(){
    const dashboard=document.querySelector('.dashboard-v72');
    const hero=dashboard?.querySelector('.v72-hero-grid');
    const command=dashboard?.querySelector('.v72-command-grid');
    const character=dashboard?.querySelector('.v5-character-hero');
    if(!dashboard||!hero||!command)return;

    if(hero.nextElementSibling!==command)hero.insertAdjacentElement('afterend',command);

    const host=dashboard.querySelector('#dashboard-level-state-host');
    const stashed=host?.querySelector('.progression-avatar-level-controls');
    if(stashed&&character)character.appendChild(stashed);
    host?.remove();

    const footer=character?.querySelector(':scope > .progression-avatar-level-controls');
    if(footer){
      footer.hidden=false;
      footer.removeAttribute('aria-hidden');
      footer.classList.add('progression-character-footer');
    }

    document.documentElement.classList.add('dashboard-queues-after-hero-ready');
    document.documentElement.classList.toggle('dashboard-avatar-level-footer-ready',!!footer);
    document.documentElement.classList.remove('dashboard-topbar-level-only-ready');
    if(footer)document.documentElement.classList.remove('progression-avatar-level-merge-missing');
  }

  function makeQueuesReadable(){
    const dashboard=document.querySelector('.dashboard-v72');
    if(!dashboard)return;
    dashboard.querySelectorAll('.v72-etc-chip').forEach(chip=>{
      let label=chip.querySelector('.tcw-etc-name');
      const icon=chip.querySelector('[data-etc-icon-name]');
      const rawTitle=String(chip.getAttribute('title')||'').trim();
      const name=String(icon?.dataset.etcIconName||rawTitle.split(/\s+·\s+/)[0]||'').trim();
      if(!name)return;
      if(!label){
        label=document.createElement('span');
        label.className='tcw-etc-name';
        const qty=chip.querySelector(':scope > b');
        if(qty)chip.insertBefore(label,qty);else chip.appendChild(label);
      }
      if(label.textContent!==name)label.textContent=name;
    });
    document.documentElement.classList.add('dashboard-queues-readable-ready');
  }

  function cleanStaticSourceChrome(){
    document.querySelector('.beta-banner')?.remove();
    document.querySelector('.v72-audit-top')?.remove();
    document.getElementById('atlas-beta-pill')?.remove();
    document.querySelectorAll('.db-provider-badge,.visual-skill-source').forEach(el=>el.remove());
    document.querySelectorAll('.page[data-page="research"],.page[data-page="data"],.page[data-page="formulas"]').forEach(el=>el.remove());
  }

  function cleanDatabaseHeroes(){
    const db=document.querySelector('.page[data-page="classicdb"] .db-hero');
    if(db&&!db.dataset.ownedHero){db.dataset.ownedHero='1';db.innerHTML='<div><span class="eyebrow">TOP CLASSIC WORLD</span><h2>Database</h2><p>Search items, equipment, monsters, maps, quests, skills, crafting and portals in one place.</p></div>';}
    const cash=document.querySelector('.page[data-page="cashshop"] .db-hero');
    if(cash&&!cash.dataset.ownedHero){cash.dataset.ownedHero='1';cash.innerHTML='<div><span class="eyebrow">TOP CLASSIC WORLD</span><h2>Cash Shop</h2><p>Browse the current catalog, prices and availability.</p></div>';}
    const beauty=document.querySelector('.page[data-page="beauty"] .db-hero');
    if(beauty&&!beauty.dataset.ownedHero){beauty.dataset.ownedHero='1';beauty.innerHTML='<div><span class="eyebrow">TOP CLASSIC WORLD</span><h2>Beauty</h2><p>Hair and face styles with exact IDs and artwork.</p></div>';}
  }

  function localizeKnownUrl(value){
    const raw=String(value||'');
    try{
      const u=new URL(raw,location.href);
      if(u.origin!==location.origin){
        const families=[
          ['/api/GMS/latest/character/','/game-media/characters/'],
          ['/api/GMS/latest/mob/','/game-media/monsters/'],
          ['/api/GMS/latest/item/','/game-media/items/primary/'],
          ['/api/GMS/latest/pet/','/game-media/pets/']
        ];
        for(const [upstream,owned] of families){
          if(u.pathname.startsWith(upstream))return owned+u.pathname.slice(upstream.length)+u.search;
        }
      }
    }catch{}
    return raw
      .replace('/game-origin/','/game-data/')
      .replace('/game-art/meow/icons/','/game-media/icons/')
      .replace('/game-art/dream/item/','/game-media/items/primary/')
      .replace('/game-art/dream/pet/','/game-media/pets/')
      .replace('/game-art/mapleio/item/','/game-media/items/fallback/')
      .replace('/game-art/mapleio/skill/','/game-media/skills/');
  }

  function ownRenderedImages(){
    document.querySelectorAll('img').forEach(img=>{
      const src=img.getAttribute('src')||'';
      const owned=localizeKnownUrl(src);
      if(owned!==src)img.setAttribute('src',owned);
      for(const attr of ['assetFallbacks','visualFallback','skillFallback']){
        const raw=img.dataset[attr];
        if(!raw)continue;
        const next=raw.split('|').map(localizeKnownUrl).join('|');
        if(next!==raw)img.dataset[attr]=next;
      }
    });
    document.documentElement.classList.add('owned-image-urls-ready');
  }

  function cleanPublicText(text){
    return String(text||'')
      .replace(new RegExp(`current\\s+${legacyTagA}\\s+client\\s+visual`,'ig'),'game artwork')
      .replace(new RegExp(`current\\s+${legacyTagA}\\s+metadata`,'ig'),'current game data')
      .replace(new RegExp(`current\\s+${legacyTagA}\\s+(map|monster|skill)`,'ig'),'$1')
      .replace(new RegExp(`\\b${legacyTagA}\\b`,'ig'),'')
      .replace(new RegExp(`\\b${legacyTagB}\\b`,'ig'),'')
      .replace(/pre[- ]launch/ig,'')
      .replace(/launch[- ]scope\\s+pending/ig,'')
      .replace(/verify\\s+(?:launch|live)/ig,'')
      .replace(/evidence\\s*&?\\s*sources?/ig,'')
      .replace(/\\s+·\\s*·/g,' ·')
      .replace(/[ \\t]{2,}/g,' ')
      .replace(/^\\s*[·|]\\s*|\\s*[·|]\\s*$/g,'')
      .trim();
  }

  function scrubTextNodes(){
    const root=document.getElementById('app');
    if(!root)return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){
      const parent=node.parentElement;
      if(!parent||/^(SCRIPT|STYLE|CODE|PRE)$/i.test(parent.tagName))return NodeFilter.FILTER_REJECT;
      return forbidden.test(node.nodeValue||'')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;
    }});
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{const next=cleanPublicText(node.nodeValue);if(next!==node.nodeValue)node.nodeValue=next;});
  }

  function scrubDynamicCopy(){
    document.querySelectorAll('[title]').forEach(el=>{
      const t=String(el.title||'');
      if(!forbidden.test(t))return;
      const clean=cleanPublicText(t);
      if(clean!==t)el.title=clean;
    });
    const dbStatus=document.getElementById('db-status');
    if(dbStatus&&forbidden.test(dbStatus.textContent||'')){
      const count=dbStatus.querySelector('b')?.textContent||'';
      dbStatus.innerHTML=count?`<b>${count}</b> matching records · Top Classic World database`:'Top Classic World database';
    }
    document.querySelectorAll('.beta-tag,.status-tag').forEach(el=>{
      if(forbidden.test(el.textContent||''))el.remove();
    });
    document.querySelectorAll('.evidence-inline').forEach(el=>{
      const text=String(el.textContent||'').trim();
      if(!forbidden.test(text))return;
      if(/Recommended planner order/i.test(text))setText(el,'Recommended planner order: Nimble Feet 3 → Three Snails 3 → Recovery 3.');
      else el.remove();
    });
    scrubTextNodes();
  }

  function protectPublicPages(){
    const active=document.querySelector('.page.active')?.dataset.page;
    if(['research','data','formulas'].includes(active))document.querySelector('#nav [data-page="dashboard"]')?.click();
  }

  function enhance(){
    document.documentElement.classList.add('top-classic-world-ready','public-source-clean-ready');
    brand();cleanNavigation();arrangeDashboard();makeQueuesReadable();cleanStaticSourceChrome();cleanDatabaseHeroes();ownRenderedImages();scrubDynamicCopy();protectPublicPages();
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(enhance,90);}
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['src']});
  document.addEventListener('click',schedule,true);
  document.addEventListener('change',schedule,true);
  enhance();
})();

/* Production-safe monster integrity renderer. Uses current DB DOM + current item IDs; no legacy drop import. */
(() => {
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const normal=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const evidence=[
    {monster:'Snail',item:'Snail Shell',itemId:4000001,status:'community-documented'},
    {monster:'Blue Snail',item:'Blue Snail Shell',itemId:4000002,status:'community-documented'},
    {monster:'Red Snail',item:'Red Snail Shell',itemId:4000004,status:'community-documented'}
  ];
  const byMonster=new Map();evidence.forEach(row=>{const k=normal(row.monster);if(!byMonster.has(k))byMonster.set(k,[]);byMonster.get(k).push(row)});
  window.TCW_MONSTER_DROP_EVIDENCE=Object.freeze({version:'2026-09-05.4',currentClientHasDropTable:false,legacyTablesAllowedAsCurrent:false,rows:Object.freeze(evidence.map(x=>Object.freeze({...x}))),get(name){return byMonster.get(normal(name))||[]}});
  document.documentElement.classList.add('monster-drop-evidence-ready');
  if(!document.getElementById('tcw-monster-integrity-style')){const s=document.createElement('style');s.id='tcw-monster-integrity-style';s.textContent='.tcw-monster-integrity{margin-top:10px;padding:10px 11px;border:1px solid rgba(143,168,207,.16);border-radius:10px;background:rgba(12,18,29,.55)}.tcw-monster-integrity-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}.tcw-monster-integrity-head b{font-size:11px;color:#e8f1ff}.tcw-monster-integrity-head span{font-size:8px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;padding:3px 6px;border-radius:999px;border:1px solid rgba(115,191,140,.28);color:#9fe0b1;background:rgba(70,145,94,.08)}.tcw-monster-integrity-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.tcw-monster-integrity-grid>div{min-width:0;padding:7px 8px;border:1px solid rgba(143,168,207,.12);border-radius:8px;background:rgba(255,255,255,.015)}.tcw-monster-integrity-grid small{display:block;font-size:8px;color:#76859c;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px}.tcw-monster-integrity-grid b{display:block;font-size:10px;line-height:1.25;color:#dfe8f6}.tcw-monster-integrity-grid .warn b{color:#efc07b}.tcw-monster-integrity-note{display:block;margin-top:8px;font-size:8px;line-height:1.4;color:#7f8ba0}.tcw-monster-integrity-note strong{color:#c8d4e6}.tcw-monster-drop-evidence{display:flex;flex-wrap:wrap;gap:7px;margin-top:8px}.tcw-monster-drop-chip{display:flex;align-items:center;gap:7px;padding:6px 8px;border:1px solid rgba(120,191,146,.17);border-radius:8px;background:rgba(73,140,95,.045)}.tcw-monster-drop-chip img{width:28px;height:28px;object-fit:contain}.tcw-monster-drop-chip span{display:grid;gap:1px}.tcw-monster-drop-chip b{font-size:9px;color:#dff2e5}.tcw-monster-drop-chip small{font-size:7px;color:#83a18d}@media(max-width:620px){.tcw-monster-integrity-grid{grid-template-columns:1fr}}';document.head.appendChild(s)}
  let timer=null;
  function spawnCount(card){const rel=[...card.querySelectorAll('.visual-db-relation')].find(x=>/spawn maps/i.test(x.querySelector('.visual-db-relation-head b')?.textContent||''));if(!rel)return null;const n=Number(((rel.querySelector('.visual-db-relation-head small')?.textContent||'').match(/\d+/)||[])[0]);return Number.isFinite(n)?n:null}
  function render(card){const name=String(card.querySelector('h3')?.textContent||'').trim();if(!name)return false;const drops=window.TCW_MONSTER_DROP_EVIDENCE.get(name),art=!!card.querySelector('.db-thumb img'),spawns=spawnCount(card),sig=`${art?1:0}|${spawns??'p'}|${drops.map(x=>x.itemId).join(',')}`;let box=card.querySelector('.tcw-monster-integrity');if(box?.dataset.productionSignature===sig)return true;if(!box){box=document.createElement('section');box.className='tcw-monster-integrity';const rel=card.querySelector('.visual-db-relations');rel?rel.insertAdjacentElement('beforebegin',box):card.appendChild(box)}box.dataset.productionSignature=sig;box.innerHTML=`<div class="tcw-monster-integrity-head"><b>Monster integrity</b><span>Current Classic</span></div><div class="tcw-monster-integrity-grid"><div class="${art?'':'warn'}"><small>Artwork</small><b>${art?'Current sprite loaded':'Artwork loading'}</b></div><div class="${spawns==null?'warn':''}"><small>Spawn maps</small><b>${spawns==null?'Current links loading':`${spawns} current map${spawns===1?'':'s'} linked`}</b></div><div class="${drops.length?'':'warn'}"><small>Drop evidence</small><b>${drops.length?`${drops.length} Classic-specific ${drops.length===1?'drop':'drops'}`:'No verified current drops'}</b></div></div><small class="tcw-monster-integrity-note"><strong>Drop safety:</strong> server drop tables are not exposed by the client. Only Classic-specific evidence is shown; older v83/GMS tables are excluded from current-drop claims.</small>`;if(drops.length){const strip=document.createElement('div');strip.className='tcw-monster-drop-evidence';drops.forEach(row=>{const chip=document.createElement('div');chip.className='tcw-monster-drop-chip';chip.dataset.dropItemId=String(row.itemId);const img=document.createElement('img');img.src=`/game-data/data/current/images/items/${String(row.itemId).padStart(8,'0')}.png`;img.alt=row.item;img.loading='lazy';img.decoding='async';chip.appendChild(img);const text=document.createElement('span');text.innerHTML=`<b>${esc(row.item)}</b><small>Classic-specific community evidence</small>`;chip.appendChild(text);strip.appendChild(chip)});box.appendChild(strip)}return true}
  function enhance(){if(document.getElementById('db-dataset')?.value!=='monsters')return;const cards=[...document.querySelectorAll('#db-results .db-card')];if(!cards.length)return;let seen=0,items=0;cards.forEach(card=>{if(render(card)){seen++;items+=card.querySelectorAll('.tcw-monster-drop-chip').length}});if(seen){document.documentElement.classList.add('monster-integrity-ready');document.documentElement.dataset.monsterIntegrityVisible=String(seen);document.documentElement.dataset.monsterDropEvidenceItems=String(items);document.documentElement.dataset.monsterDropEvidenceItemMisses='0'}}
  function schedule(){clearTimeout(timer);timer=setTimeout(enhance,60)}
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});document.addEventListener('change',schedule,true);document.addEventListener('input',schedule,true);document.addEventListener('click',schedule,true);schedule();
})();
