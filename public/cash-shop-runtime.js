  let cashWired=false, cashCatalogPromise=null, cashRenderSequence=0, cashLimit=96;
  const CASH_CATALOG_URL='./cash-shop-catalogs.json?v=__CASH_CATALOG_VERSION__';
  function fetchCashCatalogs(){
    if(!cashCatalogPromise)cashCatalogPromise=fetch(CASH_CATALOG_URL,{cache:'force-cache'}).then(r=>{
      if(!r.ok)throw Error('Cash Shop catalog could not be loaded.');
      return r.json();
    }).catch(error=>{cashCatalogPromise=null;throw error;});
    return cashCatalogPromise;
  }
  function cashDurationTag(duration){
    const kind=duration?.kind||'unknown';
    const label=kind==='permanent'?'PERMANENT':kind==='timed'?`Time-limited · ${duration.text}`:'Duration unconfirmed';
    return `<span class="cash-duration cash-duration-${kind}" data-duration="${kind}">${esc(label)}</span>`;
  }
  function cashOfferAvailable(item,beta){
    return beta?!!item.on_sale&&Number(item.price)>0:!item.sale?.ends||Date.now()<Date.parse(item.sale.ends);
  }
  function cashDate(iso){
    const d=new Date(iso);
    return `${d.getUTCDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()]} ${d.getUTCFullYear()} · ${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')} UTC`;
  }
  function cashCard(item,beta){
    const available=cashOfferAvailable(item,beta);
    const unpriced=beta&&Number(item.price)<=0;
    const prices=(item.prices||[]).map(p=>`<div class="cash-price-row">${p.count>1?`<small>×${esc(p.count)}</small>`:''}${p.originalPrice?`<del>${Number(p.originalPrice).toLocaleString()} ${esc(p.currency)}</del>`:''}<b>${unpriced?'UNAVAILABLE':`${Number(p.price).toLocaleString()} ${esc(p.currency)}`}</b>${cashDurationTag(item.duration)}</div>`).join('');
    const details=[...(item.details||[])];
    if(beta&&unpriced)details.unshift('Not sold in the beta snapshot. Its recorded price is 0; this does not mean free.');
    if(beta&&item.duration?.kind==='unknown')details.push('No sold beta offer establishes this item’s expiry.');
    const sale=beta?(available?'Sold in beta · beta price':'Not sold in beta'):item.sale.ends?`${available?'Sale ends':'Sale ended'} ${cashDate(item.sale.ends)}`:'Sale: until further notice';
    const rewards=(item.rewards||[]).map(reward=>`<li><span>${esc(reward.name)}</span><b>${reward.rate.toFixed(2)}%</b></li>`).join('');
    return `<article class="cash-card cash-offer${beta&&!available?' cash-unavailable':''}" data-cash-id="${esc(item.catalogId||item.id)}" data-cash-catalog="${beta?'beta':'founders-access'}">${item.image?`<img class="cash-offer-art" src="${esc(item.image)}" alt="${esc(item.imageAlt||item.name)}" loading="lazy">`:''}<div class="cash-offer-body"><small class="cash-category-label">${esc(item.category)}${beta?' · Beta Cash Shop':''}</small><h3>${esc(item.name)}</h3><div class="cash-meta">${prices}</div><p class="cash-sale-window">${esc(sale)}</p>${details.length||rewards?`<details class="cash-offer-details"><summary>${rewards?'Details & reward rates':'Details & contents'}</summary>${details.length?`<ul>${details.map(detail=>`<li>${esc(detail)}</li>`).join('')}</ul>`:''}${rewards?`<p>Reward duration: unconfirmed. These are crate rewards, with no separate purchase price.</p><ul class="cash-reward-list">${rewards}</ul><a href="${esc(item.ratesUrl)}" target="_blank" rel="noopener noreferrer">Official reward rates ↗</a>`:''}</details>`:''}${beta?`<code class="cash-item-id">#${esc(item.id)}</code>`:''}</div></article>`;
  }
  async function renderCashShop(){
    const catalogSelect=document.getElementById('cash-catalog'),cat=document.getElementById('cash-category'),input=document.getElementById('cash-search'),sale=document.getElementById('cash-sale-only'),duration=document.getElementById('cash-duration-filter'),status=document.getElementById('cash-status'),results=document.getElementById('cash-results'),note=document.getElementById('cash-catalog-note'),more=document.getElementById('cash-load-more');
    if(!catalogSelect||!cat||!input||!sale||!duration||!status||!results)return;
    if(!cashWired){
      [catalogSelect,cat,input,sale,duration].forEach(el=>el.addEventListener(el===input?'input':'change',()=>{cashLimit=96;renderCashShop();}));
      more.addEventListener('click',()=>{cashLimit+=96;renderCashShop();});
      cashWired=true;
    }
    const sequence=++cashRenderSequence;
    status.setAttribute('aria-busy','true');
    try{
      const data=await fetchCashCatalogs();
      if(sequence!==cashRenderSequence)return;
      const key=catalogSelect.value==='beta'?'beta':'founders-access',beta=key==='beta',catalog=data.catalogs[key];
      if(cat.dataset.catalog!==key){
        const previous=cat.dataset.catalog? 'all':cat.value;
        cat.innerHTML='<option value="all">All categories</option>'+[...new Set(catalog.items.map(i=>i.category))].map(category=>`<option value="${esc(category)}">${esc(category)}</option>`).join('');
        cat.value=[...cat.options].some(o=>o.value===previous)?previous:'all';
        cat.dataset.catalog=key;
      }
      note.innerHTML=beta?'<b>Beta Cash Shop · archived</b><span>Original beta prices and durations. This catalog is kept for reference; it is not the Founder’s Access release shop.</span>':`<b>Founder’s Access · 6 October 2026</b><span>Opens after maintenance. Item expiry is tagged beside each price; sale windows are shown separately. Gifting unlocks at Lv. ${catalog.giftingMinimumLevel}.</span><a href="${esc(catalog.sourceUrl)}" target="_blank" rel="noopener noreferrer">Nexon announcement ↗</a>`;
      const query=input.value.trim().toLowerCase();
      const rows=catalog.items.filter(item=>(cat.value==='all'||item.category===cat.value)&&(!sale.checked||cashOfferAvailable(item,beta))&&(duration.value==='all'||item.duration.kind===duration.value)&&(!query||[item.name,item.category,...(item.details||[]),...(item.rewards||[]).map(r=>r.name)].join(' ').toLowerCase().includes(query)));
      status.innerHTML=`<b>${rows.length.toLocaleString()}</b> ${beta?'beta entries':'release offers'} · ${esc(catalog.label)}${rows.length>cashLimit?` · showing ${cashLimit}`:''}`;
      results.innerHTML=rows.slice(0,cashLimit).map(item=>cashCard(item,beta)).join('')||'<div class="db-empty">No matching Cash Shop items.</div>';
      more.hidden=rows.length<=cashLimit;
      more.textContent=`Show more (${Math.max(0,rows.length-cashLimit).toLocaleString()} remaining)`;
      document.documentElement.classList.add('cash-shop-catalogs-ready');
      results.dataset.catalog=key;
      hookImageFallback(results);
    }catch(error){
      if(sequence!==cashRenderSequence)return;
      status.innerHTML=`<span class="db-error">${esc(error.message)}</span>`;results.innerHTML='';more.hidden=true;
    }finally{if(sequence===cashRenderSequence)status.setAttribute('aria-busy','false');}
  }
  window.TCW_CASH_SHOP={restore:async controls=>{
    const catalog=document.getElementById('cash-catalog');
    catalog.value=controls['cash-catalog']==='beta'?'beta':'founders-access';
    await renderCashShop();
    for(const id of ['cash-category','cash-search','cash-duration-filter']){
      if(controls[id]!==undefined)document.getElementById(id).value=controls[id];
    }
    cashLimit=96;
    await renderCashShop();
  }};
