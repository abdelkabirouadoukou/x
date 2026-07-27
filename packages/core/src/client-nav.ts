/**
 * Inline client-side navigation script.
 *
 * Embedded directly into every rendered page as a <script> tag (see render.ts).
 * Intercepts same-origin <a> clicks, fetches the destination page, and swaps
 * the #root element's content in place. Includes hover-prefetch and popstate
 * (back/forward) support.
 */
export const CLIENT_NAV_SCRIPT = `(function () {
  if (window.__xNav) return;
  window.__xNav = true;

  var cache = new Map();
  var CACHE_LIMIT = 30;

  function isEligibleLink(link) {
    if (!link) return null;
    if (link.hasAttribute("data-no-nav")) return null;
    if (link.target && link.target !== "_self") return null;
    if (link.hasAttribute("download")) return null;
    var href = link.getAttribute("href");
    if (!href) return null;
    if (/^(#|mailto:|tel:|javascript:)/i.test(href)) return null;

    var url;
    try {
      url = new URL(href, location.href);
    } catch (e) {
      return null;
    }
    if (url.origin !== location.origin) return null;

    var current = new URL(location.href);
    var samePage = url.pathname === current.pathname && url.search === current.search;
    if (samePage && url.hash) return null;

    return url;
  }

  function setLoading(isLoading) {
    document.documentElement.classList.toggle("x-nav-loading", isLoading);
  }

  function runScripts(container) {
    var scripts = container.querySelectorAll("script");
    for (var i = 0; i < scripts.length; i++) {
      var old = scripts[i];
      var fresh = document.createElement("script");
      for (var j = 0; j < old.attributes.length; j++) {
        var attr = old.attributes[j];
        fresh.setAttribute(attr.name, attr.value);
      }
      fresh.textContent = old.textContent;
      old.replaceWith(fresh);
    }
  }

  function evictIfFull() {
    if (cache.size < CACHE_LIMIT) return;
    var oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }

  function fetchPage(url) {
    var key = url.href;
    if (cache.has(key)) return cache.get(key);
    var promise = fetch(url.href, { headers: { "X-X-Nav": "1" } })
      .then(function (res) {
        return res.text().then(function (html) {
          var contentType = res.headers.get("content-type") || "";
          return {
            html: html,
            ok: res.ok,
            finalUrl: res.url || url.href,
            isHtml: contentType.indexOf("text/html") !== -1,
          };
        });
      })
      .catch(function (err) {
        cache.delete(key);
        throw err;
      });
    evictIfFull();
    cache.set(key, promise);
    return promise;
  }

  function prefetch(url) {
    if (cache.has(url.href)) return;
    fetchPage(url).catch(function () {});
  }

  function navigate(url, push) {
    setLoading(true);
    return fetchPage(url)
      .then(function (entry) {
        if (!entry.isHtml) {
          location.href = url.href;
          return;
        }
        var doc = new DOMParser().parseFromString(entry.html, "text/html");
        var newRoot = doc.getElementById("root");
        var currentRoot = document.getElementById("root");
        if (!newRoot || !currentRoot) {
          location.href = url.href;
          return;
        }

        if (push) history.pushState({ xNav: true }, "", entry.finalUrl);
        if (doc.title) document.title = doc.title;
        currentRoot.innerHTML = newRoot.innerHTML;
        runScripts(currentRoot);

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

  document.addEventListener("click", function (event) {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    var link = event.target && event.target.closest ? event.target.closest("a[href]") : null;
    var url = isEligibleLink(link);
    if (!url) return;

    event.preventDefault();
    if (url.href === location.href) return;
    navigate(url, true);
  });

  document.addEventListener(
    "mouseover",
    function (event) {
      var link = event.target && event.target.closest ? event.target.closest("a[href]") : null;
      var url = isEligibleLink(link);
      if (url) prefetch(url);
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
})();`;
