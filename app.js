(function () {
  "use strict";

  var DATA_URL = "live-data.json";
  var state = {
    data: null,
    filter: "all",
    query: "",
    saved: loadSaved(),
    read: loadRead(),
  };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function loadSaved() {
    try { return JSON.parse(localStorage.getItem("an-saved") || "[]"); } catch (e) { return []; }
  }
  function persistSaved() {
    try { localStorage.setItem("an-saved", JSON.stringify(state.saved)); } catch (e) {}
  }
  function loadRead() {
    try { return JSON.parse(localStorage.getItem("an-read") || "[]"); } catch (e) { return []; }
  }
  function persistRead() {
    try { localStorage.setItem("an-read", JSON.stringify(state.read)); } catch (e) {}
  }

  function applyPrefs() {
    var root = document.documentElement;
    var theme = null;
    var density = null;
    try {
      theme = localStorage.getItem("an-theme");
      density = localStorage.getItem("an-density");
    } catch (e) {}
    if (theme === "dark") root.setAttribute("data-theme", "dark");
    else root.removeAttribute("data-theme"); // light default
    if (density === "compact") root.setAttribute("data-density", "compact");
    else root.removeAttribute("data-density");
  }

  function fmtRelative(iso) {
    if (!iso) return "";
    var t = Date.parse(iso);
    if (!t) return "";
    var diff = Date.now() - t;
    var mins = Math.round(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    var hrs = Math.round(mins / 60);
    if (hrs < 36) return hrs + "h ago";
    var days = Math.round(hrs / 24);
    if (days < 14) return days + "d ago";
    try {
      return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch (e) { return ""; }
  }

  function fmtDateLong(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString(undefined, {
        weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
      });
    } catch (e) { return ""; }
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function badgeClass(badge) {
    var b = (badge || "").toLowerCase();
    return "badge badge-" + (b || "signal");
  }

  function pageName() {
    return document.body.getAttribute("data-page") || "today";
  }

  function renderChrome() {
    var data = state.data;
    var page = pageName();
    var counts = {
      stories: (data.stories || []).length,
      signals: (data.signals || []).length,
      reports: (data.reports || []).length,
      saved: state.saved.length,
    };
    var nav = [
      { id: "today", href: "index.html", label: "Today" },
      { id: "signals", href: "signals.html", label: "Signals", count: counts.signals },
      { id: "stories", href: "index.html", label: "Stories", count: counts.stories },
      { id: "reports", href: "reports.html", label: "Reports", count: counts.reports },
      { id: "saved", href: "index.html?view=saved", label: "Saved", count: counts.saved },
    ];

    var lastUpdated = "";
    if (data.meta && data.meta.lastUpdatedTs) {
      lastUpdated = fmtRelative(new Date(Number(data.meta.lastUpdatedTs)).toISOString());
    } else if (data.meta && data.meta.generatedAt) {
      lastUpdated = fmtRelative(data.meta.generatedAt);
    }

    var sidebar = $("#sidebar");
    if (sidebar) {
      sidebar.innerHTML =
        '<div class="nav-label">Browse</div>' +
        '<ul class="side-nav">' +
        nav.map(function (item) {
          var active = item.id === page || (page === "today" && item.id === "stories" && getParam("view") !== "saved") ||
            (page === "today" && item.id === "saved" && getParam("view") === "saved") ||
            (page === "today" && item.id === "today" && getParam("view") !== "saved");
          // Today active only for default today; Saved active when view=saved
          if (item.id === "today") active = page === "today" && getParam("view") !== "saved";
          if (item.id === "stories") active = false; // stories fold into today feed
          if (item.id === "saved") active = page === "today" && getParam("view") === "saved";
          return (
            '<li><a class="' + (active ? "active" : "") + '" href="' + item.href + '">' +
            escapeHtml(item.label) +
            (item.count != null ? '<span class="count">' + item.count + "</span>" : "") +
            "</a></li>"
          );
        }).join("") +
        "</ul>" +
        '<div class="nav-label" style="margin-top:1.25rem">Sections</div>' +
        '<ul class="side-nav" id="sectionNav"></ul>' +
        '<div class="sidebar-foot">Logged in as Asher · Pro<br>Quiet reader mock · data from alignednews.com</div>';

      var sectionNav = $("#sectionNav");
      var chips = data.chips || [];
      sectionNav.innerHTML = chips.filter(function (c) { return c.id !== "all"; }).map(function (c) {
        var href = page === "signals" ? "signals.html?section=" + encodeURIComponent(c.id) : "index.html?section=" + encodeURIComponent(c.id);
        return '<li><a href="' + href + '">' + escapeHtml(c.label) + "</a></li>";
      }).join("");
    }

    var metaEl = $("#pageMeta");
    if (metaEl) {
      var todayLabel = new Date().toLocaleDateString(undefined, {
        weekday: "long", month: "long", day: "numeric", year: "numeric"
      });
      if (page === "today") {
        metaEl.textContent = todayLabel + (lastUpdated ? " · Last updated " + lastUpdated : "");
      } else if (page === "signals") {
        metaEl.textContent = counts.signals + " signals" + (lastUpdated ? " · Updated " + lastUpdated : "");
      } else if (page === "reports") {
        metaEl.textContent = counts.reports + " reports";
      }
    }

    var densBtn = $("#densityToggle");
    if (densBtn) {
      var compact = document.documentElement.getAttribute("data-density") === "compact";
      densBtn.setAttribute("aria-pressed", compact ? "true" : "false");
      densBtn.textContent = compact ? "Compact" : "Comfortable";
    }
    var themeBtn = $("#themeToggle");
    if (themeBtn) {
      var dark = document.documentElement.getAttribute("data-theme") === "dark";
      themeBtn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
      themeBtn.title = dark ? "Light mode" : "Dark mode";
    }
  }

  function getParam(name) {
    try {
      return new URLSearchParams(location.search).get(name);
    } catch (e) { return null; }
  }

  function storyMatches(story) {
    if (state.filter && state.filter !== "all") {
      var key = story.section_key || "";
      if (state.filter === "robotics") {
        if (key !== "robotics" && key !== "policy" && (story.section || "").indexOf("robot") === -1) {
          // allow robotics-policy via policy chip separately; robotics chip matches robotics*
          if ((story.section || "").indexOf("robotics") === -1) return false;
        }
      } else if (key !== state.filter) {
        return false;
      }
    }
    if (state.query) {
      var q = state.query.toLowerCase();
      var hay = [story.headline, story.summary, story.section_label, story.section, story.signal_badge]
        .join(" ").toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    if (getParam("view") === "saved") {
      if (state.saved.indexOf(story.id) === -1) return false;
    }
    return true;
  }

  function renderChips(containerId) {
    var el = $(containerId);
    if (!el || !state.data) return;
    var chips = state.data.chips || [];
    el.innerHTML = chips.map(function (c) {
      return (
        '<button type="button" class="chip" data-filter="' + escapeHtml(c.id) + '" aria-pressed="' +
        (state.filter === c.id ? "true" : "false") + '">' + escapeHtml(c.label) + "</button>"
      );
    }).join("");
    $all(".chip", el).forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.filter = btn.getAttribute("data-filter") || "all";
        renderChips(containerId);
        if (pageName() === "today") renderTodayFeed();
        if (pageName() === "signals") renderSignals();
      });
    });
  }

  function renderForYou() {
    var el = $("#forYou");
    if (!el || !state.data) return;
    if (getParam("view") === "saved") { el.hidden = true; return; }
    var items = state.data.forYou || [];
    if (!items.length) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML =
      '<div class="foryou-label">For you</div>' +
      items.map(function (s) {
        return (
          '<a href="story.html?id=' + encodeURIComponent("sigstory-" + s.id) + '">' +
          '<span class="' + badgeClass(s.badge) + '">' + escapeHtml((s.badge || "signal").toUpperCase()) + "</span>" +
          "<span>" + escapeHtml(s.title) + "</span></a>"
        );
      }).join("");
  }

  function renderTodayFeed() {
    var list = $("#feed");
    if (!list || !state.data) return;
    var stories = (state.data.stories || []).filter(storyMatches);
    if (!stories.length) {
      list.innerHTML = '<li class="empty">No stories match this filter.</li>';
      return;
    }
    list.innerHTML = stories.map(function (s, i) {
      var badge = s.signal_badge
        ? '<span class="' + badgeClass(s.signal_badge) + '">' + escapeHtml(String(s.signal_badge).toUpperCase()) + "</span>"
        : "";
      var excerpt = s.summary || "";
      if (excerpt.length > 180) excerpt = excerpt.slice(0, 177).trim() + "…";
      var isRead = state.read.indexOf(s.id) !== -1;
      return (
        '<li class="feed-row' + (isRead ? " is-read" : "") + '">' +
          '<div class="rank">' + (i + 1) + "</div>" +
          '<div class="feed-body">' +
            '<h2 class="story-title"><a href="story.html?id=' + encodeURIComponent(s.id) + '">' +
              escapeHtml(s.headline) + "</a></h2>" +
            (excerpt ? '<p class="excerpt">' + escapeHtml(excerpt) + "</p>" : "") +
            '<div class="meta">' +
              badge +
              '<span class="section-pill">' + escapeHtml(s.section_label || s.section || "") + "</span>" +
              '<span class="dot">' + escapeHtml(fmtRelative(s.published_at)) + "</span>" +
              (s.source_list ? '<span class="dot">' + escapeHtml(s.source_list) + "</span>" : "") +
              (s.author_name && !s.signal_badge ? '<span class="dot">' + escapeHtml(s.author_name) + "</span>" : "") +
            "</div>" +
          "</div>" +
        "</li>"
      );
    }).join("");
  }

  function renderSignals() {
    var list = $("#feed");
    if (!list || !state.data) return;
    var items = (state.data.signals || []).filter(function (s) {
      if (state.filter && state.filter !== "all" && (s.section_key || "") !== state.filter) return false;
      if (state.query) {
        var q = state.query.toLowerCase();
        var hay = [s.title, s.text, s.category, s.badge, s.source_list].join(" ").toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    if (!items.length) {
      list.innerHTML = '<li class="empty">No signals match.</li>';
      return;
    }
    list.innerHTML = items.map(function (s, i) {
      var excerpt = s.analysis || s.text || "";
      if (excerpt.length > 200) excerpt = excerpt.slice(0, 197).trim() + "…";
      return (
        '<li class="feed-row">' +
          '<div class="rank">' + (i + 1) + "</div>" +
          '<div class="feed-body">' +
            '<h2 class="story-title"><a href="story.html?id=' + encodeURIComponent("sigstory-" + s.id) + '">' +
              escapeHtml(s.title) + "</a></h2>" +
            '<p class="excerpt">' + escapeHtml(excerpt) + "</p>" +
            '<div class="meta">' +
              '<span class="' + badgeClass(s.badge) + '">' + escapeHtml((s.badge || "signal").toUpperCase()) + "</span>" +
              '<span class="section-pill">' + escapeHtml(s.section_label || s.category || "") + "</span>" +
              '<span class="dot">' + escapeHtml(fmtRelative(s.created_at)) + "</span>" +
              (s.source_list ? '<span class="dot">' + escapeHtml(s.source_list) + "</span>" : "") +
              (s.engagement_score != null ? '<span class="dot">' + s.engagement_score + "% conf.</span>" : "") +
            "</div>" +
          "</div>" +
        "</li>"
      );
    }).join("");
  }

  function renderReports() {
    var list = $("#reportList");
    if (!list || !state.data) return;
    var items = state.data.reports || [];
    if (state.query) {
      var q = state.query.toLowerCase();
      items = items.filter(function (r) {
        return [r.title, r.summary, r.type].join(" ").toLowerCase().indexOf(q) !== -1;
      });
    }
    if (!items.length) {
      list.innerHTML = '<li class="empty">No reports.</li>';
      return;
    }
    list.innerHTML = items.map(function (r) {
      return (
        '<li class="report-item">' +
          "<h2>" + escapeHtml(r.title) + "</h2>" +
          (r.summary ? "<p>" + escapeHtml(r.summary) + "</p>" : "") +
          '<div class="meta">' +
            '<span class="section-pill">' + escapeHtml((r.type || "report").replace(/_/g, " ")) + "</span>" +
            (r.reading_time_min ? '<span class="dot">' + r.reading_time_min + " min</span>" : "") +
            '<span class="dot">' + escapeHtml(fmtRelative(r.published_at)) + "</span>" +
            (r.author ? '<span class="dot">' + escapeHtml(r.author) + "</span>" : "") +
          "</div>" +
        "</li>"
      );
    }).join("");
  }

  function findStory(id) {
    if (!state.data) return null;
    var stories = state.data.stories || [];
    for (var i = 0; i < stories.length; i++) if (stories[i].id === id) return stories[i];
    // also allow raw signal id
    var signals = state.data.signals || [];
    for (var j = 0; j < signals.length; j++) {
      if (signals[j].id === id || ("sigstory-" + signals[j].id) === id) {
        var sig = signals[j];
        return {
          id: "sigstory-" + sig.id,
          headline: sig.title,
          summary: sig.text,
          section_label: sig.section_label || sig.category,
          section: sig.category,
          published_at: sig.created_at,
          signal_badge: sig.badge,
          source_list: sig.source_list,
          source_url: sig.source_url,
          sources: sig.source_url ? [{ url: sig.source_url, name: sig.source_list || "Source" }] : [],
          body: sig.analysis || sig.text,
          author_name: "Aligned News",
          _body_placeholder: sig._analysis_placeholder,
        };
      }
    }
    return null;
  }

  function renderStory() {
    var root = $("#article");
    if (!root) return;
    var id = getParam("id");
    var story = findStory(id);
    if (!story) {
      root.innerHTML = '<p class="status error">Story not found. <a href="index.html">Back to Today</a></p>';
      return;
    }
    if (state.read.indexOf(story.id) === -1) {
      state.read.push(story.id);
      persistRead();
    }
    var saved = state.saved.indexOf(story.id) !== -1;
    var paragraphs = String(story.body || story.summary || "")
      .split(/\n\n+/)
      .map(function (p) { return p.trim(); })
      .filter(Boolean);

    var bodyHtml = paragraphs.map(function (p) {
      if (/^\[Sample/i.test(p) || /placeholder/i.test(p) && /^\[/.test(p)) {
        return '<p class="sample-note">' + escapeHtml(p) + "</p>";
      }
      return "<p>" + escapeHtml(p) + "</p>";
    }).join("");

    var sources = story.sources || [];
    if ((!sources.length) && story.source_url) {
      sources = [{ url: story.source_url, name: story.source_list || "Original source" }];
    }

    root.innerHTML =
      '<a class="back-link" href="index.html">← Today</a>' +
      '<div class="article-kicker">' +
        (story.signal_badge ? '<span class="' + badgeClass(story.signal_badge) + '">' + escapeHtml(String(story.signal_badge).toUpperCase()) + "</span>" : "") +
        '<span class="section-pill">' + escapeHtml(story.section_label || story.section || "") + "</span>" +
        '<span class="dot">' + escapeHtml(fmtDateLong(story.published_at)) + "</span>" +
        (story.source_list ? '<span class="dot">' + escapeHtml(story.source_list) + "</span>" : "") +
      "</div>" +
      "<h1>" + escapeHtml(story.headline) + "</h1>" +
      (story.summary ? '<p class="article-dek">' + escapeHtml(story.summary) + "</p>" : "") +
      '<div class="article-actions">' +
        '<button type="button" class="btn" id="saveBtn">' + (saved ? "Saved" : "Save") + "</button>" +
        '<button type="button" class="btn" id="readBtn">Mark unread</button>' +
        (story.source_url ? '<a class="btn btn-primary" href="' + escapeHtml(story.source_url) + '" target="_blank" rel="noopener">Open source</a>' : "") +
      "</div>" +
      '<div class="article-body">' + bodyHtml + "</div>" +
      (sources.length
        ? '<div class="sources"><h2>Sources</h2><ul>' +
          sources.map(function (src) {
            return "<li><a href=\"" + escapeHtml(src.url) + "\" target=\"_blank\" rel=\"noopener\">" +
              escapeHtml(src.name || src.url) + "</a></li>";
          }).join("") + "</ul></div>"
        : "");

    var saveBtn = $("#saveBtn");
    if (saveBtn) {
      saveBtn.addEventListener("click", function () {
        var idx = state.saved.indexOf(story.id);
        if (idx === -1) state.saved.push(story.id);
        else state.saved.splice(idx, 1);
        persistSaved();
        saveBtn.textContent = state.saved.indexOf(story.id) !== -1 ? "Saved" : "Save";
      });
    }
    var readBtn = $("#readBtn");
    if (readBtn) {
      readBtn.addEventListener("click", function () {
        state.read = state.read.filter(function (x) { return x !== story.id; });
        persistRead();
        readBtn.textContent = "Marked unread";
      });
    }
  }

  function bindShell() {
    var menuBtn = $("#menuToggle");
    var sidebar = $("#sidebar");
    var backdrop = $("#backdrop");
    function closeNav() {
      if (sidebar) sidebar.classList.remove("open");
      if (backdrop) backdrop.classList.remove("open");
      if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
    }
    function openNav() {
      if (sidebar) sidebar.classList.add("open");
      if (backdrop) backdrop.classList.add("open");
      if (menuBtn) menuBtn.setAttribute("aria-expanded", "true");
    }
    if (menuBtn) {
      menuBtn.addEventListener("click", function () {
        if (sidebar && sidebar.classList.contains("open")) closeNav();
        else openNav();
      });
    }
    if (backdrop) backdrop.addEventListener("click", closeNav);

    var densBtn = $("#densityToggle");
    if (densBtn) {
      densBtn.addEventListener("click", function () {
        var root = document.documentElement;
        var next = root.getAttribute("data-density") === "compact" ? "comfortable" : "compact";
        if (next === "compact") root.setAttribute("data-density", "compact");
        else root.removeAttribute("data-density");
        try { localStorage.setItem("an-density", next); } catch (e) {}
        densBtn.setAttribute("aria-pressed", next === "compact" ? "true" : "false");
        densBtn.textContent = next === "compact" ? "Compact" : "Comfortable";
      });
    }

    var themeBtn = $("#themeToggle");
    if (themeBtn) {
      themeBtn.addEventListener("click", function () {
        var root = document.documentElement;
        var dark = root.getAttribute("data-theme") === "dark";
        if (dark) {
          root.removeAttribute("data-theme");
          try { localStorage.setItem("an-theme", "light"); } catch (e) {}
        } else {
          root.setAttribute("data-theme", "dark");
          try { localStorage.setItem("an-theme", "dark"); } catch (e) {}
        }
        var isDark = root.getAttribute("data-theme") === "dark";
        themeBtn.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
        themeBtn.title = isDark ? "Light mode" : "Dark mode";
      });
    }

    var search = $("#searchInput");
    if (search) {
      var timer = null;
      search.addEventListener("input", function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          state.query = search.value.trim();
          if (pageName() === "today") renderTodayFeed();
          if (pageName() === "signals") renderSignals();
          if (pageName() === "reports") renderReports();
        }, 120);
      });
    }
  }

  function setTitle(page) {
    var base = "Aligned News";
    if (page === "today") document.title = (getParam("view") === "saved" ? "Saved" : "Today") + " · " + base;
    else if (page === "signals") document.title = "Signals · " + base;
    else if (page === "reports") document.title = "Reports · " + base;
    else if (page === "story") document.title = "Story · " + base;
  }

  function boot() {
    applyPrefs();
    bindShell();
    setTitle(pageName());
    var status = $("#loadStatus");
    if (status) status.textContent = "Loading…";

    fetch(DATA_URL, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("Could not load " + DATA_URL);
        return res.json();
      })
      .then(function (data) {
        state.data = data;
        var section = getParam("section");
        if (section) state.filter = section;
        renderChrome();
        renderChips("#chips");
        var page = pageName();
        if (page === "today") {
          var h = $("#pageTitle");
          if (h) h.textContent = getParam("view") === "saved" ? "Saved" : "Today";
          renderForYou();
          renderTodayFeed();
        } else if (page === "signals") {
          renderSignals();
        } else if (page === "reports") {
          renderReports();
        } else if (page === "story") {
          renderStory();
          if (state.data && findStory(getParam("id"))) {
            document.title = findStory(getParam("id")).headline + " · Aligned News";
          }
        }
        if (status) status.hidden = true;
      })
      .catch(function (err) {
        if (status) {
          status.hidden = false;
          status.className = "status error";
          status.textContent = "Could not load live-data.json. Open this folder via a local static server (file:// may block fetch).";
        }
        console.error(err);
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
