// OSMS structured records are game-data truth; priority is a guide decision.
function questCatalog(snapshot, previous, branch) {
  const raw = snapshot.quests;
  const byId = new Map(raw.map(q => [String(q.id), q]));
  const branches = new Set(['Warrior', 'Magician', 'Bowman', 'Thief']);
  const effectiveLevel = (q, visiting = new Set()) => {
    if (visiting.has(String(q.id))) throw new Error(`Quest prerequisite cycle: ${q.id}`);
    const next = new Set(visiting).add(String(q.id));
    return Math.max(1, Number(q.level_min ?? q.chain_level_min ?? 1), ...(q.requirements_list || [])
      .filter(r => r.type === 'quest').map(r => byId.has(String(r.id)) ? effectiveLevel(byId.get(String(r.id)), next) : 1));
  };
  const priorities = new Map((previous || []).map(q => [q.Quest, q.Priority]));
  const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return raw.filter(q => !branches.has(q.region) || q.region === branch).map(q => {
    const lv = effectiveLevel(q);
    const req = q.requirements_list || [];
    const start = q.start_items || [];
    const gather = req.filter(r => r.type === 'item').map(r => ({...r,
      count: Math.max(0, Number(r.count || 1) - start.filter(s => Number(s.id) === Number(r.id)).reduce((n, s) => n + Number(s.count || 1), 0))
    })).filter(r => r.count > 0);
    const groups = entries => (entries || []).flatMap(e => (e.groups || []).filter(g => !g.job_mask || g.job_name === branch)
      .map(g => ({...g, items: g.items || []})));
    const old = (previous || []).filter(p => p.Quest === q.name && p.Region === q.region);
    const legacy = new Set(old.map(p => `${slug(p.Region)}-${slug(p.Quest)}-${p.Lv ?? 'x'}`));
    // The original canonical converter had no inherited prerequisite level.
    legacy.add(`${slug(q.region)}-${slug(q.name)}-${Number(q.level_min ?? q.chain_level_min ?? 1)}`);
    const cadence = q.is_daily ? 'Daily' : q.is_weekly ? 'Weekly' : q.is_repeatable ? 'Repeatable' : 'Once';
    const guaranteed = (q.rewards || []).filter(r => r.type === 'item' && r.guaranteed && (!r.job_mask || r.job_name === branch));
    const choices = groups(q.reward_choices), random = groups(q.reward_weighted);
    const rewardSummary = [...guaranteed.map(r => `${r.count}x ${r.name}`),
      ...choices.flatMap(g => g.items.map(r => `Choose one: ${r.name}`)),
      ...random.flatMap(g => g.items.map(r => `${r.name} (${r.chance_pct}%)`))].join(' · ');
    const description = String(q.description || '').split('\n').filter(Boolean);
    return {
      'Quest ID': String(q.id), Quest: q.name, Region: q.region, Lv: lv,
      Priority: branches.has(q.region) || lv <= 10 ? 'High' : priorities.get(q.name) || (lv <= 30 ? 'Medium' : 'Low / Optional'),
      Eligibility: branches.has(q.region) ? `${branch} advancement` : 'Any class',
      NPC: q.npc_name || '—', Chain: q.parent || '', 'Next Quest ID': q.next_quest ? String(q.next_quest) : '',
      'Next Quest': q.next_quest_name || '', Repeatable: cadence, EXP: Number(q.rewards_exp || 0), Mesos: Number(q.rewards_money || 0),
      'Reward / Unlock': rewardSummary || (q.next_quest_name ? `Unlocks ${q.next_quest_name}` : 'No item reward'),
      'Why Do It': description[0] || 'Talk to the quest giver to begin.',
      Journal: description, Requirements: q.requirements || '', Objectives: req.filter(r => r.type !== 'quest'),
      Prerequisites: req.filter(r => r.type === 'quest'), 'Start Items': start, Gather: gather,
      'Guaranteed Rewards': guaranteed, 'Choice Rewards': choices, 'Random Rewards': random,
      Contribution: q.rewards_contribution || null, Rotation: q.rotation || null,
      'ETC / Item To Save': gather.map(r => r.name).join(' · '), Qty: gather.map(r => r.count).join(' · '),
      'Save Guidance': gather.length ? gather.map(r => `${r.name} ×${r.count}`).join(' · ') : 'No items to gather before starting.',
      'Legacy Keys': [...legacy], Status: ''
    };
  }).sort((a, b) => a.Lv - b.Lv || a.Region.localeCompare(b.Region) || a.Quest.localeCompare(b.Quest));
}
module.exports = {questCatalog};
