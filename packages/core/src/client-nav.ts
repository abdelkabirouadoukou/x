/**
 * Inline client-side navigation script.
 *
 * Embedded directly into every rendered page as a <script> tag (see render.ts).
 * Intercepts same-origin <a> clicks, fetches the destination page, and swaps
 * the #root element's content in place. Includes hover-prefetch and popstate
 * (back/forward) support.
 *
 * Opt-out attributes on <a> / <Link />:
 * - data-no-nav       — skip client navigation (full page load)
 * - data-no-prefetch  — skip hover prefetch (navigation still works)
 */
export const CLIENT_NAV_SCRIPT = `
(function () {
  if (window.__xNav) return;
  window.__xNav = true;

  var cache = new Map();

  document.addEventListener("click", function (ev) {
    if (ev.defaultPrevented || ev.button !== 0) return;
    if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    var anchor = resolveLink(ev.target && ev.target.closest ? ev.target.closest("a[href]") : null);
    if (!anchor) return;
    ev.preventDefault();
    if (anchor.href !== location.href) navigate(anchor, true);
  });

  document.addEventListener(
    "mouseover",
    function (ev) {
      var anchor = resolveLink(ev.target && ev.target.closest ? ev.target.closest("a[href]") : null);
      if (!anchor || anchor.hasAttribute("data-no-prefetch")) return;
      prefetch(anchor);
    },
    { passive: true },
  );

  document.addEventListener(
    "focusin",
    function (ev) {
      var anchor = resolveLink(ev.target && ev.target.closest ? ev.target.closest("a[href]") : null);
      if (!anchor || anchor.hasAttribute("data-no-prefetch")) return;
      prefetch(anchor);
    },
    { passive: true },
  );

  window.addEventListener("popstate", function () {
    navigate(new URL(location.href), false);
  });

  var style = document.createElement("style");
  style.textContent = [
    ".x-nav-loading{cursor:progress}",
    ".x-nav-loading::after{content:'';position:fixed;top:0;left:0;height:2px;width:100%;",
    "background:var(--x-accent,#6ab0ff);z-index:9999;animation:x-nav-progress .8s ease-in-out infinite}",
    "@keyframes x-nav-progress{0%{transform:translateX(-100%)}50%{transform:translateX(0)}100%{transform:translateX(100%)}}",
  ].join("");
  document.head.appendChild(style);

  function resolveLink(anchor) {
    if (!anchor) return null;
    if (anchor.hasAttribute("data-no-nav")) return null;
    if (anchor.target && anchor.target !== "_self") return null;
    if (anchor.hasAttribute("download")) return null;
    var href = anchor.getAttribute("href");
    if (!href) return null;
    if (/^(#|mailto:|tel:|javascript:)/i.test(href)) return null;
    var url;
    try {
      url = new URL(href, location.href);
    } catch (_) {
      return null;
    }
    if (url.origin !== location.origin) return null;
    var here = new URL(location.href);
    if (url.pathname === here.pathname && url.search === here.search && url.hash) return null;
    return url;
  }

  function setLoading(on) {
    document.documentElement.classList.toggle("x-nav-loading", on);
  }

  function prefetch(url) {
    if (cache.has(url.href)) return;
    var promise = fetch(url.href, { headers: { "X-X-Nav": "1" } })
      .then(function (res) {
        return res.text().then(function (html) {
          var ct = res.headers.get("content-type") || "";
          return { html: html, ok: res.ok, finalUrl: res.url || url.href, isHtml: ct.indexOf("text/html") !== -1 };
        });
      })
      .catch(function (err) {
        cache.delete(url.href);
        throw err;
      });
    if (cache.size >= 30) {
      var first = cache.keys().next().value;
      if (first !== undefined) cache.delete(first);
    }
    cache.set(url.href, promise);
  }

  function navigate(url, push) {
    setLoading(true);
    prefetch(url)
      .then(function (payload) {
        if (!payload.isHtml) {
          location.href = url.href;
          return;
        }
        var doc = new DOMParser().parseFromString(payload.html, "text/html");
        var next = doc.getElementById("root");
        var root = document.getElementById("root");
        if (!next || !root) {
          location.href = url.href;
          return;
        }
        if (push) history.pushState({ xNav: true }, "", payload.finalUrl);
        if (doc.title) document.title = doc.title;
        root.innerHTML = next.innerHTML;
        reexecuteScripts(root);
        if (url.hash) {
          var target = document.getElementById(url.hash.slice(1));
          if (target) {
            target.scrollIntoView();
            return;
          }
        }
        window.scrollTo(0, 0);
      })
      .catch(function () {
        location.href = url.href;
      })
      .finally(function () {
        setLoading(false);
      });
  }

  function reexecuteScripts(root) {
    var scripts = root.querySelectorAll("script");
    for (var i = 0; i < scripts.length; i++) {
      var old = scripts[i];
      var el = document.createElement("script");
      for (var j = 0; j < old.attributes.length; j++) {
        var attr = old.attributes[j];
        el.setAttribute(attr.name, attr.value);
      }
      el.textContent = old.textContent;
      old.replaceWith(el);
    }
  }

  /** Soft reload current page without a full document reload (used by dev live-reload). */
  window.__xSoftReload = function () {
    navigate(new URL(location.href), false);
  };
})();
`.trim();
