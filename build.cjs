const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = __dirname;
const source = path.join(root, 'public');
const runtime = path.join(source, 'assets', 'runtime');
const repairs = path.join(source, 'repairs');
const out = path.join(root, 'dist');
const assetVersion = '0.8.9-multibuild-foundation';
const BRAND = 'Top Classic World Maplestory';

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
    subtitle: 'Sword-focused Warrior progression',
    levelMin: 1,
    levelMax: 70,
    status: 'active',
    tags: ['Warrior', 'Fighter', 'Level 1–70', 'Quest-aware', 'Sword route'],
    primaryStat: 'STR',
    secondaryPolicy: 'DEX only for verified accuracy or equipment breakpoints',
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

function fighterVariant(base) {
  const skillsAudit = JSON.parse(fs.readFileSync(path.join(root, 'audit', 'fighter-skills.json'), 'utf8'));
  const itemAudit = JSON.parse(fs.readFileSync(path.join(root, 'audit', 'fighter-items.json'), 'utf8'));
  const questAudit = JSON.parse(fs.readFileSync(path.join(root, 'audit', 'fighter-quests.json'), 'utf8'));
  const monsterAudit = JSON.parse(fs.readFileSync(path.join(root, 'audit', 'fighter-monsters.json'), 'utf8'));
  const craftingAudit = JSON.parse(fs.readFileSync(path.join(root, 'audit', 'fighter-crafting.json'), 'utf8'));
  const skillGroups = [...(skillsAudit.warrior || []), ...(skillsAudit.beginner || [])];
  const allSkills = skillGroups.flatMap(group => group.skills || []);
  const beginner = beginnerSkillRows();
  const skillOrder = ['Three Snails','Recovery','Nimble Feet','Improved HP Recovery','Max HP Increase','Precise Strikes','Power Strike','Slash Blast','Iron Body','Sword Mastery','Sword Booster','Final Attack: Sword','Rage','Rush'];
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
  const second = secondJobPlan(31, 70, [
    {name:'Sword Mastery', label:'SM', points:5},
    {name:'Sword Booster', label:'SB', points:1},
    {name:'Final Attack: Sword', label:'FA', points:1},
    {name:'Rush', label:'Rush', points:1},
    {name:'Sword Mastery', label:'SM', points:15},
    {name:'Rush', label:'Rush', points:9},
    {name:'Rage', label:'Rage', points:30},
    {name:'Rush', label:'Rush', points:10},
    {name:'Final Attack: Sword', label:'FA', points:29},
    {name:'Sword Booster', label:'SB', points:19}
  ]);
  const skills = [...beginner, ...[...steps, ...second].map(([level, spend, result], i) => ({
    Level: level, SP: level === 10 ? 1 : 3, Spend: spend,
    'Why This Is The Action': level < 30 ? 'Current Classic Warrior first-job route: build Power Strike and Slash Blast, finish Precise Strikes, then take the delayed HP breakpoints.' : 'Cross-checked one-handed sword Fighter route: satisfy Mastery prerequisites, add Booster, Final Attack, and Rush, then finish Mastery, Rush, Rage, Final Attack, and Booster.',
    'Meso / MP Logic': 'Use the skill when its target is met; preserve potions and avoid spending on a skill that does not improve the current route.',
    Status: 'Classic beta / verify at launch', 'Result After Level': result || 'Fighter progression checkpoint', 'Evidence Class': 'CURRENT / VERIFY'
  }))];
  const warriorItems = (itemAudit.items || []).filter(item => {
    const stats = item.stats || {};
    return item.category === 'Equipment' && (item.req_job_label === 'Warrior' || (Number(stats.reqJob || 0) & 1) || ['1H Sword','2H Sword','1H Axe','2H Axe','1H Blunt Weapon','2H Blunt Weapon','Spear','Polearm'].includes(item.weapon_type));
  });
  const slotFor = item => ({Cap:'Hat',Coat:'Overall',Longcoat:'Overall',Pants:'Bottom',Shoes:'Shoes',Glove:'Gloves',Shield:'Shield',Cape:'Cape',Ring:'Ring',Accessory:'Earrings',Weapon:'Weapon'})[item.sub_category] || (item.sub_category === 'Weapon' ? 'Weapon' : 'Any');
  let gear = [{Item:'None',Slot:'Any','Item ID':0,'Icon URL':'',STR:0,DEX:0,INT:0,LUK:0,'W.ATK':0,'M.ATK':0,'WDEF':0,'MDEF':0,'Crit%':0,'Crit DMG':0,Speed:0,Jump:0,'Req Lv':0,'Req STR':0,'Req DEX':0,'Req LUK':0,Status:'CURRENT / VERIFY','Class Fit':'Any',Plan:'EMPTY',Priority:'—',Notes:'Empty slot','Highly Recommended':false,'Recommendation Reason':'','Evidence Class':'CURRENT / VERIFY'}, ...warriorItems.map(item => {
    const s = item.stats || {};
    return {Item:item.name, Slot:item.sub_category === 'Weapon' ? 'Weapon' : slotFor(item), 'Item ID':item.id, 'Icon URL':`/game-media/items/primary/${item.id}`, STR:s.incSTR||0, DEX:s.incDEX||0, INT:s.incINT||0, LUK:s.incLUK||0, 'W.ATK':s.incPAD||0, 'M.ATK':s.incMAD||0, 'WDEF':s.incPDD||0, 'MDEF':s.incMDD||0, 'Crit%':s.incCritRate||0, 'Crit DMG':s.incCritDamage||0, Speed:s.incSpeed||0, Jump:s.incJump||0, 'Req Lv':s.reqLevel||0, 'Req STR':s.reqSTR||0, 'Req DEX':s.reqDEX||0, 'Req LUK':s.reqLUK||0, 'Status':'CURRENT / VERIFY', 'Class Fit':'Warrior', Plan:'OPTIONAL', Priority:'Use at the relevant level or when it creates a real damage/accuracy breakpoint', Notes:item.weapon_type ? `${item.weapon_type} · ${item.attack_speed_label || ''}` : 'Classic Warrior equipment option', 'Highly Recommended':false, 'Recommendation Reason':'', 'Evidence Class':'CURRENT / VERIFY'};
  })];
  const gearPlan = applyGearPlan(gear, [
    {min:1, gear:{Weapon:'Sword'}, reason:'Starter one-handed sword; keep early mesos for potions and advancement.'},
    {min:10, gear:{Weapon:'Long Sword',Hat:'Metal Koif',Top:'Brown Lolico Armor',Bottom:'Brown Lolico Pants',Shoes:'Bronze Grieves',Gloves:'Juno',Shield:'Wooden Buckler'}, reason:'First Warrior equipment checkpoint with a real sword, armor, and shield foundation.'},
    {min:15, gear:{Weapon:'Sabre',Hat:'Steel Full Helm',Overall:'Steel Fitted Mail',Shoes:'Steel Grieves',Gloves:'Steel Fingerless Gloves',Shield:'Steel Shield'}, reason:'Affordable level-15 Warrior set; replace only when the item is available without starving potions.'},
    {min:20, gear:{Weapon:'Viking Sword',Overall:'Blue Kendo Robe',Shield:'Mithril Buckler'}, reason:'Level-20 sword and overall checkpoint for the Fighter route.'},
    {min:30, gear:{Weapon:'Gladius',Overall:'Red Engrit',Shield:'Red Cross Shield'}, reason:'Level-30 Fighter advancement and weapon breakpoint.'},
    {min:35, gear:{Weapon:'Cutlus',Overall:'Blood Fitted Mail',Shield:'Battle Shield'}, reason:'Level-35 one-handed sword and durable overall checkpoint.'},
    {min:40, gear:{Weapon:'Traus',Shield:'Adamantium Tower Shield'}, reason:'Level-40 attack and shield checkpoint; keep the prior overall if it is better funded.'},
    {min:45, gear:{Weapon:"Hero's Gladius"}, reason:'Level-45 one-handed sword checkpoint.'},
    {min:50, gear:{Weapon:'Jeweled Katar',Top:'Umber Shouldermail',Bottom:'Umber Shouldermail Pants',Shoes:'Mithril Hildon Boots'}, reason:'Level-50 Fighter armor breakpoint; use the weapon only after confirming its requirement in-game.'},
    {min:60, gear:{Weapon:'Neocora',Top:'Blue Orientican',Bottom:'Blue Orientican Pants',Shoes:'Sapphire Camel Boots'}, reason:'Level-60 weapon and armor checkpoint.'},
    {min:70, gear:{Weapon:'Red Katana',Top:'Bronze Platine',Bottom:'Bronze Platine Pants',Shoes:'Purple Carzen Boots'}, reason:'Level-70 Fighter capstone checkpoint.'}
  ], 'Fighter');
  gear = gearPlan.gear;
  const weaponRows = gear.filter(x=>x.Slot==='Weapon').map(x=>({Lv:x['Req Lv']||1, Weapon:x.Item, Type:x['Item ID'], 'Weapon Type':'Warrior weapon', 'Why':x.Notes}));
  const routeBlocks = [
    routeBlock(1, 9, [50, 1004, 1005], 'Snail / Blue Snail / Shroom', 'Beginner route through the retained Maple Island layouts; leave when the Warrior advancement is ready.'),
    routeBlock(10, 12, [10001021, 10001070, 10001010], 'Slime / Orange Mushroom / Pig', 'Use Power Strike on safe single targets while completing the Warrior advancement and Henesys citizenship preparation.'),
    routeBlock(13, 15, [10002031, 10000010], 'Green Mushroom / Slime / Blue Snail', 'Use Power Strike for single targets and Slash Blast when three or more mobs are grouped.'),
    routeBlock(16, 20, [10002075, 10002033], 'Green Mushroom / Slime / Horny Mushroom', 'Keep the hit-rate check ahead of the map switch; use the attack that matches the pack size.'),
    routeBlock(21, 25, [10005070, 10005060, 10003061], 'Evil Eye / Zombie Mushroom / Bubbling', 'Ant Tunnel Park, Ant Tunnel I, and Line 1 are retained Classic checkpoints; do not force a map that misses.'),
    routeBlock(26, 30, [10004091, 10005061, 10003062], 'Wild Boar / Iron Hog / Zombie Mushroom / Stirge', 'Finish the first-job targets, prepare the level-30 weapon breakpoint, and take Fighter in Perion.'),
    routeBlock(31, 35, [10004041, 10004091, 10002080], 'Wild Boar / Iron Hog / Curse Eye', 'Start the sword route with Mastery and the early prerequisite skills; switch when the map or hit-rate breakpoint is real.'),
    routeBlock(36, 40, [10006060, 10003097, 10002024], 'Glowshroom / Raffle / Curse Eye / Zombie Lupin', 'Use Rush for map control and keep the route inside retained Victoria layouts.'),
    routeBlock(41, 45, [10007020, 10006070, 10006080], 'Lorang / Lupin / Zombie Lupin / higher-level Forgotten mobs', 'Use the safer Lorang or Forgotten route until the next sword and accuracy checkpoint is met.'),
    routeBlock(46, 50, [10003067, 10005075, 10006071], 'Jr. Wraith / Wraith / Drake', 'Line 2 <Area 2> is the level-gated accuracy check; Drake and Forgotten Dungeon Tunnel are alternatives for parties.'),
    routeBlock(51, 60, [10005075, 10006070, 10006020], 'Drake / Raffle / Rafflesia / Sporewood', 'Prioritize maps where the current weapon kills reliably; use Drake drops and the Forgotten route for gear funding.'),
    routeBlock(61, 70, [10006080, 10006031, 10006071], 'Rafflesia / Sporewood / Rotten Mushroom / Tauromacis', 'Finish the level-70 Fighter range on retained Classic layouts; Ludibrium and Leafre are intentionally not named because they are not in the retained atlas.')
  ];
  const leveling = Array.from({length:70},(_,i)=>{const lv=i+1,b=routeBlocks.find(x=>lv>=x[0]&&lv<=x[1]);return {Lv:lv,Job:lv<10?'Beginner':lv<30?'Warrior':'Fighter','Primary Route':b[2],'Main Monsters':b[3],'Fighter Method':b[4],'Alternative':'Use the nearest safer route with a confirmed layout','Quest / PQ Tie-In':lv<30?'Maple Island and Victoria quest chains':'Fighter advancement and class-appropriate quest chains','Gear Hunt Tie-In':lv<10?'Use Maple Island rewards':`Use the ${lv < 40 ? 'sword and shield' : 'current weapon'} checkpoint`,'SAVE ETC / ITEM NOW':'Bank active quest materials only','Target Qty':'As required by the active quest','Priority / Used For':'Route and quest progression','When You Can Stop Saving':'After the active quest chain is complete','Confidence':'CURRENT / VERIFY','Evidence Class':'CURRENT / VERIFY'};});
  const apPlan=[
    ['1–10','ALL STR',57,5,'Maple Island weapon',0,'Current Classic Warrior sample: keep the starting 5 DEX and put level-up AP into STR.'],
    ['11–12','+4 STR / +1 DEX each level',65,7,'Level-appropriate sword',0,'Use DEX only for the accuracy and weapon breakpoint shown by the current Warrior guide.'],
    ['13–14','+3 STR / +2 DEX each level',71,11,'Level-appropriate sword',0,'The extra DEX is a breakpoint tool, not a first-job advancement requirement.'],
    ['15','+4 STR / +1 DEX',75,12,'Level 15 sword or axe',10,'Keep the current accuracy target while preserving STR damage.'],
    ['16–19','+4 STR / +1 DEX each level',91,16,'Level 20 weapon checkpoint',15,'Follow the verified sample until the next real accuracy or equipment breakpoint.'],
    ['20','+3 STR / +2 DEX',94,18,'Level 20 weapon',20,'Reach the current Classic sample’s level-20 accuracy breakpoint.'],
    ['21–25','+4 STR / +1 DEX each level',114,23,'Level 25 weapon',25,'Keep the base DEX close to the current sample; equipment can cover part of the requirement.'],
    ['26–29','+4 STR / +1 DEX each level',130,27,'Level 30 weapon',30,'Build toward 30 total DEX with gear rather than over-investing permanent AP.'],
    ['30','+5 STR',135,27,'Gladius / Blue Axe / level-30 sword route',30,'Current level-30 sample is 135 STR / 27 base DEX, with gear supplying the remaining DEX.' ],
    ['31–70','STR first; DEX only for verified accuracy or equipment breakpoints','135+','27+','One-handed sword + shield', '30+','Keep the safer sword route’s hit rate current; use gear, scrolls, and potions before permanent AP when practical.']
  ].map(x=>({'Level Range':x[0],'AP Action':x[1],'Base STR Target':x[2],'Base DEX Target':x[3],'Weapon Target':x[4],'Weapon DEX Req':x[5],'Effective DEX Plan':x[6],'Scroll Plan':'Prefer safe 100%/60% upgrades; do not gamble early progression gear','Why':x[6],'Status':'Classic beta / verify at launch','Evidence Class':'CURRENT / VERIFY'}));
  const quests = buildQuestRows(questAudit.quests, 'Fighter Build');
  const etc = buildEtcRows(base.etc, questAudit.quests, 'Fighter Build');
  return {catalog:base.catalog,meta:{...base.meta},dashboardMilestones:base.dashboardMilestones,skills,skillOrder,skillIcons,gear,weapons:weaponRows,armor:gear,recipes:buildRecipeRows(gear,gearPlan.levels,'Fighter Build'),upgrades:base.upgrades,routes:routeBlocks.map(x=>({Levels:`${x[0]}–${x[1]}`,'Primary Route':x[2],'Main Monsters':x[3],'Main Skill / Method':x[4],'Why This Block':'Classic Fighter route checkpoint.','Major ETCs to Bank':'Only active quest materials','Weapon Decision Point':'Review current sword breakpoint','Quest / PQ Focus':'Complete class-appropriate chain','Status':'CURRENT / VERIFY','Evidence Class':'CURRENT / VERIFY'})),leveling,quests,etc,apPlan,scrolls:base.scrolls,decisions:base.decisions,gearPresets:{efficient:{name:'Fighter Sword Progression',description:'Level checkpoints for a practical sword-and-shield Fighter.',levels:gearPlan.levels},luk:{name:'Fighter Accuracy Bridge',description:'Reuse the active Fighter checkpoint when accuracy or requirements need a temporary bridge.',levels:gearPlan.levels}},fighterDatabase:{monsters:monsterAudit.monsters,crafting:craftingAudit}};
}

function hunterVariant(base) {
  const audit = JSON.parse(fs.readFileSync(path.join(root, 'audit', 'fighter-skills.json'), 'utf8'));
  const items = JSON.parse(fs.readFileSync(path.join(root, 'audit', 'fighter-items.json'), 'utf8'));
  const quests = JSON.parse(fs.readFileSync(path.join(root, 'audit', 'fighter-quests.json'), 'utf8'));
  const monsters = JSON.parse(fs.readFileSync(path.join(root, 'audit', 'fighter-monsters.json'), 'utf8'));
  const crafting = JSON.parse(fs.readFileSync(path.join(root, 'audit', 'fighter-crafting.json'), 'utf8'));
  const groups = [...(audit.archer || []), ...(audit.beginner || [])];
  const all = groups.flatMap(g => g.skills || []).filter(s => !/Crossbow|Iron Arrow|Blizzard|Arrow Eruption|Golden Eagle|Evasion Step/.test(s.name));
  const beginner = beginnerSkillRows();
  const skillOrder = ['Three Snails','Recovery','Nimble Feet','Critical Shot','The Eye of Amazon','Focus','Power Knockback','Arrow Blow','Bow Mastery','Bow Booster','Soul Arrow: Bow','Final Attack: Bow','Arrow Bomb: Bow'];
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
  const second = secondJobPlan(31, 70, [
    {name:'Bow Mastery', label:'BM', points:5},
    {name:'Bow Booster', label:'BB', points:1},
    {name:'Soul Arrow: Bow', label:'Soul', points:1},
    {name:'Final Attack: Bow', label:'FA', points:1},
    {name:'Bow Mastery', label:'BM', points:15},
    {name:'Arrow Bomb: Bow', label:'AB', points:30},
    {name:'Final Attack: Bow', label:'FA', points:29},
    {name:'Soul Arrow: Bow', label:'Soul', points:19},
    {name:'Bow Booster', label:'BB', points:19}
  ]);
  const skills=[...beginner,...[...first,...second].map(([Level,Spend,result])=>({Level,SP:Level===10?1:3,Spend,'Why This Is The Action':Level<30?'Current Classic Bowman first-job route: raise Arrow Blow, take Eye early for range, then finish Critical Shot, Eye, Focus, and one Power Knockback.':'Cross-checked Hunter route: satisfy Bow Mastery prerequisites, add Booster, Soul Arrow, and Final Attack, then finish Mastery, Arrow Bomb, Final Attack, Soul Arrow, and Booster.','Meso / MP Logic':'Use the active skill breakpoint and preserve potions and arrows for training.','Result After Level':result||'Hunter checkpoint','Status':'Classic beta / verify at launch','Evidence Class':'CURRENT / VERIFY'}))];
  const bows=(items.items||[]).filter(i=>i.category==='Equipment'&&(i.weapon_type==='Bow'||i.req_job_label==='Bowman'));
  let gear=[{Item:'None',Slot:'Any','Item ID':0,'Icon URL':'',STR:0,DEX:0,INT:0,LUK:0,'W.ATK':0,'Req Lv':0,Status:'CURRENT / VERIFY','Class Fit':'Any',Plan:'EMPTY','Priority':'—','Highly Recommended':false,'Recommendation Reason':'',Notes:'Empty slot'},...bows.map(i=>{const s=i.stats||{};return {Item:i.name,Slot:i.sub_category==='Weapon'?'Weapon':({Cap:'Hat',Coat:'Overall',Longcoat:'Overall',Pants:'Bottom',Shoes:'Shoes',Glove:'Gloves',Cape:'Cape',Accessory:'Earrings'}[i.sub_category]||'Any'),'Item ID':i.id,'Icon URL':`/game-media/items/primary/${i.id}`,STR:s.incSTR||0,DEX:s.incDEX||0,INT:s.incINT||0,LUK:s.incLUK||0,'W.ATK':s.incPAD||0,'Req Lv':s.reqLevel||0,'Req STR':s.reqSTR||0,'Req DEX':s.reqDEX||0,Status:'CURRENT / VERIFY','Class Fit':'Bowman / Hunter',Plan:'OPTIONAL',Priority:'Use at the relevant bow breakpoint', 'Highly Recommended':false,'Recommendation Reason':'',Notes:i.weapon_type||'Classic Bowman equipment'};})];
  const gearPlan = applyGearPlan(gear, [
    {min:10, gear:{Weapon:'War Bow',Hat:'Brown Winter Hat',Top:'Brown Archer Top',Bottom:'Archer Pants',Shoes:'Brown Hard Leather Boots'}, reason:'First Bowman bow and starter armor checkpoint.'},
    {min:15, gear:{Weapon:'Composite Bow',Hat:'Green Feather Hat',Top:'Green Able Armor',Bottom:'Green Able Armor Skirt',Shoes:'Green Woodsman Boots',Gloves:'Basic Archer Gloves'}, reason:'Level-15 bow and first complete Bowman gear checkpoint.'},
    {min:20, gear:{Weapon:"Hunter's Bow",Hat:'Green Robin Hat',Top:'Brown Hard Leather Top',Bottom:'Brown Hard Leather Pants',Shoes:'Deer Huntertop',Gloves:'Green Diros'}, reason:'Level-20 Hunter bow and armor breakpoint.'},
    {min:25, gear:{Weapon:'Battle Bow',Hat:'Green Hunter',Top:'Green Bennis Chainmail',Bottom:'Bennis Chain Pants',Shoes:'Green Jack Boots',Gloves:'Green Savata'}, reason:'Level-25 bow and armor checkpoint before advancement.'},
    {min:30, gear:{Weapon:'Ryden',Hat:'Green Hawkeye',Top:"Green Hunter's Armor",Bottom:"Green Hunter's Pants",Shoes:'Green Hunter Boots',Gloves:'Green Marker'}, reason:'Level-30 Hunter advancement and full class armor checkpoint.'},
    {min:35, gear:{Weapon:'Red Viper',Hat:'Green Pole-Feather Hat',Top:'Green Legolier',Bottom:'Green Legolier Pants',Shoes:'Green Silky Boots',Gloves:'Mithril Scaler'}, reason:'Level-35 bow and armor checkpoint.'},
    {min:40, gear:{Weapon:'Vaulter 2000',Hat:'Green Distinction',Top:'Brown Piette',Bottom:'Brown Piette Pants',Shoes:'Brown Pierre Shoes',Gloves:'Aqua Brace'}, reason:'Level-40 bow and DEX armor breakpoint.'},
    {min:50, gear:{Weapon:'Olympus',Hat:'Green Maro',Overall:'Blue Lumati',Shoes:'Blue Steel-Tip Boots',Gloves:'Blue Willow'}, reason:'Level-50 bow and overall checkpoint.'},
    {min:60, gear:{Weapon:'Asianic Bow',Hat:'Brown Polyfeather Hat',Overall:'Blue Choro',Shoes:'Blue Gore Boots',Gloves:'Oaker Garner'}, reason:'Level-60 bow and high-DEX overall checkpoint.'},
    {min:70, gear:{Weapon:'Golden Hinkel',Hat:'Blue Patriot',Overall:'Blue Linnex',Shoes:'Blue Elf Shoes',Gloves:'Blue Eyes'}, reason:'Level-70 Hunter capstone equipment checkpoint.'}
  ], 'Hunter');
  gear = gearPlan.gear;
  const routes=[
    routeBlock(1, 9, [50, 1004, 1005], 'Snail / Blue Snail / Shroom', 'Beginner route through the retained Maple Island layouts; leave when the Bowman advancement is ready.'),
    routeBlock(10, 12, [10000010, 10000011, 10001010], 'Snail / Shroom / Pig', 'Complete the early Lith Harbor/Henesys quests, then use Arrow Blow from safe range.'),
    routeBlock(13, 15, [10002031, 10000012, 10001010], 'Green Mushroom / Slime / Pig', 'Use the confirmed Southern Forest and beach layouts while early range improves.'),
    routeBlock(16, 20, [10002075, 10002033], 'Green Mushroom / Horny Mushroom / Slime', 'Critical Shot and Eye make the retained Ellinia tree maps more consistent.'),
    routeBlock(21, 25, [10005060, 10005070, 10002034], 'Zombie Mushroom / Evil Eye / Horny Mushroom', 'Use ranged positioning in Ant Tunnel I or Park; Southern Forest IV is the safer fallback.'),
    routeBlock(26, 30, [10003062, 10003061, 10004091], 'Stirge / Bubbling / Wild Boar / Iron Hog', 'Finish Bowman targets, meet the bow breakpoint, and advance to Hunter in Henesys.'),
    routeBlock(31, 35, [10004091, 10004041, 10002080], 'Wild Boar / Iron Hog / Curse Eye', 'Open with the Mastery/Booster/Soul Arrow/Final Attack prerequisites, then scale Arrow Bomb.'),
    routeBlock(36, 40, [10006060, 10002021, 10002024], 'Glowshroom / Raffle / Curse Eye / Lupin', 'Keep kiting from confirmed layouts; use the map with the cleanest two-hit breakpoint.'),
    routeBlock(41, 50, [10003097, 10006070, 10007021], 'Zombie Lupin / Lorang / Copper Drake / Raffle', 'Use Monkey Swamp, Forgotten, or Lorang Lorang Lorang according to party space and damage.'),
    routeBlock(51, 60, [10006020, 10005075, 10006031], 'Rafflesia / Duskmander / Drake / Sporewood', 'Primeval Forest II, Drake Hunting Ground, and Valley of Death are retained high-level alternatives.'),
    routeBlock(61, 70, [10006080, 10006071, 10006070], 'Sporewood / Rotten Mushroom / Rafflesia / Tauromacis', 'Finish Hunter on retained Classic layouts; Ranger/Bowmaster remain roadmap content and are not presented as live.' )
  ];
  const leveling=Array.from({length:70},(_,i)=>{const Lv=i+1,r=routes.find(x=>Lv>=x[0]&&Lv<=x[1]);return {Lv,Job:Lv<10?'Beginner':Lv<30?'Bowman':'Hunter','Primary Route':r[2],'Main Monsters':r[3],'Hunter Method':r[4],'Alternative':'Use the nearest retained Classic layout with a reliable hit rate','Quest / PQ Tie-In':'Complete the active Bowman/Hunter quest chain','Gear Hunt Tie-In':'Use the next bow breakpoint','SAVE ETC / ITEM NOW':'Bank active quest materials and arrows only','Target Qty':'As required by the active quest','Priority / Used For':'Route and quest progression','When You Can Stop Saving':'After the active quest chain is complete','Confidence':'CURRENT / VERIFY','Evidence Class':'CURRENT / VERIFY'};});
  const apPlan=[
    ['1–10','ALL DEX',5,57,'War Bow',25,'Current Classic Bowman sample: keep base STR at 5 and place level-up AP into DEX; job advancement has no stat requirement.'],
    ['11–15','+10 STR / +15 DEX',15,72,'Composite Bow',35,'Follow the current bow AP table so STR covers the level-15 bow while DEX continues to drive damage and accuracy.'],
    ['16–20','+5 STR / +20 DEX',20,92,"Hunter's Bow",45,'Use equipment stats where available, but do not miss the next bow requirement.'],
    ['21–25','+5 STR / +20 DEX',25,112,'Battle Bow',55,'Keep DEX as the primary stat and use the current Classic bow breakpoint.'],
    ['26–30','+5 STR / +20 DEX',30,132,'Ryden',65,'Reach the current level-30 bow sample, then let gear/scrolls handle later STR requirements where possible.'],
    ['31–70','Keep STR at the next bow requirement; DEX otherwise','30+','132+','Current bow / Hunter equipment','Next bow requirement','The private guide’s minimum-STR rule is useful after level 30; current Classic data remains the authority for exact equipment breakpoints.']
  ].map(x=>({'Level Range':x[0],'AP Action':x[1],'Base STR Target':x[2],'Base DEX Target':x[3],'Weapon Target':x[4],'Weapon DEX Req':x[5],'Effective DEX Plan':x[6],'Primary Stat':'DEX','Secondary Stat':'STR for bow requirements','Scroll Plan':'Bow Attack weapon scrolls; use safe progression upgrades first','Why':x[6],'Status':'Classic beta / verify at launch','Evidence Class':'CURRENT / VERIFY'}));
  const questRows = buildQuestRows(quests.quests, 'Hunter Build');
  const etc = buildEtcRows(base.etc, quests.quests, 'Hunter Build');
  return {catalog:base.catalog,meta:{...base.meta},dashboardMilestones:base.dashboardMilestones,skills,skillOrder,skillIcons,gear,weapons:gear.filter(x=>x.Slot==='Weapon').map(x=>({Lv:x['Req Lv']||1,Weapon:x.Item,Type:x['Item ID'],'Weapon Type':'Bow','Why':x.Notes||'Bow breakpoint'})),armor:gear,recipes:buildRecipeRows(gear,gearPlan.levels,'Hunter Build'),upgrades:base.upgrades,routes:routes.map(x=>({Levels:`${x[0]}–${x[1]}`,'Primary Route':x[2],'Main Monsters':x[3],'Main Skill / Method':x[4],'Why This Block':'Classic Hunter route checkpoint.','Major ETCs to Bank':'Only active quest materials','Weapon Decision Point':'Review current bow breakpoint','Quest / PQ Focus':'Complete class-appropriate chain','Status':'CURRENT / VERIFY','Evidence Class':'CURRENT / VERIFY'})),leveling,quests:questRows,etc,apPlan,scrolls:base.scrolls,decisions:base.decisions,gearPresets:{efficient:{name:'Hunter Bow Progression',description:'DEX-first bow progression with current Classic bow breakpoints and minimum-STR guidance after level 30.',levels:gearPlan.levels},luk:{name:'Hunter STR Bridge',description:'Reuse the active Hunter checkpoint when a bow requirement needs a temporary STR bridge.',levels:gearPlan.levels}},hunterDatabase:{monsters:monsters.monsters,crafting}};
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
      version: data.meta.version,
      builtAt: data.meta.builtAt,
      maxLevel: data.meta.maxLevel,
      recommendationPolicy: data.meta.recommendationPolicy
    };
  }
  // Variants are rendered through the same dashboard/runtime as I/L. Keep the
  // shared max-level metadata and milestone model on every selected guide.
  fighter.meta = {...(data.meta || {}), title: BRAND};
  hunter.meta = {...(data.meta || {}), title: BRAND};
  fighter.dashboardMilestones = data.dashboardMilestones || fighter.dashboardMilestones || [];
  hunter.dashboardMilestones = data.dashboardMilestones || hunter.dashboardMilestones || [];
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
  app = app.replace("  function recommendedWeaponName(level=state.level){", "  function recommendedWeaponName(level=state.level){\n    if(['warrior-fighter','archer-hunter'].includes(activeBuild()?.id)){ const row=(D.weapons||[]).filter(x=>Number(x.Lv||0)<=level).at(-1); return row?.Weapon||'None'; }");
  app = app.replace("  function renderAtlasSkills(){", "  function renderAtlasSkills(){\n    if(['warrior-fighter','archer-hunter'].includes(activeBuild()?.id)){\n      const tabs=document.getElementById('atlas-skill-tabs'),grid=document.getElementById('atlas-skill-grid'),detail=document.getElementById('atlas-skill-detail');\n      if(!tabs||!grid||!detail)return;\n      const label=activeBuild()?.shortName||'Class'; tabs.innerHTML=`<span class=\"eyebrow\">${label.toUpperCase()} SKILL PLAN</span>`;\n      const beginner=['Three Snails','Recovery','Nimble Feet'];\n      const allocations={};\n      (D.skills||[]).filter(x=>Number(x.Level)<=state.level).forEach(x=>String(x.Spend||'').split(',').forEach(part=>{const m=part.trim().match(/^(.+?)\\s+\\+(\\d+)/);if(m&&D.skillIcons?.[m[1]])allocations[m[1]]=(allocations[m[1]]||0)+Number(m[2]);}));\n      if(state.level>=10) beginner.forEach(name=>allocations[name]=3);\n      const row=D.skills.filter(x=>Number(x.Level)===state.level).at(-1)||D.skills[0];\n      const names=(D.skillOrder||[]).filter(name=>D.skillIcons?.[name]);\n      grid.innerHTML=names.map(name=>{const max=Number(D.skillIcons[name]?.max||20),lv=Math.min(max,Number(allocations[name]||0));return `<button class=\"atlas-skill-card ${lv>0?'learned':'unlearned'}\" data-skill-name=\"${esc(name)}\"><span class=\"skill-img-wrap\">${skillImgTag(name,'skill-icon')}</span><b>${esc(name)}</b><small>Lv. ${lv}/${max}</small></button>`;}).join('');\n      const show=name=>{const max=Number(D.skillIcons[name]?.max||20),lv=Math.min(max,Number(allocations[name]||0));detail.innerHTML=`<span class=\"skill-img-wrap\">${skillImgTag(name,'skill-icon')}</span><div><span class=\"detail-kicker\">${esc(label.toUpperCase())} · CLASSIC SKILL</span><b>${esc(name)} · Lv ${lv}/${max}</b><p>${esc(D.skillIcons[name]?.desc||'Follow the selected class progression.')}</p><small>Current SP action: <strong>${esc(row?.Spend||'Follow the plan')}</strong></small></div>`;hookImageFallback(detail);};\n      grid.querySelectorAll('[data-skill-name]').forEach(btn=>btn.addEventListener('click',()=>{grid.querySelectorAll('.atlas-skill-card').forEach(x=>x.classList.remove('selected'));btn.classList.add('selected');show(btn.dataset.skillName);}));\n      show(names.find(name=>Number(allocations[name]||0)>0)||names[0]);\n      hookImageFallback(grid);\n      return;\n    }");

  const oldSetLevel = `function setLevel(level){\n    state.level=Math.max(1,Math.min(Number(D.meta.maxLevel)||70,Number(level)||1));\n    save();\n    renderAll();\n  }`;
  const newSetLevel = `function preserveLoadedImages(root,render){\n    const pool=new Map();\n    if(root) root.querySelectorAll('img[src]').forEach(img=>{\n      const key=[img.getAttribute('src')||'',img.alt||'',img.className||''].join('¦');\n      if(!pool.has(key))pool.set(key,[]);\n      pool.get(key).push(img);\n    });\n    render();\n    if(!root)return;\n    root.querySelectorAll('img[src]').forEach(img=>{\n      const key=[img.getAttribute('src')||'',img.alt||'',img.className||''].join('¦');\n      const old=pool.get(key)?.shift();\n      if(old&&old!==img&&old.complete&&old.naturalWidth>0)img.replaceWith(old);\n    });\n  }\n  function renderLevelPage(){\n    const p=state.page;\n    const root=document.querySelector('.page[data-page="'+p+'"]');\n    preserveLoadedImages(root,()=>{\n      if(p==='dashboard')renderDashboard();\n      else if(p==='builds')renderBuildLibrary();\n      else if(p==='leveling')renderRoutes();\n      else if(p==='quests')renderQuests();\n      else if(p==='equipment'){renderWeapons();renderEquipment('equipment-window-page','build-summary-page');}\n      else if(p==='skills')renderSkills();\n      else if(p==='etc')renderEtc();\n      else if(p==='formulas')renderFormulas();\n    });\n  }\n  function setLevel(level){\n    const next=Math.max(1,Math.min(Number(D.meta.maxLevel)||70,Number(level)||1));\n    if(next===state.level)return;\n    state.level=next;\n    save();\n    const a=document.getElementById('level-select'),b=document.getElementById('hero-level-select'),r=document.getElementById('level-range');\n    if(a)a.value=String(next);if(b)b.value=String(next);if(r)r.value=String(next);\n    document.documentElement.dataset.levelUpdate='1';\n    renderLevelPage();\n    requestAnimationFrame(()=>document.documentElement.removeAttribute('data-level-update'));\n  }`;
  if (!app.includes(oldSetLevel)) throw new Error('setLevel patch target missing');
  app = app.replace(oldSetLevel, newSetLevel);

  const pageHook = `if(p==='equipment') renderEquipment('equipment-window-page','build-summary-page');`;
  if (!app.includes(pageHook)) throw new Error('setPage patch target missing');
  app = app.replace(pageHook, `if(p==='dashboard') renderDashboard();\n    if(p==='leveling') renderRoutes();\n    if(p==='quests') renderQuests();\n    if(p==='skills') renderSkills();\n    if(p==='etc') renderEtc();\n    if(p==='equipment'){renderWeapons();renderEquipment('equipment-window-page','build-summary-page');}`);

  app = app.replace(
    "  function baseLukTarget(){ const a=currentAP(); return Number(a?.['Base LUK Target'] ?? (state.level>50?30:5)); }",
    "  function baseLukTarget(){ const a=currentAP(); if(activeBuild()?.id==='warrior-fighter') return Number(a?.['Base DEX Target'] ?? 5); if(activeBuild()?.id==='archer-hunter') return Number(a?.['Base STR Target'] ?? 5); return Number(a?.['Base LUK Target'] ?? (state.level>50?30:5)); }"
  );
  app = app.replace(
    "    const names=[...new Set((D.skills||[]).flatMap(row=>String(row.Spend||'').split(/[+,]/).map(x=>x.trim().replace(/\\s+\\+\\d+.*$/,'')).filter(Boolean)))].filter(name=>D.skillIcons?.[name]);",
    "    const names=(D.skillOrder||[...new Set((D.skills||[]).flatMap(row=>String(row.Spend||'').split(/[+,]/).map(x=>x.trim().replace(/\\s+\\+\\d+.*$/,'')).filter(Boolean)))]).filter(name=>D.skillIcons?.[name]);"
  );
  app = app.replace(
    "  function currentCoreWeapon(level=state.level){\n    const names=[\"Beginner's Wooden Wand / job wand\",'Hardwood Wand','Mithril Wand','Cromi','Angel Wings'];\n    return names.map(getGear).filter(Boolean).filter(x=>Number(x['Req Lv'])<=level).sort((a,b)=>Number(b['Req Lv'])-Number(a['Req Lv']))[0]||null;\n  }",
    "  function currentCoreWeapon(level=state.level){\n    const names=['warrior-fighter','archer-hunter'].includes(activeBuild()?.id) ? (D.weapons||[]).filter(x=>Number(x.Lv||0)<=level).map(x=>x.Weapon) : [\"Beginner's Wooden Wand / job wand\",'Hardwood Wand','Mithril Wand','Cromi','Angel Wings'];\n    return names.map(getGear).filter(Boolean).filter(x=>Number(x['Req Lv'])<=level).sort((a,b)=>Number(b['Req Lv'])-Number(a['Req Lv']))[0]||null;\n  }"
  );
  app = app.replace(
    "    if(!select||!card||!dmg)return;\n    const route=currentLevelRow()||{};",
    "    if(!select||!card||!dmg)return;\n    const route=currentLevelRow()||{};\n    if(['warrior-fighter','archer-hunter'].includes(activeBuild()?.id)){\n      select.innerHTML='<option value=\"auto\">Auto · current class route</option>'; select.value='auto'; select.disabled=true;\n      const targetText=String(route['Main Monsters']||'Current route target').split('/')[0].trim();\n      const key=mobKeyFromText(targetText)||mobKeyFromText(route['Main Monsters']); const mob=key?atlasMobMap[key]:null;\n      card.innerHTML=`<div class=\"mob-art\">${mob?`<img src=\"${esc(mobAsset(mob.id))}\" data-asset-fallbacks=\"${esc(mapleIoMobAsset(mob.id))}\" alt=\"${esc(mob.name)}\">`:'<div class=\"mob-placeholder\"><span>◈</span><small>Visual unavailable</small></div>'}</div><div class=\"mob-copy\"><span class=\"detail-kicker\">CURRENT CLASS ROUTE</span><h4>${esc(mob?.name||targetText)}</h4><p>${esc(route['Primary Route']||'Current training route')}</p><div class=\"mob-stat-grid\"><div><small>Job method</small><b>${esc(route['Main Skill / Method']||'Follow the build plan')}</b></div><div><small>Class</small><b>${esc(activeBuild()?.name||'Selected build')}</b></div></div></div>`;\n      dmg.innerHTML=`<div class=\"damage-empty\"><b>Class-specific route active.</b><p>Use the selected build's AP, SP, weapon, and hit-rate checkpoints before changing maps.</p></div>`; hookImageFallback(card); return;\n    }"
  );
  app = app.replace(
    "  function renderAtlasBuffs(){\n    const root=document.getElementById('atlas-buffs');if(!root)return;",
    "  function renderAtlasBuffs(){\n    const root=document.getElementById('atlas-buffs');if(!root)return;\n    if(['warrior-fighter','archer-hunter'].includes(activeBuild()?.id)){\n      const current=D.skills.filter(x=>Number(x.Level)<=state.level).at(-1);\n      const names=(D.skillOrder||[]).filter(name=>D.skillIcons?.[name]).slice(3,7);\n      root.innerHTML=names.map(name=>`<div class=\"buff-chip\"><span class=\"skill-img-wrap\">${skillImgTag(name,'skill-icon')}</span><div><b>${esc(name)}</b><small>${esc(activeBuild()?.shortName||'Class')} plan · ${state.level>=10?'available by level':'Beginner foundation'}</small></div></div>`).join('')+`<div class=\"economy-note\"><b>Class route</b><span>${esc(current?.Spend||'Follow the Beginner foundation before first job.')}</span></div>`; hookImageFallback(root); return; }"
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
const app = publicScript(patchApp(readChunks('app', 4)));
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
html = html.replace('</head>', `  <link rel="stylesheet" href="visuals.css?v=${assetVersion}">\n  <link rel="stylesheet" href="visuals-db.css?v=${assetVersion}">\n  <link rel="stylesheet" href="visuals-npc.css?v=${assetVersion}">\n  <link rel="stylesheet" href="visuals-skills.css?v=${assetVersion}">\n  <link rel="stylesheet" href="visuals-portals.css?v=${assetVersion}">\n  <link rel="stylesheet" href="dashboard-polish.css?v=${assetVersion}">\n  <link rel="stylesheet" href="progression-sync.css?v=${assetVersion}">\n  <link rel="stylesheet" href="progression-gear-visual.css?v=${assetVersion}">\n  <link rel="stylesheet" href="ownership-ui.css?v=${assetVersion}">\n  <link rel="stylesheet" href="maps-tab.css?v=${assetVersion}">\n  <link rel="stylesheet" href="etc-audit-ui.css?v=${assetVersion}">\n</head>`);
html = html.replace('</body>', `  <script src="visuals.js?v=${assetVersion}"></script>\n  <script src="visuals-db.js?v=${assetVersion}"></script>\n  <script src="visuals-npc.js?v=${assetVersion}"></script>\n  <script src="visuals-skills.js?v=${assetVersion}"></script>\n  <script src="visuals-portals.js?v=${assetVersion}"></script>\n  <script src="dashboard-polish.js?v=${assetVersion}"></script>\n  <script src="progression-sync.js?v=${assetVersion}"></script>\n  <script src="progression-level-hook.js?v=${assetVersion}"></script>\n  <script src="progression-skill-state.js?v=${assetVersion}"></script>\n  <script src="progression-gear-visual.js?v=${assetVersion}"></script>\n  <script src="ownership-ui.js?v=${assetVersion}"></script>\n  <script src="maps-tab.js?v=${assetVersion}"></script>\n  <script src="etc-audit-ui.js?v=${assetVersion}"></script>\n</body>`);

html=html.replace('</head>', '<link rel="stylesheet" href="readability.css?v='+assetVersion+'"></head>');
html=html.replace('<script src="app.js', '<script src="job-search.js?v='+assetVersion+'"></script>\n<script src="app.js');
html=html.replace('</body>', '<script src="navigation-history.js?v='+assetVersion+'"></script></body>');
for(const file of ['readability.css','job-search.js','navigation-history.js'])fs.copyFileSync(path.join(source,file),path.join(out,file));
for(const file of ['map-layouts.json','map-audit.html','map-audit.js','map-audit.json','map-audit.csv'])fs.copyFileSync(path.join(source,file),path.join(out,file));
html=html.replace('</head>', '<link rel="stylesheet" href="equipment-branding.css?v='+assetVersion+'"></head>');
fs.copyFileSync(path.join(source,'equipment-branding.css'),path.join(out,'equipment-branding.css'));
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
