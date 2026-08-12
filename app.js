(function () {
  "use strict";

  // Dismissible preview banner
  var banner = document.getElementById("previewBanner");
  var dismiss = document.getElementById("dismissBanner");
  if (banner && sessionStorage.getItem("an-preview-dismissed") === "1") {
    banner.hidden = true;
  }
  if (dismiss && banner) {
    dismiss.addEventListener("click", function () {
      banner.hidden = true;
      try { sessionStorage.setItem("an-preview-dismissed", "1"); } catch (e) {}
    });
  }

  // Theme toggle
  var root = document.documentElement;
  var themeBtn = document.getElementById("themeToggle");
  var stored = null;
  try { stored = localStorage.getItem("an-theme"); } catch (e) {}
  if (stored === "light" || stored === "dark") {
    root.setAttribute("data-theme", stored);
  }
  function syncThemeLabel() {
    if (!themeBtn) return;
    var isLight = root.getAttribute("data-theme") === "light";
    themeBtn.setAttribute("aria-label", isLight ? "Switch to dark mode" : "Switch to light mode");
    themeBtn.title = isLight ? "Dark mode" : "Light mode";
  }
  syncThemeLabel();
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      if (next === "dark") root.removeAttribute("data-theme");
      else root.setAttribute("data-theme", "light");
      try { localStorage.setItem("an-theme", next); } catch (e) {}
      syncThemeLabel();
    });
  }

  // Mobile nav
  var toggle = document.getElementById("menuToggle");
  var links = document.getElementById("navLinks");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // Newsletter demo (no network)
  var form = document.getElementById("newsletterForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = form.querySelector('input[type="email"]');
      var note = document.getElementById("newsletterNote");
      if (!input || !input.value) return;
      if (note) {
        note.textContent = "Preview mode — subscription UI only. Visit alignednews.com for the live list.";
      }
      input.value = "";
    });
  }
})();
