(() => {
  let restoring=false,ready=false,timer;
  const controlIds=['db-dataset','db-search','maps-explorer-search','maps-explorer-continent','maps-continent-search','quest-search','quest-priority','quest-region','etc-search','cash-search','cash-category'];
  function snapshot(){
    const page=document.querySelector('.page.active')?.dataset.page||'dashboard';
    const controls={};for(const id of controlIds){const el=document.getElementById(id);if(el?.closest('.page')?.dataset.page===page)controls[id]=el.value;}
    const m=window.TCW_MAPS?.state;
    return {tcw:true,page,controls,map:page==='maps'&&m?{view:m.view,continent:m.continent,selected:m.selected,returnView:m.returnView,returnContinent:m.returnContinent,explorerLimit:m.explorerLimit}:null};
  }
  function urlFor(s){const u=new URL(location.href);u.search='';u.hash='';u.searchParams.set('page',s.page);if(s.map){u.searchParams.set('view',s.map.view);if(s.map.continent)u.searchParams.set('continent',s.map.continent);if(s.map.view==='detail'&&s.map.selected)u.searchParams.set('map',s.map.selected);}for(const [k,v] of Object.entries(s.controls))if(v)u.searchParams.set(k,v);return u.pathname+u.search;}
  function capture(){if(restoring||!ready)return;const s=snapshot();if(JSON.stringify(s)!==JSON.stringify(history.state))history.pushState(s,'',urlFor(s));}
  function schedule(){if(timer)return;timer=setTimeout(()=>{timer=null;capture();},180);}
  async function restore(s){
    if(!s?.tcw)return;restoring=true;clearTimeout(timer);timer=null;
    try{
      if(s.page==='maps')await window.TCW_MAPS.restore(s.map||{view:'world'},s.controls||{});
      else{window.TCW_NAV.setPage(s.page);for(const [id,value] of Object.entries(s.controls||{})){const el=document.getElementById(id);if(el){el.value=value;el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));}}}
    }finally{restoring=false;}
  }
  window.addEventListener('popstate',e=>restore(e.state));
  new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});
  document.addEventListener('input',schedule);document.addEventListener('change',schedule);document.addEventListener('click',schedule);
  const start=setInterval(async()=>{if(!window.TCW_NAV||!window.TCW_MAPS?.state.loaded)return;clearInterval(start);const u=new URL(location.href);let s=history.state;
    if(!s?.tcw&&u.searchParams.has('page'))s={tcw:true,page:u.searchParams.get('page'),map:{view:u.searchParams.get('view')||'world',continent:u.searchParams.get('continent'),selected:u.searchParams.get('map'),returnView:'explorer'},controls:Object.fromEntries(controlIds.filter(k=>u.searchParams.has(k)).map(k=>[k,u.searchParams.get(k)]))};
    if(s?.tcw)await restore(s);ready=true;const initial=snapshot();history.replaceState(initial,'',urlFor(initial));
  },100);
})();
