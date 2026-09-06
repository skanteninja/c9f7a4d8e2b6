module.exports = function(app) {
  app = app.replace(/    const l=currentLevelRow\(\)\|\|\{\};\n    document\.getElementById\('level-detail'\)[\s\S]*?\n    <\/div>`;/, '');
  app = app.replaceAll("'quest-region','quest-relevant','quest-available'", "'quest-region','quest-available'")
    .replace("const relevant=document.getElementById('quest-relevant').checked;", 'const relevant=false;');
  app = app.replace(/        <details><summary>Full metadata<\/summary>[\s\S]*?<\/details>/, '')
    .replace("${row.id!==undefined?`<code>#${esc(row.id)}</code>`:''}", '')
    .replace('<article class="db-card">', '<article class="db-card" data-record-id="${esc(row.id??\'\')}">')
    .replace("||`ID ${row.id??'—'}`", "||'Unnamed record'");
  app = app.replace("const facts=recordFacts(row);", "const facts=recordFacts(row).filter(([k,v])=>!/(?:^|[ _])(?:id|hash|url|source|provider|thumbnail|gif)(?:$|[ _])/i.test(k)&&!/^\\d{6,}$/.test(String(v)));");
  app = app.replace("if(q) rows=rows.filter(r=>searchableRecord(r).includes(q));", "if(q) rows=rows.filter(r=>window.TCW_JOB_SEARCH ? window.TCW_JOB_SEARCH.matches(r,q,key) : searchableRecord(r).includes(q));");
  app = app.replace('  function setPage(p,persist=true){', '  window.TCW_NAV={setPage};\n  function setPage(p,persist=true){');
  return app;
};
