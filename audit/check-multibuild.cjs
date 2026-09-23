const fs = require('fs');
const vm = require('vm');

const outputDir = fs.existsSync('dist/guide-data.js') ? 'dist' : 'site';
const guideSource = fs.readFileSync(`${outputDir}/guide-data.js`, 'utf8');
const context = {window: {}};
vm.createContext(context);
vm.runInContext(guideSource, context, {filename: 'dist/guide-data.js'});

const root = context.window.GUIDE_DATA;
if (!root?.catalog || !root?.buildVariants) throw new Error('Missing multi-build guide data');

const classicItems = JSON.parse(fs.readFileSync('audit/fighter-items.json', 'utf8')).items || [];
const classicById = new Map(classicItems.filter(item => item.category === 'Equipment').map(item => [String(item.id), item]));
const slotMap = {
  Weapon: 'Weapon', Hat: 'Hat', Cap: 'Hat', Top: 'Top', Coat: 'Top', Longcoat: 'Overall',
  Overall: 'Overall', Bottom: 'Bottom', Pants: 'Bottom', Shoes: 'Shoes', Glove: 'Gloves',
  Gloves: 'Gloves', Shield: 'Shield', Cape: 'Cape', Ring: 'Ring', Earring: 'Earrings',
  Earrings: 'Earrings', Accessory: 'Earrings'
};

function expectedGenderClass(item) {
  const raw = String(item?.gender || item?.stats?.gender || '').trim().toLowerCase();
  if (/female|^f$/.test(raw)) return 'Female';
  if (/male|^m$/.test(raw)) return 'Male';
  if (/unisex/.test(raw)) return 'Unisex';
  return ['Top','Coat','Longcoat','Overall','Bottom','Pants'].includes(item?.sub_category) ? 'Unisex' : 'Genderless';
}

function gearRowForGender(guide, itemName, gender) {
  return (guide.gear || []).find(row => row.Item === itemName && ['Genderless','Unisex',gender === 'female' ? 'Female' : 'Male'].includes(String(row['Gender Class'] || '')));
}

function checkPotionRecommendations(guide, name) {
  const catalog = guide.potionRecommendations;
  const buildId = guide.id || 'magician-il-fresh';
  if (!catalog?.items?.length || !catalog.builds?.[buildId]) throw new Error(`${name} is missing its potion recommendation catalog`);
  const items = new Map(catalog.items.map(item => [String(item.id), item]));
  for (const item of catalog.items) {
    if (item.icon !== `/game-media/icons/${item.id}` || Number(item.shopPrice) <= 0 || Number(item.efficiency) <= 0) {
      throw new Error(`${name} has an invalid potion catalog row: ${item.name}`);
    }
  }
  for (const kind of ['hp','mp']) {
    const tiers = catalog.builds[buildId]?.[kind] || [];
    if (!tiers.length) throw new Error(`${name} is missing ${kind.toUpperCase()} potion tiers`);
    for (const tier of tiers) {
      const item = items.get(String(tier.recommendedId));
      if (!item || Number(item[kind] || 0) <= 0 || Number(tier.min) > Number(tier.max)) {
        throw new Error(`${name} has an invalid ${kind.toUpperCase()} potion tier at Lv${tier.min}`);
      }
    }
  }
}

function checkCompleteGenderInventory(guide, name) {
  const expectedEarrings = new Set(classicItems
    .filter(item => item.category === 'Equipment' && item.sub_category === 'Earring')
    .map(item => String(item.id)));
  const actualEarrings = new Set((guide.gear || [])
    .filter(row => row.Slot === 'Earrings' && row.Item !== 'None')
    .map(row => String(row['Item ID'])));
  if (actualEarrings.size !== expectedEarrings.size || [...expectedEarrings].some(id => !actualEarrings.has(id))) {
    throw new Error(`${name} is missing one or more current genderless earrings`);
  }
  for (const slot of ['Top','Bottom','Overall']) {
    if (!(guide.gear || []).some(row => row.Slot === slot && row['Gender Class'] === 'Male')) {
      throw new Error(`${name} is missing a Male ${slot} option`);
    }
    if (!(guide.gear || []).some(row => row.Slot === slot && row['Gender Class'] === 'Female')) {
      throw new Error(`${name} is missing a Female ${slot} option`);
    }
  }
}



function checkCanonicalInventory(guide, name) {
  const ids = new Map();
  for (const row of (guide.gear || []).filter(row => row.Item !== 'None')) {
    const evidence = String(row['Evidence Class'] || row.Status || 'CURRENT');
    if (/HISTORICAL|UNVERIFIED/i.test(evidence)) {
      if (row['Icon URL']) throw new Error(`${name} historical item ${row.Item} still has an active icon URL`);
      continue;
    }
    const id = Number(row['Item ID'] || 0);
    const canonical = classicById.get(String(id));
    if (!Number.isInteger(id) || id <= 0 || !canonical) throw new Error(`${name} has an unrecognized Classic item ID for ${row.Item}: ${row['Item ID']}`);
    if (canonical.name !== row.Item) throw new Error(`${name} item identity mismatch: ${row.Item} uses ${id}, canonical name is ${canonical.name}`);
    if (row['Icon URL'] !== `/game-media/icons/${id}`) throw new Error(`${name} ${row.Item} does not use its canonical icon route`);
    const expectedGender = String(canonical.gender || '');
    if (String(row.Gender || '') !== expectedGender) throw new Error(`${name} ${row.Item} gender mismatch: ${row.Gender || '(blank)'} != ${expectedGender || '(blank)'}`);
    const expectedClass = expectedGenderClass(canonical);
    if (String(row['Gender Class'] || '') !== expectedClass) throw new Error(`${name} ${row.Item} gender class mismatch: ${row['Gender Class'] || '(blank)'} != ${expectedClass}`);
    if (slotMap[canonical.sub_category] && row.Slot !== slotMap[canonical.sub_category]) throw new Error(`${name} ${row.Item} has slot ${row.Slot}, canonical slot is ${slotMap[canonical.sub_category]}`);
    if (!ids.has(id)) ids.set(id, row.Item);
    else if (ids.get(id) !== row.Item) throw new Error(`${name} reuses item ID ${id} for multiple names`);
  }
}

checkCanonicalInventory(root, 'I/L');
checkPotionRecommendations(root, 'I/L');
checkCompleteGenderInventory(root, 'I/L');

const expectedClassicIlSkillIds = {
  'Improved MP Recovery': 2000000,
  'Max MP Increase': 2000001,
  'Magic Guard': 2001000,
  'Magic Armor': 2001001,
  'Energy Bolt': 2001002,
  'Magic Claw': 2001003,
  'Teleport': 2201001,
  'MP Eater': 2200000,
  'Meditation': 2201000,
  'Slow': 2201002,
  'Cold Beam': 2201003,
  'Thunder Bolt': 2201004
};
for (const [skill, id] of Object.entries(expectedClassicIlSkillIds)) {
  if (Number(root.skillIcons?.[skill]?.id) !== id) throw new Error(`I/L skill ID mismatch for ${skill}`);
}

const expected = [
  ['magician-il-fresh', 'magician', 'I/L Wizard Build'],
  ['warrior-fighter', 'warrior', 'Fighter Build'],
  ['archer-hunter', 'bowman', 'Hunter Build']
];

const catalogShape = guide => JSON.stringify({
  classes: guide.catalog.classes.map(({id, status}) => ({id, status})),
  builds: guide.catalog.builds.map(({id, classId, name, status, dataRef}) => ({id, classId, name, status, dataRef}))
});

const sharedCatalog = catalogShape(root);
function effectivePreset(guide, level, gender) {
  const out = {Overall: 'None', Top: 'None', Bottom: 'None'};
  const stages = guide.gearPresets?.efficient?.levels || [];
  stages.filter(row => Number(row.min) <= level).sort((a, b) => Number(a.min) - Number(b.min)).forEach(row => {
    const stageGear = {...(row.gear || {}), ...((gender && row.genderGear?.[gender]) || {})};
    Object.entries(stageGear).forEach(([slot, item]) => {
      out[slot] = item;
      if (item !== 'None' && slot === 'Overall') { out.Top = 'None'; out.Bottom = 'None'; }
      if (item !== 'None' && (slot === 'Top' || slot === 'Bottom')) out.Overall = 'None';
    });
  });
  return out;
}

for (const [name, guide] of Object.entries(root.buildVariants)) {
  checkCanonicalInventory(guide, name);
  if (catalogShape(guide) !== sharedCatalog) throw new Error(`${name} has a divergent build catalog`);
  const skillLevels = guide.skills.map(row => Number(row.Level));
  const level30Rows = skillLevels.filter(level => level === 30).length;
  const expectedQuestCount = name === 'fighter' || name === 'hunter' ? 310 : 322;
  if (guide.meta?.maxLevel !== 70 || guide.leveling.length !== 70 || guide.skills.length !== 71 || skillLevels[0] !== 1 || skillLevels.at(-1) !== 70 || level30Rows !== 2 || guide.gear.length === 0 || guide.quests.length !== expectedQuestCount) {
    throw new Error(`${name} is missing a complete progression payload`);
  }
  if (!Array.isArray(guide.skillOrder) || guide.skillOrder.length < 10 || !guide.skillIcons?.['Three Snails']) {
    throw new Error(`${name} is missing its class skill order or Beginner skills`);
  }
  if (!guide.gearPresets?.efficient?.levels?.length || !guide.gear.some(row => row['Highly Recommended'] === true)) {
    throw new Error(`${name} is missing curated equipment checkpoints`);
  }
  if (guide.gear.some(row => row['Req Lv'] === undefined || row['Class Fit'] === undefined || row['Job Family'] === undefined || row['Job Branch'] === undefined || row['Req Job'] === undefined || row['Item Type'] === undefined || row['Gender Class'] === undefined)) {
    throw new Error(`${name} contains an item without job, branch, type, or level metadata`);
  }
  const gearNames = new Set(guide.gear.map(row => row.Item));
  for (const checkpoint of guide.gearPresets.efficient.levels) {
    for (const [slot, item] of Object.entries(checkpoint.gear || {})) {
      if (!gearNames.has(item)) throw new Error(`${name} checkpoint ${checkpoint.min} references missing ${slot}: ${item}`);
    }
    for (const [gender, variant] of Object.entries(checkpoint.genderGear || {})) {
      for (const [slot, item] of Object.entries(variant || {})) {
        if (!gearNames.has(item)) throw new Error(`${name} checkpoint ${checkpoint.min} references missing ${gender} ${slot}: ${item}`);
      }
    }
  }
  const sharedEarrings = guide.gear.some(row => row.Slot === 'Earrings' && ['Unisex','Genderless'].includes(String(row['Gender Class'] || '')));
  const sharedCapes = guide.gear.some(row => row.Slot === 'Cape' && ['Unisex','Genderless'].includes(String(row['Gender Class'] || '')));
  if (!sharedEarrings || !sharedCapes) throw new Error(`${name} is missing shared earrings or cape equipment`);
  if (name === 'fighter' && !guide.gear.some(row => row.Slot === 'Shield' && ['Unisex','Genderless'].includes(String(row['Gender Class'] || '')))) {
    throw new Error('Fighter is missing shared shield equipment');
  }
  for (const slot of ['Top','Bottom','Overall']) {
    const hasMale = guide.gear.some(row => row.Slot === slot && row['Gender Class'] === 'Male');
    const hasFemale = guide.gear.some(row => row.Slot === slot && row['Gender Class'] === 'Female');
    if (!hasMale || !hasFemale) throw new Error(`${name} is missing a ${slot} gender counterpart`);
  }
  checkPotionRecommendations(guide, name);
  checkCompleteGenderInventory(guide, name);
  for (const level of [1, 10, 15, 30, 50, 60, 70]) {
    for (const gender of ['male','female']) {
      const loadout = effectivePreset(guide, level, gender);
      if (loadout.Overall !== 'None' && (loadout.Top !== 'None' || loadout.Bottom !== 'None')) {
        throw new Error(`${name} ${gender} effective Lv${level} preset contains Overall plus Top/Bottom`);
      }
      for (const [slot, item] of Object.entries(loadout)) {
        if (!item || item === 'None') continue;
        const row = gearRowForGender(guide, item, gender);
        if (!row) throw new Error(`${name} ${gender} effective Lv${level} preset cannot resolve ${slot}: ${item}`);
      }
    }
  }
  if (guide.quests.some(row => !row.Quest || !row.Region || !row.Priority || !row['Why Do It'] || row.Lv === undefined || row.Lv === null)) {
    throw new Error(`${name} contains an unnormalized quest row`);
  }
  if (guide.etc.some(row => !row.Item || !row['Start Saving'] || row['Core + Craft Minimum'] === undefined)) {
    throw new Error(`${name} contains an unnormalized ETC row`);
  }
  if (guide.etc.some(row => Number(row['Crafting Need'] || 0) > 0)) {
    throw new Error(`${name} inherited an unrelated I/L crafting reserve`);
  }

  const tierIds = (guide.skillTiers || []).map(tier => tier.id);
  if (tierIds.join('|') !== 'beginner|warrior|fighter' && tierIds.join('|') !== 'beginner|bowman|hunter') {
    throw new Error(`${name} does not expose its three class-specific skill tiers`);
  }
  const allocations = {};
  guide.skills.forEach(row => String(row.Spend || '').split(',').forEach(part => {
    const match = part.trim().match(/^(.+?)\s+\+(\d+)/);
    if (match) allocations[match[1]] = (allocations[match[1]] || 0) + Number(match[2]);
  }));
  if (name === 'fighter') {
    for (const [skill, target] of [['Axe Mastery',20],['Axe Booster',20],['Final Attack: Axe',30],['Rage',30],['Rush',20]]) {
      if (allocations[skill] !== target) throw new Error(`Fighter endpoint mismatch for ${skill}: ${allocations[skill]} != ${target}`);
    }
    if (guide.gear.some(row => row.Slot === 'Weapon' && /Crossbow|Spear|Polearm|Blunt/i.test(String(row.Notes || '')))) {
      throw new Error('Fighter gear leaked a non-sword/axe weapon branch');
    }
    if (guide.gear.some(row => row.Item !== 'None' && /\b(?:Mage|Magician|Wizard|Cleric)\b/i.test(`${row['Req Job']} ${row['Class Fit']} ${row.Notes}`))) {
      throw new Error('Fighter gear leaked a magician label');
    }
    if (guide.upgrades.some(row => /Wand|Magic Claw|M\.ATK|\b(?:INT|LUK|Mage|Magician)\b/i.test(JSON.stringify(row)))) {
      throw new Error('Fighter upgrades inherited the I/L table');
    }
    if (guide.quests.some(row => ['Bowman','Magician','Thief'].includes(row.Region))) throw new Error('Fighter quest list leaked another advancement branch');
    const core = guide.gearPresets.efficient.levels.map(row => row.gear?.Weapon).filter(Boolean);
    if (core.at(-1) !== 'Chrono' || !core.includes('Blue Axe') || !guide.weaponPaths?.defensive?.label?.includes('1H')) {
      throw new Error('Fighter axe route or one-handed alternative is incomplete');
    }
  }
  if (name === 'hunter') {
    for (const [skill, target] of [['Bow Mastery',20],['Bow Booster',10],['Soul Arrow: Bow',11],['Final Attack: Bow',30],['Arrow Bomb: Bow',30],['Amazon\'s Judgement',20]]) {
      if (allocations[skill] !== target) throw new Error(`Hunter endpoint mismatch for ${skill}: ${allocations[skill]} != ${target}`);
    }
    if (guide.gear.some(row => row.Slot === 'Weapon' && /Crossbow/i.test(String(row.Notes || '')))) {
      throw new Error('Hunter gear leaked the crossbow weapon branch');
    }
    if (guide.gear.some(row => row.Item !== 'None' && /\b(?:Mage|Magician|Wizard|Cleric|Warrior)\b/i.test(`${row['Req Job']} ${row['Class Fit']} ${row.Notes}`))) {
      throw new Error('Hunter gear leaked a magician/warrior label');
    }
    if (guide.upgrades.some(row => /Wand|Magic Claw|M\.ATK|\b(?:INT|LUK|Warrior|Mage|Magician)\b/i.test(JSON.stringify(row)))) {
      throw new Error('Hunter upgrades inherited the I/L table');
    }
    if (guide.quests.some(row => ['Warrior','Magician','Thief'].includes(row.Region))) throw new Error('Hunter quest list leaked another advancement branch');
    if (guide.weapons.some(row => row['Weapon Type'] !== 'Bow')) throw new Error('Hunter roadmap contains a non-bow weapon');
  }
}

for (const [id, classId, name] of expected) {
  const build = root.catalog.builds.find(row => row.id === id);
  if (!build || build.classId !== classId || build.name !== name || build.status !== 'active') {
    throw new Error(`Incorrect active build metadata for ${id}`);
  }
}

if (root.buildVariants.fighter?.id !== 'warrior-fighter' || root.buildVariants.fighter?.meta?.buildId !== 'warrior-fighter') {
  throw new Error('Fighter variant identity metadata is stale');
}
if (root.buildVariants.hunter?.id !== 'archer-hunter' || root.buildVariants.hunter?.meta?.buildId !== 'archer-hunter') {
  throw new Error('Hunter variant identity metadata is stale');
}

const hunterTiers = root.buildVariants.hunter?.skillTiers || [];
if (hunterTiers.map(row => row.label).join('|') !== 'Beginner|Archer · 1st Job|Hunter · 2nd Job · Bow') {
  throw new Error('Hunter skill tiers must expose Beginner, Archer, and Hunter');
}

const bowman = root.catalog.classes.find(row => row.id === 'bowman');
if (bowman?.status !== 'active') throw new Error('Hunter did not activate the Bowman class');

const app = fs.readFileSync(`${outputDir}/app.js`, 'utf8');
for (const token of [
  'window.GUIDE_DATA = D;',
  "new URLSearchParams(location.search).get('build')",
  "const LEGACY_KEY = 'ultimateILGuideState.v1';",
  "${LEGACY_KEY}.${window.TCW_ACTIVE_BUILD_ID}",
  'data-build-select',
  'Open build',
  'AVAILABLE',
  "activeBuild()?.id==='warrior-fighter'",
  "activeBuild()?.id==='archer-hunter'"
]) {
  if (!app.includes(token)) throw new Error(`Missing build-navigation contract: ${token}`);
}
for (const token of [
  'function classCoreWeaponName',
  'classCoreWeaponName(level)',
  'gearOptionStats(item,none)',
  "Final Attack: Axe",
  "Arrow Bomb: Bow",
  'classGearItemAllowed',
  'classFilteredGearItems',
  'sanitizeGearState',
  'presetAtLevel',
  'classicAvatarRenderUrl',
  'classicAvatarGearSummary',
  'classic-avatar-preview-v1',
  'classic-avatar-compositor',
  'session-entry-modal',
  'session-reset-modal',
  'session-gender-modal',
  'genderGearItemAllowed',
  'SESSION_FOCUSABLE_SELECTOR',
  'trapSessionFocus',
  'top-classic-world-session-entry-v1',
  'sessionEntryState',
  'setSessionEntryState',
  "root.dataset.avatarGender=gender;",
  'hairId:31000',
  'faceId:21000',
  "root.dataset.avatarGearIds=gearSummary;",
  'Show future-level',
  "navigator.serviceWorker.register('./sw.js?v=0.10.19-compact-skill-ap-targets')",
  'tcwFullSkillBuild',
  'data-plan-level',
  "list.querySelectorAll('.skill-row[data-plan-level]')",
  'const next=Math.max(1,Math.min(Number(D.meta.maxLevel)||70,Number(level)||1));',
  'renderLevelPage();',
  'grid.dataset.classSkillTier===tier.id',
  'profile?.subtitle||\'Current route\')+\' · Level \'+'
]) {
  if (!app.includes(token)) throw new Error(`Missing class-specific renderer contract: ${token}`);
}
for (const token of [
  'equipment-pot-slots',
  'equipment-pot-slot',
  'potion-modal',
  'function potionTier',
  'renderPotionOptions',
  'potion-modal-close',
  'renderRecommendedPotions'
]) {
  if (!app.includes(token)) throw new Error(`Missing recommended-potion renderer contract: ${token}`);
}
const themeCss = fs.readFileSync(`${outputDir}/royal-maple-theme.css`, 'utf8');
const themeJs = fs.readFileSync(`${outputDir}/class-theme.js`, 'utf8');
for (const token of ['assets/class-themes/perion.webp', 'assets/class-themes/henesys.webp', 'assets/class-themes/ellinia.webp', 'body.royal-maple-theme', 'var(--town-bg)']) {
  if (!themeCss.includes(token)) throw new Error(`Missing Royal Maple theme contract: ${token}`);
}
for (const token of ['warrior-fighter', 'archer-hunter', 'magician-il-fresh', 'royal-theme-ready', 'mapleTown']) {
  if (!themeJs.includes(token)) throw new Error(`Missing class-town theme contract: ${token}`);
}
for (const asset of ['perion.webp', 'henesys.webp', 'ellinia.webp']) {
  if (!fs.existsSync(`${outputDir}/assets/class-themes/${asset}`)) throw new Error(`Missing class-town background asset: ${asset}`);
}
if (app.includes('state.level=Math.max(1,Math.min(Number(D.meta.maxLevel)||70,Number(level)||1));\n    save();\n    renderAll();')) {
  throw new Error('The old full-render level handler is still active');
}
if (!fs.readFileSync(`${outputDir}/progression-gear-visual.js`, 'utf8').includes('progression-avatar-level-controls')) {
  throw new Error('Level-control merge module is missing its avatar footer contract');
}
const progressionGearVisualCss = fs.readFileSync(`${outputDir}/progression-gear-visual.css`, 'utf8');
if (progressionGearVisualCss.includes('.v5-avatar[data-build-id="warrior-fighter"] .avatar-equipped-icons') || progressionGearVisualCss.includes('.v5-avatar[data-build-id="archer-hunter"] .avatar-equipped-icons')) {
  throw new Error('Class-specific avatar icon-box visibility returned');
}
const progressionGearVisualJs = fs.readFileSync(outputDir + '/progression-gear-visual.js', 'utf8');
if (!progressionGearVisualJs.includes("document.querySelectorAll('.v5-avatar .avatar-equipped-icons').forEach(node => node.remove())")) {
  throw new Error('Avatar icon-box cleanup contract is missing');
}
const worker = fs.readFileSync('worker.js', 'utf8');
if (!worker.includes('ICON_MEDIA + primaryItem[1]') || worker.includes("api.dreamms.gg/api/GMS/latest/item/")) {
  throw new Error('Worker still routes primary item artwork through the incompatible DreamMS/GMS table');
}
if (!app.includes("root.dataset.avatarRenderer='classic-avatar-preview-v1'") || app.includes('class="avatar-equipped-icons"') || app.includes('/game-media/characters/2000/47077,21078/stand1/0')) {
  throw new Error('App still uses the incompatible character compositor or avatar icon box');
}
if (!worker.includes('CLASSIC_AVATAR_PREVIEW') || !worker.includes('classicAvatarRequestBody') || !worker.includes("url.pathname === '/game-media/characters/classic-preview'")) {
  throw new Error('Worker Classic avatar proxy contract is missing');
}
const ciProxy = fs.readFileSync('.github/ci_static_proxy.py', 'utf8');
if (!ciProxy.includes('primary_match') || ciProxy.includes('api.dreamms.gg/api/GMS/latest/item/') || !ciProxy.includes('CLASSIC_AVATAR_PREVIEW') || !ciProxy.includes("p=='/game-media/characters/classic-preview'")) {
  throw new Error('CI asset proxy still routes primary item artwork through the incompatible DreamMS/GMS table');
}
if (!app.includes('classic-canonical-item-id') || !app.includes("String(item['Icon URL']||'')!==canonical") || app.includes('/game-media/items/fallback/')) {
  throw new Error('App still exposes legacy item visual fallbacks instead of canonical Classic IDs');
}
const indexHtml = fs.readFileSync(`${outputDir}/index.html`, 'utf8');
for (const token of ['modal-filter-summary', 'modal-show-future', 'data-class-equipment-filters', 'session-entry-modal', 'session-reset-modal', 'session-gender-modal', 'modal-gender-label']) {
  if (!indexHtml.includes(token)) throw new Error(`Missing equipment filter contract: ${token}`);
}
for (const token of ['equipment-window', 'equipment-window-page', 'potion-modal', 'potion-modal-close']) {
  if (!indexHtml.includes(token)) throw new Error(`Missing recommended-potion markup contract: ${token}`);
}
if (indexHtml.includes('recommended-pots-panel') || indexHtml.includes('id="recommended-pots"')) {
  throw new Error('Recommended Pots returned as a standalone card');
}
if (!fs.existsSync(`${outputDir}/session-flow.css`) || !fs.statSync(`${outputDir}/session-flow.css`).size) {
  throw new Error('Session flow stylesheet is missing');
}
if (!fs.existsSync(`${outputDir}/potions.css`) || !fs.statSync(`${outputDir}/potions.css`).size) {
  throw new Error('Recommended potion stylesheet is missing');
}

const progressionSyncCss = fs.readFileSync(`${outputDir}/progression-sync.css`, 'utf8');
const progressionGearCss = fs.readFileSync(`${outputDir}/progression-gear-visual.css`, 'utf8');
const ownershipCss = fs.readFileSync(`${outputDir}/ownership-ui.css`, 'utf8');
const visualsSkillsJs = fs.readFileSync(`${outputDir}/visuals-skills.js`, 'utf8');
const readabilityCss = fs.readFileSync(`${outputDir}/readability.css`, 'utf8');
const levelHookJs = fs.readFileSync(`${outputDir}/progression-level-hook.js`, 'utf8');
const progressionLevelHook = fs.readFileSync(`${outputDir}/progression-level-hook.js`, 'utf8');
for (const token of ['tcw-ap-target-ready','tcw-ap-allocation','BASE AP TARGET']) {
  if (!progressionLevelHook.includes(token)) throw new Error(`Missing AP target renderer contract: ${token}`);
}

if (!progressionSyncCss.includes('.tcw-hero-skill-tree .atlas-skill-grid') || !progressionSyncCss.includes('grid-template-columns:repeat(6,minmax(0,1fr))')) {
  throw new Error('Dashboard skill-tree horizontal layout contract is missing');
}
for (const [name, source] of [['progression-gear-visual.css', progressionGearCss], ['ownership-ui.css', ownershipCss]]) {
  if (source.includes('.dashboard-v72 .v6-skills-panel .atlas-skill-grid{grid-template-columns:repeat(3')) {
    throw new Error(`${name} still overrides the moved dashboard skill tree with the legacy vertical grid`);
  }
}
if (visualsSkillsJs.includes('.dashboard-v72 .v6-skills-panel .atlas-skill-grid{grid-template-columns:repeat(3')) {
  throw new Error('Runtime skill styling still overrides the dashboard horizontal grid');
}
if (!readabilityCss.includes('.page[data-page="skills"] .skill-grid{display:flex') || !readabilityCss.includes('.page[data-page="skills"] .skill-tree-grid{display:grid')) {
  throw new Error('Full Skill Tree and dashboard skill-grid layouts are not separated');
}
if (levelHookJs.includes("n < 10 ? 'beginner' : n < 30 ? 'magician' : 'il'")) {
  throw new Error('Level stability hook still hardcodes the I/L stage names for other builds');
}

const bootStart = app.indexOf('  let D = window.GUIDE_DATA;');
const bootEnd = app.indexOf('  const defaultGear = {', bootStart);
if (bootStart < 0 || bootEnd < 0) throw new Error('Could not locate selected-guide bootstrap');
const bootstrap = app.slice(bootStart, bootEnd);

function selectedGuide(build) {
  const runtime = {
    window: {GUIDE_DATA: root},
    location: {search: `?build=${build}`},
    URLSearchParams,
    localStorage: {getItem: () => JSON.stringify({activeBuildId: 'magician-il-fresh'})}
  };
  vm.createContext(runtime);
  return vm.runInContext(`(()=>{${bootstrap};return {id:window.TCW_ACTIVE_BUILD_ID,key:KEY,skills:D.skills.length};})()`, runtime);
}

const boots = {
  il: selectedGuide('magician-il-fresh'),
  fighter: selectedGuide('warrior-fighter'),
  hunter: selectedGuide('archer-hunter'),
  planned: selectedGuide('magician-fp-future')
};
if (boots.il.key !== 'ultimateILGuideState.v1' || boots.il.skills !== root.skills.length) {
  throw new Error('I/L bootstrap no longer preserves its established progress key');
}
for (const [name, id] of [['fighter', 'warrior-fighter'], ['hunter', 'archer-hunter']]) {
  const boot = boots[name];
  if (boot.id !== id || boot.key !== `ultimateILGuideState.v1.${id}` || boot.skills !== root.buildVariants[name].skills.length) {
    throw new Error(`${name} bootstrap did not select isolated build data/state`);
  }
}
if (boots.planned.id !== 'magician-il-fresh' || boots.planned.key !== 'ultimateILGuideState.v1') {
  throw new Error('A planned build can still become an active guide');
}

console.log('multi-build-regression-ok');
