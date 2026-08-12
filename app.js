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
          body: excerpt + "\n\nFiled under " + secName + ".\n\n[Sample Pro body · from scraped /ai cards.]",
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
      var body = sig.analysis || (text + ".\n\n[Sample Pro body · signal from live site.]");
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
        body: summary + "\n\n[Sample Pro body · from live site listing.]",
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

  function joinMeta(parts) {
    return parts.filter(function (p) { return p != null && String(p).trim() !== ""; })
      .map(function (p) { return String(p).trim(); })
      .join(" · ");
  }

  function fallbackTime(iso) {
    var t = fmtRelative(iso);
    if (t) return t;
    var meta = state.data && state.data.meta;
    if (meta && meta.generatedAt) return fmtRelative(meta.generatedAt);
    if (meta && meta.lastUpdatedTs) return fmtRelative(new Date(Number(meta.lastUpdatedTs)).toISOString());
    return "";
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
    var stories = (state.data.stories || []).filter(function (s) {
      if (s.kind === "signal-story") return false;
      return storyMatches(s);
    });
    if (!stories.length) {
      list.innerHTML = '<li class="empty">No stories match this filter.</li>';
      return;
    }
    list.innerHTML = stories.map(function (s, i) {
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
      return (
        '<li class="feed-row' + (isRead ? " is-read" : "") + '">' +
          '<div class="rank">' + (i + 1) + "</div>" +
          '<div class="feed-body">' +
            '<h2 class="story-title"><a href="story.html?id=' + encodeURIComponent(s.id) + '">' +
              escapeHtml(s.headline) + "</a></h2>" +
            (excerpt ? '<p class="excerpt">' + escapeHtml(excerpt) + "</p>" : "") +
            '<div class="meta">' +
              badge +
              '<span class="dot">' + escapeHtml(metaLine) + "</span>" +
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
      var excerpt = cleanDisplayText(s.analysis || "");
      if (!excerpt || excerpt.toLowerCase() === String(s.title || "").toLowerCase()) {
        excerpt = "";
      }
      if (excerpt.length > 200) excerpt = excerpt.slice(0, 197).trim() + "…";
      var metaLine = joinMeta([
        (s.badge || "signal").toUpperCase(),
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
              '<span class="' + badgeClass(s.badge) + '">' + escapeHtml((s.badge || "signal").toUpperCase()) + "</span>" +
              '<span class="dot">' + escapeHtml(joinMeta([
                s.section_label || s.category || "",
                fallbackTime(s.created_at),
                s.source_list || "",
                (s.engagement_score != null ? s.engagement_score + "% conf." : "")
              ])) + "</span>" +
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
    var paragraphs = cleanDisplayText(story.body || story.summary || "")
      .split(/\n\n+/)
      .map(function (p) { return p.trim(); })
      .filter(function (p) {
        if (!p) return false;
        if (/^\[Sample/i.test(p)) return false;
        if (/^\[/.test(p) && /placeholder/i.test(p)) return false;
        return true;
      });
    if (!paragraphs.length && story.summary) paragraphs = [cleanDisplayText(story.summary)];

    var bodyHtml = paragraphs.map(function (p) {
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
