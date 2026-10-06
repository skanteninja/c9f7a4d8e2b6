// Material identity and quantities come from the same pinned records as the journal.
// Optional weapon recipes are available to select, never an automatic shopping list.
function etcCatalog(guide, itemSnapshot, craftSnapshot) {
  const items = itemSnapshot.items || [];
  const byId = new Map(items.map(i => [Number(i.id), i]));
  const byName = new Map();
  for (const item of items) {
    if (!byName.has(item.name)) byName.set(item.name, []);
    byName.get(item.name).push(item);
  }
  const recipes = (craftSnapshot.disciplines || []).flatMap(d => (d.output_types || []).flatMap(t =>
    (t.levels || []).flatMap(l => (l.recipes || []).map(r => ({...r, discipline:d.discipline})))));
  const materials = new Map(), plans = [], seen = new Set();
  const material = (id, name) => {
    id = Number(id);
    if (!materials.has(id)) {
      const item = byId.get(id);
      if (!item) throw new Error(`Material missing from item snapshot: ${id} ${name}`);
      materials.set(id, {
        Item:item.name, 'Item ID':id, Category:item.category,
        'Quest Item':!!item.stats?.quest, 'Once Uses':[], 'Repeat Uses':[], 'Craft Uses':[],
        'Start Lv':101, 'Core Quest Need':0, 'Crafting Need':0, 'Optional / Donation':0
      });
    }
    return materials.get(id);
  };
  for (const q of guide.quests) {
    for (const req of q.Gather || []) {
      const row = material(req.id, req.name);
      const use = {questId:q['Quest ID'], name:q.Quest, level:q.Lv, count:Number(req.count),
        cadence:q.Repeatable, region:q.Region, conditions:q.Conditions || [], rotation:q.Rotation,
        job:q['Job Family']};
      const once = q.Repeatable === 'Once' || q.Rotation?.one_time;
      row[once ? 'Once Uses' : 'Repeat Uses'].push(use);
      row['Start Lv'] = Math.min(row['Start Lv'], q.Lv);
      if (once) row['Core Quest Need'] += use.count;
      else row['Optional / Donation'] = Math.max(row['Optional / Donation'], use.count);
    }
  }
  for (const stage of guide.gearPresets?.efficient?.levels || []) {
    const name = stage.gear?.Weapon;
    if (!name || name === 'None' || seen.has(name)) continue;
    seen.add(name);
    const gear = guide.gear.find(g => g.Item === name);
    const recipe = recipes.find(r => Number(r.output_id) === Number(gear?.['Item ID']));
    if (!recipe) continue; // Drop/shop-only equipment has no invented recipe.
    const plan = {id:String(recipe.id), name, level:Math.max(stage.min, Number(gear['Req Lv'] || 1)),
      outputId:recipe.output_id, outputCount:Number(recipe.result_count || 1),
      discipline:recipe.discipline, craftLevel:recipe.req_level, mesos:recipe.meso_cost, ingredients:[]};
    for (const input of recipe.ingredients || []) {
      const matches = byName.get(input.item_name) || [];
      if (matches.length !== 1) throw new Error(`Ambiguous recipe material: ${input.item_name}`);
      const row = material(matches[0].id, input.item_name);
      const count = Number(input.count);
      plan.ingredients.push({id:row['Item ID'], name:row.Item, count});
      row['Craft Uses'].push({recipeId:plan.id, name, level:plan.level, count});
      row['Start Lv'] = Math.min(row['Start Lv'], plan.level);
    }
    plans.push(plan);
  }
  const rows = [...materials.values()].map(row => {
    const base = row['Core Quest Need'];
    // Exact quest items and equipment/consumable turn-ins do not need spares.
    const buffered = row.Category === 'Etc' && !row['Quest Item'];
    const keep = buffered && base > 1 ? Math.ceil(base * 1.15) : base;
    return {...row, 'Start Saving':`Lv${row['Start Lv']}`, 'Lifetime Quest Need':base,
      'Core + Craft Minimum':base, 'Permanent Keep':keep, 'All-In Total':keep,
      'Used For':row['Once Uses'].map(u => `${u.name} ×${u.count}`).join(' · ') || 'Optional crafting or repeatable quest',
      'Stop Saving When':'Recheck the remaining target after completing quests or changing selected crafts.',
      Confidence:'Quest-linked', 'Buffer Eligible':buffered};
  }).sort((a,b) => a['Start Lv'] - b['Start Lv'] || a.Item.localeCompare(b.Item) || a['Item ID'] - b['Item ID']);
  return {rows, plans};
}
module.exports = {etcCatalog};
