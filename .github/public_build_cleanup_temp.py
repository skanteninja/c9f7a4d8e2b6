from pathlib import Path

p = Path('build.cjs')
s = p.read_text()

old_owned = """function ownedUrls(text) {
  return String(text)
    .replaceAll('https://raw.githubusercontent.com/ohmi69/osms_datamine_dashboard/main/', '/game-origin/')
    .replaceAll('https://meowdb.com/msclassic/api/assets/icons/', '/game-art/meow/icons/')
    .replaceAll('https://api.dreamms.gg/api/GMS/latest/item/', '/game-art/dream/item/')
    .replaceAll('https://api.dreamms.gg/api/GMS/latest/pet/', '/game-art/dream/pet/')
    .replaceAll('https://maplestory.io/api/GMS/83/item/', '/game-art/mapleio/item/')
    .replaceAll('https://maplestory.io/api/wz/img/GMS/83/Skill/', '/game-art/mapleio/skill/');
}

function publicGuide(raw) {
  const data = JSON.parse(raw);
  // Research provenance stays in the private project/workflow, not in the public product payload.
  if (Array.isArray(data.sources)) data.sources = [];
  return ownedUrls(JSON.stringify(data));
}
"""

new_owned = r"""function ownedUrls(text) {
  return String(text)
    .replaceAll('https://raw.githubusercontent.com/ohmi69/osms_datamine_dashboard/main/', '/game-data/')
    .replaceAll('https://meowdb.com/msclassic/api/assets/icons/', '/game-media/icons/')
    .replaceAll('https://api.dreamms.gg/api/GMS/latest/item/', '/game-media/items/primary/')
    .replaceAll('https://api.dreamms.gg/api/GMS/latest/pet/', '/game-media/pets/')
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
  if (data.meta) {
    data.meta = {
      title: BRAND,
      version: data.meta.version,
      builtAt: data.meta.builtAt,
      maxLevel: data.meta.maxLevel,
      recommendationPolicy: data.meta.recommendationPolicy
    };
  }
  if (Array.isArray(data.sources)) data.sources = [];
  return JSON.stringify(sanitizePublicGuide(data));
}
"""

assert old_owned in s, 'ownedUrls/publicGuide block missing'
s = s.replace(old_owned, new_owned, 1)

old_nav = """  html = html.replace(/\\s*<div class=\"nav-section-label\">META<\\/div>\\s*/, '\\n');"""
new_nav = """  html = html.replace(/\\s*<div class=\"nav-section-label\">(?:PLAY|DATABASE|META)<\\/div>\\s*/g, '\\n');"""
assert old_nav in s, 'nav strip target missing'
s = s.replace(old_nav, new_nav, 1)

marker = 'function patchHtml(raw) {'
assert marker in s, 'patchHtml marker missing'
helper = r"""function removePageSection(html, page) {
  const startRe = new RegExp(`<section\\s+data-page=\"${page}\"\\b`, 'i');
  const match = startRe.exec(html);
  if (!match) return html;
  const tokenRe = /<\\/?section\\b[^>]*>/gi;
  tokenRe.lastIndex = match.index;
  let depth = 0;
  let end = -1;
  let token;
  while ((token = tokenRe.exec(html))) {
    if (/^<section\\b/i.test(token[0])) depth += 1;
    else depth -= 1;
    if (depth === 0) { end = tokenRe.lastIndex; break; }
  }
  if (end < 0) throw new Error(`Could not remove ${page} page section`);
  return html.slice(0, match.index) + html.slice(end);
}

"""
s = s.replace(marker, helper + marker, 1)

return_marker = "  return html;\n}\n\nfs.rmSync"
assert return_marker in s, 'patchHtml return marker missing'
s = s.replace(return_marker, "  for (const page of ['research','data','formulas']) html = removePageSection(html, page);\n  return html;\n}\n\nfs.rmSync", 1)

repls = {
    "const app = patchApp(readChunks('app', 4));": "const app = publicScript(patchApp(readChunks('app', 4)));",
    "const visuals = ownedUrls(fs.readFileSync(path.join(source, 'visuals.js'), 'utf8'));": "const visuals = publicScript(fs.readFileSync(path.join(source, 'visuals.js'), 'utf8'));",
    "const visualDb = ownedUrls(fs.readFileSync(path.join(source, 'visuals-db.js'), 'utf8'));": "const visualDb = publicScript(fs.readFileSync(path.join(source, 'visuals-db.js'), 'utf8'));",
    "const visualNpc = ownedUrls(fs.readFileSync(path.join(source, 'visuals-npc.js'), 'utf8'));": "const visualNpc = publicScript(fs.readFileSync(path.join(source, 'visuals-npc.js'), 'utf8'));",
    "const visualSkill = ownedUrls(fs.readFileSync(path.join(source, 'visuals-skills.js'), 'utf8'));": "const visualSkill = publicScript(fs.readFileSync(path.join(source, 'visuals-skills.js'), 'utf8'));",
    "const visualPortal = ownedUrls(fs.readFileSync(path.join(source, 'visuals-portals.js'), 'utf8'));": "const visualPortal = publicScript(fs.readFileSync(path.join(source, 'visuals-portals.js'), 'utf8'));",
    "const dashboardPolish = ownedUrls(fs.readFileSync(path.join(source, 'dashboard-polish.js'), 'utf8'));": "const dashboardPolish = publicScript(fs.readFileSync(path.join(source, 'dashboard-polish.js'), 'utf8'));",
    "const progressionSync = ownedUrls(fs.readFileSync(path.join(source, 'progression-sync.js'), 'utf8'));": "const progressionSync = publicScript(fs.readFileSync(path.join(source, 'progression-sync.js'), 'utf8'));",
    "const ownershipUi = fs.readFileSync(path.join(source, 'ownership-ui.js'), 'utf8');": "const ownershipUi = publicScript(fs.readFileSync(path.join(source, 'ownership-ui.js'), 'utf8'));",
}
for old, new in repls.items():
    assert old in s, f'missing script target: {old}'
    s = s.replace(old, new, 1)

p.write_text(s)
