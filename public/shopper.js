(() => {
  'use strict';
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>Number(n).toLocaleString(undefined,{maximumFractionDigits:2});
  const date=value=>new Date(value).toLocaleString();
  const time=value=>`<time datetime="${escape(value)}" title="${escape(new Date(value).toISOString())}">${escape(date(value))}</time>`;
  let catalog=[],selected=null,activeView='dashboard',timer,requestId=0,ws,reconnect,refreshing=false;
  const labels={reqLevel:'Required level',reqSTR:'Required STR',reqDEX:'Required DEX',reqINT:'Required INT',reqLUK:'Required LUK',reqJob:'Job flags',incSTR:'STR',incDEX:'DEX',incINT:'INT',incLUK:'LUK',incPAD:'Weapon attack',incMAD:'Magic attack',incPDD:'Weapon defense',incMDD:'Magic defense',incMHP:'HP',incMMP:'MP',incACC:'Accuracy',incEVA:'Evasion',incSpeed:'Speed',incJump:'Jump',tuc:'Upgrade slots',attackSpeed:'Attack speed tier',quest:'Quest item',tradeBlock:'Untradeable',only:'Unique',cash:'Cash item'};
  function itemImage(item,cls='market-item-icon'){return `<img class="${cls}" src="/game-media/icons/${item.id}" alt="${escape(item.name)}" loading="lazy">`;}
  function builds(){
    const root=document.getElementById('dashboard-builds'),data=window.GUIDE_DATA?.catalog;
    if(!root||!data)return;
    root.innerHTML=(data.builds||[]).filter(b=>b.status==='active').map(b=>`<a class="market-build-card" href="?build=${encodeURIComponent(b.id)}&page=dashboard" data-build-select="${escape(b.id)}"><img src="/assets/class-themes/${({warrior:'perion',archer:'henesys',magician:'ellinia',bowman:'henesys'}[b.classId]||'ellinia')}.webp" alt="" loading="lazy"><div><span class="eyebrow">Lv ${b.levelMin||1}–${b.levelMax||70}</span><h3>${escape(b.name)}</h3><p>${escape(b.weaponPath||b.subtitle||'Skills, equipment and progression')}</p><strong>Open build →</strong></div></a>`).join('');
  }
  function setStatus(message,kind=''){document.querySelectorAll('[data-market-status]').forEach(el=>{el.textContent=message;el.dataset.state=kind;});}
  function scopeParams(root){
    const params=new URLSearchParams();
    for(const name of ['server','world','channel','room','age','sort']){const value=root?.querySelector(`[data-market-filter="${name}"]`)?.value;if(value)params.set(name,value);}
    return params;
  }
  function listingCard(row){
    const item=catalog.find(i=>i.id===row.itemId)||{id:row.itemId,name:row.name};
    const stats=Object.entries(row.stats||{}).map(([k,v])=>`${escape(k)} ${escape(v)}`).join(' · ');
    return `<article class="market-listing"><div class="market-listing-top">${itemImage(item)}<div><button class="market-item-link" type="button" data-market-item="${row.itemId}">${escape(item.name)}</button><small>${escape(item.category||'')} · #${row.itemId}</small></div><div class="market-listing-price"><strong>${money(row.unitPrice)} <small>mesos / item</small></strong><span>${row.priceBasis==='bundle'?`${money(row.price)} / bundle`:'Unit price'} · quantity ${money(row.quantity)}</span></div></div><dl class="market-listing-meta"><div><dt>Seller</dt><dd>${escape(row.seller)}</dd></div><div><dt>Location</dt><dd>CH ${row.channel} · FM ${row.room} · slot ${row.slot}</dd></div><div><dt>Server / world</dt><dd>${escape(row.server)} / ${escape(row.world)}</dd></div><div><dt>Shop</dt><dd>${escape(row.shop)}</dd></div><div><dt>Last seen</dt><dd>${time(row.lastSeen)}</dd></div><div><dt>First seen</dt><dd>${time(row.firstSeen)}</dd></div></dl>${item.category==='Equipment'?`<p class="market-observed-stats">${row.statsKnown?`Observed stats: ${stats||'No bonus stats recorded'}`:'Equipment stats not recorded — compare the tooltip before buying.'}</p>`:''}<div class="market-listing-footer"><small>Scanned by ${escape(row.contributor)} · availability may have changed</small><button class="mini-btn" type="button" data-offer-history="${escape(row.id)}">Observations</button>${row.evidence?`<a class="mini-btn" href="/api/market/evidence?offerId=${encodeURIComponent(row.id)}" target="_blank" rel="noopener">View scan</a>`:''}</div><div data-history-for="${escape(row.id)}" hidden></div></article>`;
  }
  async function getListings(params){
    const response=await fetch('/api/market/listings?'+params,{cache:'no-store'});
    if(!response.ok)throw new Error('Market unavailable');
    return response.json();
  }
  function detailMarkup(item){
    const stats=Object.entries(item.stats||{}).filter(([k])=>!['icon','iconRaw'].includes(k));
    const extra=Object.entries(item).filter(([k,v])=>!['id','name','stats','category','description','icon','price','icon_url','icon_path'].includes(k)&&v!=null&&typeof v!=='object');
    return `<div class="market-detail-head">${itemImage(item,'market-detail-icon')}<div><span class="eyebrow">${escape(item.category)} · #${item.id}</span><h3>${escape(item.name)}</h3><p>${escape([item.sub_category,item.weapon_type,item.req_job_label].filter(Boolean).join(' · '))}</p></div><button class="mini-btn" type="button" data-market-clear>Close item</button></div>${item.description?`<p class="market-item-description">${escape(item.description)}</p>`:''}<div class="market-stat-grid">${stats.map(([k,v])=>`<div><small>${escape(labels[k]||k)}</small><b>${escape(typeof v==='object'?JSON.stringify(v):v)}</b></div>`).join('')}${item.price!=null?`<div><small>Catalog NPC price</small><b>${money(item.price)} mesos</b></div>`:''}</div>${extra.length?`<details class="market-extra"><summary>More item details</summary><dl>${extra.map(([k,v])=>`<div><dt>${escape(k.replaceAll('_',' '))}</dt><dd>${escape(v)}</dd></div>`).join('')}</dl></details>`:''}<p class="market-note">Catalog stats are base values. Individual equipment listings can have different stats.</p><div class="market-section-title"><h3>Latest listings</h3><button class="mini-btn" type="button" data-open-shopper="${item.id}">Compare in SHOPPER →</button></div><p class="market-note">Recent observations, grouped by their server and world. Each offer may have changed since its scan.</p><div data-item-listings><p class="market-empty">Loading recent listings…</p></div>`;
  }
  async function showItem(id,view=activeView){
    selected=catalog.find(item=>item.id===Number(id));if(!selected)return;
    activeView=view;const root=document.getElementById(view+'-item-detail');if(!root)return;
    root.hidden=false;if(root.dataset.itemId!==String(selected.id)){root.innerHTML=detailMarkup(selected);root.dataset.itemId=String(selected.id);}
    const current=selected.id,params=scopeParams(document.querySelector('section[data-page="shopper"]'));
    params.set('itemId',current);params.set('sort','newest');params.set('limit','12');
    const results=root.querySelector('[data-item-listings]');
    try{const data=await getListings(params);if(root.dataset.itemId!==String(current))return;const signature=JSON.stringify(data.listings);if(results.dataset.signature===signature)return;results.dataset.signature=signature;results.innerHTML=data.listings.length?data.listings.map(listingCard).join(''):'<p class="market-empty">No recent scans for this item yet. Listings appear here when a contributor publishes a scan.</p>';}
    catch{if(root.dataset.itemId===String(current))results.innerHTML='<p class="market-empty">Listings are temporarily unavailable. Item details remain available.</p>';}
  }
  function search(view){
    const input=document.getElementById(view+'-database-search'),root=document.getElementById(view+'-search-results');
    if(!input||!root)return;const q=input.value.trim().toLowerCase();
    if(!q){root.innerHTML='';root.hidden=true;return;}
    root.hidden=false;if(!catalog.length){root.innerHTML='<p class="market-empty">Item catalog is loading…</p>';return;}
    const words=q.split(/\s+/);const matches=catalog.filter(i=>String(i.id)===q||words.every(w=>i.name.toLowerCase().includes(w))).sort((a,b)=>(a.name.toLowerCase()===q?-1:b.name.toLowerCase()===q?1:0)||a.name.localeCompare(b.name));
    root.innerHTML=matches.length?`<p class="market-result-count">${matches.length} items${matches.length>40?' · showing the first 40':''}</p><div class="market-search-grid">${matches.slice(0,40).map(item=>`<button class="market-search-item" data-market-item="${item.id}" data-market-view="${view}" type="button">${itemImage(item)}<span><b>${escape(item.name)}</b><small>${escape(item.category)} · #${item.id}${item.stats?.reqLevel?` · Lv ${item.stats.reqLevel}`:''}</small></span><span aria-hidden="true">→</span></button>`).join('')}</div>`:'<p class="market-empty">No matching item. Try a shorter name or an item ID.</p>';
  }
  let shopperLimit=40;
  async function refreshShopper(){
    const root=document.querySelector('section[data-page="shopper"]'),results=document.getElementById('shopper-listings');if(!root||!results)return;
    const id=++requestId,params=scopeParams(root),q=document.getElementById('shopper-database-search').value.trim();
    if(q)params.set('q',q);params.set('limit',shopperLimit);
    try{
      const data=await getListings(params);if(id!==requestId)return;
      document.getElementById('shopper-count').textContent=`${data.total} matching offer${data.total===1?'':'s'}`;
      const signature=JSON.stringify(data.listings);if(results.dataset.signature!==signature){results.dataset.signature=signature;results.innerHTML=data.listings.length?data.listings.map(listingCard).join(''):'<div class="market-empty"><h3>No matching shop scans yet</h3><p>Published scans from you and your friend will appear here, with each offer’s price and timestamp.</p></div>';}
      document.getElementById('shopper-more').hidden=data.total<=data.listings.length||shopperLimit>=100;
      document.getElementById('shopper-refreshed').textContent=`Updated ${new Date().toLocaleTimeString()}`;
    }catch{if(id===requestId)results.innerHTML='<p class="market-empty">Shared listings are temporarily unavailable. Please retry shortly.</p>';}
  }
  async function refresh(){
    if(refreshing||document.hidden)return;refreshing=true;
    try {
      const response=await fetch('/api/market/status',{cache:'no-store'});if(!response.ok)throw new Error();
      const data=await response.json();
      if(!ws||ws.readyState!==WebSocket.OPEN)setStatus('Refreshing every 5 seconds','polling');
      const badge=document.getElementById('dashboard-market-count');if(badge)badge.textContent=`${data.count.toLocaleString()} scanned offers`;
      for(const name of ['server','world']) {
        const select=document.querySelector(`[data-market-filter="${name}"]`),values=[...new Set(data.scopes.map(s=>s[name]))];
        for(const value of values)if(!Array.from(select.options).some(o=>o.value===value)){const option=document.createElement('option');option.value=value;option.textContent=value;select.append(option);}
      }
      const page=document.querySelector('.page.active')?.dataset.page;
      if(page==='shopper')await refreshShopper();
      if(selected&&['dashboard','shopper'].includes(page))await showItem(selected.id,page);
    }catch{setStatus('Market connection unavailable','offline');}
    finally{refreshing=false;}
  }
  function connect(){
    clearTimeout(reconnect);if(document.hidden)return;
    const url=new URL('/api/market/live',location.href);url.protocol=location.protocol==='https:'?'wss:':'ws:';
    try{
      ws=new WebSocket(url);
      ws.onopen=()=>{setStatus('Live updates connected','live');refresh();};
      ws.onmessage=e=>{try{if(JSON.parse(e.data).type==='listings-updated')refresh();}catch{}};
      ws.onclose=()=>{setStatus('Refreshing every 5 seconds','polling');reconnect=setTimeout(connect,10000);};
      ws.onerror=()=>ws.close();
    }catch{setStatus('Refreshing every 5 seconds','polling');}
  }
  document.addEventListener('input',event=>{
    if(!['dashboard-database-search','shopper-database-search'].includes(event.target.id))return;
    clearTimeout(timer);timer=setTimeout(()=>{const view=event.target.id.startsWith('dashboard')?'dashboard':'shopper';activeView=view;search(view);if(view==='shopper'){shopperLimit=40;refreshShopper();}},160);
  });
  document.addEventListener('change',event=>{if(event.target.matches('[data-market-filter]')){shopperLimit=40;refreshShopper();if(selected)showItem(selected.id,'shopper');}});
  document.addEventListener('click',async event=>{
    const button=event.target.closest('[data-market-item],[data-market-clear],[data-open-shopper],[data-offer-history]');if(!button)return;
    if(button.hasAttribute('data-market-item')){activeView=button.dataset.marketView||document.querySelector('.page.active')?.dataset.page||'dashboard';showItem(button.dataset.marketItem,activeView);}
    if(button.hasAttribute('data-market-clear')){const root=button.closest('.market-item-detail');root.hidden=true;root.dataset.itemId='';selected=null;}
    if(button.hasAttribute('data-open-shopper')){window.TCW_NAV?.setPage('shopper');const item=catalog.find(i=>i.id===Number(button.dataset.openShopper));document.getElementById('shopper-database-search').value=item.name;search('shopper');showItem(item.id,'shopper');refreshShopper();}
    if(button.hasAttribute('data-offer-history')){
      const root=button.closest('.market-listing').querySelector('[data-history-for]');root.hidden=!root.hidden;if(root.hidden)return;
      root.textContent='Loading observations…';
      try{const r=await fetch('/api/market/history?offerId='+encodeURIComponent(button.dataset.offerHistory),{cache:'no-store'});if(!r.ok)throw new Error();const data=await r.json();root.innerHTML='<ul class="market-observations">'+data.observations.map(row=>`<li>${time(row.observedAt)} · ${escape(row.name)} · ${money(row.price)} mesos / ${row.priceBasis} · qty ${row.quantity} · ${escape(row.contributor)} · ${escape(row.shop)} · CH ${row.channel} / FM ${row.room}</li>`).join('')+'</ul>';}catch{root.textContent='Observation history is temporarily unavailable.';}
    }
  });
  document.getElementById('shopper-more')?.addEventListener('click',()=>{shopperLimit=Math.min(100,shopperLimit+30);refreshShopper();});
  document.getElementById('shopper-refresh')?.addEventListener('click',refresh);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){refresh();if(!ws||ws.readyState>1)connect();}else if(ws)ws.close();});
  const pageObserver=new MutationObserver(()=>{const page=document.querySelector('.page.active')?.dataset.page;if(page==='shopper'&&activeView!=='shopper'){activeView='shopper';refreshShopper();}});
  document.querySelectorAll('.page').forEach(page=>pageObserver.observe(page,{attributes:true,attributeFilter:['class']}));
  builds();
  fetch('/item-catalog.json').then(r=>{if(!r.ok)throw new Error();return r.json();}).then(data=>{
    catalog=data.items;window.TCW_MARKET={catalog,showItem,refresh};
    search('dashboard');search('shopper');refresh();connect();
    document.documentElement.classList.add('shopper-ready');
  }).catch(()=>{for(const view of ['dashboard','shopper']){const root=document.getElementById(view+'-search-results');root.hidden=false;root.textContent='Item database could not load. Please refresh.';}});
  setInterval(refresh,5000);
})();
