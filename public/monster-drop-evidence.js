(() => {
  const normal = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

  /*
   * Classic-only drop evidence registry.
   *
   * Important: the current client export has no server-side monster drop table.
   * Entries belong here only when a Classic World-specific source explicitly
   * documents the monster -> item relationship. Older v83/GMS drop tables are
   * intentionally excluded from this registry.
   *
   * Status meanings:
   *   community-documented = explicitly documented by a current Classic World
   *                          source, but not an official server drop-table dump.
   *   player-confirmed     = direct Classic World player observation that has
   *                          passed our review threshold.
   *   official-confirmed   = Nexon/official Classic World evidence.
   */
  const rows = [
    {
      monster: 'Snail',
      item: 'Snail Shell',
      status: 'community-documented',
      sourceType: 'classic-community',
      source: 'MapleClassic Wiki · Getting started',
      sourceUrl: 'https://mapleclassic.wiki/wiki/Getting_started',
      checked: '2026-09-05',
      note: 'Classic World guide explicitly states that Snail and Blue Snail drop snail shells used by Three Snails.'
    },
    {
      monster: 'Blue Snail',
      item: 'Blue Snail Shell',
      status: 'community-documented',
      sourceType: 'classic-community',
      source: 'MapleClassic Wiki · Getting started',
      sourceUrl: 'https://mapleclassic.wiki/wiki/Getting_started',
      checked: '2026-09-05',
      note: 'Classic World guide explicitly states that Snail and Blue Snail drop snail shells used by Three Snails.'
    },
    {
      monster: 'Red Snail',
      item: 'Red Snail Shell',
      status: 'community-documented',
      sourceType: 'classic-community',
      source: 'MapleClassic Wiki · Red Snail',
      sourceUrl: 'https://mapleclassic.wiki/wiki/Red_Snail',
      checked: '2026-09-05',
      note: 'Current Classic World monster page lists Red Snail Shell in the Red Snail drop section; no rate is claimed.'
    }
  ];

  const byMonster = new Map();
  rows.forEach(row => {
    const key = normal(row.monster);
    if (!byMonster.has(key)) byMonster.set(key, []);
    byMonster.get(key).push(Object.freeze({...row}));
  });

  window.TCW_MONSTER_DROP_EVIDENCE = Object.freeze({
    version: '2026-09-05.1',
    currentClientHasDropTable: false,
    legacyTablesAllowedAsCurrent: false,
    statuses: Object.freeze(['community-documented','player-confirmed','official-confirmed']),
    rows: Object.freeze(rows.map(row => Object.freeze({...row}))),
    get(monsterName) { return byMonster.get(normal(monsterName)) || []; }
  });
  document.documentElement.classList.add('monster-drop-evidence-ready');
})();
