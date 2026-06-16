/**
 * floating-button.js
 * Include on every page. Renders a floating CTA button showing
 * active coupon count. Reads coursesData from courses-data.js
 * (must be loaded before this script).
 */
(function () {
  "use strict";

  function countActiveCoupons() {
    if (typeof coursesData === "undefined" || !Array.isArray(coursesData.courses)) {
      return 0;
    }
    const now = Date.now();
    return coursesData.courses.filter(function (c) {
      return (
        c.status === "published" &&
        c.coupon_code &&
        c.coupon_expires &&
        new Date(c.coupon_expires).getTime() > now
      );
    }).length;
  }

  function createButton(activeCount) {
    const existing = document.getElementById("floating-cta");
    if (existing) existing.remove();

    const btn = document.createElement("a");
    btn.id = "floating-cta";

    if (activeCount > 0) {
      btn.href = "deals.html";
      btn.setAttribute("aria-label", "عروض اليوم — " + activeCount + " عرض نشط");

      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = activeCount;

      const label = document.createElement("span");
      label.textContent = "🔥 عروض اليوم";

      btn.appendChild(badge);
      btn.appendChild(label);
    } else {
      // Resolve href relative to page depth
      const depth = (window.location.pathname.match(/\//g) || []).length;
      // At GitHub Pages /ar/ = depth 1 from root, niches/ = depth 2, admin/ = depth 2
      // We always want to link to index.html at the /ar/ root
      btn.href = "index.html";
      btn.setAttribute("aria-label", "تصفح الكورسات");

      const label = document.createElement("span");
      label.textContent = "📚 تصفح الكورسات";
      btn.appendChild(label);
    }

    document.body.appendChild(btn);
  }

  function init() {
    try {
      const count = countActiveCoupons();
      createButton(count);
    } catch (e) {
      // Never crash the page — just skip the button
      console.warn("floating-button.js: could not render button", e);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Register Service Worker (once, from any page depth)
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      var swPath = "/ar/sw.js";
      var scope  = "/ar/";
      // Handle local file:// testing or relative paths
      try {
        var p = window.location.pathname;
        var idx = p.indexOf("/ar/");
        if (idx !== -1) {
          swPath = p.substring(0, idx + 4) + "sw.js";
          scope  = p.substring(0, idx + 4);
        }
      } catch (e) {}
      navigator.serviceWorker.register(swPath, { scope: scope }).catch(function () {});
    });
  }
})();
