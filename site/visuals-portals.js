(() => {
  const RAW='/game-data/data/current/';
  let mapsPromise=null,portalsPromise=null,timer=null;
  const norm=v=>String(v??'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function collectMaps(value,out=[]){
    if(Array.isArray(value)){value.forEach(v=>collectMaps(v,out));return out;}
    if(!value||typeof value!=='object')return out;
    if(value.id!==undefined&&(value.name||value.map_name))out.push(value);
    Object.values(value).forEach(v=>{if(v&&typeof v==='object')collectMaps(v,out);});return out;
  }
  function maps(){
    if(!mapsPromise)mapsPromise=fetch(`${RAW}maps.json`,{cache:'force-cache'}).then(r=>r.ok?r.json():null).then(data=>{
      const rows=collectMaps(data||{}),byId=new Map(),byName=new Map();
      rows.forEach(row=>{const id=Number(row.id),name=norm(row.name||row.map_name);if(Number.isFinite(id)&&!byId.has(id))byId.set(id,row);if(name&&!byName.has(name))byName.set(name,row);});
      return{rows,byId,byName,names:[...byName.keys()].sort((a,b)=>b.length-a.length)};
    }).catch(()=>({rows:[],byId:new Map(),byName:new Map(),names:[]}));
    return mapsPromise;
  }
  function portals(){if(!portalsPromise)portalsPromise=fetch(`${RAW}portals.json`,{cache:'force-cache'}).then(r=>r.ok?r.json():{}).catch(()=>({}));return portalsPromise;}
  function mapUrl(id){const n=Number(id);return Number.isFinite(n)?`${RAW}images/maps/${String(Math.trunc(n)).padStart(9,'0')}.png`:'';}
  function mapName(row,id){return row?.name||row?.map_name||`Map ${id}`;}
  function mapNode(row,id,label){
    const node=document.createElement('div');node.className='visual-portal-map';
    const im=document.createElement('img');im.src=mapUrl(id);im.alt=mapName(row,id);im.loading='lazy';im.decoding='async';im.addEventListener('error',()=>im.remove());
    const text=document.createElement('span');text.innerHTML=`<small>${esc(label)}</small><b>${esc(mapName(row,id))}</b><code>#${esc(String(id))}</code>`;node.append(im,text);return node;
  }
  function portalNode(portal){
    const node=document.createElement('div');node.className='visual-portal-node';
    node.innerHTML=`<span>⇢</span><div><small>PORTAL</small><b>${esc(portal.name||`#${portal.id}`)}</b><em>type ${esc(portal.type)} · ${esc(portal.x)}, ${esc(portal.y)}</em></div><span>⇢</span>`;return node;
  }
  function sourceKey(card){
    const group=card.querySelector('.db-card-title small')?.textContent?.trim()||'';
    const m=group.match(/\b(\d{9})\b/);return m?.[1]||'';
  }
  function portalId(card){const raw=card.dataset.recordId || card.querySelector('code')?.textContent?.replace(/\D/g,'');const n=Number(raw);return Number.isFinite(n)?n:null;}

  async function enhancePortalDb(){
    if(document.getElementById('db-dataset')?.value!=='portals')return;
    const cards=[...document.querySelectorAll('#db-results .db-card')];if(!cards.length)return;
    const [mapIdx,portalData]=await Promise.all([maps(),portals()]);
    cards.forEach(card=>{
      if(card.querySelector('.visual-portal-flow'))return;
      const key=sourceKey(card),pid=portalId(card);if(!key||pid==null)return;
      const portal=(portalData[key]||[]).find(p=>Number(p.id)===pid);if(!portal)return;
      const sourceId=Number(key),destId=Number(portal.dest_map),source=mapIdx.byId.get(sourceId),dest=mapIdx.byId.get(destId);
      const flow=document.createElement('div');flow.className='visual-portal-flow';
      flow.appendChild(mapNode(source,sourceId,'Source map'));
      flow.appendChild(portalNode(portal));
      if(Number.isFinite(destId)&&destId!==999999999)flow.appendChild(mapNode(dest,destId,portal.intra_map?'Intra-map target':'Destination'));
      else{const end=document.createElement('div');end.className='visual-portal-special';end.innerHTML='<small>DESTINATION</small><b>Script / special portal</b><span>No normal destination map in client metadata</span>';flow.appendChild(end);}
      card.appendChild(flow);
    });
  }

  function matchMaps(idx,text,limit=3){const hay=` ${norm(text)} `,out=[];for(const name of idx.names){if(name.length<5)continue;if(hay.includes(` ${name} `)||hay.includes(name)){const row=idx.byName.get(name);if(row&&!out.some(x=>Number(x.id)===Number(row.id)))out.push(row);if(out.length>=limit)break;}}return out;}
  async function enhanceRouteNeighbors(){
    const cards=[...document.querySelectorAll('#route-cards .route-card')];if(!cards.length)return;
    const [idx,portalData]=await Promise.all([maps(),portals()]);
    cards.forEach(card=>{
      if(card.querySelector('.visual-route-neighbors'))return;
      const text=card.textContent||'';const matched=matchMaps(idx,text,1);if(!matched.length)return;
      const source=matched[0],key=String(Math.trunc(Number(source.id))).padStart(9,'0');
      const seen=new Set();const dests=(portalData[key]||[]).map(p=>Number(p.dest_map)).filter(id=>Number.isFinite(id)&&id!==999999999&&id!==Number(source.id)&&!seen.has(id)&&seen.add(id)).map(id=>idx.byId.get(id)).filter(Boolean).slice(0,4);
      if(!dests.length)return;
      const strip=document.createElement('div');strip.className='visual-route-neighbors';const label=document.createElement('small');label.textContent='PORTAL NEIGHBORS';strip.appendChild(label);
      const flow=document.createElement('div');flow.className='visual-route-neighbor-flow';flow.appendChild(mapNode(source,source.id,'Training map'));
      dests.forEach(dest=>{const arrow=document.createElement('i');arrow.textContent='→';flow.appendChild(arrow);flow.appendChild(mapNode(dest,dest.id,'Neighbor'));});strip.appendChild(flow);card.appendChild(strip);
    });
  }

  async function enhance(){document.documentElement.classList.add('visual-portal-layer-ready');await Promise.allSettled([enhancePortalDb(),enhanceRouteNeighbors()]);}
  function schedule(){clearTimeout(timer);timer=setTimeout(enhance,120);}
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});document.addEventListener('click',schedule,true);document.addEventListener('change',schedule,true);document.addEventListener('input',schedule,true);enhance();
})();

