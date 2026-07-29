export const LIVE_RELOAD_SCRIPT = `
(function () {
  var es = new EventSource("/__x/reload");
  es.addEventListener("reload", function () {
    es.close();
    if (typeof window.__xSoftReload === "function") {
      window.__xSoftReload();
    } else {
      window.location.reload();
    }
  });
  es.addEventListener("hb", function () {});
  es.onerror = function () {
    es.close();
  };
})();
`.trim();
