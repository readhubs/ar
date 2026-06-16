/**
 * register-sw.js
 * Include on every HTML page (loaded last, after body).
 * Registers the service worker for PWA offline capability.
 */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    // Resolve SW path from the /ar/ root regardless of current page depth
    const swPath = (function () {
      const path = window.location.pathname;
      // Find the /ar/ segment and build path from there
      const arIdx = path.indexOf("/ar/");
      if (arIdx !== -1) return path.substring(0, arIdx + 4) + "sw.js";
      return "/ar/sw.js";
    })();

    navigator.serviceWorker.register(swPath, { scope: "/ar/" })
      .then(function (reg) {
        console.info("Readhubs SW registered:", reg.scope);
      })
      .catch(function (err) {
        console.warn("Readhubs SW registration failed:", err);
      });
  });
}
