const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = __dirname;
const source = path.join(root, 'public');
const runtime = path.join(source, 'assets', 'runtime');
const repairs = path.join(source, 'repairs');
const out = path.join(root, 'dist');
const assetVersion = '0.9.0-class-specific-builds';
const BRAND = 'Top Classic World Maplestory';

const FIGHTER_MILESTONES = [
  {level:10, label:'Warrior', detail:'1st job + STR/DEX accuracy route'},
  {level:15, label:'Axe Checkpoint', detail:'first weapon-family decision'},
  {level:30, label:'Fighter', detail:'2nd job + Rush + axe bleed path'},
  {level:35, label:'Mastery / Booster', detail:'Axe Mastery, Axe Booster, and Final Attack prerequisites'},
  {level:50, label:'Rage / Axe FA', detail:'party attack buff and sustained axe damage'},
  {level:65, label:'2H Axe Progression', detail:'higher W.ATK route with DEX breakpoint checks'},
  {level:70, label:'Fighter Cap', detail:'Axe Mastery 20 · Axe FA 30 · Booster 20 · Rage 30 · Rush 20'}
];

const HUNTER_MILESTONES = [
  {level:10, label:'Bowman', detail:'1st job + bow route'},
  {level:15, label:'Bow Checkpoint', detail:'first meaningful Bowman weapon set'},
  {level:30, label:'Hunter', detail:'2nd job + Arrow Bomb'},
  {level:35, label:'Mastery / Booster', detail:'bow consistency and attack-speed foundation'},
  {level:50, label:'Arrow Bomb / Soul Arrow', detail:'midgame ranged route'},
  {level:65, label:'Bow Progression', detail:'late weapon and accuracy checkpoint'},
  {level:70, label:'Hunter Cap', detail:'Bow Mastery 20 · AJ 20 · FA Bow 30 · Booster 10 · Soul Arrow 11 · Arrow Bomb 30'}
];

function retainedMapIndex() {
  const audit = JSON.parse(fs.readFileSync(path.join(root, 'public', 'map-audit.json'), 'utf8'));
  return new Map((audit.records || [])
    .filter(row => row.status === 'kept' && row.name)
    .map(row => [String(row.id), row]));
}

const currentMapIndex = retainedMapIndex();

function routeBlock(start, end, mapIds, monsters, method) {
  const maps = mapIds.map(id => {
    const row = currentMapIndex.get(String(id));
    if (!row) throw new Error(`Build route references a non-retained map: ${id}`);
    return row;
  });
  return [start, end, maps.map(row => row.name).join(' / '), monsters, method];
}

function secondJobPlan(startLevel, endLevel, phases) {
  const work = phases.map(phase => ({...phase, points: Number(phase.points)}));
  const totals = Object.fromEntries(work.map(phase => [phase.label, 0]));
  const rows = [];
  let phaseIndex = 0;
  for (let level = startLevel; level <= endLevel; level++) {
    let pointsLeft = 3;
    const spend = [];
    while (pointsLeft > 0 && phaseIndex < work.length) {
      const phase = work[phaseIndex];
      const take = Math.min(pointsLeft, phase.points);
      spend.push(`${phase.name} +${take}`);
      totals[phase.label] += take;
      phase.points -= take;
      pointsLeft -= take;
      if (phase.points === 0) phaseIndex++;
    }
    if (pointsLeft) throw new Error(`Second-job plan did not consume all SP at level ${level}`);
    const result = Object.entries(totals)
      .filter(([, value]) => value > 0)
      .map(([label, value]) => `${label} ${value}`)
      .join(' | ');
    rows.push([level, spend.join(', '), result]);
  }
  if (phaseIndex < work.length || work.some(phase => phase.points > 0)) {
    throw new Error('Second-job plan has unspent SP phases');
  }
  return rows;
}

/*
 * The build library is shared product metadata, not part of any one build's
 * gameplay payload.  Every selected guide must therefore receive the exact
 * same catalog.  Keeping catalog changes inside individual variants caused a
 * Fighter session and a Hunter session to disagree about which builds existed.
 */
function multiBuildCatalog(baseCatalog = {}) {
  const classes = (baseCatalog.classes || []).map(cls => {
    if (cls.id === 'warrior' || cls.id === 'bowman') return {...cls, status: 'active'};
    return {...cls};
  });

  const fighter = {
    id: 'warrior-fighter',
    classId: 'warrior',
    branchId: 'fighter',
    name: 'Fighter Build',
    shortName: 'Fighter',
    subtitle: 'Axe-focused Warrior progression',
    levelMin: 1,
    levelMax: 70,
    status: 'active',
    tags: ['Warrior', 'Fighter', 'Level 1–70', 'Quest-aware', 'Axe route', '2H damage'],
    primaryStat: 'STR',
    secondaryPolicy: 'DEX only for verified accuracy or equipment breakpoints',
    weaponPath: 'Axe family · two-handed damage default; one-handed axe + shield is the defensive alternative',
    skillPath: 'Axe Mastery → Axe Booster → Final Attack: Axe · Sword skills are not mixed into this route',
    description: 'A complete Classic Fighter path covering AP, SP, equipment, training, quests, monsters and crafting.',
    dataRef: 'fighter'
  };
  const hunter = {
    id: 'archer-hunter',
    classId: 'bowman',
    branchId: 'hunter',
    name: 'Hunter Build',
    shortName: 'Hunter',
    subtitle: 'DEX-first bow progression',
    levelMin: 1,
    levelMax: 70,
    status: 'active',
    tags: ['Bowman', 'Hunter', 'Level 1–70', 'Bow route'],
    primaryStat: 'DEX',
    secondaryPolicy: 'Minimum STR for bow requirements',
    weaponPath: 'Bow + arrows · two-handed ranged weapon; no shield slot',
    skillPath: 'Arrow Bomb: Bow → Bow Mastery → Bow Booster / Soul Arrow → Final Attack: Bow → Amazon\'s Judgement',
    description: 'A complete Classic Bowman-to-Hunter path covering AP, SP, bows, training, quests, monsters and crafting.',
    dataRef: 'hunter'
  };

  let hasHunter = false;
  const builds = (baseCatalog.builds || []).map(build => {
    if (build.id === 'magician-il-fresh') {
      return {
        ...build,
        name: 'I/L Wizard Build',
        shortName: 'I/L Wizard',
        subtitle: 'Ice / Lightning Wizard progression',
        description: 'A complete Classic I/L Wizard path covering AP, SP, equipment, training, quests, monsters and crafting.',
        dataRef: 'root'
      };
    }
    if (build.id === 'warrior-future' || build.id === 'warrior-fighter') return fighter;
    if (build.id === 'archer-hunter') {
      hasHunter = true;
      return hunter;
    }
    return {...build};
  });

  if (!hasHunter) {
    const afterBowman = builds.findIndex(build => build.id === 'bowman-future');
    builds.splice(afterBowman >= 0 ? afterBowman + 1 : builds.length, 0, hunter);
  }

  return {...baseCatalog, classes, builds};
}

function questOnlyEtc(rows, buildName) {
  return (rows || []).flatMap(row => {
    const quest = Number(row['Core Quest Need'] || 0);
    const craft = Number(row['Crafting Need'] || 0);
    if (!craft) return [{...row}];
    if (!quest) return [];
    const donation = Number(row['Optional / Donation'] || 0);
    return [{
      ...row,
      'Crafting Need': 0,
      'Core + Craft Minimum': quest,
      'All-In Total': quest + donation,
      'Used For': `${row.Item} quest reserve. Add ${buildName} crafting materials only when a verified recipe is selected.`,
      'Stop Saving When': donation
        ? `After the quest reserve. Donation extras are only needed when active.`
        : 'After the listed quest reserve is complete.',
      'Confidence': 'Quest baseline'
    }];
  });
}

function beginnerSkillRows() {
  const plan = [
    [1, 'Save SP for Beginner skills', 'Three Snails 0 | Recovery 0 | Nimble Feet 0'],
    [2, 'Three Snails +1', 'Three Snails 1 | Recovery 0 | Nimble Feet 0'],
    [3, 'Three Snails +1', 'Three Snails 2 | Recovery 0 | Nimble Feet 0'],
    [4, 'Three Snails +1', 'Three Snails 3 | Recovery 0 | Nimble Feet 0'],
    [5, 'Recovery +1', 'Three Snails 3 | Recovery 1 | Nimble Feet 0'],
    [6, 'Recovery +1', 'Three Snails 3 | Recovery 2 | Nimble Feet 0'],
    [7, 'Recovery +1', 'Three Snails 3 | Recovery 3 | Nimble Feet 0'],
    [8, 'Nimble Feet +1', 'Three Snails 3 | Recovery 3 | Nimble Feet 1'],
    [9, 'Nimble Feet +1', 'Three Snails 3 | Recovery 3 | Nimble Feet 2']
  ];
  return plan.map(([Level, Spend, result]) => ({
    Level, SP: Level === 1 ? 0 : 1, Spend,
    'Why This Is The Action': Level === 1
      ? 'Start with no spend at Lv1; the first Beginner SP arrives at Lv2.'
      : 'Finish the shared Beginner foundation before the level-10 job advancement.',
    'Meso / MP Logic': 'Keep Maple Island gear and potion spending light while the Beginner route is still active.',
    'Result After Level': result,
    Status: 'Classic beta / verify at launch',
    'Evidence Class': 'CURRENT / VERIFY'
  }));
}

function buildQuestRows(rows, buildName) {
  return (rows || []).map((q, index) => {
    const level = Number(q.level_min ?? q.chain_level_min ?? 1);
    const requirements = Array.isArray(q.requirements_list) ? q.requirements_list : [];
    const items = requirements.filter(x => x.type === 'item');
    const text = `${q.name || ''} ${q.description || ''} ${q.region || ''} ${q.npc_name || ''}`;
    const classQuest = /advance|job|warrior|fighter|bowman|archer|hunter|perion|henesys|olaf|athena/i.test(text);
    const priority = level <= 10 || classQuest ? 'High' : level <= 30 || items.length ? 'Medium' : 'Low / Optional';
    const description = String(q.description || '').split(/\n+/).map(x => x.trim()).find(Boolean) || `Continue the ${buildName} route.`;
    const reward = [
      q.rewards_items,
      q.rewards_exp ? `EXP ${q.rewards_exp}` : '',
      q.rewards_money ? `${q.rewards_money} mesos` : '',
      q.next_quest_name ? `Next: ${q.next_quest_name}` : ''
    ].filter(Boolean).join(' · ') || 'Quest completion';
    return {
      'Done?': false,
      Priority: priority,
      Lv: Number.isFinite(level) ? level : 1,
      Quest: q.name || `Quest ${q.id || index + 1}`,
      Region: q.region || 'Classic World',
      Eligibility: `${buildName} route · level ${Number.isFinite(level) ? level : 1}+`,
      Repeatable: 'No',
      EXP: q.rewards_exp || 0,
      Mesos: q.rewards_money || 0,
      'Reward / Unlock': reward,
      'Why Do It': description.slice(0, 260),
      'ETC / Item To Save': items.map(x => x.name).join(' · '),
      Qty: items.map(x => x.count).join(' · '),
      'Save Guidance': items.length ? `Keep ${items.map(x => `${x.name} ×${x.count}`).join(', ')} until this chain is complete.` : 'No special ETC reserve; follow the route and take the reward.',
      Status: 'CURRENT / VERIFY',
      'Quest ID': q.id || String(index + 1),
      NPC: q.npc_name || '—',
      Chain: q.parent || '—',
      'Next Quest': q.next_quest_name || '—',
      'Class Fit': buildName,
      Requirements: q.requirements || '—'
    };
  });
}

function classQuestRows(rows, buildName) {
  const branch = buildName === 'Fighter Build' ? 'Warrior' : buildName === 'Hunter Build' ? 'Bowman' : null;
  if (!branch) return rows || [];
  const advancementBranches = new Set(['Warrior','Magician','Bowman','Thief']);
  return (rows || []).filter(row => !advancementBranches.has(String(row.region || '')) || String(row.region) === branch);
}

function buildEtcRows(baseRows, rawQuests, buildName) {
  const rows = questOnlyEtc(baseRows, buildName).map(row => ({...row}));
  const byName = new Map(rows.map(row => [String(row.Item).toLowerCase(), row]));
  for (const quest of rawQuests || []) {
    const itemReqs = (quest.requirements_list || []).filter(x => x.type === 'item' && x.name);
    for (const req of itemReqs) {
      const key = String(req.name).toLowerCase();
      const count = Math.max(1, Number(req.count) || 1);
      let row = byName.get(key);
      if (!row) {
        row = {
          Item: req.name,
          'Start Saving': `Lv${Number(quest.level_min || quest.chain_level_min || 1)}`,
          'Core Quest Need': count,
          'Crafting Need': 0,
          'Optional / Donation': 0,
          'Core + Craft Minimum': count,
          'All-In Total': count,
          'Used For': `${quest.name || 'Quest'} (${buildName} quest reserve)`,
          'Stop Saving When': `After ${quest.name || 'the active quest'} is complete.`,
          Confidence: 'Quest-linked',
          'Start Lv': Number(quest.level_min || quest.chain_level_min || 1),
          'Satisfied?': false,
          'Your Held': null
        };
        rows.push(row);
        byName.set(key, row);
      } else {
        row['Core Quest Need'] = Math.max(Number(row['Core Quest Need'] || 0), count);
        row['Core + Craft Minimum'] = Math.max(Number(row['Core + Craft Minimum'] || 0), count);
        row['All-In Total'] = Math.max(Number(row['All-In Total'] || 0), Number(row['Core + Craft Minimum'] || 0) + Number(row['Optional / Donation'] || 0));
        const lv = Number(quest.level_min || quest.chain_level_min || 1);
        row['Start Lv'] = Math.min(Number(row['Start Lv'] || lv), lv);
        row['Start Saving'] = `Lv${row['Start Lv']}`;
        const use = `${quest.name || 'Quest'} (${buildName})`;
        if (!String(row['Used For'] || '').includes(quest.name || '')) row['Used For'] = `${row['Used For'] || ''}; ${use}`.replace(/^;\s*/, '');
      }
    }
  }
  return rows
    .map(row => ({...row, 'Start Lv': Number(row['Start Lv'] || 1), 'Start Saving': `Lv${Number(row['Start Lv'] || 1)}`}))
    .sort((a, b) => Number(a['Start Lv'] || 1) - Number(b['Start Lv'] || 1) || String(a.Item).localeCompare(String(b.Item)));
}

function applyGearPlan(gear, stages, buildName) {
  const available = new Map(gear.map(row => [row.Item, row]));
  const selected = new Map();
  const levels = stages.map(stage => {
    const clean = {};
    for (const [slot, itemName] of Object.entries(stage.gear || {})) {
      if (!available.has(itemName)) continue;
      clean[slot] = itemName;
      selected.set(itemName, {min: Number(stage.min) || 1, reason: stage.reason || `${buildName} checkpoint at Lv${stage.min}.`});
    }
    return {min: Number(stage.min) || 1, gear: clean};
  });
  const planned = gear.map(row => {
    const rec = selected.get(row.Item);
    if (!rec) return row;
    return {
      ...row,
      Plan: 'CORE',
      Priority: `Use at Lv${rec.min} or later when affordable`,
      'Highly Recommended': true,
      'Recommendation Reason': rec.reason,
      Notes: `${row.Notes || ''} · ${rec.reason}`.replace(/^ · /, ''),
      Status: 'CURRENT / VERIFY'
    };
  });
  return {gear: planned, levels};
}

function buildRecipeRows(gear, levels, buildName) {
  const byName = new Map(gear.map(row => [row.Item, row]));
  const seen = new Set();
  return (levels || []).flatMap(stage => {
    const name = stage.gear?.Weapon;
    if (!name || name === 'None' || seen.has(name) || !byName.has(name)) return [];
    seen.add(name);
    const item = byName.get(name);
    return [{
      Weapon: name,
      Ingredient1: 'Classic item recipe', Qty1: 'See Database',
      Ingredient2: 'Quest / ETC reserve', Qty2: 'As listed',
      Ingredient3: 'Verify before crafting', Qty3: '—',
      CraftLevel: `${buildName} · Lv${stage.min} checkpoint`,
      MesoFee: 'Verify',
      BuildOrder: `Use the ${item['Class Fit'] || buildName} equipment checkpoint first; confirm current recipe materials in the Database before farming.`,
      Verify: 'CURRENT / VERIFY'
    }];
  });
}

function classEquipmentLabel(item) {
  return String(item?.req_job_label || 'All').trim() || 'All';
}

function classEquipmentFit(item, family, branch) {
  const label = classEquipmentLabel(item);
  if (label === 'All') return `Any · ${branch}`;
  return family;
}

function equipmentSlot(item) {
  return ({
    Weapon: 'Weapon', Hat: 'Hat', Cap: 'Hat',
    Top: 'Top', Coat: 'Top', Longcoat: 'Overall',
    Overall: 'Overall', Bottom: 'Bottom', Pants: 'Bottom',
    Shoes: 'Shoes', Glove: 'Gloves', Gloves: 'Gloves',
    Shield: 'Shield', Cape: 'Cape', Ring: 'Ring',
    Earring: 'Earrings', Earrings: 'Earrings', Accessory: 'Earrings'
  })[item?.sub_category] || 'Any';
}

function equipmentFields(item, family, branch) {
  const stats = item.stats || {};
  const label = classEquipmentLabel(item);
  return {
    'Job Family': family,
    'Job Branch': branch,
    'Req Job': label === 'All' ? 'Any' : label,
    'Req Job ID': Number(stats.reqJob || 0),
    'Item Type': item.sub_category === 'Weapon' ? (item.weapon_type || 'Weapon') : (item.sub_category || 'Equipment')
  };
}

function buildWeaponUpgradeRows(gear, levels, buildName, branch, skillFamily) {
  const byName = new Map(gear.map(row => [row.Item, row]));
  const rows = [];
  let previous = null;
  for (const stage of levels || []) {
    const name = stage.gear?.Weapon;
    const item = name && byName.get(name);
    if (!item) continue;
    if (previous && previous.Item !== item.Item) {
      const gain = Number(item['W.ATK'] || 0) - Number(previous['W.ATK'] || 0);
      rows.push({
        Lv: Number(stage.min || item['Req Lv'] || 1),
        'Current Weapon': previous.Item,
        Candidate: item.Item,
        'W.ATK Gain': gain >= 0 ? gain : 0,
        'Representative Next Mob': `${buildName} route checkpoint`,
        HP: 'Route target',
        'M.DEF': '—',
        'Skill / Ref Build': `${buildName} · ${skillFamily} route`,
        'Current Final Dmg / Cast': 'Build-specific',
        'Candidate Final Dmg / Cast': 'Build-specific',
        'Worst Casts Current': '—',
        'Worst Casts Candidate': '—',
        'Default Action': 'BUY / HOLD TO BREAKPOINT',
        Why: `${branch} weapon breakpoint. Compare W.ATK, required stats, price, and the current route before replacing a working weapon.`,
        'Req Job': item['Req Job'] || familyLabelForUpgrade(branch),
        'Req Lv': Number(item['Req Lv'] || stage.min || 1),
        'Req STR': Number(item['Req STR'] || 0),
        'Req DEX': Number(item['Req DEX'] || 0),
        'Weapon Type': item['Item Type'] || skillFamily,
        'Class Fit': item['Class Fit'] || branch
      });
    }
    previous = item;
  }
  return rows;
}

function familyLabelForUpgrade(branch) {
  return branch === 'Fighter' ? 'Warrior' : branch === 'Hunter' ? 'Bowman' : 'Any';
}

function fighterVariant(base) {
  const skillsAudit = JSON.parse(fs.readFileSync(path.join(root, 'audit', 'fighter-skills.json'), 'utf8'));
  const itemAudit = JSON.parse(fs.readFileSync(path.join(root, 'audit', 'fighter-items.json'), 'utf8'));
  const questAudit = JSON.parse(fs.readFileSync(path.join(root, 'audit', 'fighter-quests.json'), 'utf8'));
  const monsterAudit = JSON.parse(fs.readFileSync(path.join(root, 'audit', 'fighter-monsters.json'), 'utf8'));
  const craftingAudit = JSON.parse(fs.readFileSync(path.join(root, 'audit', 'fighter-crafting.json'), 'utf8'));
  // Only the shared Beginner tree, Swordsman first job, and Fighter's Axe
  // branch belong in this build.  The audit also contains Page/Spearman and
  // third-job groups; including those here was the source of class bleed.
  const skillGroups = [
    ...(skillsAudit.beginner || []),
    ...((skillsAudit.warrior || []).slice(0, 2))
  ];
  const allSkills = skillGroups.flatMap(group => group.skills || []);
  const beginner = beginnerSkillRows();
  const skillOrder = ['Three Snails','Recovery','Nimble Feet','Improved HP Recovery','Max HP Increase','Precise Strikes','Power Strike','Slash Blast','Iron Body','Axe Mastery','Axe Booster','Final Attack: Axe','Rage','Rush'];
  const skillTiers = [
    {id:'beginner', label:'Beginner', opens:1, names:['Three Snails','Recovery','Nimble Feet']},
    {id:'warrior', label:'Warrior · 1st Job', opens:10, names:['Improved HP Recovery','Max HP Increase','Precise Strikes','Power Strike','Slash Blast','Iron Body']},
    {id:'fighter', label:'Fighter · 2nd Job · Axe', opens:30, names:['Axe Mastery','Axe Booster','Final Attack: Axe','Rage','Rush']}
  ];
  const skillIcons = Object.fromEntries(allSkills.map(skill => [skill.name, {
    id: skill.id, max: skill.max_level, role: skill.passive ? 'Passive' : (skill.mechanics?.label || 'Combat skill'),
    desc: String(skill.description || '').replace(/\s+/g, ' ').trim()
  }]));
  const steps = [
    [10, 'Power Strike +1', 'PS 1 | SB 0 | Precise 0 | IHP 0 | MHP 0'],
    [11, 'Power Strike +2, Slash Blast +1', 'PS 3 | SB 1 | Precise 0 | IHP 0 | MHP 0'],
    [12, 'Power Strike +1, Slash Blast +2', 'PS 4 | SB 3 | Precise 0 | IHP 0 | MHP 0'],
    [13, 'Slash Blast +1, Precise Strikes +2', 'PS 4 | SB 4 | Precise 2 | IHP 0 | MHP 0'],
    [14, 'Precise Strikes +3', 'PS 4 | SB 4 | Precise 5 | IHP 0 | MHP 0'],
    [15, 'Power Strike +3', 'PS 7 | SB 4 | Precise 5 | IHP 0 | MHP 0'],
    [16, 'Power Strike +3', 'PS 10 | SB 4 | Precise 5 | IHP 0 | MHP 0'],
    [17, 'Power Strike +3', 'PS 13 | SB 4 | Precise 5 | IHP 0 | MHP 0'],
    [18, 'Power Strike +3', 'PS 16 | SB 4 | Precise 5 | IHP 0 | MHP 0'],
    [19, 'Power Strike +3', 'PS 19 | SB 4 | Precise 5 | IHP 0 | MHP 0'],
    [20, 'Power Strike +1, Slash Blast +2', 'PS 20 | SB 6 | Precise 5 | IHP 0 | MHP 0'],
    [21, 'Slash Blast +3', 'PS 20 | SB 9 | Precise 5 | IHP 0 | MHP 0'],
    [22, 'Slash Blast +3', 'PS 20 | SB 12 | Precise 5 | IHP 0 | MHP 0'],
    [23, 'Slash Blast +3', 'PS 20 | SB 15 | Precise 5 | IHP 0 | MHP 0'],
    [24, 'Slash Blast +3', 'PS 20 | SB 18 | Precise 5 | IHP 0 | MHP 0'],
    [25, 'Slash Blast +2, Precise Strikes +1', 'PS 20 | SB 20 | Precise 6 | IHP 0 | MHP 0'],
    [26, 'Precise Strikes +3', 'PS 20 | SB 20 | Precise 9 | IHP 0 | MHP 0'],
    [27, 'Precise Strikes +3', 'PS 20 | SB 20 | Precise 12 | IHP 0 | MHP 0'],
    [28, 'Precise Strikes +3', 'PS 20 | SB 20 | Precise 15 | IHP 0 | MHP 0'],
    [29, 'Improved HP Recovery +3', 'PS 20 | SB 20 | Precise 15 | IHP 3 | MHP 0'],
    [30, 'Max HP Increase +3', 'PS 20 | SB 20 | Precise 15 | IHP 3 | MHP 3']
  ];
  // Classic Fighter axe route.  The phase boundaries intentionally preserve
  // the mixed-spend levels from the researched table (31, 33, 38, 48, 64).
  const second = [[30, 'Rush +1', 'Rush 1', 1], ...secondJobPlan(31, 70, [
    {name:'Rage', label:'Rage', points:1},
    {name:'Axe Mastery', label:'AM', points:5},
    {name:'Axe Booster', label:'ABo', points:1},
    {name:'Final Attack: Axe', label:'FA', points:1},
    {name:'Axe Mastery', label:'AM', points:15},
    {name:'Final Attack: Axe', label:'FA', points:1},
    {name:'Rage', label:'Rage', points:29},
    {name:'Final Attack: Axe', label:'FA', points:1},
    {name:'Final Attack: Axe', label:'FA', points:27},
    {name:'Axe Booster', label:'ABo', points:19},
    {name:'Rush', label:'Rush', points:19},
    {name:'Hold 1 flexible SP', label:'Unspent SP', points:1}
  ])];
  const skills = [...beginner, ...[...steps, ...second].map(([level, spend, result, spOverride]) => ({
    Level: level, SP: spOverride ?? (level === 10 ? 1 : 3), Spend: spend,
    'Why This Is The Action': level < 30 ? 'Current Classic Warrior first-job route: build Power Strike and Slash Blast, finish Precise Strikes, then take the delayed HP breakpoints.' : 'Cross-checked axe Fighter route: keep the weapon family consistent, use Axe Mastery bleed, then add Axe Booster, Final Attack: Axe, Rage, and Rush.',
    'Meso / MP Logic': 'Use the skill when its target is met; preserve potions and avoid spending on a skill that does not improve the current route.',
    Status: 'Classic beta / verify at launch', 'Result After Level': result || 'Fighter progression checkpoint', 'Evidence Class': 'CURRENT / VERIFY'
  }))];
  const warriorItems = (itemAudit.items || []).filter(item => {
    const stats = item.stats || {};
    if (item.category !== 'Equipment') return false;
    // A Fighter can compare swords and axes, but the payload must not expose
    // Page/Spearman blunt, spear, or polearm branches as actionable gear.
    if (item.sub_category === 'Weapon') {
      return ['1H Sword','2H Sword','1H Axe','2H Axe'].includes(item.weapon_type)
        && (classEquipmentLabel(item) === 'All' || /\bWarrior\b/.test(classEquipmentLabel(item)))
        && !/\bMage\b/i.test(classEquipmentLabel(item));
    }
    // Do not treat a mixed Warrior/Mage record as Fighter equipment. The
    // source export uses bit flags, so checking only reqJob let magician
    // crossover items leak into this build.
    return /\bWarrior\b/.test(classEquipmentLabel(item)) && !/\bMage\b/i.test(classEquipmentLabel(item));
  });
  let gear = [{Item:'None',Slot:'Any','Item ID':0,'Icon URL':'',STR:0,DEX:0,INT:0,LUK:0,'W.ATK':0,'M.ATK':0,'WDEF':0,'MDEF':0,'Crit%':0,'Crit DMG':0,Speed:0,Jump:0,'Req Lv':0,'Req STR':0,'Req DEX':0,'Req LUK':0,Status:'CURRENT / VERIFY','Class Fit':'Any · Fighter','Job Family':'Any','Job Branch':'None','Req Job':'Any','Req Job ID':0,'Item Type':'Empty',Plan:'EMPTY',Priority:'—',Notes:'Empty slot','Highly Recommended':false,'Recommendation Reason':'','Evidence Class':'CURRENT / VERIFY'}, ...warriorItems.map(item => {
    const s = item.stats || {};
    return {Item:item.name, Slot:equipmentSlot(item), 'Item ID':item.id, 'Icon URL':`/game-media/items/primary/${item.id}`, STR:s.incSTR||0, DEX:s.incDEX||0, INT:s.incINT||0, LUK:s.incLUK||0, 'W.ATK':s.incPAD||0, 'M.ATK':s.incMAD||0, 'WDEF':s.incPDD||0, 'MDEF':s.incMDD||0, 'Crit%':s.incCritRate||0, 'Crit DMG':s.incCritDamage||0, Speed:s.incSpeed||0, Jump:s.incJump||0, 'Req Lv':s.reqLevel||0, 'Req STR':s.reqSTR||0, 'Req DEX':s.reqDEX||0, 'Req LUK':s.reqLUK||0, Status:'CURRENT / VERIFY', 'Class Fit':classEquipmentFit(item,'Warrior','Fighter'), ...equipmentFields(item,'Warrior','Fighter'), Plan:'OPTIONAL', Priority:'Use at the relevant level or when it creates a real damage/accuracy breakpoint', Notes:item.weapon_type ? `${item.weapon_type} · ${item.attack_speed_label || ''}` : `${classEquipmentLabel(item)} Fighter equipment option`, 'Highly Recommended':false, 'Recommendation Reason':'', 'Evidence Class':'CURRENT / VERIFY'};
  })];
  const gearPlan = applyGearPlan(gear, [
    {min:1, gear:{Weapon:'Hand Axe'}, reason:'Maple Island starter; the axe family is selected before weapon-specific Fighter SP.'},
    {min:10, gear:{Weapon:'Metal Axe',Hat:'Metal Koif',Top:'Brown Lolico Armor',Bottom:'Brown Lolico Pants',Shoes:'Bronze Grieves',Gloves:'Juno'}, reason:'First Warrior axe checkpoint. Keep the early route cheap and reserve mesos for potions.'},
    {min:15, gear:{Weapon:'Battle Axe',Hat:'Steel Full Helm',Overall:'Steel Fitted Mail',Shoes:'Steel Grieves',Gloves:'Steel Fingerless Gloves'}, reason:'Level-15 axe-family checkpoint; use the shop axe instead of switching to a sword.'},
    {min:20, gear:{Weapon:'Iron Axe',Overall:'Blue Kendo Robe'}, reason:'Level-20 two-handed axe checkpoint; preserve the family path and hit-rate budget.'},
    {min:25, gear:{Weapon:'Two-Handed Axe'}, reason:'Level-25 raw-W.ATK checkpoint before Fighter advancement.'},
    {min:30, gear:{Weapon:'Blue Axe',Overall:'Red Engrit'}, reason:'Level-30 Fighter handoff. Blue Axe is the researched two-handed damage default; Fireman\'s Axe + shield is the defensive alternative.'},
    {min:35, gear:{Weapon:'Niam',Overall:'Blood Fitted Mail'}, reason:'Level-35 axe breakpoint; keep Axe Mastery, Booster, and Final Attack on the same family.'},
    {min:40, gear:{Weapon:'Sabretooth'}, reason:'Level-40 two-handed axe checkpoint; use a one-handed Blue Counter only when Guard is worth the W.ATK trade.'},
    {min:50, gear:{Weapon:'The Rising',Top:'Umber Shouldermail',Bottom:'Umber Shouldermail Pants',Shoes:'Mithril Hildon Boots'}, reason:'Level-50 two-handed axe and armor breakpoint. Weapon Attack takes priority over small armor gains.'},
    {min:60, gear:{Weapon:'The Shining',Top:'Blue Orientican',Bottom:'Blue Orientican Pants',Shoes:'Sapphire Camel Boots'}, reason:'Level-60 two-handed axe checkpoint; verify the 60 DEX target against your actual gear.'},
    {min:70, gear:{Weapon:'Chrono',Top:'Bronze Platine',Bottom:'Bronze Platine Pants',Shoes:'Purple Carzen Boots'}, reason:'Level-70 axe capstone. Chrono is the two-handed damage endpoint; Mikhail + shield is the Guard alternative.'}
  ], 'Fighter');
  gear = gearPlan.gear;
  const fighterCoreWeapons = new Set(['Hand Axe','Metal Axe','Battle Axe','Iron Axe','Two-Handed Axe','Blue Axe','Niam','Sabretooth','The Rising','The Shining','Chrono']);
  const fighterDefensiveWeapons = new Set(['Fireman\'s Axe','Dankke','Blue Counter','Buck','Hawkhead','Mikhail']);
  const fighterSwordAlternatives = new Set(['Sword','Long Sword','Sabre','Scimitar','Zard','Lion\'s Fang','Sparta','Doombringer']);
  const weaponRows = gear.filter(x=>x.Slot==='Weapon' && /^(?:1H|2H) (?:Axe|Sword)\b/.test(String(x.Notes||''))).map(x=>({
    Lv:x['Req Lv']||1, Weapon:x.Item, Type:x['Item ID'], 'Weapon Type':String(x.Notes||'').split(' · ')[0]||'Warrior weapon',
    'W.ATK':x['W.ATK']||0, Speed:x.Speed||0, 'Req DEX':x['Req DEX']||0,
    'Upgrade Priority':fighterCoreWeapons.has(x.Item)?'CORE · BUY AT BREAKPOINT':fighterDefensiveWeapons.has(x.Item)?'DEFENSIVE ALTERNATIVE':fighterSwordAlternatives.has(x.Item)?'SWORD ALTERNATIVE':'OPTIONAL',
    'Why':x.Notes
  })).sort((a,b)=>Number(a.Lv)-Number(b.Lv)||(['CORE · BUY AT BREAKPOINT','DEFENSIVE ALTERNATIVE','SWORD ALTERNATIVE','OPTIONAL'].indexOf(a['Upgrade Priority'])-['CORE · BUY AT BREAKPOINT','DEFENSIVE ALTERNATIVE','SWORD ALTERNATIVE','OPTIONAL'].indexOf(b['Upgrade Priority'])));
  const routeBlocks = [
    routeBlock(1, 9, [50, 1004, 1005], 'Snail / Blue Snail / Shroom', 'Beginner route through the retained Maple Island layouts; finish the shared 3/3/3 Beginner skills before Warrior advancement.'),
    routeBlock(10, 14, [10001021, 10001070, 10001010], 'Red Snail / Shroom / Orange Mushroom / Pig', 'Power Strike is the single-target tool. Keep STR high and use the first axe breakpoint without forcing a higher-level map.'),
    routeBlock(15, 19, [10002031, 10000010], 'Slime / Red Snail / Blue Snail', 'Power Strike stays primary; use Slash Blast only on three or more grouped targets and check 100% hit rate first.'),
    routeBlock(20, 29, [10002075, 10002033], 'Green Mushroom / Slime / Horny Mushroom', 'Finish Power Strike, Slash Blast, and Precise Strikes while the axe route follows the next real STR/DEX breakpoint.'),
    routeBlock(30, 34, [10003061, 10002075], 'Bubbling / Green Mushroom / Slime', 'At Fighter 1, use Rush for grouping but do not spend early SP away from the Axe Mastery prerequisites.'),
    routeBlock(35, 39, [20000092, 20000091], 'Jr. Sentinel', 'Axe Mastery reaches 20 and Axe Booster/Final Attack come online; choose the retained Orbis Tower map only when accuracy is clean.'),
    routeBlock(40, 49, [20000050, 20000052], 'Star Pixie / Jr. Cellion / Lunar Pixie', 'Use Power Strike for reliable single targets and Slash Blast for packs; Rage is the physical party/damage buff, not a magic buff.'),
    routeBlock(50, 59, [20000087, 20000088], 'Luster Pixie / Lunar Pixie', 'The Rising then late axe upgrades should be judged by weakest-hit kill breakpoints; keep Final Attack off when it adds overkill delay.'),
    routeBlock(60, 64, [20000087, 20000088], 'Luster Pixie / Lunar Pixie', 'Keep the two-handed axe and verify 100% hit before moving. Booster uptime improves while Rage remains the party buff.'),
    routeBlock(65, 69, [10003068, 10003065], 'Wraith', 'Use the retained subway routes when the level/accuracy check is met; a lower map is preferable if misses or melee travel erase EXP.'),
    routeBlock(70, 70, [20000054, 20000071], 'Lioner / Cellion / Grupin', 'Finish the Axe Fighter endpoint, then prepare the level-70 advancement to Crusader without inventing third-job SP.')
  ];
  const leveling = Array.from({length:70},(_,i)=>{const lv=i+1,b=routeBlocks.find(x=>lv>=x[0]&&lv<=x[1]);return {Lv:lv,Job:lv<10?'Beginner':lv<30?'Warrior':'Fighter','Primary Route':b[2],'Main Monsters':b[3],'Fighter Method':b[4],'Alternative':'Use the nearest retained Classic layout with a reliable 100% hit check','Quest / PQ Tie-In':lv<10?'Maple Island quest chain':lv<30?'Warrior advancement, Henesys citizenship, and class-appropriate chains':'Fighter advancement, weapon-family checks, and class-appropriate quest chains','Gear Hunt Tie-In':lv<10?'Use Maple Island rewards':`Use the next axe-family breakpoint${lv>=30?' and verify 2H DEX requirement':''}`,'SAVE ETC / ITEM NOW':'Bank active quest materials plus axe/weapon-crafting inputs only','Target Qty':'As required by the active quest or next weapon craft','Priority / Used For':'Route, accuracy, and axe damage progression','When You Can Stop Saving':'After the active quest chain or weapon craft is complete','Confidence':'CURRENT / VERIFY','Evidence Class':'CURRENT / VERIFY'};});
  const apPlan=[
    ['1–10','ALL STR',57,5,'Metal Axe / early Warrior weapon',0,'Keep the starting 5 DEX and put level-up AP into STR; job advancement itself has no stat requirement.'],
    ['11–12','+4 STR / +1 DEX each level',65,7,'Metal Axe / Battle Axe',0,'Raise DEX only for the researched accuracy and weapon breakpoints; STR remains the damage stat.'],
    ['13–14','+3 STR / +2 DEX each level',71,11,'Battle Axe',0,'Front-load the DEX needed for the level-15 route without abandoning STR damage.'],
    ['15','+4 STR / +1 DEX',75,12,'Battle Axe / early axe family',10,'Keep the level-15 accuracy sample while preserving the axe family.'],
    ['16–19','+4 STR / +1 DEX each level',91,16,'Iron Axe',15,'Follow the verified Warrior sample until the level-20 accuracy breakpoint.'],
    ['20','+3 STR / +2 DEX',94,18,'Iron Axe',20,'Reach the current Classic level-20 DEX checkpoint with gear covering the rest where possible.'],
    ['21–25','+4 STR / +1 DEX each level',114,23,'Two-Handed Axe',25,'Keep base DEX close to the sample and use the level-25 two-handed axe breakpoint.'],
    ['26–29','+4 STR / +1 DEX each level',130,27,'Blue Axe',30,'Build toward 30 total DEX with the Jousting Helmet/gear breakpoint rather than overspending permanent AP.'],
    ['30','+5 STR',135,27,'Blue Axe (2H default) / Fireman\'s Axe + shield alternative',30,'The level-30 handoff is 135 base STR / 27 base DEX. Axe Mastery works with either one- or two-handed axes; this build defaults to the higher-W.ATK 2H path.'],
    ['31–36','+3 STR / +2 DEX each level',153,39,'Niam / Sabretooth',35,'Front-load DEX for accuracy and later equipment requirements after the Fighter advancement.'],
    ['37–57','+4 STR / +1 DEX each level',237,60,'Sabretooth / The Rising',50,'Reach 60 base DEX by level 57; gear may reduce the permanent DEX needed.'],
    ['58–70','ALL STR',302,60,'The Shining / Chrono',70,'Spend STR only after the DEX cap; check actual gear because level-70 two-handed axes require 70 effective DEX.']
  ].map(x=>({'Level Range':x[0],'AP Action':x[1],'Base STR Target':x[2],'Base DEX Target':x[3],'Weapon Target':x[4],'Weapon DEX Req':x[5],'Effective DEX Plan':x[6],'Scroll Plan':'Prefer safe 100%/60% upgrades; prioritize weapon attack and only add DEX when it changes hit rate or equips the next axe','Why':x[6],'Status':'Classic beta / verify at launch','Evidence Class':'CURRENT / VERIFY'}));
  const fighterQuests = classQuestRows(questAudit.quests, 'Fighter Build');
  const quests = buildQuestRows(fighterQuests, 'Fighter Build');
  const etc = buildEtcRows(base.etc, fighterQuests, 'Fighter Build');
  return {
    catalog:base.catalog, meta:{...base.meta}, dashboardMilestones:FIGHTER_MILESTONES,
    skills, skillOrder, skillTiers, skillIcons, gear, weapons:weaponRows, armor:gear,
    weaponPaths:{
      primary:{id:'axe-2h',label:'Axe · 2H damage default',summary:'Higher W.ATK and stronger two-handed multipliers; keeps Axe Mastery bleed and the Axe Booster/Final Attack path.',skillFamily:'Axe',shield:'None',checkpoints:['Blue Axe','Niam','Sabretooth','The Rising','The Shining','Chrono']},
      defensive:{id:'axe-1h-shield',label:'Axe · 1H + shield alternative',summary:'Same Axe Mastery/Booster/Final Attack skills with Guard and shield WDEF, traded against two-handed W.ATK.',skillFamily:'Axe',shield:'Red Cross Shield → Gold Ancient Shield',checkpoints:['Fireman\'s Axe','Dankke','Blue Counter','Buck','Hawkhead','Mikhail']},
      alternate:{id:'sword',label:'Sword alternative',summary:'Use only if consistency and extra Sword Mastery WDEF outweigh the axe family\'s average damage and bleed.',skillFamily:'Sword',shield:'Optional',checkpoints:['Scimitar','Zard','Lion\'s Fang','Sparta','Doombringer']}
    },
    recipes:buildRecipeRows(gear,gearPlan.levels,'Fighter Build'), upgrades:buildWeaponUpgradeRows(gear,gearPlan.levels,'Fighter Build','Fighter','Axe'),
    routes:routeBlocks.map(x=>({Levels:`${x[0]}–${x[1]}`,'Primary Route':x[2],'Main Monsters':x[3],'Main Skill / Method':x[4],'Why This Block':'Class-specific Axe Fighter route checkpoint; verify weakest-hit kills and hit rate before moving.','Major ETCs to Bank':'Active quest materials plus confirmed axe-crafting inputs','Weapon Decision Point':'Keep Axe Mastery, Axe Booster, and Final Attack: Axe on the same family; compare 2H W.ATK against 1H Guard','Quest / PQ Focus':'Warrior/Fighter advancement, Henesys citizenship, and the active class quest chain','Status':'CURRENT / VERIFY','Evidence Class':'CURRENT / VERIFY'})),
    leveling, quests, etc, apPlan, scrolls:base.scrolls, decisions:base.decisions,
    gearPresets:{efficient:{name:'Fighter Axe · 2H Progression',description:'Default researched axe-family path using two-handed damage breakpoints; compare 1H + shield only when Guard changes survivability.',levels:gearPlan.levels},luk:{name:'Fighter DEX / Accuracy Bridge',description:'Use the current axe checkpoint and add only the DEX or direct Accuracy needed for the next verified hit/equipment breakpoint.',levels:gearPlan.levels}},
    fighterDatabase:{monsters:monsterAudit.monsters,crafting:craftingAudit}
  };
}

function hunterVariant(base) {
  const audit = JSON.parse(fs.readFileSync(path.join(root, 'audit', 'fighter-skills.json'), 'utf8'));
  const items = JSON.parse(fs.readFileSync(path.join(root, 'audit', 'fighter-items.json'), 'utf8'));
  const quests = JSON.parse(fs.readFileSync(path.join(root, 'audit', 'fighter-quests.json'), 'utf8'));
  const monsters = JSON.parse(fs.readFileSync(path.join(root, 'audit', 'fighter-monsters.json'), 'utf8'));
  const crafting = JSON.parse(fs.readFileSync(path.join(root, 'audit', 'fighter-crafting.json'), 'utf8'));
  // Keep only Beginner + Bowman first job + Hunter bow second job. The audit
  // also contains Crossbowman, Ranger, and Sniper groups.
  const groups = [
    ...(audit.beginner || []),
    ...((audit.archer || []).slice(0, 2))
  ];
  const all = groups.flatMap(g => g.skills || []).filter(s => !/Crossbow|Iron Arrow/.test(s.name));
  const beginner = beginnerSkillRows();
  const skillOrder = ['Three Snails','Recovery','Nimble Feet','Critical Shot','The Eye of Amazon','Focus','Power Knockback','Arrow Blow','Bow Mastery',"Amazon's Judgement",'Bow Booster','Soul Arrow: Bow','Final Attack: Bow','Arrow Bomb: Bow'];
  const skillTiers = [
    {id:'beginner', label:'Beginner', opens:1, names:['Three Snails','Recovery','Nimble Feet']},
    {id:'bowman', label:'Bowman · 1st Job', opens:10, names:['Critical Shot','The Eye of Amazon','Focus','Power Knockback','Arrow Blow','Double Shot']},
    {id:'hunter', label:'Hunter · 2nd Job · Bow', opens:30, names:['Bow Mastery',"Amazon's Judgement",'Final Attack: Bow','Bow Booster','Soul Arrow: Bow','Arrow Bomb: Bow']}
  ];
  const skillIcons = Object.fromEntries(all.map(s => [s.name,{id:s.id,max:s.max_level,role:s.passive?'Passive':(s.mechanics?.label||'Combat skill'),desc:String(s.description||'').replace(/\s+/g,' ').trim()}]));
  const first = [
    [10,'Arrow Blow +1','AB 1'],
    [11,'Arrow Blow +3','AB 4'],
    [12,'Arrow Blow +2, The Eye of Amazon +1','AB 6 | EYE 1'],
    [13,'Arrow Blow +3','AB 9 | EYE 1'],
    [14,'Arrow Blow +3','AB 12 | EYE 1'],
    [15,'Arrow Blow +1, The Eye of Amazon +2','AB 13 | EYE 3'],
    [16,'Arrow Blow +3','AB 16 | EYE 3'],
    [17,'Arrow Blow +3','AB 19 | EYE 3'],
    [18,'Arrow Blow +1, Critical Shot +2','AB 20 | CS 2 | EYE 3'],
    [19,'Critical Shot +3','AB 20 | CS 5 | EYE 3'],
    [20,'Critical Shot +3','AB 20 | CS 8 | EYE 3'],
    [21,'Critical Shot +3','AB 20 | CS 11 | EYE 3'],
    [22,'Critical Shot +3','AB 20 | CS 14 | EYE 3'],
    [23,'Critical Shot +1, The Eye of Amazon +2','AB 20 | CS 15 | EYE 5'],
    [24,'The Eye of Amazon +3','AB 20 | CS 15 | EYE 8'],
    [25,'The Eye of Amazon +3','AB 20 | CS 15 | EYE 11'],
    [26,'The Eye of Amazon +3','AB 20 | CS 15 | EYE 14'],
    [27,'The Eye of Amazon +1, Focus +2','AB 20 | CS 15 | EYE 15 | FOC 2'],
    [28,'Focus +3','AB 20 | CS 15 | EYE 15 | FOC 5'],
    [29,'Focus +3','AB 20 | CS 15 | EYE 15 | FOC 8'],
    [30,'Focus +2, Power Knockback +1','AB 20 | CS 15 | EYE 15 | FOC 10 | PKB 1']
  ];
  // Current Classic Hunter order: Arrow Bomb immediately, then Mastery and
  // Booster/Soul Arrow prerequisites, max Mastery, build Arrow Bomb, finish
  // Final Attack, max Amazon's Judgement, and extend buff durations.
  const second = [[30, 'Arrow Bomb: Bow +1', 'Arrow Bomb 1', 1], ...secondJobPlan(31, 70, [
    {name:'Bow Mastery', label:'Bow Mastery', points:5},
    {name:'Bow Booster', label:'Bow Booster', points:5},
    {name:'Soul Arrow: Bow', label:'Soul Arrow', points:1},
    {name:'Bow Mastery', label:'Bow Mastery', points:15},
    {name:'Final Attack: Bow', label:'Final Attack', points:1},
    {name:'Arrow Bomb: Bow', label:'Arrow Bomb', points:29},
    {name:'Final Attack: Bow', label:'Final Attack', points:28},
    {name:'Final Attack: Bow', label:'Final Attack', points:1},
    {name:"Amazon's Judgement", label:'Amazon\'s Judgement', points:20},
    {name:'Bow Booster', label:'Bow Booster', points:5},
    {name:'Soul Arrow: Bow', label:'Soul Arrow', points:10}
  ])];
  const skills=[...beginner,...[...first,...second].map(([Level,Spend,result,spOverride])=>({Level,SP:spOverride ?? (Level===10?1:3),Spend,'Why This Is The Action':Level<30?'Current Classic Bowman first-job route: raise Arrow Blow, take Eye early for range, then finish Critical Shot, Eye, Focus, and one Power Knockback.':'Current Classic Hunter route: unlock Arrow Bomb immediately, raise Bow Mastery and speed prerequisites, then max Arrow Bomb, Final Attack, Amazon\'s Judgement, Booster, and Soul Arrow in the researched order.','Meso / MP Logic':'Use Arrow Blow on single mobs, Arrow Bomb on packs, keep Soul Arrow active when arrow savings matter, and preserve potions for real hit/damage breakpoints.','Result After Level':result||'Hunter checkpoint','Status':'Classic beta / verify at launch','Evidence Class':'CURRENT / VERIFY'}))];
  // Bowman is the job label shared by both bows and crossbows in the export;
  // this build must expose the Hunter bow branch only.
  const bows=(items.items||[]).filter(i=>i.category==='Equipment' && (
    (i.sub_category==='Weapon' && i.weapon_type==='Bow' && /\bBowman\b/.test(classEquipmentLabel(i)))
    || (i.sub_category!=='Weapon' && /\bBowman\b/.test(classEquipmentLabel(i)) && !/\bMage\b/i.test(classEquipmentLabel(i)))
  ));
  let gear=[{Item:'None',Slot:'Any','Item ID':0,'Icon URL':'',STR:0,DEX:0,INT:0,LUK:0,'W.ATK':0,WDEF:0,MDEF:0,Speed:0,Jump:0,'Req Lv':0,Status:'CURRENT / VERIFY','Class Fit':'Any · Hunter','Job Family':'Any','Job Branch':'None','Req Job':'Any','Req Job ID':0,'Item Type':'Empty',Plan:'EMPTY','Priority':'—','Highly Recommended':false,'Recommendation Reason':'',Notes:'Empty slot'},...bows.map(i=>{const s=i.stats||{};return {Item:i.name,Slot:equipmentSlot(i),'Item ID':i.id,'Icon URL':`/game-media/items/primary/${i.id}`,STR:s.incSTR||0,DEX:s.incDEX||0,INT:s.incINT||0,LUK:s.incLUK||0,'W.ATK':s.incPAD||0,WDEF:s.incPDD||0,MDEF:s.incMDD||0,Speed:s.incSpeed||0,Jump:s.incJump||0,'Req Lv':s.reqLevel||0,'Req STR':s.reqSTR||0,'Req DEX':s.reqDEX||0,Status:'CURRENT / VERIFY','Class Fit':classEquipmentFit(i,'Bowman','Hunter'),...equipmentFields(i,'Bowman','Hunter'),Plan:'OPTIONAL',Priority:'Use at the relevant bow breakpoint', 'Highly Recommended':false,'Recommendation Reason':'',Notes:i.weapon_type?`${i.weapon_type} · ${i.attack_speed_label || ''}`:`${classEquipmentLabel(i)} Hunter equipment`};})];
  const gearPlan = applyGearPlan(gear, [
    {min:10, gear:{Weapon:'War Bow',Hat:'Brown Winter Hat',Top:'Brown Archer Top',Bottom:'Archer Pants',Shoes:'Brown Hard Leather Boots'}, reason:'First Bowman bow and starter armor checkpoint.'},
    {min:15, gear:{Weapon:'Composite Bow',Hat:'Green Feather Hat',Top:'Green Able Armor',Bottom:'Green Able Armor Skirt',Shoes:'Green Woodsman Boots',Gloves:'Basic Archer Gloves'}, reason:'Level-15 bow and first complete Bowman gear checkpoint.'},
    {min:20, gear:{Weapon:"Hunter's Bow",Hat:'Green Robin Hat',Top:'Brown Hard Leather Top',Bottom:'Brown Hard Leather Pants',Shoes:'Deer Huntertop',Gloves:'Green Diros'}, reason:'Level-20 Hunter bow and armor breakpoint.'},
    {min:25, gear:{Weapon:'Battle Bow',Hat:'Green Hunter',Top:'Green Bennis Chainmail',Bottom:'Bennis Chain Pants',Shoes:'Green Jack Boots',Gloves:'Blue Savata'}, reason:'Level-25 bow and armor checkpoint before advancement.'},
    {min:30, gear:{Weapon:'Ryden',Hat:'Green Hawkeye',Top:"Green Hunter's Armor",Bottom:"Green Hunter's Pants",Shoes:'Green Snowshoes',Gloves:'Green Marker'}, reason:'Level-30 Hunter advancement and full class armor checkpoint.'},
    {min:35, gear:{Weapon:'Red Viper',Hat:'Green Pole-Feather Hat',Top:'Green Legolier',Bottom:'Green Legolier Pants',Shoes:'Green Silky Boots',Gloves:'Mithril Scaler'}, reason:'Level-35 bow and armor checkpoint.'},
    {min:40, gear:{Weapon:'Vaulter 2000',Hat:'Green Distinction',Top:'Brown Piette',Bottom:'Brown Piette Pants',Shoes:'Brown Pierre Shoes',Gloves:'Aqua Brace'}, reason:'Level-40 bow and DEX armor breakpoint.'},
    {min:50, gear:{Weapon:'Olympus',Hat:'Green Maro',Overall:'Blue Lumati',Shoes:'Blue Steel-Tip Boots',Gloves:'Blue Willow'}, reason:'Level-50 bow and overall checkpoint.'},
    {min:60, gear:{Weapon:'Asianic Bow',Hat:'Brown Polyfeather Hat',Overall:'Blue Choro',Shoes:'Blue Gore Boots',Gloves:'Oaker Garner'}, reason:'Level-60 bow and high-DEX overall checkpoint.'},
    {min:70, gear:{Weapon:'Golden Hinkel',Hat:'Blue Patriot',Overall:'Blue Linnex',Shoes:'Blue Elf Shoes',Gloves:'Blue Eyes'}, reason:'Level-70 Hunter capstone equipment checkpoint.'}
  ], 'Hunter');
  gear = gearPlan.gear;
  const routes=[
    routeBlock(1, 9, [50, 1004, 1005], 'Snail / Blue Snail / Shroom', 'Finish the shared Beginner route and all 3/3/3 skills before the Bowman advancement.'),
    routeBlock(10, 12, [10001021, 10001070, 10001010], 'Red Snail / Shroom / Orange Mushroom / Pig', 'Arrow Blow is the ranged single-target tool; buy plain arrows and keep DEX as the damage/Accuracy stat.'),
    routeBlock(13, 15, [10002031, 10000012, 10001010], 'Green Mushroom / Slime / Pig', 'Use Eye of Amazon range to preserve spacing; Arrow Blow remains cheaper than Double Shot for this route.'),
    routeBlock(16, 20, [10002075, 10002033], 'Green Mushroom / Horny Mushroom / Slime', 'Critical Shot and Eye improve ranged reliability; never enter a map that drops below the verified hit-rate target.'),
    routeBlock(21, 25, [10002075, 10002033], 'Green Mushroom / Horny Mushroom / Slime', 'Keep Arrow Blow maxed, then finish Critical Shot/Eye while staying outside the bow dead zone.'),
    routeBlock(26, 30, [10003062, 10003061], 'Stirge / Bubbling', 'Finish Bowman SP, carry arrows, take Henesys citizenship when available, and complete the Hunter advancement.'),
    routeBlock(31, 35, [10003062, 10003061], 'Stirge / Bubbling / Wild Boar', 'Arrow Bomb starts at 1; add Bow Mastery, Bow Booster, and Soul Arrow before forcing a new map.'),
    routeBlock(36, 40, [10005065, 10005064], 'Stirge / Zombie Mushroom / Horny Mushroom', 'Use the 65 px dead-zone rule, keep the mob at bow range, and finish Bow Mastery at the level-39 checkpoint.'),
    routeBlock(41, 50, [10005070, 10005062], 'Zombie Mushroom / Evil Eye / Horny Mushroom', 'Arrow Bomb handles packs; use Arrow Blow or Double Shot for isolated targets and keep Final Attack off when it causes overkill.'),
    routeBlock(51, 60, [20000082, 20000084], 'Lunar Pixie / Star Pixie', 'Cloud Park III/IV are the researched ranged checkpoints; refill arrows until Soul Arrow uptime is comfortable.'),
    routeBlock(61, 70, [20000087, 20000088], 'Luster Pixie / Lunar Pixie', 'Finish the Hunter endpoint on Cloud Park V/VI, then plan the Ranger advancement separately; do not fabricate third-job SP.' )
  ];
  const leveling=Array.from({length:70},(_,i)=>{const Lv=i+1,r=routes.find(x=>Lv>=x[0]&&Lv<=x[1]);return {Lv,Job:Lv<10?'Beginner':Lv<30?'Bowman':'Hunter','Primary Route':r[2],'Main Monsters':r[3],'Hunter Method':r[4],'Alternative':'Use the nearest retained Classic layout with a reliable hit rate and enough firing room','Quest / PQ Tie-In':Lv<10?'Maple Island quest chain':Lv<30?'Bowman advancement, Henesys citizenship, and Archer quest chains':'Hunter advancement, ammo management, and the active Hunter quest chain','Gear Hunt Tie-In':'Use the next bow breakpoint and carry enough arrow stacks','SAVE ETC / ITEM NOW':'Bank active quest materials, arrows, and only confirmed bow-crafting inputs','Target Qty':'As required by the active quest, arrow restock, or next bow craft','Priority / Used For':'Route, range, hit rate, and Arrow Bomb progression','When You Can Stop Saving':'After the active quest chain or bow craft is complete','Confidence':'CURRENT / VERIFY','Evidence Class':'CURRENT / VERIFY'};});
  const apPlan=[
    ['1–10','ALL DEX',5,57,'War Bow',25,'Keep base STR at 5 and put all level-up AP into DEX; job advancement itself has no stat requirement.'],
    ['11–15','+10 STR / +15 DEX',15,72,'Composite Bow',35,'Meet the level-15 bow requirement while DEX remains the primary damage and Accuracy stat.'],
    ['16–20','+5 STR / +20 DEX',20,92,"Hunter's Bow",45,'Use equipment stats where available, but do not miss the next bow requirement.'],
    ['21–25','+5 STR / +20 DEX',25,112,'Battle Bow',55,'Keep DEX primary and reach the researched level-25 bow breakpoint.'],
    ['26–30','+5 STR / +20 DEX',30,132,'Ryden',65,'Reach the level-30 bow sample; Bronze Arrows and safe Gloves Attack upgrades matter more than random armor shopping.'],
    ['31–70','+1 STR / +4 DEX each level',70,292,'Golden Hinkel',70,'Continue the current Classic plan: 70 base STR / 292 base DEX at level 70, with gear allowed to replace permanent STR where a requirement is already covered.']
  ].map(x=>({'Level Range':x[0],'AP Action':x[1],'Base STR Target':x[2],'Base DEX Target':x[3],'Weapon Target':x[4],'Weapon DEX Req':x[5],'Effective DEX Plan':x[6],'Primary Stat':'DEX','Secondary Stat':'STR for bow requirements and damage','Scroll Plan':'Bow Attack weapon scrolls and Gloves Attack first; use safe progression upgrades','Why':x[6],'Status':'Classic beta / verify at launch','Evidence Class':'CURRENT / VERIFY'}));
  const hunterQuests = classQuestRows(quests.quests, 'Hunter Build');
  const questRows = buildQuestRows(hunterQuests, 'Hunter Build');
  const etc = buildEtcRows(base.etc, hunterQuests, 'Hunter Build');
  return {
    catalog:base.catalog, meta:{...base.meta}, dashboardMilestones:HUNTER_MILESTONES,
    skills, skillOrder, skillTiers, skillIcons, gear,
    weapons:gear.filter(x=>x.Slot==='Weapon').map(x=>({Lv:x['Req Lv']||1,Weapon:x.Item,Type:x['Item ID'],'Weapon Type':'Bow','W.ATK':x['W.ATK']||0,Speed:x.Speed||0,'Req STR':x['Req STR']||0,'Upgrade Priority':['War Bow','Composite Bow',"Hunter's Bow",'Battle Bow','Ryden','Red Viper','Vaulter 2000','Olympus','Asianic Bow','Golden Hinkel'].includes(x.Item)?'CORE · BUY AT BREAKPOINT':'OPTIONAL','Why':x.Notes||'Bow breakpoint'})).sort((a,b)=>Number(a.Lv)-Number(b.Lv)||String(a.Weapon).localeCompare(String(b.Weapon))),
    armor:gear, weaponPath:'Bow + arrows · two-handed ranged path; no shield',
    recipes:buildRecipeRows(gear,gearPlan.levels,'Hunter Build'), upgrades:buildWeaponUpgradeRows(gear,gearPlan.levels,'Hunter Build','Hunter','Bow'),
    routes:routes.map(x=>({Levels:`${x[0]}–${x[1]}`,'Primary Route':x[2],'Main Monsters':x[3],'Main Skill / Method':x[4],'Why This Block':'Class-specific Hunter route checkpoint; maintain firing room and verify hit rate before moving.','Major ETCs to Bank':'Active quest materials plus confirmed arrow/bow inputs','Weapon Decision Point':'Use the next bow breakpoint and arrow tier; W.ATK beats speculative crit gear for this route','Quest / PQ Focus':'Bowman/Hunter advancement, Henesys citizenship, ammo, and class-appropriate chain','Status':'CURRENT / VERIFY','Evidence Class':'CURRENT / VERIFY'})),
    leveling, quests:questRows, etc, apPlan, scrolls:base.scrolls, decisions:base.decisions,
    gearPresets:{efficient:{name:'Hunter Bow Progression',description:'DEX-first bow progression with Arrow Blow → Arrow Bomb, current bow breakpoints, and minimum-STR guidance after level 30.',levels:gearPlan.levels},luk:{name:'Hunter STR / Bow Requirement Bridge',description:'Use the current bow checkpoint and add only the STR needed for the next bow; keep the rest of each level in DEX.',levels:gearPlan.levels}},
    hunterDatabase:{monsters:monsters.monsters,crafting}
  };
}

function readChunk(name) {
  const directRepair = path.join(repairs, name);
  if (fs.existsSync(directRepair)) return fs.readFileSync(directRepair, 'utf8');
  const stem = name.replace(/\.txt$/, '');
  let repaired = '';
  for (let i = 0; ; i++) {
    const part = path.join(repairs, `${stem}.part${i}.txt`);
    if (!fs.existsSync(part)) break;
    repaired += fs.readFileSync(part, 'utf8');
  }
  if (repaired) return repaired;
  return fs.readFileSync(path.join(runtime, name), 'utf8');
}

function readChunks(prefix, count) {
  let base64 = '';
  for (let i = 0; i < count; i++) {
    const name = `${prefix}.${String(i).padStart(2, '0')}.txt`;
    base64 += readChunk(name).replace(/\s+/g, '');
  }
  return zlib.gunzipSync(Buffer.from(base64, 'base64')).toString('utf8');
}

function ownedUrls(text) {
  return String(text)
    .replaceAll('https://raw.githubusercontent.com/ohmi69/osms_datamine_dashboard/main/', '/game-data/')
    .replaceAll('https://meowdb.com/msclassic/api/assets/icons/', '/game-media/icons/')
    .replaceAll('https://api.dreamms.gg/api/GMS/latest/item/', '/game-media/items/primary/')
    .replaceAll('https://api.dreamms.gg/api/GMS/latest/pet/', '/game-media/pets/')
    .replaceAll('https://api.dreamms.gg/api/GMS/latest/character/', '/game-media/characters/')
    .replaceAll('https://api.dreamms.gg/api/GMS/latest/mob/', '/game-media/monsters/')
    .replaceAll('https://maplestory.io/api/GMS/83/item/', '/game-media/items/fallback/')
    .replaceAll('https://maplestory.io/api/wz/img/GMS/83/Skill/', '/game-media/skills/');
}

function publicScript(text) {
  return ownedUrls(text)
    .replaceAll('OSMS', 'TCW')
    .replaceAll('Osms', 'Tcw')
    .replaceAll('osms', 'tcw')
    .replaceAll('COT2', 'CURRENT')
    .replaceAll('Cot2', 'Current')
    .replaceAll('cot2', 'current');
}

function sanitizePublicGuide(value, key = '') {
  if (Array.isArray(value)) {
    return value.map(v => sanitizePublicGuide(v, key)).filter(v => v !== undefined);
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (/(?:source|provider|evidence|provenance|audit|canonical|spreadsheet|launchscope|legacyparity|parityexamples|questcoverage|questaudit)/i.test(k)) continue;
      const clean = sanitizePublicGuide(v, k);
      if (clean !== undefined) out[k] = clean;
    }
    return out;
  }
  if (typeof value === 'string') {
    let clean = ownedUrls(value);
    if (/https?:\/\//i.test(clean)) return undefined;
    clean = clean
      .replace(/\bCOT2\b/gi, 'current')
      .replace(/\bCOT1\b/gi, 'earlier')
      .replace(/\bOSMS\b/gi, 'Top Classic World')
      .replace(/pre[- ]launch/gi, 'current')
      .replace(/\s{2,}/g, ' ')
      .trim();
    return clean;
  }
  return value;
}

function publicGuide(raw) {
  const data = JSON.parse(raw);
  const catalog = multiBuildCatalog(data.catalog);
  const fighter = fighterVariant(data);
  const hunter = hunterVariant(data);
  // Every guide reads the same build library. Gameplay arrays differ by build;
  // navigation metadata must not.
  data.catalog = catalog;
  fighter.catalog = catalog;
  hunter.catalog = catalog;
  data.buildVariants = {fighter, hunter};
  if (data.meta) {
    data.meta = {
      title: BRAND,
      version: assetVersion,
      builtAt: data.meta.builtAt,
      maxLevel: data.meta.maxLevel,
      recommendationPolicy: data.meta.recommendationPolicy
    };
  }
  // Variants are rendered through the same dashboard/runtime as I/L. Keep the
  // shared max-level metadata and milestone model on every selected guide.
  fighter.meta = {...(data.meta || {}), title: BRAND};
  hunter.meta = {...(data.meta || {}), title: BRAND};
  fighter.dashboardMilestones = fighter.dashboardMilestones || FIGHTER_MILESTONES;
  hunter.dashboardMilestones = hunter.dashboardMilestones || HUNTER_MILESTONES;
  if (Array.isArray(data.sources)) data.sources = [];
  return JSON.stringify(sanitizePublicGuide(data));
}

function patchApp(raw) {
  let app = ownedUrls(raw).replaceAll('MapleStory Classic Builder', BRAND);
  app = app.replace('  const D = window.GUIDE_DATA;', `  let D = window.GUIDE_DATA;
  let requestedBuild = '';
  try {
    const saved = JSON.parse(localStorage.getItem('ultimateILGuideState.v1') || '{}');
    requestedBuild = new URLSearchParams(location.search).get('build') || saved.activeBuildId || '';
    const researched = new Set((D.catalog?.builds||[]).filter(build=>build.status==='active').map(build=>build.id));
    if(!researched.has(requestedBuild)) requestedBuild = D.catalog?.activeBuildId || 'magician-il-fresh';
    const variant = { 'warrior-fighter':'fighter', 'archer-hunter':'hunter' }[requestedBuild];
    if(variant && D.buildVariants?.[variant]) D = D.buildVariants[variant];
  } catch(e) {}
  // All enhancement modules receive the selected guide, never the I/L root
  // object. This is the boundary that keeps every page build-aware.
  window.GUIDE_DATA = D;
  window.TCW_ACTIVE_BUILD_ID = requestedBuild || D.catalog?.activeBuildId || 'magician-il-fresh';`);
  app = app.replace(
    "  const KEY = 'ultimateILGuideState.v1';",
    "  const LEGACY_KEY = 'ultimateILGuideState.v1';\n  // Preserve the established I/L save unchanged; other researched builds own\n  // their level, gear, checklist, and planner state.\n  const KEY = window.TCW_ACTIVE_BUILD_ID==='magician-il-fresh' ? LEGACY_KEY : `${LEGACY_KEY}.${window.TCW_ACTIVE_BUILD_ID}`;"
  );
  app = require('./patches/usability.cjs')(app);
  app = app.replace(
    "    const profile=activeBuild();",
    "    const profile=activeBuild();\n    const bridge=document.getElementById('preset-luk'); if(bridge) bridge.textContent=profile?.id==='warrior-fighter'?'Accuracy Bridge':profile?.id==='archer-hunter'?'STR Bow Bridge':'LUK Bridge';"
  );
  app = app.replace("    const profile=activeBuild();", "    const profile=activeBuild();\n    const buildTitle=document.getElementById('hero-build-title'); if(buildTitle) buildTitle.textContent=profile?.name||'I/L Wizard Build';\n    const buildSub=document.getElementById('hero-build-subtitle'); if(buildSub) buildSub.textContent=profile?.subtitle||'Current route';\n    const heroClass=document.querySelector('.v5-kicker-row .class-pill'); if(heroClass) heroClass.textContent=classForBuild(profile)?.name?.toUpperCase()||'MAGICIAN';\n    const heroJob=document.querySelector('.v5-kicker-row .job-pill'); if(heroJob) heroJob.textContent=profile?.shortName||'I/L WIZARD';");
  app = app.replace("  function recommendedWeaponName(level=state.level){", "  function classCoreWeaponName(level=state.level){\n    const stages=D.gearPresets?.efficient?.levels||[];\n    const stage=[...stages].filter(x=>Number(x.min||0)<=level).sort((a,b)=>Number(a.min||0)-Number(b.min||0)).at(-1);\n    return stage?.gear?.Weapon||'None';\n  }\n  function recommendedWeaponName(level=state.level){\n    if(['warrior-fighter','archer-hunter'].includes(activeBuild()?.id)) return classCoreWeaponName(level);");
  app = app.replace("  function renderAtlasSkills(){", "  function renderClassAtlasSkills(){\n    const tabs=document.getElementById('atlas-skill-tabs'),grid=document.getElementById('atlas-skill-grid'),detail=document.getElementById('atlas-skill-detail');\n    if(!tabs||!grid||!detail)return;\n    const profile=activeBuild()||{};\n    const tiers=D.skillTiers||[];\n    const level=Math.max(1,Math.min(Number(D.meta?.maxLevel)||70,Number(state.level)||1));\n    const defaultTier=level<10?'beginner':level<30?(tiers[1]?.id||'first'):(tiers[2]?.id||'second');\n    const chosen=tiers.some(t=>t.id===state.skillTab)?state.skillTab:defaultTier;\n    const tier=tiers.find(t=>t.id===chosen)||tiers[0];\n    const allocations={};\n    (D.skills||[]).filter(row=>Number(row.Level)<=level).forEach(row=>String(row.Spend||'').split(',').forEach(part=>{const m=part.trim().match(/^(.+?)\\s+\\+(\\d+)/);if(m)allocations[m[1]]=(allocations[m[1]]||0)+Number(m[2]);}));\n    if(level>=10)['Three Snails','Recovery','Nimble Feet'].forEach(name=>allocations[name]=3);\n    tabs.innerHTML=`<span class=\"eyebrow\">${esc((profile.shortName||'CLASS').toUpperCase())} SKILL PLAN</span>`+tiers.map(t=>`<button class=\"atlas-skill-tab ${t.id===tier.id?'active':''} ${level<t.opens?'locked':''}\" data-skill-tab=\"${esc(t.id)}\">${esc(t.label)}${level<t.opens?`<small>Lv${t.opens}</small>`:''}</button>`).join('');\n    tabs.querySelectorAll('[data-skill-tab]').forEach(button=>button.addEventListener('click',()=>{state.skillTab=button.dataset.skillTab;save();renderClassAtlasSkills();}));\n    const names=(tier.names||[]).filter(name=>D.skillIcons?.[name]);\n    const locked=level<tier.opens;\n    const currentRow=D.skills.filter(row=>Number(row.Level)===level).at(-1)||D.skills.filter(row=>Number(row.Level)<=level).at(-1)||D.skills[0];\n    const detailName=grid.querySelector('.atlas-skill-card.selected')?.dataset.skillName||names.find(name=>Number(allocations[name]||0)>0)||names[0];\n    const updateCard=(card,name)=>{const info=D.skillIcons[name]||{},max=Number(info.max||20),lv=locked?0:Math.min(max,Number(allocations[name]||0));card.classList.toggle('learned',lv>0);card.classList.toggle('unlearned',lv===0);card.classList.toggle('tier-locked',locked);const small=card.querySelector('small');if(small)small.textContent=`Lv. ${lv}/${max}`;};\n    if(grid.dataset.classSkillTier===tier.id&&grid.querySelectorAll('.atlas-skill-card').length===names.length){grid.querySelectorAll('.atlas-skill-card').forEach(card=>updateCard(card,card.dataset.skillName));}else{grid.dataset.classSkillTier=tier.id;grid.innerHTML=names.map(name=>{const info=D.skillIcons[name]||{},max=Number(info.max||20),lv=locked?0:Math.min(max,Number(allocations[name]||0));return `<button class=\"atlas-skill-card ${lv>0?'learned':'unlearned'} ${locked?'tier-locked':''}\" data-skill-name=\"${esc(name)}\"><span class=\"skill-img-wrap\">${skillImgTag(name,'skill-icon')}</span><b>${esc(name)}</b><small>Lv. ${lv}/${max}</small></button>`;}).join('');}\n    const show=name=>{if(!name)return;const info=D.skillIcons[name]||{},max=Number(info.max||20),lv=locked?0:Math.min(max,Number(allocations[name]||0));detail.innerHTML=`<span class=\"skill-img-wrap\">${skillImgTag(name,'skill-icon')}</span><div><span class=\"detail-kicker\">${esc(tier.label.toUpperCase())} · CLASSIC SKILL</span><b>${esc(name)} · Lv ${lv}/${max}</b><p>${esc(info.desc||'Follow the selected class progression.')}</p><small>${locked?'Unlocks at':'Current'} Lv${tier.opens}${currentRow?` · SP action: <strong>${esc(currentRow.Spend||'Follow the plan')}</strong>`:''}</small></div>`;hookImageFallback(detail);};\n    grid.querySelectorAll('[data-skill-name]').forEach(button=>button.onclick=()=>{grid.querySelectorAll('.atlas-skill-card').forEach(card=>card.classList.remove('selected'));button.classList.add('selected');show(button.dataset.skillName);});\n    if(detailName&&names.includes(detailName))show(detailName);else show(names[0]);\n    hookImageFallback(grid);\n    window.TCW_REFRESH_SKILL_STATE?.();\n  }\n  function renderAtlasSkills(){\n    if(['warrior-fighter','archer-hunter'].includes(activeBuild()?.id))return renderClassAtlasSkills();");

  const oldSetLevel = `function setLevel(level){\n    state.level=Math.max(1,Math.min(Number(D.meta.maxLevel)||70,Number(level)||1));\n    save();\n    renderAll();\n  }`;
  const newSetLevel = `function preserveLoadedImages(root,render){\n    const pool=new Map();\n    if(root) root.querySelectorAll('img[src]').forEach(img=>{\n      const key=[img.getAttribute('src')||'',img.alt||'',img.className||''].join('¦');\n      if(!pool.has(key))pool.set(key,[]);\n      pool.get(key).push(img);\n    });\n    render();\n    if(!root)return;\n    root.querySelectorAll('img[src]').forEach(img=>{\n      const key=[img.getAttribute('src')||'',img.alt||'',img.className||''].join('¦');\n      const old=pool.get(key)?.shift();\n      if(old&&old!==img&&old.complete&&old.naturalWidth>0)img.replaceWith(old);\n    });\n  }\n  function renderLevelPage(){\n    const p=state.page;\n    const root=document.querySelector('.page[data-page="'+p+'"]');\n    preserveLoadedImages(root,()=>{\n      if(p==='dashboard')renderDashboard();\n      else if(p==='builds')renderBuildLibrary();\n      else if(p==='leveling')renderRoutes();\n      else if(p==='quests')renderQuests();\n      else if(p==='equipment'){renderWeapons();renderEquipment('equipment-window-page','build-summary-page');}\n      else if(p==='skills')renderSkills();\n      else if(p==='etc')renderEtc();\n      else if(p==='formulas')renderFormulas();\n    });\n  }\n  function setLevel(level){\n    const next=Math.max(1,Math.min(Number(D.meta.maxLevel)||70,Number(level)||1));\n    if(next===state.level)return;\n    state.level=next;\n    save();\n    const a=document.getElementById('level-select'),b=document.getElementById('hero-level-select'),r=document.getElementById('level-range');\n    if(a)a.value=String(next);if(b)b.value=String(next);if(r)r.value=String(next);\n    document.documentElement.dataset.levelUpdate='1';\n    renderLevelPage();\n    requestAnimationFrame(()=>document.documentElement.removeAttribute('data-level-update'));\n  }`;
  // Beginner allocations already come from the per-level rows. Do not overwrite Nimble Feet with a fake Lv3 at the job change.
  app = app.replace("    if(level>=10)['Three Snails','Recovery','Nimble Feet'].forEach(name=>allocations[name]=3);\n", '');
  if (!app.includes(oldSetLevel)) throw new Error('setLevel patch target missing');
  app = app.replace(oldSetLevel, newSetLevel);

  const pageHook = `if(p==='equipment') renderEquipment('equipment-window-page','build-summary-page');`;
  if (!app.includes(pageHook)) throw new Error('setPage patch target missing');
  app = app.replace(pageHook, `if(p==='dashboard') renderDashboard();\n    if(p==='leveling') renderRoutes();\n    if(p==='quests') renderQuests();\n    if(p==='skills') renderSkills();\n    if(p==='etc') renderEtc();\n    if(p==='equipment'){renderWeapons();renderEquipment('equipment-window-page','build-summary-page');}`);

  app = app.replace(
    "  function baseLukTarget(){ const a=currentAP(); return Number(a?.['Base LUK Target'] ?? (state.level>50?30:5)); }",
    "  function baseLukTarget(){ const a=currentAP(); const numeric=v=>{const n=Number(v);if(Number.isFinite(n))return n;const m=String(v??'').match(/-?\\d+(?:\\.\\d+)?/);return m?Number(m[0]):5;}; if(activeBuild()?.id==='warrior-fighter') return numeric(a?.['Base DEX Target'] ?? 5); if(activeBuild()?.id==='archer-hunter') return numeric(a?.['Base STR Target'] ?? 5); return numeric(a?.['Base LUK Target'] ?? (state.level>50?30:5)); }"
  );
  app = app.replace(
    "    const names=[...new Set((D.skills||[]).flatMap(row=>String(row.Spend||'').split(/[+,]/).map(x=>x.trim().replace(/\\s+\\+\\d+.*$/,'')).filter(Boolean)))].filter(name=>D.skillIcons?.[name]);",
    "    const names=(D.skillOrder||[...new Set((D.skills||[]).flatMap(row=>String(row.Spend||'').split(/[+,]/).map(x=>x.trim().replace(/\\s+\\+\\d+.*$/,'')).filter(Boolean)))]).filter(name=>D.skillIcons?.[name]);"
  );
  app = app.replace(
    "  function currentCoreWeapon(level=state.level){\n    const names=[\"Beginner's Wooden Wand / job wand\",'Hardwood Wand','Mithril Wand','Cromi','Angel Wings'];\n    return names.map(getGear).filter(Boolean).filter(x=>Number(x['Req Lv'])<=level).sort((a,b)=>Number(b['Req Lv'])-Number(a['Req Lv']))[0]||null;\n  }",
    "  function currentCoreWeapon(level=state.level){\n    const names=['warrior-fighter','archer-hunter'].includes(activeBuild()?.id) ? [classCoreWeaponName(level)] : [\"Beginner's Wooden Wand / job wand\",'Hardwood Wand','Mithril Wand','Cromi','Angel Wings'];\n    return names.map(getGear).filter(Boolean).filter(x=>Number(x['Req Lv'])<=level).sort((a,b)=>Number(b['Req Lv'])-Number(a['Req Lv']))[0]||null;\n  }"
  );
  app = app.replace(
    "        <span>${w['M.ATK']?`${w['M.ATK']} MA`:'—'}</span>",
    "        <span>${w['W.ATK']?`${w['W.ATK']} W.ATK`:(w['M.ATK']?`${w['M.ATK']} MA`:'—')}</span>"
  );
  app = app.replace(
    "  function renderGearOptions(){",
    "  function classGearItemAllowed(item){\n    if(!item||item.Item==='None')return true;\n    const id=activeBuild()?.id;\n    if(id!=='warrior-fighter'&&id!=='archer-hunter')return true;\n    const text=String(item['Class Fit']||'')+' '+String(item['Req Job']||'');\n    const forbidden=/(mage|magician|wizard|cleric|thief|crossbow|spear|polearm|blunt)/i;\n    if(forbidden.test(text))return false;\n    if(id==='warrior-fighter')return /(warrior|any|fighter)/i.test(text);\n    return /(bowman|hunter|any)/i.test(text);\n  }\n  function classFilteredGearItems(slot){return gearItemsForSlot(slot).filter(classGearItemAllowed);}\n  function gearOptionStats(item,none){\n    if(none)return '';\n    const id=activeBuild()?.id;\n    if(id==='warrior-fighter') return `Lv ${item['Req Lv']||0}<br>W.ATK ${item['W.ATK']||0} · DEX ${item.DEX||0}<br>WDEF ${item.WDEF||0} · Speed ${item.Speed||0}`;\n    if(id==='archer-hunter') return `Lv ${item['Req Lv']||0}<br>W.ATK ${item['W.ATK']||0} · STR ${item.STR||0}<br>WDEF ${item.WDEF||0} · Speed ${item.Speed||0}`;\n    return `Lv ${item['Req Lv']||0}<br>INT ${item.INT||0} · LUK ${item.LUK||0}<br>M.ATK ${item['M.ATK']||0}<br>Crit ${item['Crit%']||0}% · CDMG ${item['Crit DMG']||0}%`;\n  }\n  function gearOptionMeta(item,none){\n    if(none)return '';\n    const id=activeBuild()?.id;\n    const job=String(item['Req Job']||item['Class Fit']||'Any');\n    const stat=id==='warrior-fighter'?`STR ${item['Req STR']||0} · DEX ${item['Req DEX']||0}`:id==='archer-hunter'?`STR ${item['Req STR']||0} · DEX ${item['Req DEX']||0}`:'';\n    return [`Lv ${item['Req Lv']||0}`,job,stat].filter(Boolean).join(' · ');\n  }\n  function updateGearFilterUi(){\n    const id=activeBuild()?.id, profile=activeBuild()||{}, branch=id==='warrior-fighter'?'Warrior / Fighter':id==='archer-hunter'?'Bowman / Hunter':(profile.shortName||'class');\n    const row=document.querySelector('[data-class-equipment-filters]'); if(row)row.hidden=false;\n    const future=document.getElementById('modal-future-label'), optional=document.getElementById('modal-optional-label');\n    if(future)future.textContent='Show future-level '+branch+' items';\n    if(optional)optional.textContent='Show all curated '+branch+' options';\n  }\n  function renderGearOptions(){"
  );
  app = app.replace(
    "    document.getElementById('modal-title').textContent=`Choose ${slot}`;\n    document.getElementById('gear-modal').classList.add('open');",
    "    document.getElementById('modal-title').textContent=`Choose ${slot}`;\n    updateGearFilterUi();\n    document.getElementById('gear-modal').classList.add('open');"
  );
  app = app.replace(
    "    let items=gearItemsForSlot(activeSlot);",
    "    updateGearFilterUi();\n    let items=classFilteredGearItems(activeSlot);\n    const beforeLevelFilter=items.length;\n    const futureCount=items.filter(x=>x.Item!=='None'&&Number(x['Req Lv']||0)>state.level).length;"
  );
  app = app.replace(
    "const forbidden=/(mage|magician|wizard|cleric|thief|crossbow|spear|polearm|blunt)/i;",
    "const forbidden=/\\b(?:mage|magician|wizard|cleric)\\b/i;"
  );
  app = app.replace(
    "    if(items.length===1 && items[0].Item==='None'){\n      root.innerHTML=`<div class=\"empty-option\">No meaningful ${esc(activeSlot)} target is in the curated class equipment pool yet. That is deliberate: an empty slot is better than chasing filler gear.</div>`;",
    "    const summary=document.getElementById('modal-filter-summary');\n    if(summary){\n      const profile=activeBuild()||{}, branch=profile.shortName||'Class';\n      summary.textContent=`${branch} equipment · Level ${state.level} · ${futureCount} future-level item${futureCount===1?'':'s'} ${showFuture?'shown':'hidden'} · ${Math.max(0,beforeLevelFilter-1)} class-matched option${beforeLevelFilter-1===1?'':'s'}`;\n    }\n    if(items.length===1 && items[0].Item==='None'){\n      root.innerHTML=`<div class=\"empty-option\">No ${esc(activeSlot)} item matches the ${esc((activeBuild()?.shortName||'selected class')+' job filter')}. Future-level and optional controls stay available above.</div>`;"
  );
  const gearSummaryNeedle = "    if(items.length===1 && items[0].Item==='None'){";
  if (!app.includes("const summary=document.getElementById('modal-filter-summary');")) {
    if (!app.includes(gearSummaryNeedle)) throw new Error('gear summary guard target missing');
    const gearSummaryPatch = [
      "    const summary=document.getElementById('modal-filter-summary');",
      "    if(summary){",
      "      const profile=activeBuild()||{}, branch=profile.shortName||'Class';",
      "      summary.textContent=`${branch} equipment · Level ${state.level} · ${futureCount} future-level item${futureCount===1?'':'s'} ${showFuture?'shown':'hidden'} · ${Math.max(0,beforeLevelFilter-1)} class-matched option${beforeLevelFilter-1===1?'':'s'}`;",
      "    }",
      gearSummaryNeedle
    ].join("\n");
    app = app.replace(gearSummaryNeedle, gearSummaryPatch);
  }
  app = app.replace(
    "<div><h4>${esc(item.Item)}</h4><div class=\"gear-badges\">${none?'':`<span class=\"plan-tag ${slug(item.Plan)}\">${esc(item.Plan)}</span><span class=\"class-tag\">${esc(item['Class Fit']||'Mage')}</span>`}</div><p>${esc(highly?(item['Recommendation Reason']||item.Notes||''):item.Notes||'Empty slot')}</p>${none?'':`<span class=\"evidence-tag ${String(item['Evidence Class']||'').includes('HISTORICAL')?'historical':String(item['Evidence Class']||'').includes('PRE-LAUNCH')?'verify':''}\" title=\"${esc(item['Parity Check']||'Current Classic/CURRENT cross-check status')}\">${esc(evidenceLabel(item))}</span>`}</div>",
    "<div><h4>${esc(item.Item)}</h4><div class=\"gear-badges\">${none?'':`<span class=\"plan-tag ${slug(item.Plan)}\">${esc(item.Plan)}</span><span class=\"class-tag\">${esc(item['Class Fit']||item['Req Job']||'Any')}</span>`}</div><p>${esc(highly?(item['Recommendation Reason']||item.Notes||''):item.Notes||'Empty slot')}</p>${none?'':`<span class=\"evidence-tag ${String(item['Evidence Class']||'').includes('HISTORICAL')?'historical':String(item['Evidence Class']||'').includes('PRE-LAUNCH')?'verify':''}\" title=\"${esc(item['Parity Check']||'Current Classic/CURRENT cross-check status')}\">${esc(evidenceLabel(item))}</span>`}</div>"
  );
  app = app.replace(
    "        <div class=\"stats\">${gearOptionStats(item,none)}</div>",
    "        <div class=\"stats\">${gearOptionStats(item,none)}${none?'':`<span class=\"gear-requirements\"><span>Requires</span> ${esc(gearOptionMeta(item,none))}</span>`}</div>"
  );
  app = app.replace(
    "        <div class=\"stats\">${none?'':`Lv ${item['Req Lv']||0}<br>INT ${item.INT||0} · LUK ${item.LUK||0}<br>M.ATK ${item['M.ATK']||0}<br>Crit ${item['Crit%']||0}% · CDMG ${item['Crit DMG']||0}%`}</div>",
    "        <div class=\"stats\">${gearOptionStats(item,none)}</div>"
  );
  app = app.replace(
    "  function renderLoadoutSnapshot(){",
    "  function snapshotSummary(b){\n    const id=activeBuild()?.id;\n    if(id==='warrior-fighter') return `${b.wAtk} W.ATK · ${b.effectiveDex} effective DEX`;\n    if(id==='archer-hunter') return `${b.wAtk} W.ATK · ${b.effectiveStr} effective STR`;\n    return `${b.int} INT · ${b.luk} gear LUK · ${b.matk} M.ATK`;\n  }\n  function snapshotRequirement(b){\n    const id=activeBuild()?.id;\n    if(b.ready) return 'Weapon ready';\n    if(id==='warrior-fighter') return `${Math.max(0,b.reqDex-b.effectiveDex)} DEX short`;\n    if(id==='archer-hunter') return `${Math.max(0,b.reqStr-b.effectiveStr)} STR short`;\n    return `${Math.max(0,b.reqLuk-b.effectiveLuk)} LUK short`;\n  }\n  function renderLoadoutSnapshot(){"
  );
  app = app.replace(
    "<div class=\"snapshot-footer\"><b>${b.int} INT · ${b.luk} gear LUK · ${b.matk} M.ATK</b><span class=\"${b.ready?'equip-ready':'equip-blocked'}\">${b.ready?'Weapon ready':`${Math.max(0,b.reqLuk-b.effectiveLuk)} effective LUK short`}</span></div>",
    "<div class=\"snapshot-footer\"><b>${snapshotSummary(b)}</b><span class=\"${b.ready?'equip-ready':'equip-blocked'}\">${snapshotRequirement(b)}</span></div>"
  );
  app = app.replace(
    "  document.getElementById('clear-gear')?.addEventListener('click',()=>{state.gear={...defaultGear,Weapon:state.level>=10?\"Beginner's Wooden Wand / job wand\":'None'};save();renderDashboard();renderEquipment('equipment-window-page','build-summary-page');toast('Build cleared');});",
    "  document.getElementById('clear-gear')?.addEventListener('click',()=>{state.gear={...defaultGear,Weapon:state.level>=10&&activeBuild()?.id==='magician-il-fresh'?\"Beginner's Wooden Wand / job wand\":'None'};save();renderDashboard();renderEquipment('equipment-window-page','build-summary-page');toast('Build cleared');});"
  );
  app = app.replace(
    /  document\.getElementById\('clear-gear'\)\?\.addEventListener\('click',\(\)=>\{\n    state\.gear=\{\.\.\.defaultGear,Weapon:state\.level>=10\?\"Beginner's Wooden Wand \/ job wand\":'None'\};save\(\);renderDashboard\(\);renderEquipment\('equipment-window-page','build-summary-page'\);toast\('Build cleared'\);\n  \}\);/,
    "  document.getElementById('clear-gear')?.addEventListener('click',()=>{\n    state.gear={...defaultGear,Weapon:state.level>=10&&activeBuild()?.id==='magician-il-fresh'?\"Beginner's Wooden Wand / job wand\":'None'};save();renderDashboard();renderEquipment('equipment-window-page','build-summary-page');toast('Build cleared');\n  });"
  );
  app = app.replace(
    "<p>${esc(b.description||b.subtitle||'Infrastructure reserved for a future researched build.')}</p><div class=\"build-tags\">",
    "<p>${esc(b.description||b.subtitle||'Infrastructure reserved for a future researched build.')}</p>${researched?`<div class=\"build-paths\"><small><b>Weapon:</b> ${esc(b.weaponPath||'Class route')}</small><small><b>Skills:</b> ${esc(b.skillPath||'Class route')}</small></div>`:''}<div class=\"build-tags\">"
  );
  app = app.replace(
    "    if(!select||!card||!dmg)return;\n    const route=currentLevelRow()||{};",
    "    if(!select||!card||!dmg)return;\n    const route=currentLevelRow()||{};\n    if(['warrior-fighter','archer-hunter'].includes(activeBuild()?.id)){\n      select.innerHTML='<option value=\"auto\">Auto · current class route</option>'; select.value='auto'; select.disabled=true;\n      const targetText=String(route['Main Monsters']||'Current route target').split('/')[0].trim();\n      const key=mobKeyFromText(targetText)||mobKeyFromText(route['Main Monsters']); const mob=key?atlasMobMap[key]:null;\n      card.innerHTML=`<div class=\"mob-art\">${mob?`<img src=\"${esc(mobAsset(mob.id))}\" data-asset-fallbacks=\"${esc(mapleIoMobAsset(mob.id))}\" alt=\"${esc(mob.name)}\">`:'<div class=\"mob-placeholder\"><span>◈</span><small>Visual unavailable</small></div>'}</div><div class=\"mob-copy\"><span class=\"detail-kicker\">CURRENT CLASS ROUTE</span><h4>${esc(mob?.name||targetText)}</h4><p>${esc(route['Primary Route']||'Current training route')}</p><div class=\"mob-stat-grid\"><div><small>Job method</small><b>${esc(route['Main Skill / Method']||'Follow the build plan')}</b></div><div><small>Class</small><b>${esc(activeBuild()?.name||'Selected build')}</b></div></div></div>`;\n      dmg.innerHTML=`<div class=\"damage-empty\"><b>Class-specific route active.</b><p>Use the selected build's AP, SP, weapon, and hit-rate checkpoints before changing maps.</p></div>`; hookImageFallback(card); return;\n    }"
  );
  app = app.replace(
    "  function renderAtlasBuffs(){\n    const root=document.getElementById('atlas-buffs');if(!root)return;",
    "  function renderAtlasBuffs(){\n    const root=document.getElementById('atlas-buffs');if(!root)return;\n    if(['warrior-fighter','archer-hunter'].includes(activeBuild()?.id)){\n      const id=activeBuild()?.id, fighter=id==='warrior-fighter';\n      const names=fighter?['Axe Mastery','Axe Booster','Rage','Final Attack: Axe','Rush']:['Bow Mastery',\"Amazon's Judgement\",'Bow Booster','Soul Arrow: Bow','Final Attack: Bow','Arrow Bomb: Bow'];\n      const allocation={};\n      (D.skills||[]).filter(row=>Number(row.Level)<=state.level).forEach(row=>String(row.Spend||'').split(',').forEach(part=>{const m=part.trim().match(/^(.+?)\\s+\\+(\\d+)/);if(m)allocation[m[1]]=(allocation[m[1]]||0)+Number(m[2]);}));\n      const maxes=Object.fromEntries(names.map(name=>[name,Number(D.skillIcons?.[name]?.max||20)]));\n      const roles=fighter?{'Axe Mastery':'Bleed + minimum damage','Axe Booster':'Axe attack speed','Rage':'Party Attack Power','Final Attack: Axe':'Toggle · proc damage','Rush':'Grouping / knockback protection'}:{'Bow Mastery':'Bow minimum damage + Evasion',\"Amazon's Judgement\":'Critical-hit slow','Bow Booster':'Bow attack speed','Soul Arrow: Bow':'Arrow conservation','Final Attack: Bow':'Toggle · proc damage','Arrow Bomb: Bow':'Four-target stun AoE'};\n      root.innerHTML=names.map(name=>{const lv=Math.min(maxes[name],Number(allocation[name]||0));const status=lv?`Lv${lv}/${maxes[name]}`:(state.level<30?'Unlocks at Lv30':'Next SP checkpoint');return `<div class=\"buff-chip\"><span class=\"skill-img-wrap\">${skillImgTag(name,'skill-icon')}</span><div><b>${esc(name)} <span>${status}</span></b><small>${esc(roles[name])}</small></div></div>`;}).join('')+`<div class=\"economy-note\"><b>${fighter?'Axe path':'Bow path'}</b><span>${esc(fighter?(D.weaponPaths?.primary?.summary||'Two-handed axe default; compare one-handed Guard when needed.'):(D.weaponPath||'Bow + arrows; keep firing room and arrow reserves.'))}</span></div>`; hookImageFallback(root); return; }"
  );
  app = app.replaceAll('No available I/L-relevant quests.', 'No available quests for this build.');
  app = app.replace('alt="Equipped I/L character"', 'alt="${esc(activeBuild()?.name||"Equipped character")}"');
  app = app.replace('<div class="avatar-job-badge">I/L</div>', '<div class="avatar-job-badge">${esc(activeBuild()?.shortName||"I/L")}</div>');
  app = app.replace(
    "    const b=computeBuild(), l=currentLevelRow()||{};",
    "    const b=computeBuild(), l=currentLevelRow()||{};\n    const buildId=activeBuild()?.id;\n    if(buildId==='warrior-fighter'||buildId==='archer-hunter'){\n      const rows=buildId==='warrior-fighter'?[['Job',l.Job||'Beginner'],['Gear STR',`+${b.str}`],['Base DEX target',b.baseDex],['Gear DEX',`+${b.dex}`],['Effective DEX',b.effectiveDex],['Weapon Attack',b.wAtk],['Weapon Req. DEX',b.reqDex],['Speed bonus',`+${b.speed}`]]:[['Job',l.Job||'Beginner'],['Gear DEX',`+${b.dex}`],['Base STR target',b.baseStr],['Gear STR',`+${b.str}`],['Effective STR',b.effectiveStr],['Weapon Attack',b.wAtk],['Weapon Req. STR',b.reqStr],['Speed bonus',`+${b.speed}`]];\n      const short=buildId==='warrior-fighter'?`${Math.max(0,b.reqDex-b.effectiveDex)} DEX SHORT`:`${Math.max(0,b.reqStr-b.effectiveStr)} STR SHORT`;\n      root.innerHTML=rows.map(([k,v])=>`<div class=\"atlas-stat-row\"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')+`<div class=\"atlas-equip-check ${b.ready?'ready':'blocked'}\"><span>Weapon requirement</span><b>${b.ready?'READY':short}</b></div>`;\n      return;\n    }"
  );
  app = app.replaceAll('Multi-class infrastructure with your I/L build active and personalized right now.', 'Multi-class build library with Fighter, Hunter, and I/L routes active.');
  app = app.replaceAll('One definitive SP path built around efficient I/L progression.', 'One definitive SP path for the selected class build.');
  app = app.replace(
    "      const names=[...new Set((D.skills||[]).flatMap(row=>String(row.Spend||'').split(/[+,]/).map(x=>x.trim().replace(/\\s+\\+\\d+.*$/,'')).filter(Boolean)))].filter(name=>D.skillIcons?.[name]);",
    "      const names=(D.skillOrder||[...new Set((D.skills||[]).flatMap(row=>String(row.Spend||'').split(/[+,]/).map(x=>x.trim().replace(/\\s+\\+\\d+.*$/,'')).filter(Boolean)))]).filter(name=>D.skillIcons?.[name]);"
  );
  app = app.replace(
    `  function computeBuild(){
    let chosen=[];
    for(const [slot,name] of Object.entries(state.gear)){
      if(!name||name==='None') continue;
      if(state.gear.Overall!=='None' && (slot==='Top'||slot==='Bottom')) continue;
      const item=getGear(name); if(item) chosen.push(item);
    }
    const sum=k=>chosen.reduce((a,x)=>a+Number(x[k]||0),0);
    const weapon=getGear(state.gear.Weapon);
    const totalLuk=sum('LUK');
    const base=baseLukTarget();
    const effective=base+totalLuk;
    const req=Number(weapon?.['Req LUK']||0);
    return {
      chosen,int:sum('INT'),luk:totalLuk,matk:sum('M.ATK'),
      crit:sum('Crit%'),critDmg:sum('Crit DMG'),speed:sum('Speed'),
      baseLuk:base,effectiveLuk:effective,reqLuk:req,ready:effective>=req,weapon
    };
  }`,
    `  function computeBuild(){
    let chosen=[];
    for(const [slot,name] of Object.entries(state.gear)){
      if(!name||name==='None') continue;
      if(state.gear.Overall!=='None' && (slot==='Top'||slot==='Bottom')) continue;
      const item=getGear(name); if(item) chosen.push(item);
    }
    const sum=k=>chosen.reduce((a,x)=>a+Number(x[k]||0),0);
    const weapon=getGear(state.gear.Weapon);
    const id=activeBuild()?.id;
    if(id==='warrior-fighter'){
      const base=baseLukTarget(), gearDex=sum('DEX'), req=Number(weapon?.['Req DEX']||0), effective=base+gearDex;
      return {chosen,str:sum('STR'),dex:gearDex,wAtk:sum('W.ATK'),wdef:sum('WDEF'),speed:sum('Speed'),baseDex:base,effectiveDex:effective,reqDex:req,ready:effective>=req,weapon,int:sum('INT'),luk:sum('LUK'),matk:sum('M.ATK'),crit:sum('Crit%'),critDmg:sum('Crit DMG')};
    }
    if(id==='archer-hunter'){
      const base=baseLukTarget(), gearStr=sum('STR'), req=Number(weapon?.['Req STR']||0), effective=base+gearStr;
      return {chosen,str:gearStr,dex:sum('DEX'),wAtk:sum('W.ATK'),wdef:sum('WDEF'),speed:sum('Speed'),baseStr:base,effectiveStr:effective,reqStr:req,ready:effective>=req,weapon,int:sum('INT'),luk:sum('LUK'),matk:sum('M.ATK'),crit:sum('Crit%'),critDmg:sum('Crit DMG')};
    }
    const totalLuk=sum('LUK'),base=baseLukTarget(),effective=base+totalLuk,req=Number(weapon?.['Req LUK']||0);
    return {chosen,int:sum('INT'),luk:totalLuk,matk:sum('M.ATK'),crit:sum('Crit%'),critDmg:sum('Crit DMG'),speed:sum('Speed'),baseLuk:base,effectiveLuk:effective,reqLuk:req,ready:effective>=req,weapon};
  }`
  );
  app = app.replace(
    "    const b=computeBuild();\n    const rows=[\n      ['Job',l.Job||'Beginner'],['Gear INT',`+${b.int}`],['Base LUK target',b.baseLuk],['Gear LUK',`+${b.luk}`],['Effective LUK',b.effectiveLuk],['Magic Attack',b.matk],['Critical Rate',`${b.crit}%`],['Critical Damage',`${b.critDmg}%`],['Speed bonus',`+${b.speed}`],['Weapon Req. LUK',b.reqLuk]\n    ];\n    root.innerHTML=rows.map(([k,v])=>`<div class=\"atlas-stat-row\"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')+`<div class=\"atlas-equip-check ${b.ready?'ready':'blocked'}\"><span>Weapon requirement</span><b>${b.ready?'READY':`${Math.max(0,b.reqLuk-b.effectiveLuk)} LUK SHORT`}</b></div>${state.level>50?'<p class=\"atlas-beta-note\">Lv51–70 LUK/equip behavior remains live-verification territory.</p>':''}`;",
    "    const b=computeBuild();\n    const id=activeBuild()?.id;\n    const rows=id==='warrior-fighter'\n      ? [['Job',l.Job||'Beginner'],['Gear STR',`+${b.str}`],['Base DEX target',b.baseDex],['Gear DEX',`+${b.dex}`],['Effective DEX',b.effectiveDex],['Weapon Attack',b.wAtk],['Weapon Req. DEX',b.reqDex],['Speed bonus',`+${b.speed}`]]\n      : id==='archer-hunter'\n        ? [['Job',l.Job||'Beginner'],['Gear DEX',`+${b.dex}`],['Base STR target',b.baseStr],['Gear STR',`+${b.str}`],['Effective STR',b.effectiveStr],['Weapon Attack',b.wAtk],['Weapon Req. STR',b.reqStr],['Speed bonus',`+${b.speed}`]]\n        : [['Job',l.Job||'Beginner'],['Gear INT',`+${b.int}`],['Base LUK target',b.baseLuk],['Gear LUK',`+${b.luk}`],['Effective LUK',b.effectiveLuk],['Magic Attack',b.matk],['Critical Rate',`${b.crit}%`],['Critical Damage',`${b.critDmg}%`],['Speed bonus',`+${b.speed}`],['Weapon Req. LUK',b.reqLuk]];\n    const short=id==='warrior-fighter'?`${Math.max(0,b.reqDex-b.effectiveDex)} DEX SHORT`:id==='archer-hunter'?`${Math.max(0,b.reqStr-b.effectiveStr)} STR SHORT`:`${Math.max(0,b.reqLuk-b.effectiveLuk)} LUK SHORT`;\n    root.innerHTML=rows.map(([k,v])=>`<div class=\"atlas-stat-row\"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')+`<div class=\"atlas-equip-check ${b.ready?'ready':'blocked'}\"><span>Weapon requirement</span><b>${b.ready?'READY':short}</b></div>${state.level>50?'<p class=\"atlas-beta-note\">Lv51–70 equipment behavior remains live-verification territory.</p>':''}`;"
  );

  app = app.replace(
    `function evidenceLabel(item){\n    const e=String(item?.['Evidence Class']||'UNVERIFIED');\n    if(e.includes('HISTORICAL')) return 'HISTORICAL ONLY';\n    if(e.includes('PRE-LAUNCH')) return 'COT2 · VERIFY LAUNCH';\n    if(e.includes('CURRENT')) return 'COT2 VERIFIED';\n    return 'UNVERIFIED';\n  }`,
    `function evidenceLabel(){ return ''; }`
  );
  app = app.replaceAll('curated Mage/I/L pool', 'curated class equipment pool');
  app = app.replaceAll('Your personalized Ice / Lightning build workspace.', 'Your selected multi-build workspace.');
  app = app.replaceAll('Prioritized for an Ice / Lightning Mage and saved forever in your browser.', 'Prioritized for the selected class build and saved in your browser.');
  app = app.replace("`Base LUK target ${baseLukTarget()}`", "`${activeBuild()?.id==='warrior-fighter'?'Base DEX target':activeBuild()?.id==='archer-hunter'?'Base STR target':'Base LUK target'} ${baseLukTarget()}`");
  const buildLibraryStart = app.indexOf('  function renderBuildLibrary(){');
  const buildLibraryEnd = app.indexOf('\n\n  function renderRoutes(){', buildLibraryStart);
  if (buildLibraryStart < 0 || buildLibraryEnd < 0) throw new Error('build library renderer patch target missing');
  const multiBuildLibraryRenderer = `  function renderBuildLibrary(){
    const root=document.getElementById('build-library'); if(!root)return;
    const builds=D.catalog?.builds||[];
    const classes=D.catalog?.classes||[];
    const available=builds.filter(b=>b.status==='active');
    document.getElementById('active-build-count').textContent=String(available.length);
    root.innerHTML=classes.filter(c=>c.id!=='beginner').map(cls=>{
      const list=builds.filter(b=>b.classId===cls.id);
      if(!list.length)return '';
      const classLive=list.some(b=>b.status==='active');
      return \`<section class="class-build-group \${classLive?'active-class':''}"><div class="class-build-head"><div class="class-emblem">\${classEmblem(cls)}</div><div><span class="eyebrow">\${classLive?'RESEARCHED BUILDS':'READY FOR FUTURE BUILDS'}</span><h3>\${esc(cls.name)}</h3><p>\${esc((cls.branches||[]).join(' · '))}</p></div></div><div class="build-card-grid">\${list.map(b=>{const selected=b.id===state.activeBuildId;const researched=b.status==='active';const label=selected?'VIEWING':researched?'AVAILABLE':'PLANNED';return \`<article class="build-card \${selected?'active-build':researched?'available-build':'planned-build'}"><div class="build-card-top"><span class="\${selected?'live-build-tag':researched?'available-build-tag':'planned-tag'}">\${label}</span>\${b.levelMin?\`<small>Lv \${b.levelMin}–\${b.levelMax}</small>\`:''}</div><h4>\${esc(b.name)}</h4><p>\${esc(b.description||b.subtitle||'Infrastructure reserved for a future researched build.')}</p><div class="build-tags">\${(b.tags||[]).map(t=>\`<span>\${esc(t)}</span>\`).join('')}</div>\${researched?\`<a class="\${selected?'primary-btn':'ghost-btn'}" data-build-select="\${esc(b.id)}" href="?build=\${encodeURIComponent(b.id)}&page=dashboard">\${selected?'Viewing build':'Open build'}</a>\`:\`<button class="ghost-btn" disabled>Not researched yet</button>\`}</article>\`;}).join('')}</div></section>\`;
    }).join('');
  }`;
  app = app.slice(0, buildLibraryStart) + multiBuildLibraryRenderer + app.slice(buildLibraryEnd);
  app = app.replace(
    "<p>${esc(b.description||b.subtitle||'Infrastructure reserved for a future researched build.')}</p><div class=\"build-tags\">",
    "<p>${esc(b.description||b.subtitle||'Infrastructure reserved for a future researched build.')}</p>${researched?`<div class=\"build-paths\"><small><b>Weapon:</b> ${esc(b.weaponPath||'Class route')}</small><small><b>Skills:</b> ${esc(b.skillPath||'Class route')}</small></div>`:''}<div class=\"build-tags\">"
  );
  app = app.replace("  document.getElementById('page-back')?.addEventListener('click',()=>setPage('dashboard'));", "  document.getElementById('page-back')?.addEventListener('click',()=>setPage('dashboard'));\n  document.body.addEventListener('click',e=>{const b=e.target.closest('[data-build-select]');if(!b)return;e.preventDefault();const id=b.dataset.buildSelect;if(!D.catalog?.builds?.some(x=>x.id===id&&x.status==='active'))return;window.TCW_ACTIVE_BUILD_ID=id;const u=new URL(location.href);u.searchParams.set('build',id);u.searchParams.set('page','dashboard');location.assign(u.pathname+u.search+u.hash);});");

  app = app.replaceAll('COT2 client export via OSMS', 'Top Classic World database');
  app = app.replaceAll('Current COT2 metadata', 'Current game data');
  app = app.replaceAll('current COT2 client visual', 'game artwork');
  app = app.replaceAll('COT2 skill', 'Skill');
  app = app.replaceAll('COT2 map', 'Map');
  app = app.replaceAll('COT2 monster', 'Monster');
  app = app.replaceAll('COT2 needs', 'Needs');
  app = app.replaceAll('COT2 rewards', 'Rewards');

  // Do not expose provider/source implementation fields in public Database metadata cards.
  app = app.replace(
    `Object.entries(row).filter(([k])=>!k.startsWith('__'))`,
    `Object.entries(row).filter(([k])=>!k.startsWith('__')&&!/(?:source|provider|origin|url|thumbnail|gif|hash)/i.test(k))`
  );

  // Hidden research/agent pages are not part of the public render cycle anymore.
  app = app.replace(
    `renderDashboard();renderBuildLibrary();renderRoutes();renderQuests();renderWeapons();renderSkills();renderEtc();renderResearch();renderData();`,
    `renderDashboard();renderBuildLibrary();renderRoutes();renderQuests();renderWeapons();renderSkills();renderEtc();`
  );
  // The public shell removes internal Research/Data/Formula pages. Keep the
  // legacy maintenance controls optional so their absent nodes cannot abort
  // the dashboard boot sequence before multi-build enhancement modules run.
  for (const id of ['export-progress','import-progress','reset-progress','cache-assets']) {
    app = app.replaceAll(`document.getElementById('${id}').addEventListener`, `document.getElementById('${id}')?.addEventListener`);
  }
  app = app.replace(`page:raw.page||'dashboard',`, `page:['research','data','formulas'].includes(raw.page)?'dashboard':(raw.page||'dashboard'),`);
  app = app.replace(
    `activeBuildId:raw.activeBuildId||D.catalog?.activeBuildId||'magician-il-fresh',`,
    `activeBuildId:((id)=>D.catalog?.builds?.some(b=>b.id===id&&b.status==='active')?id:(D.catalog?.activeBuildId||'magician-il-fresh'))(new URLSearchParams(location.search).get('build')||window.TCW_ACTIVE_BUILD_ID||raw.activeBuildId),`
  );

  // Dashboard queues use the physical space available in the equal-height action row.
  app = app.replace(
    `.sort((a,b)=>(rank[a.Priority]??9)-(rank[b.Priority]??9)||Number(a.Lv||0)-Number(b.Lv||0)).slice(0,4);`,
    `.sort((a,b)=>(rank[a.Priority]??9)-(rank[b.Priority]??9)||Number(a.Lv||0)-Number(b.Lv||0)).slice(0,8);`
  );
  app = app.replace(
    `.sort((a,b)=>Number(a['Start Lv']||99)-Number(b['Start Lv']||99)).slice(0,6);`,
    `.sort((a,b)=>Number(a['Start Lv']||99)-Number(b['Start Lv']||99)).slice(0,12);`
  );

  // ETC names are part of the core queue markup so rerenders cannot erase readable labels.
  const etcChipNeedle = '<span class="etc-icon-shell" data-etc-icon-name="${esc(x.Item)}">◌</span><b>';
  const etcChipNamed = '<span class="etc-icon-shell" data-etc-icon-name="${esc(x.Item)}">◌</span><span class="tcw-etc-name">${esc(x.Item)}</span><b>';
  if (!app.includes(etcChipNeedle)) throw new Error('ETC queue chip markup patch target missing');
  app = app.replaceAll(etcChipNeedle, etcChipNamed);

  // The full Skill Tree is informational: the core renderer never emits completion checkboxes.
  const skillRenderer=fs.readFileSync(path.join(root,'patches','skill-renderer.txt'),'utf8').trimEnd();
  const skillStart=app.indexOf('  function renderSkills(){');
  const skillEnd=app.indexOf("\n\n  ['etc-search'",skillStart);
  if(skillStart<0||skillEnd<0) throw new Error('Skill Tree renderer patch target missing');
  app=app.slice(0,skillStart)+skillRenderer+app.slice(skillEnd);

  // Never use the generic icon endpoint for skills; it can resolve to unrelated item artwork.
  const genericSkillCandidates="return [...new Set([String(skill.url||'').trim(),mapleIoSkillIcon(skill)].filter(Boolean))];";
  const safeSkillCandidates="return [...new Set([mapleIoSkillIcon(skill)].filter(Boolean))];";
  if(!app.includes(genericSkillCandidates)) throw new Error('generic skill icon candidate patch target missing');
  app=app.replace(genericSkillCandidates,safeSkillCandidates);
  const monsterMapReturn = "    if(dataset==='maps') return";
  const monsterMapPos = app.indexOf(monsterMapReturn);
  const monsterEmptyPos = monsterMapPos >= 0 ? app.indexOf("    return '';", monsterMapPos) : -1;
  if(monsterEmptyPos >= 0) app = app.slice(0,monsterEmptyPos) + "    if(dataset==='monsters') return `/game-media/monsters/${Math.trunc(id)}/render/stand?format=png&resize=2`;\n" + app.slice(monsterEmptyPos);
  app=app.replace(/(function entityThumb\(row,dataset\)\{)\n    if\(row\.thumbnail\) return osmsImage\(row\.thumbnail\);\n    const id=Number\(row\.id\);/, "$1\n    if(dataset==='monsters'){ const hash=row.gif||row.gifs?.move||row.gifs?.stand; if(hash) return `/game-data/data/images/monsters/${hash}.webp`; if(row.thumbnail) return `/game-data/data/images/monsters/${row.thumbnail}.png`; }\n    if(row.thumbnail) return osmsImage(row.thumbnail);\n    const id=Number(row.id);");
  // Magic Claw must request its current artwork on the very first render too,
  // before the asynchronous canonical image layer has loaded the skill index.
  const clawNeedle = '    const skill=D.skillIcons[name], urls=skillVisualCandidates(skill);';
  if(!app.includes(clawNeedle)) throw new Error('canonical Magic Claw patch target missing');
  app=app.replace(clawNeedle, "    const skill=D.skillIcons[name], urls=name==='Magic Claw'?['/game-data/data/current/images/skills/2001003.png',...skillVisualCandidates(skill)]:skillVisualCandidates(skill);");

  // The renderer owns node lifetime. Event-capture ID masking cannot protect native
  // input: microtask checkpoints may restore IDs before target listeners run.
  const atlasTabNeedle = "    const tab=activeAtlasSkillTab();";
  if(!app.includes(atlasTabNeedle)) throw new Error('stable dashboard skills patch target missing');
  app=app.replace(atlasTabNeedle, `${atlasTabNeedle}
    // tcw-skill-renderer-inplace-v1
    if(grid.dataset.renderedSkillTab===tab && grid.querySelector('.atlas-skill-card')){
      if(tab!=='beginner'){
        const alloc=parseSkillAllocation(latestSkillResult(tab,state.level)?.['Result After Level']);
        grid.querySelectorAll('[data-skill-name]').forEach(card=>{
          const info=atlasSkillInfo[card.dataset.skillName];
          if(!info)return;
          const lv=alloc[info.abbr]||0;
          card.classList.toggle('learned',lv>0);
          card.classList.toggle('unlearned',lv===0);
          const small=card.querySelector('small'),text='Lv. '+lv+'/'+info.max;
          if(small&&small.textContent!==text)small.firstChild.data=text;
        });
      }
      window.TCW_REFRESH_SKILL_STATE?.();
      return;
    }
    grid.dataset.renderedSkillTab=tab;`);
  // Keep existing connected skill images out of the generic recycled-image pool.
  app=app.replaceAll("      const key=[img.getAttribute('src')||'',img.alt||'',img.className||''].join('¦');",
    "      if(img.closest('#atlas-skill-grid,#atlas-skill-detail'))return;\n      const key=[img.getAttribute('src')||'',img.alt||'',img.className||''].join('¦');");
  // Detail click handlers must read current allocation, rather than their creation level.
  app=app.replace("      const info=atlasSkillInfo[name], lv=alloc[info.abbr]||0;\n      detail.innerHTML=",
    "      const info=atlasSkillInfo[name], lv=parseSkillAllocation(latestSkillResult(kind,state.level)?.['Result After Level'])[info.abbr]||0;\n      detail.innerHTML=");
  const buildCopyNeedle = "  function renderDashboard(){";
  const buildCopyFunction = `  function updateBuildCopy(){
    const profile=activeBuild();
    const id=profile?.id||'magician-il-fresh';
    const className=classForBuild(profile)?.name||'Magician';
    const short=profile?.shortName||'I/L Wizard';
    const max=Number(profile?.levelMax||D.meta?.maxLevel||70);
    const levelRange='Level '+String(profile?.levelMin||1)+'–'+String(max);
    const title=document.getElementById('hero-build-title'); if(title)title.textContent=profile?.name||'I/L Wizard Build';
    const subtitle=document.getElementById('hero-build-subtitle'); if(subtitle)subtitle.textContent=(profile?.subtitle||'Ice / Lightning Wizard')+' · '+levelRange;
    const milestones=document.querySelector('.v5-milestones');
    if(milestones){
      const at=lv=>(D.dashboardMilestones||[]).find(m=>Number(m.level)===lv)||{};
      milestones.innerHTML='<span>1</span><b>10<br><small>'+esc(at(10).label||className)+'</small></b><b>30<br><small>'+esc(at(30).label||short)+'</small></b><span>'+max+'</span>';
    }
    const etcSmall=document.querySelector('.v72-etc-panel .atlas-panel-head small');
    if(etcSmall)etcSmall.textContent=id==='magician-il-fresh'?'Lifetime quest + I/L craft reserve · 15% buffer':'Lifetime quest reserve · 15% safety buffer';
    const buffSmall=document.querySelector('.v6-buffs-panel .atlas-panel-head small');
    if(buffSmall)buffSmall.textContent=id==='magician-il-fresh'?'I/L utility and spending rules':short+' skill checkpoints and spending rules';
    const equipmentEyebrow=document.querySelector('[data-page="equipment"] .section-head .eyebrow');
    if(equipmentEyebrow)equipmentEyebrow.textContent=id==='magician-il-fresh'?'CURATED I/L GEAR':'CURATED '+short.toUpperCase()+' GEAR';
    const skillsEyebrow=document.querySelector('[data-page="skills"] .section-head .eyebrow');
    if(skillsEyebrow)skillsEyebrow.textContent=id==='magician-il-fresh'?'CURATED I/L SKILLS':'CURATED '+short.toUpperCase()+' SKILLS';
    const callout=document.querySelector('[data-page="skills"] .decision-callout');
    if(callout&&id!=='magician-il-fresh'){
      const b=callout.querySelector('b'),span=callout.querySelector('span');
      if(b)b.textContent='Definitive '+short+' route checkpoint.';
      if(span)span.textContent=' Follow the researched level-by-level SP plan; the dashboard and full tree use this selected build.';
    }
    const optional=document.getElementById('modal-show-optional');
    const textNode=optional?.parentElement&&[...optional.parentElement.childNodes].find(node=>node.nodeType===3);
    if(textNode)textNode.textContent=' Show all curated '+className+' options';
    const futureLabel=document.getElementById('modal-future-label');
    const optionalLabel=document.getElementById('modal-optional-label');
    const branchLabel=id==='warrior-fighter'?'Warrior / Fighter':id==='archer-hunter'?'Bowman / Hunter':className;
    if(futureLabel)futureLabel.textContent='Show future-level '+branchLabel+' items';
    if(optionalLabel)optionalLabel.textContent='Show all curated '+branchLabel+' options';
  }
  function renderDashboard(){`;
  if(!app.includes(buildCopyNeedle)) throw new Error('build-aware copy patch target missing');
  app=app.replace(buildCopyNeedle,buildCopyFunction);
  app=app.replace("    if(p==='dashboard') renderDashboard();","    updateBuildCopy();\n    if(p==='dashboard') renderDashboard();");
  app=app.replace("  function renderDashboard(){\n    const l=currentLevelRow()||{}, srow=currentSkillRow()||{}, a=currentAP()||{};","  function renderDashboard(){\n    updateBuildCopy();\n    const l=currentLevelRow()||{}, srow=currentSkillRow()||{}, a=currentAP()||{};");
  app = app.replaceAll("buildSub.textContent=profile?.subtitle||'Current route'", "buildSub.textContent=(profile?.subtitle||'Current route')+' · Level '+String(profile?.levelMin||1)+'–'+String(profile?.levelMax||D.meta?.maxLevel||70)");
  app = app.replaceAll("item['Class Fit']||'Mage'", "item['Class Fit']||item['Req Job']||'Any'");
  app = app.replace(
    "        <div class=\"stats\">${gearOptionStats(item,none)}</div>",
    "        <div class=\"stats\">${gearOptionStats(item,none)}${none?'':`<span class=\"gear-requirements\"><span>Requires</span> ${esc(gearOptionMeta(item,none))}</span>`}</div>"
  );
  return require('./patches/equipment-branding.cjs')(app);
}

function removePageSection(html, page) {
  const startRe = new RegExp(`<section\\s+data-page=\"${page}\"(?:\\s|>)`, 'i');
  const match = startRe.exec(html);
  if (!match) return html;
  const tokenRe = /<\/?section\b[^>]*>/gi;
  tokenRe.lastIndex = match.index;
  let depth = 0;
  let end = -1;
  let token;
  while ((token = tokenRe.exec(html))) {
    if (/^<section\b/i.test(token[0])) depth += 1;
    else depth -= 1;
    if (depth === 0) { end = tokenRe.lastIndex; break; }
  }
  if (end < 0) throw new Error(`Could not remove ${page} page section`);
  return html.slice(0, match.index) + html.slice(end);
}

function patchHtml(raw) {
  let html = raw.replaceAll('MapleStory Classic Builder', BRAND);
  html = html.replace('<div class="brand-title">CLASSIC BUILDER</div>', '<div class="brand-title">TOP CLASSIC WORLD</div>');
  html = html.replace('<div class="brand-sub">Top Classic World Maplestory</div>', '<div class="brand-sub">Maplestory · Classic World</div>');
  html = html.replace(/\s*<div class="beta-banner">[\s\S]*?<\/div>\s*/, '\n');
  html = html.replace(/\s*<section class="v7-audit-strip v72-audit-top"[\s\S]*?<\/section>\s*/, '\n');
  html = html.replace(/\s*<div class="nav-section-label">(?:PLAY|DATABASE|META)<\/div>\s*/g, '\n');
  html = html.replace(/\s*<button data-page="research"[^>]*>[\s\S]*?<\/button>\s*/, '\n');
  html = html.replace(/\s*<button data-page="data"[^>]*>[\s\S]*?<\/button>\s*/, '\n');
  html = html.replace(/\s*<button data-page="formulas"[^>]*>[\s\S]*?<\/button>\s*/, '\n');
  html = html.replace('<div><b>Headless data source attached</b><small>Website is the main interface</small></div>', '<div><b>Top Classic World</b><small>Database online</small></div>');
  html = html.replace('<span id="atlas-beta-pill" class="beta-tag">COT2-AWARE</span>', '');
  html = html.replace('<h2>Top Classic World Maplestory</h2><p>Ice / Lightning Wizard · Level 1–70 · equipment, skills, quests, targets and progression in one build.</p>', '<h2 id="hero-build-title">I/L Wizard Build</h2><p id="hero-build-subtitle">Ice / Lightning Wizard · Level 1–70 · equipment, skills, quests, targets and progression in one build.</p>');
  html = html.replace('Ice / Lightning is the active personalized build today; future class cards stay infrastructure-only until researched and verified.', 'Choose a researched build and follow its level-by-level progression.');

  html = html.replace(
    '<section data-page="classicdb" class="page"><div class="db-hero"><div><span class="eyebrow">OSMS · CURRENT COT2 CLIENT EXPORT</span><h2>Classic Database</h2><p>Search the broad COT2 metadata layer without mixing it into curated I/L recommendations.</p></div><div class="db-provider-badge"><b>Provider</b><span>OSMS Data Explorer</span></div></div>',
    '<section data-page="classicdb" class="page"><div class="db-hero"><div><span class="eyebrow">TOP CLASSIC WORLD</span><h2>Database</h2><p>Search items, equipment, monsters, maps, quests, skills, crafting and portals in one place.</p></div></div>'
  );
  html = html.replace(
    '<section data-page="cashshop" class="page"><div class="db-hero"><div><span class="eyebrow">COT2 CATALOG · PRICES ARE BETA DATA</span><h2>Cash Shop</h2><p>Browse the client-exported catalog. Availability and prices stay visibly pre-launch until live confirmation.</p></div><span class="beta-tag">COT2 / VERIFY LIVE</span></div>',
    '<section data-page="cashshop" class="page"><div class="db-hero"><div><span class="eyebrow">TOP CLASSIC WORLD</span><h2>Cash Shop</h2><p>Browse the current catalog, prices and availability.</p></div></div>'
  );
  html = html.replace(
    '<section data-page="beauty" class="page"><div class="db-hero"><div><span class="eyebrow">COT2 CLIENT CATALOG</span><h2>Beauty</h2><p>Hair and face styles with exact IDs and current exported artwork.</p></div></div>',
    '<section data-page="beauty" class="page"><div class="db-hero"><div><span class="eyebrow">TOP CLASSIC WORLD</span><h2>Beauty</h2><p>Hair and face styles with exact IDs and artwork.</p></div></div>'
  );
  for (const page of ['research','data','formulas']) html = removePageSection(html, page);
  return html;
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const css = readChunks('styles', 3);
const guideJson = publicGuide(readChunks('guide', 6));
const app = publicScript(patchApp(readChunks('app', 4)))
  .replace("navigator.serviceWorker.register('./sw.js?v=0.8.0')", `navigator.serviceWorker.register('./sw.js?v=${assetVersion}')`);
const visualCss = fs.readFileSync(path.join(source, 'visuals.css'), 'utf8');
const visuals = publicScript(fs.readFileSync(path.join(source, 'visuals.js'), 'utf8'));
const visualDbCss = fs.readFileSync(path.join(source, 'visuals-db.css'), 'utf8');
const visualDb = publicScript(fs.readFileSync(path.join(source, 'visuals-db.js'), 'utf8'));
const visualNpcCss = fs.readFileSync(path.join(source, 'visuals-npc.css'), 'utf8');
const visualNpc = publicScript(fs.readFileSync(path.join(source, 'visuals-npc.js'), 'utf8'));
const visualSkillCss = fs.readFileSync(path.join(source, 'visuals-skills.css'), 'utf8');
const visualSkill = publicScript(fs.readFileSync(path.join(source, 'visuals-skills.js'), 'utf8'));
const visualPortalCss = fs.readFileSync(path.join(source, 'visuals-portals.css'), 'utf8');
const visualPortal = publicScript(fs.readFileSync(path.join(source, 'visuals-portals.js'), 'utf8'));
const dashboardPolishCss = fs.readFileSync(path.join(source, 'dashboard-polish.css'), 'utf8');
const dashboardPolish = publicScript(fs.readFileSync(path.join(source, 'dashboard-polish.js'), 'utf8'));
const progressionSyncCss = fs.readFileSync(path.join(source, 'progression-sync.css'), 'utf8');
const progressionSync = publicScript(fs.readFileSync(path.join(source, 'progression-sync.js'), 'utf8'));
const progressionLevelHook = fs.readFileSync(path.join(source, 'progression-level-hook.js'), 'utf8');
const progressionSkillState = fs.readFileSync(path.join(source, 'progression-skill-state.js'), 'utf8');
const progressionGearVisualCss = fs.readFileSync(path.join(source, 'progression-gear-visual.css'), 'utf8');
const progressionGearVisual = fs.readFileSync(path.join(source, 'progression-gear-visual.js'), 'utf8');
const ownershipUiCss = fs.readFileSync(path.join(source, 'ownership-ui.css'), 'utf8');
const ownershipUi = fs.readFileSync(path.join(source, 'ownership-ui.js'), 'utf8');
const mapsTabCss = fs.readFileSync(path.join(source, 'maps-tab.css'), 'utf8');
const mapsTab = publicScript(fs.readFileSync(path.join(source, 'maps-tab.js'), 'utf8'));
const etcAuditData = fs.readFileSync(path.join(source, 'etc-audit-data.js'), 'utf8');
const questAuditAdditions = fs.readFileSync(path.join(source, 'quest-audit-additions.js'), 'utf8');
const etcAuditUiCss = fs.readFileSync(path.join(source, 'etc-audit-ui.css'), 'utf8');
const etcAuditUi = fs.readFileSync(path.join(source, 'etc-audit-ui.js'), 'utf8');

JSON.parse(guideJson);
if (!css.includes('.sidebar') || !app.includes('GUIDE_DATA')) throw new Error('Runtime verification failed');

let html = patchHtml(fs.readFileSync(path.join(source, 'index.html'), 'utf8'));
html = html.replaceAll('?v=0.8.0', `?v=${assetVersion}`);
const guideBootTag = `<script src="guide-data.js?v=${assetVersion}"></script>`;
const selectedBuildPrelude = `<script>(()=>{const root=window.GUIDE_DATA;if(!root)return;try{const saved=JSON.parse(localStorage.getItem('ultimateILGuideState.v1')||'{}');let id=new URLSearchParams(location.search).get('build')||saved.activeBuildId||root.catalog?.activeBuildId||'magician-il-fresh';const active=new Set((root.catalog?.builds||[]).filter(x=>x.status==='active').map(x=>x.id));if(!active.has(id))id=root.catalog?.activeBuildId||'magician-il-fresh';const map={'warrior-fighter':'fighter','archer-hunter':'hunter'};if(map[id]&&root.buildVariants?.[map[id]])window.GUIDE_DATA=root.buildVariants[map[id]];window.TCW_ACTIVE_BUILD_ID=id;}catch(e){window.TCW_ACTIVE_BUILD_ID='magician-il-fresh';}})();</script>`;
if (!html.includes(guideBootTag)) throw new Error('selected-guide prelude target missing');
html = html.replace(guideBootTag, guideBootTag+'\n  '+selectedBuildPrelude);
const bootNeedle = `<script src="etc-audit-data.js?v=${assetVersion}"></script>\n  <script src="quest-audit-additions.js?v=${assetVersion}"></script>\n  <script src="app.js?v=${assetVersion}"></script>`;
const bootOrdered = `<script src="etc-audit-data.js?v=${assetVersion}"></script>\n  <script src="quest-audit-additions.js?v=${assetVersion}"></script>\n<script src="job-search.js?v=${assetVersion}"></script>\n  <script src="app.js?v=${assetVersion}"></script>`;
if (!html.includes(bootNeedle)) throw new Error('build-aware boot script order target missing');
html = html.replace(bootNeedle, bootOrdered);
html = html.replace('</head>', `  <link rel="stylesheet" href="visuals.css?v=${assetVersion}">\n  <link rel="stylesheet" href="visuals-db.css?v=${assetVersion}">\n  <link rel="stylesheet" href="visuals-npc.css?v=${assetVersion}">\n  <link rel="stylesheet" href="visuals-skills.css?v=${assetVersion}">\n  <link rel="stylesheet" href="visuals-portals.css?v=${assetVersion}">\n  <link rel="stylesheet" href="dashboard-polish.css?v=${assetVersion}">\n  <link rel="stylesheet" href="progression-sync.css?v=${assetVersion}">\n  <link rel="stylesheet" href="progression-gear-visual.css?v=${assetVersion}">\n  <link rel="stylesheet" href="ownership-ui.css?v=${assetVersion}">\n  <link rel="stylesheet" href="maps-tab.css?v=${assetVersion}">\n  <link rel="stylesheet" href="etc-audit-ui.css?v=${assetVersion}">\n</head>`);
html = html.replace('</body>', `  <script src="visuals.js?v=${assetVersion}"></script>\n  <script src="visuals-db.js?v=${assetVersion}"></script>\n  <script src="visuals-npc.js?v=${assetVersion}"></script>\n  <script src="visuals-skills.js?v=${assetVersion}"></script>\n  <script src="visuals-portals.js?v=${assetVersion}"></script>\n  <script src="dashboard-polish.js?v=${assetVersion}"></script>\n  <script src="progression-sync.js?v=${assetVersion}"></script>\n  <script src="progression-level-hook.js?v=${assetVersion}"></script>\n  <script src="progression-skill-state.js?v=${assetVersion}"></script>\n  <script src="progression-gear-visual.js?v=${assetVersion}"></script>\n  <script src="ownership-ui.js?v=${assetVersion}"></script>\n  <script src="maps-tab.js?v=${assetVersion}"></script>\n  <script src="etc-audit-ui.js?v=${assetVersion}"></script>\n</body>`);

html=html.replace('</head>', '<link rel="stylesheet" href="readability.css?v='+assetVersion+'"></head>');
// job-search.js is part of the selected-guide boot sequence above, before app.js.
html=html.replace('</body>', '<script src="navigation-history.js?v='+assetVersion+'"></script></body>');
for(const file of ['readability.css','job-search.js','navigation-history.js'])fs.copyFileSync(path.join(source,file),path.join(out,file));
for(const file of ['map-layouts.json','map-audit.html','map-audit.js','map-audit.json','map-audit.csv'])fs.copyFileSync(path.join(source,file),path.join(out,file));
html=html.replace('</head>', '<link rel="stylesheet" href="equipment-branding.css?v='+assetVersion+'"></head>');
fs.copyFileSync(path.join(source,'equipment-branding.css'),path.join(out,'equipment-branding.css'));
html = html.replace(/\n[ \t]+\n/g, '\n\n');
fs.writeFileSync(path.join(out, 'index.html'), html);
const atlasAssets = path.join(source, 'assets', 'map-atlas');
if (fs.existsSync(atlasAssets)) fs.cpSync(atlasAssets, path.join(out, 'assets', 'map-atlas'), { recursive: true });
fs.copyFileSync(path.join(source, 'manifest.webmanifest'), path.join(out, 'manifest.webmanifest'));
fs.writeFileSync(path.join(out, 'styles.css'), css);
fs.writeFileSync(path.join(out, 'visuals.css'), visualCss);
fs.writeFileSync(path.join(out, 'visuals-db.css'), visualDbCss);
fs.writeFileSync(path.join(out, 'visuals-npc.css'), visualNpcCss);
fs.writeFileSync(path.join(out, 'visuals-skills.css'), visualSkillCss);
fs.writeFileSync(path.join(out, 'visuals-portals.css'), visualPortalCss);
fs.writeFileSync(path.join(out, 'dashboard-polish.css'), dashboardPolishCss);
fs.writeFileSync(path.join(out, 'progression-sync.css'), progressionSyncCss);
fs.writeFileSync(path.join(out, 'progression-gear-visual.css'), progressionGearVisualCss);
fs.writeFileSync(path.join(out, 'ownership-ui.css'), ownershipUiCss);
fs.writeFileSync(path.join(out, 'maps-tab.css'), mapsTabCss);
fs.writeFileSync(path.join(out, 'etc-audit-ui.css'), etcAuditUiCss);
fs.writeFileSync(path.join(out, 'guide-data.js'), `window.GUIDE_DATA = ${guideJson};\n`);
fs.writeFileSync(path.join(out, 'etc-audit-data.js'), etcAuditData);
fs.writeFileSync(path.join(out, 'quest-audit-additions.js'), questAuditAdditions);
fs.writeFileSync(path.join(out, 'app.js'), app);
fs.writeFileSync(path.join(out, 'visuals.js'), visuals);
fs.writeFileSync(path.join(out, 'visuals-db.js'), visualDb);
fs.writeFileSync(path.join(out, 'visuals-npc.js'), visualNpc);
fs.writeFileSync(path.join(out, 'visuals-skills.js'), visualSkill);
fs.writeFileSync(path.join(out, 'visuals-portals.js'), visualPortal);
fs.writeFileSync(path.join(out, 'dashboard-polish.js'), dashboardPolish);
fs.writeFileSync(path.join(out, 'progression-sync.js'), progressionSync);
fs.writeFileSync(path.join(out, 'progression-level-hook.js'), progressionLevelHook);
fs.writeFileSync(path.join(out, 'progression-skill-state.js'), progressionSkillState);
fs.writeFileSync(path.join(out, 'progression-gear-visual.js'), progressionGearVisual);
fs.writeFileSync(path.join(out, 'ownership-ui.js'), ownershipUi);
fs.writeFileSync(path.join(out, 'maps-tab.js'), mapsTab);
fs.writeFileSync(path.join(out, 'etc-audit-ui.js'), etcAuditUi);
fs.writeFileSync(path.join(out, 'build-info.txt'), `${BRAND} ${assetVersion}\n`);

const sw = `const CACHE='top-classic-world-${assetVersion}';\nconst CORE=['./','./index.html','./styles.css?v=${assetVersion}','./visuals.css?v=${assetVersion}','./visuals-db.css?v=${assetVersion}','./visuals-npc.css?v=${assetVersion}','./visuals-skills.css?v=${assetVersion}','./visuals-portals.css?v=${assetVersion}','./dashboard-polish.css?v=${assetVersion}','./progression-sync.css?v=${assetVersion}','./progression-gear-visual.css?v=${assetVersion}','./ownership-ui.css?v=${assetVersion}','./guide-data.js?v=${assetVersion}','./app.js?v=${assetVersion}','./visuals.js?v=${assetVersion}','./visuals-db.js?v=${assetVersion}','./visuals-npc.js?v=${assetVersion}','./visuals-skills.js?v=${assetVersion}','./visuals-portals.js?v=${assetVersion}','./dashboard-polish.js?v=${assetVersion}','./progression-sync.js?v=${assetVersion}','./progression-level-hook.js?v=${assetVersion}','./progression-skill-state.js?v=${assetVersion}','./progression-gear-visual.js?v=${assetVersion}','./ownership-ui.js?v=${assetVersion}','./maps-tab.css?v=${assetVersion}','./maps-tab.js?v=${assetVersion}','./etc-audit-data.js?v=${assetVersion}','./quest-audit-additions.js?v=${assetVersion}','./etc-audit-ui.css?v=${assetVersion}','./etc-audit-ui.js?v=${assetVersion}','./manifest.webmanifest'];\nself.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).catch(()=>{}));});\nself.addEventListener('activate',e=>{e.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('top-classic-world-')&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()]));});\nself.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);if(u.origin!==self.location.origin)return;e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});return r;}).catch(()=>caches.match(e.request).then(x=>x||caches.match('./index.html'))));});\n`;
fs.writeFileSync(path.join(out, 'sw.js'), sw);

console.log(`Built ${assetVersion}: CSS ${css.length} bytes, guide ${guideJson.length} bytes, app ${app.length} bytes, visuals ${visuals.length} bytes, DB visuals ${visualDb.length} bytes, NPC visuals ${visualNpc.length} bytes, skill visuals ${visualSkill.length} bytes, portal visuals ${visualPortal.length} bytes, dashboard polish ${dashboardPolish.length} bytes, progression sync ${progressionSync.length} bytes, progression level hook ${progressionLevelHook.length} bytes, progression skill state ${progressionSkillState.length} bytes, progression gear visual ${progressionGearVisual.length} bytes, ownership UI ${ownershipUi.length} bytes.`);
