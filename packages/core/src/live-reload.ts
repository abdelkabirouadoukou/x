export const LIVE_RELOAD_SCRIPT = `
(function(){var s=new EventSource("/__x/reload");s.addEventListener("reload",function(){s.close();window.location.reload()});s.addEventListener("hb",function(){});s.onerror=function(){s.close()}})();
`;
