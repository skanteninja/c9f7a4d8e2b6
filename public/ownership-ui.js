(() => {
  const BRAND='Top Classic World Maplestory';
  let timer=null;
  const forbidden=/\b(?:COT2|OSMS)\b|pre[- ]launch|launch[- ]scope|verify\s+(?:launch|live)|evidence\s*&?\s*sources?|provider\s*:/i;

  function setText(el,text){if(el&&el.textContent!==text)el.textContent=text;}

  function brand(){
    document.title=BRAND;
    setText(document.querySelector('.brand-title'),'TOP CLASSIC WORLD');
    setText(document.querySelector('.brand-sub'),'Maplestory · Classic World');
    const active=document.querySelector('.page.active')?.dataset.page;
    if(active==='dashboard') setText(document.getElementById('page-title'),BRAND);
    const dashTitle=document.querySelector('.dashboard-v72 .v5-buildbar h2');
    setText(dashTitle,BRAND);
    const footer=document.querySelector('.sidebar-footer div:last-child');
    if(footer){footer.innerHTML='<b>Top Classic World</b><small>Database online</small>';}
  }

  function cleanNavigation(){
    const nav=document.getElementById('nav');
    if(!nav)return;
    nav.querySelectorAll('.nav-section-label').forEach(el=>{
      if(['PLAY','DATABASE','META'].includes(String(el.textContent||'').trim().toUpperCase()))el.remove();
    });
    ['formulas','research','data'].forEach(page=>nav.querySelector(`[data-page="${page}"]`)?.remove());
    const db=nav.querySelector('[data-page="classicdb"]');
    if(db){
      const text=[...db.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);
      if(text)text.textContent=' Database';
      db.title='Database';db.setAttribute('aria-label','Database');
    }
  }

  function cleanStaticSourceChrome(){
    document.querySelector('.beta-banner')?.remove();
    document.querySelector('.v72-audit-top')?.remove();
    document.getElementById('atlas-beta-pill')?.remove();
    document.querySelectorAll('.db-provider-badge,.visual-skill-source').forEach(el=>el.remove());
    document.querySelectorAll('.page[data-page="research"],.page[data-page="data"],.page[data-page="formulas"]').forEach(el=>el.setAttribute('aria-hidden','true'));
  }

  function cleanDatabaseHeroes(){
    const db=document.querySelector('.page[data-page="classicdb"] .db-hero');
    if(db)db.innerHTML='<div><span class="eyebrow">TOP CLASSIC WORLD</span><h2>Database</h2><p>Search items, equipment, monsters, maps, quests, skills, crafting and portals in one place.</p></div>';
    const cash=document.querySelector('.page[data-page="cashshop"] .db-hero');
    if(cash&&!cash.dataset.ownedHero){cash.dataset.ownedHero='1';cash.innerHTML='<div><span class="eyebrow">TOP CLASSIC WORLD</span><h2>Cash Shop</h2><p>Browse the current catalog, prices and availability.</p></div>';}
    const beauty=document.querySelector('.page[data-page="beauty"] .db-hero');
    if(beauty&&!beauty.dataset.ownedHero){beauty.dataset.ownedHero='1';beauty.innerHTML='<div><span class="eyebrow">TOP CLASSIC WORLD</span><h2>Beauty</h2><p>Hair and face styles with exact IDs and artwork.</p></div>';}
  }

  function scrubDynamicCopy(){
    document.querySelectorAll('.visual-section-label').forEach(el=>{
      const t=String(el.textContent||'').trim();
      if(/^COT2\s+needs$/i.test(t))setText(el,'Needs');
      else if(/^COT2\s+rewards$/i.test(t))setText(el,'Rewards');
    });
    document.querySelectorAll('.visual-asset small').forEach(el=>{
      const t=String(el.textContent||'').trim();
      if(/^COT2\s+map$/i.test(t))setText(el,'Map');
      else if(/^COT2\s+monster$/i.test(t))setText(el,'Monster');
    });
    document.querySelectorAll('[title]').forEach(el=>{
      const t=String(el.title||'');
      if(!forbidden.test(t))return;
      el.title=t
        .replace(/current\s+COT2\s+client\s+visual/ig,'game artwork')
        .replace(/current\s+COT2\s+map/ig,'map')
        .replace(/current\s+COT2\s+metadata/ig,'current data')
        .replace(/\bCOT2\b/ig,'')
        .replace(/\bOSMS\b/ig,'')
        .replace(/\s{2,}/g,' ').trim();
    });
    const dbStatus=document.getElementById('db-status');
    if(dbStatus&&forbidden.test(dbStatus.textContent||'')){
      const count=dbStatus.querySelector('b')?.textContent||'';
      dbStatus.innerHTML=count?`<b>${count}</b> matching records · Top Classic World database`:'Top Classic World database';
    }
    document.querySelectorAll('.beta-tag,.status-tag,.evidence-inline').forEach(el=>{
      const text=String(el.textContent||'').trim();
      if(!forbidden.test(text))return;
      if(el.classList.contains('evidence-inline')&&/Recommended planner order/i.test(text)){
        setText(el,'Recommended planner order: Nimble Feet 3 → Three Snails 3 → Recovery 3.');
      }else el.remove();
    });
  }

  function protectPublicPages(){
    const active=document.querySelector('.page.active')?.dataset.page;
    if(['research','data','formulas'].includes(active))document.querySelector('#nav [data-page="dashboard"]')?.click();
  }

  function enhance(){
    document.documentElement.classList.add('top-classic-world-ready','public-source-clean-ready');
    brand();cleanNavigation();cleanStaticSourceChrome();cleanDatabaseHeroes();scrubDynamicCopy();protectPublicPages();
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(enhance,90);}
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true});
  document.addEventListener('click',schedule,true);
  document.addEventListener('change',schedule,true);
  enhance();
})();
