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


  function mapSectionKey(name) {
    var s = String(name || "").toLowerCase();
    if (s.indexOf("robot") !== -1) return "robotics";
    if (s.indexOf("fund") !== -1 || s.indexOf("deal") !== -1 || s.indexOf("acquisit") !== -1) return "funding";
    if (s.indexOf("polic") !== -1 || s.indexOf("regulat") !== -1) return "policy";
    if (s.indexOf("agent") !== -1 || s.indexOf("openclaw") !== -1) return "agents";
    if (s.indexOf("model") !== -1 || s.indexOf("benchmark") !== -1 || s.indexOf("big stuff") !== -1) return "models";
    if (s.indexOf("chip") !== -1 || s.indexOf("hardware") !== -1) return "chips";
    if (s.indexOf("open-source") !== -1 || s.indexOf("open source") !== -1) return "open-source";
    if (s.indexOf("creative") !== -1 || s.indexOf("video") !== -1) return "creative";
    if (s.indexOf("event") !== -1) return "events";
    if (s.indexOf("paper") !== -1 || s.indexOf("science") !== -1 || s.indexOf("research") !== -1) return "research";
    if (s.indexOf("infra") !== -1 || s.indexOf("compute") !== -1) return "compute";
    if (s.indexOf("lab") !== -1 || s.indexOf("compan") !== -1 || s.indexOf("industry") !== -1) return "industry";
    if (s.indexOf("scoble") !== -1) return "scoble";
    return s.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "general";
  }

  function labelFor(key, fallback) {
    var map = {
      models: "Models", agents: "Agents", robotics: "Robotics", funding: "Funding",
      policy: "Policy", chips: "Chips", "open-source": "Open source", events: "Events",
      research: "Research", creative: "Creative", compute: "Compute", industry: "Industry",
      scoble: "Scoble", labs: "Labs", jobs: "Jobs"
    };
    return map[key] || fallback || key;
  }

  function simpleId(prefix, title) {
    var h = 0; var str = String(title || "");
    for (var i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    return prefix + "-" + Math.abs(h).toString(16);
  }

  /** Accept app schema OR scraper-raw schema */
  function normalizeData(data) {
    if (!data) return data;
    if (data.stories && data.stories.length && data.stories[0].headline && data.chips) return data;

    var stories = [];
    var seen = {};
    function pushStory(s) {
      var t = (s.headline || "").trim().toLowerCase();
      if (!t || seen[t]) return;
      seen[t] = 1;
      stories.push(s);
    }

    (data.ai_sections || []).forEach(function (sec) {
      var secName = sec.name || "AI";
      var key = mapSectionKey(secName);
      (sec.items || []).forEach(function (item) {
        var title = item.title || "";
        var excerpt = item.excerpt || item.summary || "";
        pushStory({
          id: simpleId("ai", title),
          headline: title,
          summary: excerpt,
          section: key,
          section_key: key,
          section_label: labelFor(key, secName),
          published_at: null,
          author_name: item.source || "Aligned News",
          source_url: item.url,
          sources: item.url ? [{ url: item.url, name: item.source || "Source" }] : [],
          body: excerpt + (excerpt ? "\n\n" : "") + "Filed under " + secName + ".",
          kind: "ai-item",
          ai_section: secName,
          _body_placeholder: true
        });
      });
    });

    var signals = (data.signals || []).map(function (sig) {
      var text = sig.text || sig.title || "";
      var badge = String(sig.badge || "signal").toLowerCase();
      var cat = sig.category || "general";
      var key = mapSectionKey(cat);
      var id = sig.id || simpleId("sig", text);
      var body = cleanDisplayText(sig.analysis || text || "");
      pushStory({
        id: "sigstory-" + id,
        headline: text,
        summary: text,
        section: cat,
        section_key: key,
        section_label: labelFor(key, cat),
        published_at: sig.created_at || null,
        signal_badge: badge,
        source_list: sig.source_list || sig.when,
        source_url: sig.source_url || sig.url,
        sources: (sig.source_url || sig.url) ? [{ url: sig.source_url || sig.url, name: "Signal" }] : [],
        body: body,
        kind: "signal-story",
        engagement_score: sig.engagement_score,
        _body_placeholder: !sig.analysis
      });
      return {
        id: id,
        title: text,
        text: text,
        badge: badge,
        category: cat,
        section_key: key,
        section_label: labelFor(key, cat),
        source_list: sig.source_list,
        engagement_score: sig.engagement_score,
        created_at: sig.created_at || null,
        source_url: sig.source_url || sig.url,
        analysis: body,
        _analysis_placeholder: !sig.analysis
      };
    });

    (data.stories || []).forEach(function (s) {
      if (s.headline && s.section_key) { pushStory(s); return; }
      var title = s.title || s.headline || "";
      var summary = s.summary || "";
      var sec = s.section || "general";
      var key = mapSectionKey(sec);
      pushStory({
        id: s.id || simpleId("story", title),
        headline: title,
        summary: summary,
        section: sec,
        section_key: key,
        section_label: labelFor(key, sec),
        published_at: s.published_at || null,
        author_name: s.source || s.author_name || "Aligned News",
        source_url: s.url || s.source_url,
        sources: (s.url || s.source_url) ? [{ url: s.url || s.source_url, name: "Story" }] : [],
        body: summary || "",
        kind: "story",
        _body_placeholder: true
      });
    });

    var reports = (data.reports || []).map(function (r) {
      if (r.title && (r.published_at || r.summary)) {
        return {
          id: r.id || simpleId("rep", r.title),
          title: r.title,
          summary: r.summary,
          type: r.type || "report",
          author: r.author || "Aligned News Research",
          reading_time_min: r.reading_time_min,
          published_at: r.published_at || null,
          url: r.url
        };
      }
      return r;
    });

    var chips = data.chips || [
      { id: "all", label: "All" }, { id: "models", label: "Models" },
      { id: "agents", label: "Agents" }, { id: "robotics", label: "Robotics" },
      { id: "funding", label: "Funding" }, { id: "policy", label: "Policy" },
      { id: "chips", label: "Chips" }, { id: "open-source", label: "Open source" },
      { id: "events", label: "Events" }, { id: "research", label: "Research" }
    ];

    var forYou = data.forYou || signals.slice().sort(function (a, b) {
      return (b.engagement_score || 0) - (a.engagement_score || 0);
    }).slice(0, 3);

    return {
      meta: data.meta || {
        mock: true,
        placeholderNote: data.notes || "Normalized at runtime from live-data.json",
        scrapedAt: data.scraped_at,
        generatedAt: new Date().toISOString()
      },
      user: data.user || { name: "Asher", plan: "Pro" },
      stats: data.stats || {},
      chips: chips,
      forYou: forYou,
      stories: stories,
      signals: signals,
      reports: reports,
      bundles: data.bundles || [],
      ai_sections: data.ai_sections || []
    };
  }


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


  function cleanDisplayText(s) {
    if (!s) return "";
    return String(s)
      .replace(/\[Sample Pro body[^\]]*\]/gi, "")
      .replace(/\n*Signal type:[\s\S]*$/i, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function hasSamplePlaceholder(s) {
    return /\[Sample Pro body/i.test(String(s == null ? "" : s));
  }

  /** Non-empty parts only, joined with " · " */
  function joinMeta(parts) {
    return parts.filter(function (p) { return p != null && String(p).trim() !== ""; })
      .map(function (p) { return String(p).trim(); })
      .join(" · ");
  }

  function resolveTimeIso(iso) {
    if (iso && Date.parse(iso)) return iso;
    var meta = state.data && state.data.meta;
    if (meta && meta.generatedAt && Date.parse(meta.generatedAt)) return meta.generatedAt;
    if (meta && meta.scrapedAt && Date.parse(meta.scrapedAt)) return meta.scrapedAt;
    if (meta && meta.scraped_at && Date.parse(meta.scraped_at)) return meta.scraped_at;
    if (meta && meta.lastUpdatedTs) {
      try { return new Date(Number(meta.lastUpdatedTs)).toISOString(); } catch (e) {}
    }
    return "2026-08-09T12:00:00.000Z";
  }

  function fallbackTime(iso) {
    return fmtRelative(resolveTimeIso(iso)) || "Aug 9";
  }

  function fallbackTimeLong(iso) {
    return fmtDateLong(resolveTimeIso(iso)) || "Aug 9";
  }

  function isEventItem(item) {
    var hay = [item.section_key, item.section, item.tag, item.category].join(" ").toLowerCase();
    return hay.indexOf("event") !== -1;
  }

  function isTodayFeedKind(item) {
    return item.kind === "story" || item.kind === "ai-item";
  }

  function signalExcerpt(sig) {
    var title = String(sig.title || sig.text || "").trim();
    var cleaned = cleanDisplayText(sig.analysis || "");
    if (!cleaned) return "";
    if (cleaned.toLowerCase() === title.toLowerCase()) return "";
    var first = cleaned.split(/\n/)[0].trim();
    if (first.toLowerCase() === title.toLowerCase()) return "";
    return first;
  }

  function storyBodyParagraphs(story) {
    var raw = String(story.body || "");
    var hadPh = hasSamplePlaceholder(raw) || !!story._body_placeholder;
    var cleaned = cleanDisplayText(raw);
    if (hadPh) {
      var paras = [];
      var summary = cleanDisplayText(story.summary || "").trim();
      if (summary) paras.push(summary);
      if (story.kind === "ai-item" || story.ai_section) paras.push("From the /ai briefing.");
      else if (story.signal_badge || story.kind === "signal-story") paras.push("From the Aligned News signals desk.");
      else paras.push("From the Aligned News briefing.");
      return paras;
    }
    return cleaned.split(/\n\n+/).map(function (p) { return p.trim(); }).filter(Boolean)
      .filter(function (p) { return !hasSamplePlaceholder(p) && !/^\[Sample/i.test(p); });
  }


  function initialsFrom(name) {
    var s = String(name || "").trim();
    if (!s) return "?";
    var parts = s.replace(/[^a-zA-Z0-9\s.-]/g, " ").split(/[\s.-]+/).filter(Boolean);
    if (!parts.length) return s.slice(0, 1).toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0].slice(0, 1) + parts[1].slice(0, 1)).toUpperCase();
  }

  var AVATAR_PALETTE = [
    "#1a73e8", "#0f766e", "#b45309", "#7c3aed", "#be123c",
    "#0369a1", "#15803d", "#c2410c", "#4338ca", "#0e7490"
  ];

  function avatarColor(seed) {
    var s = String(seed || "");
    var h = 0;
    for (var i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
  }

  function sourceNamesFor(item) {
    var names = [];
    function push(n) {
      n = String(n || "").trim();
      if (!n) return;
      var low = n.toLowerCase();
      if (low === "signal" || low === "story" || low === "source") return;
      if (names.some(function (x) { return x.toLowerCase() === low; })) return;
      names.push(n);
    }
    if (item.author_name) push(item.author_name);
    if (item.source_list) {
      String(item.source_list).split(/[,+/|&]/).forEach(function (p) { push(p); });
    }
    (item.sources || []).forEach(function (src) { push(src && src.name); });
    push(item.section_label || item.section || item.category || "");
    if (names.length < 2) push("Aligned News");
    if (!names.length) push("AN");
    return names.slice(0, 3);
  }

  function avatarStackHtml(item) {
    var names = sourceNamesFor(item);
    return '<span class="avatar-stack" aria-hidden="true">' +
      names.map(function (n) {
        return '<span class="source-avatar" style="background:' + avatarColor(n) + '" title="' +
          escapeHtml(n) + '">' + escapeHtml(initialsFrom(n)) + "</span>";
      }).join("") +
      "</span>";
  }

  var SECTION_GRADIENTS = {
    models: "linear-gradient(145deg,#1e3a8a,#60a5fa)",
    agents: "linear-gradient(145deg,#5b21b6,#c4b5fd)",
    robotics: "linear-gradient(145deg,#0f766e,#5eead4)",
    funding: "linear-gradient(145deg,#166534,#86efac)",
    policy: "linear-gradient(145deg,#9a3412,#fdba74)",
    chips: "linear-gradient(145deg,#1e293b,#94a3b8)",
    "open-source": "linear-gradient(145deg,#0369a1,#7dd3fc)",
    events: "linear-gradient(145deg,#be123c,#fda4af)",
    research: "linear-gradient(145deg,#4338ca,#a5b4fc)",
    creative: "linear-gradient(145deg,#9d174d,#f9a8d4)",
    compute: "linear-gradient(145deg,#0e7490,#67e8f9)",
    industry: "linear-gradient(145deg,#374151,#d1d5db)",
    scoble: "linear-gradient(145deg,#7c2d12,#fdba74)",
    general: "linear-gradient(145deg,#334155,#93c5fd)"
  };

  function sectionThumbStyle(key) {
    return SECTION_GRADIENTS[key] || SECTION_GRADIENTS.general;
  }

  function signalIconColor(badge) {
    var b = String(badge || "signal").toLowerCase();
    if (b === "bullish") return "#16a34a";
    if (b === "critical") return "#dc2626";
    if (b === "caution") return "#ca8a04";
    if (b === "action") return "#ea580c";
    if (b === "vc") return "#7c3aed";
    if (b === "interview") return "#db2777";
    return "#1a73e8";
  }

  function renderRightRail() {
    if (!state.data) return;
    var list = $("#topSignalsList");
    if (list) {
      var items = (state.data.forYou && state.data.forYou.length)
        ? state.data.forYou.slice(0, 5)
        : (state.data.signals || []).slice().sort(function (a, b) {
            return (b.engagement_score || 0) - (a.engagement_score || 0);
          }).slice(0, 5);
      if (!items.length) {
        list.innerHTML = '<li class="empty" style="padding:0.5rem 0;text-align:left">No signals yet.</li>';
      } else {
        list.innerHTML = items.map(function (s) {
          var href = "story.html?id=" + encodeURIComponent("sigstory-" + s.id);
          return (
            '<li class="rail-item">' +
              '<span class="rail-icon" style="background:' + signalIconColor(s.badge) + '">' +
                escapeHtml(String(s.badge || "sig").slice(0, 1).toUpperCase()) +
              "</span>" +
              "<div>" +
                '<h3 class="rail-item-title"><a href="' + href + '">' + escapeHtml(s.title || s.text || "") + "</a></h3>" +
                '<div class="rail-item-meta">' +
                  avatarStackHtml(s) +
                  '<span>' + escapeHtml(joinMeta([
                    (s.badge || "signal").toUpperCase(),
                    fallbackTime(s.created_at)
                  ])) + "</span>" +
                "</div>" +
              "</div>" +
            "</li>"
          );
        }).join("");
      }
    }

    var cloud = $("#sectionCloud");
    if (cloud) {
      var chips = (state.data.chips || []).filter(function (c) { return c.id !== "all"; });
      var page = pageName();
      cloud.innerHTML = chips.map(function (c) {
        var href = page === "signals"
          ? "signals.html?section=" + encodeURIComponent(c.id)
          : "index.html?section=" + encodeURIComponent(c.id);
        return '<a href="' + href + '">' + escapeHtml(c.label) + "</a>";
      }).join("");
    }

    var vibeStats = $("#vibeStats");
    if (vibeStats) {
      var stories = (state.data.stories || []).filter(isTodayFeedKind).length;
      var signals = (state.data.signals || []).length;
      var reports = (state.data.reports || []).length;
      vibeStats.innerHTML =
        '<div class="vibe-stat"><span>Stories</span><strong>' + stories + "</strong></div>" +
        '<div class="vibe-stat"><span>Signals</span><strong>' + signals + "</strong></div>" +
        '<div class="vibe-stat"><span>Reports</span><strong>' + reports + "</strong></div>";
    }
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
      stories: (data.stories || []).filter(isTodayFeedKind).length,
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
        '<div class="sidebar-foot">Asher · Pro<br>Preview mock</div>';
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
      var key = story.section_key || mapSectionKey(story.section || story.tag || "");
      if (key !== state.filter) return false;
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
    renderRightRail();
    var stories = (state.data.stories || []).filter(function (s) {
      if (!isTodayFeedKind(s)) return false;
      return storyMatches(s);
    });
    if (!stories.length) {
      list.innerHTML = '<li class="empty">No stories match this filter.</li>';
      return;
    }

    var showLead = getParam("view") !== "saved" && state.filter === "all" && !state.query;
    var html = "";

    stories.forEach(function (s, i) {
      var badge = s.signal_badge
        ? '<span class="' + badgeClass(s.signal_badge) + '">' + escapeHtml(String(s.signal_badge).toUpperCase()) + "</span>"
        : "";
      var excerpt = cleanDisplayText(s.summary || "");
      if (excerpt.length > 180) excerpt = excerpt.slice(0, 177).trim() + "…";
      var isRead = state.read.indexOf(s.id) !== -1;
      var metaLine = joinMeta([
        s.section_label || s.section || "",
        fallbackTime(s.published_at),
        (!s.signal_badge && s.author_name) ? s.author_name : "",
        s.source_list || ""
      ]);
      var href = "story.html?id=" + encodeURIComponent(s.id);
      var key = s.section_key || mapSectionKey(s.section || s.tag || "");

      if (showLead && i === 0) {
        var dek = excerpt;
        if (dek.length > 220) dek = dek.slice(0, 217).trim() + "…";
        html +=
          '<li class="lead-card' + (isRead ? " is-read" : "") + '">' +
            '<div class="lead-eyebrow">Top Story</div>' +
            '<h2 class="lead-title"><a href="' + href + '">' + escapeHtml(s.headline) + "</a></h2>" +
            (dek ? '<p class="lead-dek">' + escapeHtml(dek) + "</p>" : "") +
            '<div class="lead-hero">' +
              '<img src="lead-hero.png" alt="" loading="eager" onerror="this.style.display=\'none\';this.parentNode.classList.add(\'lead-hero-fallback\')" />' +
            "</div>" +
            '<div class="lead-meta" style="margin:0.95rem 0 0">' +
              avatarStackHtml(s) +
              badge +
              '<span class="meta-line">' + escapeHtml(metaLine) + "</span>" +
            "</div>" +
          "</li>";
        return;
      }

      var rank = showLead ? (i + 1) : (i + 1);
      html +=
        '<li class="feed-row' + (isRead ? " is-read" : "") + '">' +
          '<div class="rank">' + rank + "</div>" +
          '<div class="feed-body">' +
            '<h2 class="story-title"><a href="' + href + '">' + escapeHtml(s.headline) + "</a></h2>" +
            (excerpt ? '<p class="excerpt">' + escapeHtml(excerpt) + "</p>" : "") +
            '<div class="meta">' +
              avatarStackHtml(s) +
              badge +
              '<span class="meta-line">' + escapeHtml(metaLine) + "</span>" +
            "</div>" +
          "</div>" +
          '<div class="row-thumb" aria-hidden="true">' +
            '<div class="row-thumb-tile" style="background:' + sectionThumbStyle(key) + '"></div>' +
          "</div>" +
        "</li>";
    });

    list.innerHTML = html;
  }

  function renderSignals() {
    var list = $("#feed");
    if (!list || !state.data) return;
    renderRightRail();
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
      var excerpt = signalExcerpt(s);
      if (excerpt.length > 200) excerpt = excerpt.slice(0, 197).trim() + "…";
      var metaLine = joinMeta([
        s.section_label || s.category || "",
        fallbackTime(s.created_at),
        s.source_list || "",
        (s.engagement_score != null ? s.engagement_score + "% conf." : "")
      ]);
      return (
        '<li class="feed-row">' +
          '<div class="rank">' + (i + 1) + "</div>" +
          '<div class="feed-body">' +
            '<h2 class="story-title"><a href="story.html?id=' + encodeURIComponent("sigstory-" + s.id) + '">' +
              escapeHtml(s.title) + "</a></h2>" +
            (excerpt ? '<p class="excerpt">' + escapeHtml(excerpt) + "</p>" : "") +
            '<div class="meta">' +
              avatarStackHtml(s) +
              '<span class="' + badgeClass(s.badge) + '">' + escapeHtml((s.badge || "signal").toUpperCase()) + "</span>" +
              '<span class="meta-line">' + escapeHtml(metaLine) + "</span>" +
            "</div>" +
          "</div>" +
        "</li>"
      );
    }).join("");
  }

  function renderReports() {
    var list = $("#reportList");
    if (!list || !state.data) return;
    renderRightRail();
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
          '<div class="meta"><span class="meta-line">' + escapeHtml(joinMeta([
            (r.type || "report").replace(/_/g, " "),
            r.reading_time_min ? (r.reading_time_min + " min") : "",
            fallbackTime(r.published_at),
            r.author || ""
          ])) + "</span></div>" +
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
          body: cleanDisplayText(sig.analysis || sig.text || ""),
          author_name: "Aligned News",
          kind: "signal-story",
          _body_placeholder: !!sig._analysis_placeholder || hasSamplePlaceholder(sig.analysis || ""),
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
    var paragraphs = storyBodyParagraphs(story);
    var bodyHtml = paragraphs.map(function (p) {
      if (hasSamplePlaceholder(p) || /^\[Sample/i.test(p)) return "";
      if (/^From the \/ai briefing/i.test(p) || /^From the Aligned News/i.test(p)) {
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
        '<span class="meta-line">' + escapeHtml(joinMeta([
          story.section_label || story.section || "",
          fallbackTimeLong(story.published_at),
          story.source_list || "",
          (!story.signal_badge && story.author_name) ? story.author_name : ""
        ])) + "</span>" +
      "</div>" +
      "<h1>" + escapeHtml(story.headline) + "</h1>" +
      (cleanDisplayText(story.summary) ? '<p class="article-dek">' + escapeHtml(cleanDisplayText(story.summary)) + "</p>" : "") +
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
        state.data = normalizeData(data);
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
