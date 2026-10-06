function plannedJobName(level) {
  return state.jobPlan === 'third' && Number(level) >= D.futureJob.level ? `${D.futureJob.name} · preview` : '';
}
window.TCW_PLANNED_JOB = () => plannedJobName(state.level);
function renderPlanningControls() {
  const hero = document.querySelector('.dashboard-v72 .v5-character-hero');
  if (!hero) return;
  let panel = document.getElementById('job-planning');
  if (!panel) {
    panel = document.createElement('div'); panel.id = 'job-planning'; panel.className = 'job-planning';
    panel.innerHTML = `<p>Launch scope: Lv100 · second job</p><label>Dashboard job<select id="job-plan"><option value="second">Current job path</option><option value="third">${esc(D.futureJob.name)} · third-job preview</option></select></label><details id="third-job-reference"><summary>${esc(D.futureJob.name)} skill reference · future planning</summary><p>Third job is outside the announced launch scope. This preview keeps future planning available; no third-job SP is assigned automatically.</p><div class="future-skill-grid">${D.futureJob.skills.map(s => `<div><img src="/game-data/data/current/images/skills/${String(s.id).padStart(7,'0')}.png" width="28" height="28" loading="lazy" alt=""><span><b>${esc(s.name)}</b><small>Max Lv${s.max} · allocation unplanned</small></span></div>`).join('')}</div></details>`;
    hero.appendChild(panel);
    document.getElementById('job-plan').addEventListener('change',e => {
      state.jobPlan = e.target.value; save(); renderDashboard(); window.TCW_REFRESH_SKILL_STATE?.();
    });
  }
  const select = document.getElementById('job-plan');
  select.querySelector('[value="third"]').disabled = state.level < D.futureJob.level;
  select.value = state.level < D.futureJob.level ? 'second' : state.jobPlan;
  const reference = document.getElementById('third-job-reference');
  reference.hidden = state.level < D.futureJob.level;
  panel.dataset.plannedJob = plannedJobName(state.level) ? 'third' : 'second';
}
