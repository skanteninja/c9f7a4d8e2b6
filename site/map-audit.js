(() => {
  const $=id=>document.getElementById(id);
  let records=[],limit=100;
  function render(){
    const needle=$('search').value.trim().toLowerCase(),status=$('status').value;
    const matches=records.filter(r=>(status==='all'||r.status===status)&&(!needle||[r.name,r.region,r.reason,r.ref].join(' ').toLowerCase().includes(needle)));
    $('rows').replaceChildren();
    for(const r of matches.slice(0,limit)){
      const tr=document.createElement('tr');
      const cell=(text,small)=>{const td=document.createElement('td');td.textContent=text;if(small){const s=document.createElement('small');s.textContent=small;td.append(s);}tr.append(td);return td;};
      cell(r.name,r.street);cell(r.region,r.source==='current'?'Classic / OSMS':'GMS v83');
      cell(r.status==='kept'?'Kept':r.status==='replaced'?'Linked to Classic':'Removed',r.reason).className=r.status;
      const linkCell=cell('');
      if(r.link){const a=document.createElement('a');a.href=r.link;a.textContent=r.status==='replaced'?'Open replacement':'Open map';linkCell.append(a);}else linkCell.textContent='No verified layout';
      $('rows').append(tr);
    }
    $('count').textContent=`Showing ${Math.min(limit,matches.length)} of ${matches.length} matching source records`;
    $('more').hidden=limit>=matches.length;$('more').textContent=`Show more (${Math.max(0,matches.length-limit)} remaining)`;
  }
  $('search').addEventListener('input',()=>{limit=100;render();});$('status').addEventListener('change',()=>{limit=100;render();});$('more').addEventListener('click',()=>{limit+=100;render();});
  fetch('/map-audit.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Review unavailable');return r.json();}).then(data=>{
    records=data.records;$('summary').textContent=data.summary;$('method').textContent=data.method;render();
  }).catch(()=>{$('summary').textContent='';$('error').hidden=false;$('error').textContent='The review could not be loaded. Please reload this page.';});
})();
