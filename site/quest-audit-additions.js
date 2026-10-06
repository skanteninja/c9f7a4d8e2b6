// Compatibility signal for existing release gates. The catalog is built from
// the pinned snapshot; this file never appends or mutates quest records.
(() => {
  const D = window.GUIDE_DATA;
  if (!D) return;
  window.TCW_QUEST_AUDIT = {revision:D.questRevision,added:0,total:D.quests.length};
  document.documentElement.classList.add('quest-catalog-audit-ready');
})();
