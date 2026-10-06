// Build-time catalogs own the quantities. Never replace them with a class-specific runtime list.
(() => {
  const D=window.GUIDE_DATA;if(!D)return;
  window.TCW_ETC_AUDIT={revision:D.questRevision,buffer:0.15,total:D.etc.length};
  document.documentElement.classList.add('etc-lifetime-data-ready','etc-build-aware-ready');
})();
