module.exports=function(app){
 const helper=`  function potionCatalog(){return Array.isArray(D.potionRecommendations?.items)?D.potionRecommendations.items:[];}
  function potionItem(id){return potionCatalog().find(item=>String(item.id)===String(id));}
  function potionPlan(){return D.potionRecommendations?.builds?.[activeBuild()?.id]||{};}
  function potionTier(kind){
    const rows=Array.isArray(potionPlan()[kind])?potionPlan()[kind]:[];
    return rows.find(row=>Number(state.level)>=Number(row.min||1)&&Number(state.level)<=Number(row.max||999))||rows.at(-1)||{};
  }
  function potionImage(item){
    if(!item||!item.icon)return '<span class="potion-icon-fallback" aria-hidden="true">?</span>';
    return '<img src="'+esc(item.icon)+'" alt="'+esc(item.name)+' icon" width="42" height="42">';
  }
  function potionEffect(item,kind){return item&&Number(item[kind]||0)>0?'+'+Number(item[kind])+' '+kind.toUpperCase():'';}
  function potionEfficiency(item,kind){return Number(item?.efficiency||0).toFixed(3)+' '+kind.toUpperCase()+'/meso';}
  function potionMeta(item,kind){return potionEffect(item,kind)+' · '+Number(item?.shopPrice||0)+' mesos · '+potionEfficiency(item,kind);}
  function potionOptionMarkup(item,kind,recommended,reason){
    if(!item)return '';
    return '<article class="potion-option-card '+(recommended?'recommended':'')+'"><div class="potion-option-icon">'+potionImage(item)+'</div><div class="potion-option-copy"><div class="potion-option-top"><strong>'+esc(item.name)+'</strong><span class="potion-category">'+esc(item.category||'Consumable')+'</span></div><p>'+esc(item.restoreLabel||potionEffect(item,kind))+'</p><small>'+esc(potionMeta(item,kind))+'</small>'+(reason?'<p class="potion-reason">'+esc(reason)+'</p>':'')+'</div>'+(recommended?'<span class="highly-recommended-badge">HIGHLY RECOMMENDED</span>':'')+'</article>';
  }
  function renderRecommendedPotions(root){
    if(!root)return;
    const grid=root.querySelector('.slot-grid');if(!grid)return;
    let slots=root.querySelector('.equipment-pot-slots');
    if(!slots){
      slots=document.createElement('div');
      slots.className='equipment-pot-slots';
      slots.setAttribute('aria-label','Recommended pots');
      grid.insertAdjacentElement('afterend',slots);
    }
    const kinds=['hp','mp'];
    slots.innerHTML=kinds.map(kind=>{
      const tier=potionTier(kind),item=potionItem(tier.recommendedId),label=kind.toUpperCase();
      if(!item)return '<button class="gear-slot equipment-pot-slot equipment-pot-slot-'+kind+'" type="button" disabled aria-label="No '+label+' potion recommendation available"><span class="slot-name">'+label+'</span></button>';
      const detail=(item.restoreLabel||potionEffect(item,kind))+' · '+Number(item.shopPrice||0).toLocaleString()+' mesos · '+potionEfficiency(item,kind);
      return '<button class="gear-slot equipment-pot-slot equipment-pot-slot-'+kind+'" type="button" data-potion-type="'+kind+'" aria-label="Open '+label+' potion recommendations. Recommended '+esc(item.name)+'. '+esc(detail)+'" title="'+esc(label+' · '+item.name+' · '+detail)+'">'+potionImage(item)+'<span class="slot-name">'+label+'</span></button>';
    }).join('');
    slots.querySelectorAll('[data-potion-type]').forEach(button=>button.addEventListener('click',()=>openPotionModal(button.dataset.potionType)));
    hookImageFallback(slots);
  }
  function renderPotionOptions(kind){
    const modal=document.getElementById('potion-modal'),feature=document.getElementById('potion-modal-feature'),optionsRoot=document.getElementById('potion-options');
    if(!modal||!feature||!optionsRoot)return;
    const tier=potionTier(kind),recommended=potionItem(tier.recommendedId),label=kind.toUpperCase();
    const profile=activeBuild()||{};
    document.getElementById('potion-modal-title').textContent=label+' Pots · Level '+Number(state.level||1);
    document.getElementById('potion-modal-copy').textContent=(profile.name||'Current build')+' uses a level-aware plan: raw '+label+' per meso early, then larger refills when fewer presses are worth the trade.';
    feature.innerHTML=recommended?potionOptionMarkup(recommended,kind,true,tier.reason):'<div class="potion-empty">No primary recommendation is available for this level.</div>';
    const alternatives=potionCatalog().filter(item=>Number(item[kind]||0)>0&&(!recommended||String(item.id)!==String(recommended.id))).sort((a,b)=>Number(b[kind]||0)-Number(a[kind]||0)||Number(b.efficiency||0)-Number(a.efficiency||0));
    optionsRoot.innerHTML=alternatives.length?alternatives.map(item=>potionOptionMarkup(item,kind,false,item.notes||'')).join(''):'<div class="potion-empty">No alternate shop items are listed for this resource.</div>';
    hookImageFallback(modal);
  }
  function openPotionModal(kind){
    if(kind!=='hp'&&kind!=='mp')return;
    renderPotionOptions(kind);
    const modal=document.getElementById('potion-modal');if(!modal)return;
    modal.classList.add('open');modal.setAttribute('aria-hidden','false');
  }
  function closePotionModal(){
    const modal=document.getElementById('potion-modal');if(!modal)return;
    modal.classList.remove('open');modal.setAttribute('aria-hidden','true');
  }
`;
 if(!app.includes('  function renderEquipment(windowId,summaryId){'))throw Error('recommended potion render target missing');
 app=app.replace('  function renderEquipment(windowId,summaryId){',helper+'  function renderEquipment(windowId,summaryId){');
 const renderNeedle='    hookImageFallback(root);renderBuildSummary(summaryId);';
 if(!app.includes(renderNeedle))throw Error('recommended potion refresh target missing');
 app=app.replace(renderNeedle,'    hookImageFallback(root);renderBuildSummary(summaryId);renderRecommendedPotions(root);');
 const listenerNeedle="  document.querySelectorAll('[data-close-modal]').forEach(x=>x.addEventListener('click',closeModal));";
 if(!app.includes(listenerNeedle))throw Error('recommended potion listener target missing');
 app=app.replace(listenerNeedle,listenerNeedle+"\n  document.querySelectorAll('[data-close-potion]').forEach(x=>x.addEventListener('click',closePotionModal));\n  document.getElementById('potion-modal-close')?.addEventListener('click',closePotionModal);\n  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById('potion-modal')?.classList.contains('open'))closePotionModal();});");
 return app;
};
