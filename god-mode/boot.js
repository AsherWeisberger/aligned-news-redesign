/**
 * Aligned News / God Mode boot — self-contained overlay.
 * Loads React + Cesium (desktop) or globe.gl HUD (phone). Never navigates to UNIFY/ops.
 */
(function (global) {
  "use strict";

  var VERSION = "an91";
  // GitHub Pages has no /god-mode proxy. Engines that read this hit Unify.
  try {
    if (!global.UNALIGNED_GOD_MODE_PROXY) {
      global.UNALIGNED_GOD_MODE_PROXY = "https://mac-studio.tail50d3a2.ts.net";
    }
  } catch (e) {}
  var BASE = (function () {
    try {
      var scripts = document.getElementsByTagName("script");
      for (var i = scripts.length - 1; i >= 0; i--) {
        var src = scripts[i].src || "";
        if (/god-mode\/boot\.js/.test(src)) return src.replace(/boot\.js(?:\?.*)?$/, "");
      }
    } catch (e) {}
    return "god-mode/";
  })();

  // Public Google Photorealistic 3D Tiles key already shipped on the ops frontend.
  try {
    if (!global.UNALIGNED_GOOGLE_MAPS_TILES_KEY) {
      global.UNALIGNED_GOOGLE_MAPS_TILES_KEY = "AIzaSyAdikDP3IFcWhm-p-FVq49GHUoLqg18s64";
    }
  } catch (e) {}

  function loadScript(src, id) {
    return new Promise(function (resolve, reject) {
      if (id) {
        var existing = document.getElementById(id);
        if (existing) {
          if (existing.dataset && existing.dataset.loaded === "1") return resolve();
          existing.addEventListener("load", function () { resolve(); }, { once: true });
          existing.addEventListener("error", function () { reject(new Error("Failed " + src)); }, { once: true });
          return;
        }
      }
      var s = document.createElement("script");
      if (id) s.id = id;
      s.src = src;
      s.async = true;
      s.onload = function () { try { s.dataset.loaded = "1"; } catch (e) {} resolve(); };
      s.onerror = function () { reject(new Error("Failed " + src)); };
      document.head.appendChild(s);
    });
  }

  function removeScript(id) {
    try {
      var el = document.getElementById(id);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    } catch (e) {}
  }

  // Desktop Mac/Safari must get Cesium — never globe.gl's baked marble blob.
  // Safari exposes ontouchstart and some Macs report maxTouchPoints; that is NOT a phone.
  function isMacDesktopGodMode() {
    var ua = String(navigator.userAgent || "");
    var platform = String(navigator.platform || "");
    if (!(/Macintosh|Mac OS X/i.test(ua) || /MacIntel|MacPPC|Mac68K/i.test(platform))) return false;
    var touchPoints = Number(navigator.maxTouchPoints || 0);
    var coarse = false, hoverNone = false, fineHover = false;
    try { coarse = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches); } catch (e) {}
    try { hoverNone = !!(window.matchMedia && window.matchMedia("(hover: none)").matches); } catch (e) {}
    try { fineHover = !!(window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches); } catch (e) {}
    var ipadSpoof = touchPoints > 1 && (coarse || hoverNone) && !fineHover;
    return !ipadSpoof;
  }

  function isPhoneGodMode() {
    // Macintosh + trackpad is always Cesium. Ignore leftover ?god=phone.
    if (isMacDesktopGodMode()) return false;
    try {
      var g = new URLSearchParams(location.search).get("god");
      if (g === "phone") return true;
      if (g === "legacy" || g === "desktop" || g === "cesium") return false;
    } catch (e) {}

    var ua = String(navigator.userAgent || "");
    var platform = String(navigator.platform || "");
    var touchPoints = Number(navigator.maxTouchPoints || 0);
    var coarse = false;
    var hoverNone = false;
    var fineHover = false;
    try { coarse = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches); } catch (e) {}
    try { hoverNone = !!(window.matchMedia && window.matchMedia("(hover: none)").matches); } catch (e) {}
    try { fineHover = !!(window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches); } catch (e) {}

    if (/iPhone|iPod/i.test(ua)) return true;
    if (/Android/i.test(ua) && /Mobile/i.test(ua)) return true;
    try {
      if (navigator.userAgentData && navigator.userAgentData.mobile) return true;
    } catch (e) {}

    // iPadOS 13+ can spoof Macintosh; require coarse pointer / no-hover plus multi-touch.
    var ipad = /iPad/i.test(ua) || /iPad/i.test(platform) ||
      ((platform === "MacIntel" || /Macintosh|Mac OS X/i.test(ua)) && touchPoints > 1 && (coarse || hoverNone) && !fineHover);
    if (ipad) return true;
    if (/Android/i.test(ua) && (coarse || hoverNone) && !fineHover) return true;

    // Real desktop (Mac included): mouse/trackpad hover. Do not treat ontouchstart as phone.
    if (fineHover) return false;
    return false;
  }

  function hasReact() {
    return !!(global.React && global.React.createElement && global.React.useRef &&
      global.ReactDOM && (global.ReactDOM.createRoot || global.ReactDOM.render));
  }

  function loadReact() {
    if (hasReact()) return Promise.resolve();
    return loadScript("https://unpkg.com/react@18.3.1/umd/react.production.min.js", "an-react").then(function () {
      return loadScript("https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js", "an-react-dom");
    }).then(function () {
      if (!hasReact()) throw new Error("React UMD failed to load");
    });
  }

  var engineWant = null;
  var loadPromise = null;
  var reactRoot = null;
  var layer = "all";
  var openFlag = false;
  var closeCb = null;

  function grabEarth() {
    var cmp = global.V4GodModeEarth || global.V4GodMode || global.GodModeEarth;
    if (typeof cmp === "function") {
      if (typeof global.V4GodModeEarth !== "function") global.V4GodModeEarth = cmp;
      return cmp;
    }
    return null;
  }

  function waitForEarth(ms) {
    return new Promise(function (resolve, reject) {
      var now = grabEarth();
      if (now) return resolve(now);
      var t0 = Date.now();
      var id = setInterval(function () {
        var cmp = grabEarth();
        if (cmp) { clearInterval(id); resolve(cmp); return; }
        if (Date.now() - t0 > ms) {
          clearInterval(id);
          reject(new Error("God Mode module loaded but V4GodModeEarth missing (React required)"));
        }
      }, 40);
    });
  }

  function unloadEngine(want) {
    removeScript("an-godmode-" + want);
    try {
      try { delete global.V4GodModeEarth; } catch (e) { global.V4GodModeEarth = undefined; }
    } catch (e2) {}
  }

  function loadEngine() {
    var want = isPhoneGodMode() ? "phone" : "cesium";
    if (typeof global.V4GodModeEarth === "function" && global.V4GodModeEarth.engine === want) {
      return Promise.resolve(global.V4GodModeEarth);
    }
    if (loadPromise && engineWant === want) return loadPromise;
    engineWant = want;
    var srcBase = BASE + (want === "phone" ? "god-mode-mobile.js" : "god-mode-cesium.js") + "?v=" + VERSION;
    function attempt(isRetry) {
      return loadReact().then(function () {
        if (!hasReact()) throw new Error("React UMD failed to load");
        if (isRetry) unloadEngine(want);
        return loadScript(srcBase + (isRetry ? "&retry=1" : ""), "an-godmode-" + want);
      }).then(function () {
        return waitForEarth(isRetry ? 2500 : 200);
      }).then(function (Cmp) {
        if (!Cmp.engine) Cmp.engine = want;
        return Cmp;
      }).catch(function (err) {
        if (!isRetry) return attempt(true);
        throw err;
      });
    }
    loadPromise = attempt(false).then(function (Cmp) { return Cmp; }, function (err) {
      loadPromise = null;
      throw err;
    });
    return loadPromise;
  }

  function render() {
    var Cmp = grabEarth();
    var mount = document.getElementById("godModeMount");
    if (!Cmp || !mount || !hasReact()) return;
    var el = global.React.createElement(Cmp, {
      open: openFlag,
      layer: layer,
      viewer: {},
      onClose: function () { if (typeof closeCb === "function") closeCb(); },
      onLayerChange: function (id) { layer = id; }
    });
    if (global.ReactDOM.createRoot) {
      if (!reactRoot) reactRoot = global.ReactDOM.createRoot(mount);
      reactRoot.render(el);
    } else {
      global.ReactDOM.render(el, mount);
    }
  }

  global.AlignedNewsGodMode = {
    open: function (opts) {
      opts = opts || {};
      if (opts.onClose) closeCb = opts.onClose;
      openFlag = true;
      return loadReact().then(loadEngine).then(function () { render(); });
    },
    close: function () {
      openFlag = false;
      try { render(); } catch (e) {}
    },
    isOpen: function () { return openFlag; }
  };
})(window);
