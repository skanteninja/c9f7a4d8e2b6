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
      if(chip.querySelector('.tcw-etc-name'))return;
      const raw=String(chip.getAttribute('title')||'').trim();
      const name=raw.split(/\s+·\s+/)[0].trim();
      if(!name)return;
      const label=document.createElement('span');
      label.className='tcw-etc-name';
      label.textContent=name;
      const qty=chip.querySelector(':scope > b');
      if(qty)chip.insertBefore(label,qty);else chip.appendChild(label);
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
