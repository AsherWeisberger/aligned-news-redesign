(function () {
  "use strict";

  try {
    var standalone = (window.navigator && window.navigator.standalone === true) ||
      (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      (window.matchMedia && window.matchMedia("(display-mode: fullscreen)").matches);
    if (standalone) document.documentElement.classList.add("is-standalone");
  } catch (e) {}


  var DATA_URL = "live-data.json?v=an99";
  var state = {
    data: null,
    filter: "all",
    query: "",
    saved: loadSaved(),
    read: loadRead(),
  };



  function topicKeyFor(item) {
    if (item.topic_key && /^(models|agents|robotics|funding|companies|research|chips|open-source|policy|creative)$/.test(item.topic_key)) {
      return item.topic_key;
    }
    var hay = [
      item.headline, item.title, item.text, item.summary, item.body,
      item.section_label, item.section, item.category, item.source_list, item.tag
    ].join(" ").toLowerCase();
    if (/robot|humanoid|physical ai|openusd/.test(hay)) return "robotics";
    if (/fund|raised|\$|series [a-d]|acquisition|ipo|valuation|invest/.test(hay)) return "funding";
    if (/regulat|polic|congress|eu ai|white house|antitrust/.test(hay)) return "policy";
    if (/agentic|\bagents?\b|openclaw|orchestrat|tool call/.test(hay)) return "agents";
    if (/gpu|chip|semiconductor|tpu|hardware|inference chip/.test(hay)) return "chips";
    if (/open[- ]?source|open.weight|hugging face|weights/.test(hay)) return "open-source";
    if (/benchmark|paper|arxiv|research|eval|sota/.test(hay)) return "research";
    if (/video|image gen|creative|midjourney|sora|flux/.test(hay)) return "creative";
    if (/model|llm|gpt|claude|gemini|fireworks|muse|token|grok|\bxai\b/.test(hay)) return "models";
    if (/nvidia/.test(hay)) return "chips";
    if (/compan|startup|lab|industry|hiring/.test(hay)) return "companies";
    var sl = String(item.section_label || item.source_list || item.section || "").toLowerCase();
    if (sl.indexOf("compan") !== -1) return "companies";
    return "companies";
  }

  function deskTakeFor(item) {
    var title = displayText(item.title || item.text || item.headline || "").replace(/\s+/g, " ").trim();
    var list = item.source_list || item.section_label || "Scoble lists";
    var badge = String(item.badge || item.signal_badge || "signal").toLowerCase();
    var eng = item.engagement_score != null ? (item.engagement_score + "% confidence") : null;
    var why = "Desk take: this crossed " + list;
    if (badge === "bullish") why += " with bullish momentum";
    else if (badge === "critical") why += " as a critical watch";
    else why += " as a ranked signal";
    if (eng) why += " (" + eng + ")";
    why += ". " + firstSentence(title, 140);
    return why;
  }

  function editorialTitle(item, maxLen) {
    maxLen = maxLen || 88;
    var raw = cleanHeadline(item.headline || item.title || item.text || "", item.summary || item.body || item.analysis);
    raw = raw.replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
    raw = raw.replace(/\s*[….]{2,}$/, "").trim();
    if (raw.length <= maxLen) return raw;
    // Prefer a complete short clause (em-dash / colon / comma before conjunction)
    var cut = raw.split(/\s+[—–-]\s+|:\s+/)[0];
    if (cut && cut.length >= 24 && cut.length <= maxLen) return cut;
    var comma = raw.lastIndexOf(", ", maxLen - 1);
    if (comma > Math.floor(maxLen * 0.45)) {
      var c = raw.slice(0, comma).trim();
      if (c.length >= 24) return c;
    }
    return softClamp(raw, maxLen);
  }

  /** Word-boundary clamp — never mid-word ellipsis */
  function softClamp(s, maxLen) {
    var t = String(s || "").replace(/\s+/g, " ").trim();
    if (!t) return "";
    if (t.length <= maxLen) return t;
    var cut = t.slice(0, maxLen);
    // never end mid-word
    if (/\S$/.test(cut) && /\S/.test(t.charAt(maxLen) || "")) {
      var sp = cut.lastIndexOf(" ");
      if (sp > Math.floor(maxLen * 0.5)) cut = cut.slice(0, sp);
    }
    cut = cut.replace(/[,:;\-—–\s]+$/, "").trim();
    // Prefer dropping trailing fragments like "in" / "and" / "the"
    cut = cut.replace(/\s+(?:in|on|of|to|for|and|or|the|a|an|with|from|at|by)$/i, "").trim();
    if (!cut) {
      cut = t.slice(0, Math.max(24, maxLen - 1));
      var sp2 = cut.lastIndexOf(" ");
      if (sp2 > 20) cut = cut.slice(0, sp2);
      cut = cut.replace(/[,:;\-—–\s]+$/, "").trim();
    }
    // If we kept a complete sentence, skip ellipsis
    if (/[.!?]$/.test(cut)) return cut;
    return cut + "…";
  }

  function whyItMatters(item) {
    var canned = displayText(item.why_it_matters || "").trim();
    if (canned && canned.length > 28 && !/^Surfaced from .+ — high-signal/i.test(canned)) {
      return canned;
    }
    var topic = item.topic_label || labelFor(item.topic_key || topicKeyFor(item), "AI");
    var title = editorialTitle(item, 64);
    var map = {
      models: " — a model move builders on Scoble’s lists are already amplifying.",
      agents: " — agent tooling is compounding across curated builder lists.",
      robotics: " — physical AI signal from Scoble robotics-adjacent lists.",
      funding: " — capital or deal flow the desk is tracking before the wire.",
      companies: " — company-side move from Scoble’s AI company lists.",
      research: " — research signal worth filing before it becomes consensus.",
      chips: " — hardware/compute signal with list momentum.",
      policy: " — policy pressure that could reshape the stack.",
      "open-source": " — open weights/tooling gaining list traction.",
      creative: " — generative creative stack movement across lists."
    };
    var key = item.topic_key || topicKeyFor(item);
    return title + (map[key] || (" — filed under " + topic + " from Scoble’s lists."));
  }

  function sourceCount(item) {
    var n = 0;
    if (item.sources && item.sources.length) n = item.sources.length;
    else if (item.source_url) n = 1;
    var eng = item.engagement || {};
    var social = (eng.retweet_count || 0) + (eng.reply_count || 0) + (eng.quote_count || 0) + (eng.like_count || 0);
    if (social > n) n = Math.max(n, Math.min(social, 64));
    return n || 1;
  }

  function xHandleFrom(item) {
    if (!item) return "";
    var url = String(item.source_url || "");
    if (!url && item.sources && item.sources[0]) url = String(item.sources[0].url || "");
    var m = String(url).match(/(?:x\.com|twitter\.com)\/([A-Za-z0-9_]{1,15})(?:\/|$)/i);
    if (m && m[1] && !/^(status|i|intent|share|search|home|explore|settings)$/i.test(m[1])) return m[1];
    var author = String(item.author_name || "").trim().replace(/^@/, "");
    if (/^[A-Za-z0-9_]{1,15}$/.test(author) && /(?:x\.com|twitter\.com)\//i.test(url)) return author;
    return "";
  }

  function storyMetaLine(item) {
    var when = fallbackTime(item.published_at || item.created_at) || "recently";
    var handle = xHandleFrom(item);
    if (handle) return "@" + handle + " · " + when;
    var parts = [];
    var n = sourceCount(item);
    parts.push(n + (n === 1 ? " source" : " sources"));
    parts.push(when);
    return parts.join(" · ");
  }

  function whyRankedLabel(item) {
    var hay = [item.headline, item.summary, item.body, item.title, item.text].join(" ");
    var hits = 0;
    try { hits = (hay.match(new RegExp(AI_RE.source, "gi")) || []).length; } catch (e) { hits = 0; }
    if (item.signal_badge && String(item.signal_badge).toLowerCase() === "bullish") return "Rising";
    if (hits >= 3) return "Keyword hit";
    if ((item.engagement && (item.engagement.retweet_count || 0) >= 10) || (item.engagement_score || 0) >= 60) return "List spike";
    return "Scoble list";
  }

  function whyRankedHtml(item) {
    var label = whyRankedLabel(item);
    return '<span class="why-ranked" title="Why this ranked">' + escapeHtml(label) + "</span>";
  }

  function uniqueDek(item, headline, maxLen) {
    maxLen = maxLen || 160;
    var body = displayText(item.summary || item.body || "").replace(/\s+/g, " ").trim();
    var parts = body.split(/(?<=[.!?])\s+/).filter(Boolean);
    var h = String(headline || "").toLowerCase();
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].replace(/^RT\s+@[A-Za-z0-9_]+:\s*/i, "").trim();
      if (!p) continue;
      if (p.toLowerCase() === h) continue;
      if (h && p.toLowerCase().indexOf(h.slice(0, Math.min(28, h.length))) === 0 && p.length < h.length + 12) continue;
      return firstSentence(p, maxLen);
    }
    var why = whyItMatters(item);
    if (why && why.toLowerCase().indexOf(h) !== 0) return firstSentence(why, maxLen);
    return "";
  }

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
    if (s.indexOf("lab") !== -1 || s.indexOf("compan") !== -1 || s.indexOf("industry") !== -1) return "companies";
    if (s.indexOf("scoble") !== -1) return "scoble";
    return s.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "general";
  }

  function labelFor(key, fallback) {
    var map = {
      models: "Models", agents: "Agents", robotics: "Robotics", funding: "Funding",
      policy: "Policy", chips: "Chips", "open-source": "Open source", events: "Events",
      research: "Research", creative: "Creative", compute: "Compute", industry: "Industry",
      scoble: "Scoble", labs: "Labs", jobs: "Jobs", companies: "Companies", industry: "Companies"
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
    if (data.stories && data.stories.length && data.stories[0].headline && data.chips) {
      // Still enrich topics / signal takes on already-normalized payloads
      data.stories.forEach(function (s) {
        if (!s.topic_key) {
          s.topic_key = topicKeyFor(s);
          s.topic_label = labelFor(s.topic_key, s.section_label);
        }
      });
      (data.signals || []).forEach(function (s) {
        if (!s.topic_key) {
          s.topic_key = topicKeyFor(s);
          s.topic_label = labelFor(s.topic_key, s.section_label);
        }
        if (!s.analysis || !String(s.analysis).trim()) {
          s.analysis = deskTakeFor(s);
          s._analysis_placeholder = false;
        }
      });
      var topicOrder2 = ["models","agents","robotics","funding","companies","research","chips","open-source","policy","creative"];
      var topicLabels2 = {
        models: "Models", agents: "Agents", robotics: "Robotics", funding: "Funding",
        policy: "Policy", chips: "Chips", "open-source": "Open source", research: "Research",
        creative: "Creative", companies: "Companies", industry: "Companies"
      };
      var counts2 = {};
      data.stories.forEach(function (s) { counts2[s.topic_key] = (counts2[s.topic_key] || 0) + 1; });
      data.chips = [{ id: "all", label: "All" }].concat(topicOrder2.filter(function (id) {
        return counts2[id];
      }).map(function (id) { return { id: id, label: topicLabels2[id] }; }));
      return data;
    }

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

    var topicOrder = ["models","agents","robotics","funding","companies","research","chips","open-source","policy","creative"];
    var topicLabels = {
      models: "Models", agents: "Agents", robotics: "Robotics", funding: "Funding",
      policy: "Policy", chips: "Chips", "open-source": "Open source", research: "Research",
      creative: "Creative", companies: "Companies", industry: "Companies"
    };
    var topicCounts = {};
    stories.forEach(function (s) {
      var tk = topicKeyFor(s);
      s.topic_key = tk;
      s.topic_label = topicLabels[tk] || labelFor(tk, s.section_label);
      topicCounts[tk] = (topicCounts[tk] || 0) + 1;
    });
    signals.forEach(function (s) {
      var tk = topicKeyFor(s);
      s.topic_key = tk;
      s.section_key = s.section_key || tk;
      s.topic_label = topicLabels[tk] || labelFor(tk, s.section_label);
      // Fill empty analysis with a short desk take so Signals feels real
      if (!s.analysis || !String(s.analysis).trim()) {
        s.analysis = deskTakeFor(s);
        s._analysis_placeholder = false;
      }
    });
    var chips = [{ id: "all", label: "All" }].concat(topicOrder.filter(function (id) {
      return topicCounts[id];
    }).map(function (id) {
      return { id: id, label: topicLabels[id] };
    }));
    // If nothing mapped, fall back to provided chips
    if (chips.length <= 1 && data.chips && data.chips.length) {
      chips = data.chips.map(function (c) {
        return { id: c.id, label: prettyChipLabel(c.id, c.label) };
      });
    }

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
      // Mock default plan is Pro. Demo free Upgrade CTA with ?plan=free
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

  // User preference (localStorage an-chrome) vs visual data-chrome (may auto-collapse on scroll).
  var chromePref = "full";
  // Soft pin: cleared automatically on clear downward scroll so scroll-down always collapses.
  var chromeScrollPinned = false;
  var lastScrollY = 0;
  var chromeScrollRaf = 0;

  function getScrollY() {
    return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
  }

  function getStoredChromePref() {
    try {
      return localStorage.getItem("an-chrome") === "compact" ? "compact" : "full";
    } catch (e) {
      return "full";
    }
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
    // Default expanded (full desk); compact = Focus mode
    chromePref = getStoredChromePref();
    applyChromeVisual(chromePref);
    syncChromeToggle();
    syncDensitySeg();
    lastScrollY = getScrollY();
  }

  function syncChromeToggle() {
    // Button reflects preference (an-chrome), not transient scroll visual state.
    var prefCompact = chromePref === "compact";
    var visualCompact = document.documentElement.getAttribute("data-chrome") === "compact";
    var btn = $("#chromeToggle");
    if (btn) {
      btn.setAttribute("aria-pressed", prefCompact ? "true" : "false");
      // Pref full → "Focus" (action to collapse). Pref compact → "Desk" (action to restore).
      btn.textContent = prefCompact ? "Desk" : "Focus";
      btn.title = prefCompact ? "Show desk overview" : "Hide desk for more feed space";
      btn.setAttribute("aria-label", prefCompact ? "Show desk" : "Focus — hide desk for more space");
    }
    var hero = document.querySelector(".desk-hero");
    if (hero) hero.setAttribute("aria-hidden", visualCompact ? "true" : "false");
  }

  /** Apply visual chrome only — does not write an-chrome preference. */
  function applyChromeVisual(mode) {
    var root = document.documentElement;
    var next = mode === "compact" ? "compact" : "full";
    var hero = document.querySelector(".desk-hero");
    var intel = document.getElementById("intelStrip");

    if (next === "compact") {
      root.setAttribute("data-chrome", "compact");
      if (hero) {
        hero.hidden = true;
        hero.classList.add("chrome-collapsed");
        hero.setAttribute("aria-hidden", "true");
      }
      if (intel) {
        intel.hidden = true;
        intel.classList.add("chrome-collapsed");
      }
    } else {
      root.removeAttribute("data-chrome");
      if (hero) {
        hero.hidden = false;
        hero.classList.remove("chrome-collapsed");
        hero.setAttribute("aria-hidden", "false");
      }
      if (intel) {
        intel.classList.remove("chrome-collapsed");
      }
      // renderIntelStrip decides whether #intelStrip should show (today page only)
      if (pageName() === "today") {
        try { renderIntelStrip(); } catch (e) {}
      }
    }
    syncChromeToggle();
  }

  /** Persist toggle preference and apply visually. */
  function setChromePreference(mode) {
    var next = mode === "compact" ? "compact" : "full";
    chromePref = next;
    try { localStorage.setItem("an-chrome", next); } catch (e) {}
    if (next === "full") {
      // Soft pin only; cleared on downward scroll > 24px so scroll-down always collapses.
      chromeScrollPinned = getScrollY() > 40;
      applyChromeVisual("full");
    } else {
      chromeScrollPinned = false;
      applyChromeVisual("compact");
    }
  }

  function setChromeMode(mode) {
    setChromePreference(mode);
  }

  function onChromeScroll() {
    syncTopbarSolid();
    var y = getScrollY();
    var dy = y - lastScrollY;
    var visualCompact = document.documentElement.getAttribute("data-chrome") === "compact";

    // Soft pin: auto-clear on clear downward motion.
    if (dy > 16) chromeScrollPinned = false;

    // Any downward scroll past ~40px always collapses desk chrome.
    if ((dy > 0 || y > lastScrollY) && y > 40) {
      chromeScrollPinned = false;
      if (!visualCompact) {
        applyChromeVisual("compact"); // auto — do not overwrite an-chrome pref
      }
    } else if (dy < 0 && y < 56) {
      chromeScrollPinned = false;
      if (chromePref === "full" && visualCompact) {
        applyChromeVisual("full");
      }
    } else if (y < 40 && chromePref === "full" && visualCompact && !chromeScrollPinned) {
      // Near top even without a measured upward tick (iOS bounce / touch end).
      applyChromeVisual("full");
    }

    lastScrollY = y < 0 ? 0 : y;
  }

  function onChromeScrollThrottled() {
    if (chromeScrollRaf) return;
    chromeScrollRaf = requestAnimationFrame(function () {
      chromeScrollRaf = 0;
      onChromeScroll();
    });
  }

  function syncTopbarSolid() {
    var bar = document.querySelector(".topbar");
    if (!bar) return;
    var y = getScrollY();
    if (y > 8) bar.classList.add("is-scrolled");
    else bar.classList.remove("is-scrolled");
  }

  function bindChromeScrollListeners() {
    var opts = { passive: true, capture: true };
    window.addEventListener("scroll", onChromeScrollThrottled, opts);
    document.addEventListener("scroll", onChromeScrollThrottled, opts);
    var main = document.querySelector(".main");
    if (main) main.addEventListener("scroll", onChromeScrollThrottled, opts);
    // iOS Safari often delays scroll events until finger lifts; touchmove keeps chrome responsive.
    window.addEventListener("touchmove", onChromeScrollThrottled, opts);
    document.addEventListener("touchmove", onChromeScrollThrottled, opts);
    if (main) main.addEventListener("touchmove", onChromeScrollThrottled, opts);
    lastScrollY = getScrollY();
  }

  var loadBarHideTimer = null;
  var skelHideTimer = null;
  var revealClearTimer = null;
  var grainHoldTimer = null;
  var grainFadeTimer = null;
  var SKEL_CROSSFADE_MS = 520;
  var FEED_REVEAL_MS = 1950;
  var FEED_GRAIN_HOLD_MS = 1000;
  var FEED_GRAIN_FADE_MS = 480;
  /* Load-whisper corner UI retired — feed morph is the load effect */
  var loadWhisperTimer = null;

  function prefersReducedMotion() {
    try {
      return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {
      return false;
    }
  }

  function killEdgeGlowDom() {
    var glow = document.getElementById("edgeGlow");
    if (glow && glow.parentNode) glow.parentNode.removeChild(glow);
    document.body.classList.remove("siri-glow");
  }

  function removeLoadWhisperDom() {
    var ids = ["loadWhisperBr", "loadWhisperTl"];
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }
  }

  function ensureLoadWhisper() { /* retired */ }

  function startLoadWhisper() {
    if (loadWhisperTimer) {
      clearInterval(loadWhisperTimer);
      loadWhisperTimer = null;
    }
    removeLoadWhisperDom();
  }

  function stopLoadWhisper() {
    if (loadWhisperTimer) {
      clearInterval(loadWhisperTimer);
      loadWhisperTimer = null;
    }
    removeLoadWhisperDom();
  }


  function feedHostEl() {
    var page = pageName();
    if (page === "reports") return document.getElementById("reportList");
    if (page === "newsletter") return document.getElementById("newsletterArchive");
    if (page === "story") return document.getElementById("article");
    return document.getElementById("feed");
  }

  function skeletonMarkup(page) {
    page = page || pageName();
    var rows = "";
    var n = (page === "today") ? 6 : 5;
    for (var i = 0; i < n; i++) {
      rows +=
        '<div class="feed-skel-row" aria-hidden="true">' +
          '<div class="feed-skel-rank skel-shimmer"></div>' +
          '<div class="feed-skel-body">' +
            '<div class="feed-skel-line skel-shimmer w90"></div>' +
            '<div class="feed-skel-line skel-shimmer w72"></div>' +
            '<div class="feed-skel-line skel-shimmer w48 thin"></div>' +
          "</div>" +
          '<div class="feed-skel-thumb skel-shimmer"></div>' +
        "</div>";
    }
    if (page === "reports" || page === "newsletter" || page === "signals") {
      return '<div class="feed-skel-stack feed-skel-' + page + '">' + rows + "</div>";
    }
    if (page === "story") {
      return (
        '<div class="feed-skel-stack feed-skel-story">' +
          '<div class="feed-skel-story-kicker skel-shimmer"></div>' +
          '<div class="feed-skel-story-title skel-shimmer"></div>' +
          '<div class="feed-skel-story-title skel-shimmer w72"></div>' +
          '<div class="feed-skel-story-hero skel-shimmer"></div>' +
          '<div class="feed-skel-line skel-shimmer w90"></div>' +
          '<div class="feed-skel-line skel-shimmer w84"></div>' +
          '<div class="feed-skel-line skel-shimmer w76"></div>' +
          '<div class="feed-skel-line skel-shimmer w64"></div>' +
        "</div>"
      );
    }
    // today — lead + rows
    return (
      '<div class="feed-skel-stack feed-skel-' + page + '">' +
        '<div class="feed-skel-lead" aria-hidden="true">' +
          '<div class="feed-skel-lead-photo skel-shimmer"></div>' +
          '<div class="feed-skel-lead-lines">' +
            '<div class="feed-skel-line skel-shimmer w40 thin"></div>' +
            '<div class="feed-skel-line skel-shimmer w92 tall"></div>' +
            '<div class="feed-skel-line skel-shimmer w78"></div>' +
            '<div class="feed-skel-line skel-shimmer w66"></div>' +
          "</div>" +
        "</div>" +
        rows +
      "</div>"
    );
  }

  function showFeedSkeleton(page) {
    if (skelHideTimer) {
      clearTimeout(skelHideTimer);
      skelHideTimer = null;
    }
    page = page || pageName();
    var host = feedHostEl();
    if (!host) return null;
    var parent = host.parentNode;
    if (!parent) return null;

    var sk = document.getElementById("feedSkeleton");
    if (!sk) {
      sk = document.createElement("div");
      sk.id = "feedSkeleton";
      sk.className = "feed-skel";
      sk.setAttribute("aria-hidden", "true");
      parent.insertBefore(sk, host);
    }
    sk.innerHTML = skeletonMarkup(page);
    sk.hidden = false;
    sk.classList.remove("is-out");
    sk.classList.add("is-on");
    host.classList.add("feed-waiting");
    host.setAttribute("aria-busy", "true");
    // Quiet load — never surface think/Siri chrome
    var think = document.getElementById("thinkStatus");
    if (think) {
      think.hidden = true;
      think.classList.remove("is-on");
      think.setAttribute("aria-hidden", "true");
    }
    killEdgeGlowDom();
    return sk;
  }


  function ensureFeedGrain() {
    var el = document.getElementById("feedGrain");
    if (el) return el;
    el = document.createElement("div");
    el.id = "feedGrain";
    el.className = "feed-grain";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = '<div class="feed-grain-veil"></div><div class="feed-grain-layer"></div>';
    document.body.appendChild(el);
    return el;
  }

  function stopFeedGrain(immediate) {
    var html = document.documentElement;
    if (grainHoldTimer) {
      clearTimeout(grainHoldTimer);
      grainHoldTimer = null;
    }
    if (grainFadeTimer) {
      clearTimeout(grainFadeTimer);
      grainFadeTimer = null;
    }
    if (immediate) {
      html.classList.remove("is-feed-grain", "is-feed-grain-out");
      return;
    }
    if (!html.classList.contains("is-feed-grain") && !html.classList.contains("is-feed-grain-out")) return;
    html.classList.remove("is-feed-grain");
    html.classList.add("is-feed-grain-out");
    grainFadeTimer = setTimeout(function () {
      grainFadeTimer = null;
      html.classList.remove("is-feed-grain-out");
    }, FEED_GRAIN_FADE_MS);
  }

  function startFeedGrain() {
    if (prefersReducedMotion()) {
      stopFeedGrain(true);
      return;
    }
    var el = ensureFeedGrain();
    var html = document.documentElement;
    if (grainHoldTimer) {
      clearTimeout(grainHoldTimer);
      grainHoldTimer = null;
    }
    if (grainFadeTimer) {
      clearTimeout(grainFadeTimer);
      grainFadeTimer = null;
    }
    html.classList.remove("is-feed-grain-out");
    void el.offsetWidth;
    html.classList.add("is-feed-grain");
    grainHoldTimer = setTimeout(function () {
      grainHoldTimer = null;
      stopFeedGrain(false);
    }, FEED_GRAIN_HOLD_MS);
  }

  function hideFeedSkeletonThen(renderFn) {
    if (skelHideTimer) {
      clearTimeout(skelHideTimer);
      skelHideTimer = null;
    }
    if (revealClearTimer) {
      clearTimeout(revealClearTimer);
      revealClearTimer = null;
    }
    var sk = document.getElementById("feedSkeleton");
    var host = feedHostEl();
    var motionOk = !prefersReducedMotion();
    if (motionOk) startFeedGrain();
    else stopFeedGrain(true);

    // Attach feed-reveal BEFORE render so cards never get opacity:1 !important
    // inline styles that would cancel the unfair-style morph.
    if (host) {
      host.classList.remove("feed-waiting");
      host.removeAttribute("aria-busy");
      if (motionOk) host.classList.add("feed-reveal");
      host.classList.add("is-ready");
    }

    if (typeof renderFn === "function") {
      try { renderFn(); } catch (e) { console.error(e); }
    }

    if (!sk) {
      if (host && motionOk) {
        revealClearTimer = setTimeout(function () {
          revealClearTimer = null;
          if (host) host.classList.remove("feed-reveal");
        }, FEED_REVEAL_MS);
      }
      return;
    }

    if (!motionOk) {
      if (sk.parentNode) sk.parentNode.removeChild(sk);
      if (host) host.classList.remove("feed-reveal");
      return;
    }

    sk.classList.add("is-out");
    sk.classList.remove("is-on");
    skelHideTimer = setTimeout(function () {
      skelHideTimer = null;
      if (sk.parentNode) sk.parentNode.removeChild(sk);
    }, SKEL_CROSSFADE_MS);
    revealClearTimer = setTimeout(function () {
      revealClearTimer = null;
      if (host) host.classList.remove("feed-reveal");
    }, FEED_REVEAL_MS);
  }

  function showThinLoadBar() {
    var bar = document.getElementById("loadBar");
    if (!bar) return;
    bar.hidden = false;
    bar.setAttribute("aria-hidden", "false");
    bar.classList.add("is-active");
    if (prefersReducedMotion()) bar.classList.add("is-static");
    else bar.classList.remove("is-static");
  }

  function hideThinLoadBar() {
    var bar = document.getElementById("loadBar");
    if (!bar) return;
    bar.classList.remove("is-active");
    bar.hidden = true;
    bar.setAttribute("aria-hidden", "true");
  }

  // Legacy no-ops — Siri/ocean edge glow retired in favor of feed skeleton
  function showSiriGlow() { /* retired */ }
  function hideSiriGlow() { /* retired */ }

  function showLoadBar() {
    if (loadBarHideTimer) {
      clearTimeout(loadBarHideTimer);
      loadBarHideTimer = null;
    }
    killEdgeGlowDom();
    document.documentElement.removeAttribute("data-revealed");
    document.documentElement.setAttribute("data-loading", "1");
    startLoadWhisper();
    hideThinLoadBar();
    showFeedSkeleton();
  }

  function hideLoadBar() {
    if (loadBarHideTimer) {
      clearTimeout(loadBarHideTimer);
      loadBarHideTimer = null;
    }
    document.documentElement.removeAttribute("data-loading");
    stopLoadWhisper();
    document.documentElement.setAttribute("data-revealed", "1");
    hideThinLoadBar();
    // If a render already wrote the feed, just crossfade skeleton away
    hideFeedSkeletonThen(null);
  }

  function flashLoadBar(ms) {
    if (loadBarHideTimer) {
      clearTimeout(loadBarHideTimer);
      loadBarHideTimer = null;
    }
    showFeedSkeleton();
    var requested = ms == null ? 900 : ms;
    var dur = prefersReducedMotion() ? 0 : Math.min(1400, Math.max(900, requested));
    if (dur <= 0) {
      hideFeedSkeletonThen(null);
      return;
    }
    loadBarHideTimer = setTimeout(function () {
      loadBarHideTimer = null;
      hideFeedSkeletonThen(null);
    }, dur);
  }

  function syncDensitySeg() {
    var root = document.documentElement;
    var compact = root.getAttribute("data-density") === "compact";
    var seg = document.getElementById("densityToggle");
    if (!seg) return;
    var buttons = seg.querySelectorAll("[data-density-mode]");
    if (!buttons.length) {
      // legacy single button
      seg.setAttribute("aria-pressed", compact ? "true" : "false");
      if (seg.tagName === "BUTTON") seg.textContent = compact ? "Compact" : "Comfortable";
      return;
    }
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      var mode = btn.getAttribute("data-density-mode");
      var on = compact ? mode === "compact" : mode === "comfortable";
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    }
  }

  function isCompactDensity() {
    return document.documentElement.getAttribute("data-density") === "compact";
  }

  function setDensityMode(next) {
    var root = document.documentElement;
    if (next === "compact") root.setAttribute("data-density", "compact");
    else {
      root.removeAttribute("data-density");
      next = "comfortable";
    }
    try { localStorage.setItem("an-density", next); } catch (e) {}
    syncDensitySeg();
    // Compact vs expanded changes layout (no lead/hero/excerpts/thumbs), so re-render.
    if (!state.data) return;
    var page = pageName();
    if (page === "today") renderTodayFeed();
    else if (page === "signals") renderSignals();
    else if (page === "reports") renderReports();
  }

  function ensureAuthCta() {
    var actions = document.querySelector(".top-actions");
    if (!actions) return null;
    var el = document.getElementById("authCta");
    if (!el) {
      el = document.createElement("a");
      el.id = "authCta";
      el.className = "auth-cta";
      el.textContent = "Sign up / Login";
      var pill = actions.querySelector(".user-pill");
      if (pill) actions.insertBefore(el, pill);
      else actions.appendChild(el);
    }
    el.href = "auth.html";
    el.removeAttribute("target");
    el.removeAttribute("rel");
    return el;
  }

  function enableCardNavigation(list) {

    if (!list) return;
    list.classList.add("is-ready");
    var cards = list.querySelectorAll(".lead-card, .feed-row");
    var i;
    for (i = 0; i < cards.length; i++) {
      (function (card) {
        card.classList.add("is-ready");
        // Never pin opacity during feed-reveal — CSS morph owns it
        card.style.removeProperty("opacity");
        card.style.removeProperty("filter");
        card.style.removeProperty("transform");
        var href = card.getAttribute("data-href");
        if (!href) {
          var link = card.querySelector(".story-title a, .lead-title a");
          if (link && link.getAttribute("href")) {
            href = link.getAttribute("href");
            card.setAttribute("data-href", href);
          }
        }
        if (!href) return;
        card.style.cursor = "pointer";
        if (!card.hasAttribute("tabindex")) card.setAttribute("tabindex", "0");
        if (!card.getAttribute("role")) card.setAttribute("role", "link");
        if (card.dataset.navBound === "1") return;
        card.dataset.navBound = "1";

        card.addEventListener("click", function (e) {
          var t = e.target;
          if (t && t.closest) {
            if (t.closest("a, button, input, textarea, select, label")) return;
          }
          var dest = card.getAttribute("data-href");
          if (dest) window.location.href = dest;
        });

        card.addEventListener("keydown", function (e) {
          if (e.key !== "Enter" && e.key !== " ") return;
          if (e.target !== card) return;
          e.preventDefault();
          var dest = card.getAttribute("data-href");
          if (dest) window.location.href = dest;
        });
      })(cards[i]);
    }
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

  function fmtDateShort(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    } catch (e) { return ""; }
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /** Linkify http(s) URLs in already-escaped plain text (does not double-escape anchors). */
  function linkifyHtml(escapedText) {
    return String(escapedText == null ? "" : escapedText).replace(
      /https?:\/\/[^\s<]+/gi,
      function (raw) {
        var trail = "";
        var url = raw.replace(/([.,;:!?)]+)$/, function (_, t) {
          trail = t;
          return "";
        });
        if (!/^https?:\/\//i.test(url)) return raw;
        return '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + url + "</a>" + trail;
      }
    );
  }

  function decodeEntities(s) {
    if (s == null) return "";
    var str = String(s);
    if (str.indexOf("&") === -1) return str;
    try {
      var ta = document.createElement("textarea");
      ta.innerHTML = str;
      return ta.value;
    } catch (e) {
      return str
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ");
    }
  }

  function displayText(s) {
    return cleanDisplayText(decodeEntities(s));
  }

  function firstSentence(s, maxLen) {
    var t = displayText(s).replace(/\s+/g, " ").trim();
    if (!t) return "";
    maxLen = maxLen || 160;
    var m = t.match(/^(.+?[.!?])(\s|$)/);
    if (m && m[1].length >= 28 && m[1].length <= maxLen) return m[1];
    if (t.length <= maxLen) return t;
    return softClamp(t, maxLen);
  }

  function cleanHeadline(s, fallback) {
    var t = displayText(s).replace(/\s+/g, " ").trim();
    t = t.replace(/^RT\s+@[A-Za-z0-9_]+:\s*/i, "");
    if (/…$|\.\.\.$/.test(t) && fallback) {
      var fuller = displayText(fallback).replace(/\s+/g, " ").trim();
      fuller = fuller.replace(/^RT\s+@[A-Za-z0-9_]+:\s*/i, "");
      if (fuller.length > t.length + 8) {
        var sentence = fuller.match(/^(.+?[.!?])(\s|$)/);
        if (sentence && sentence[1].length >= 40) return sentence[1];
        if (fuller.length <= 160) return fuller;
        return firstSentence(fuller, 140);
      }
    }
    return t;
  }

  function prettyChipLabel(id, label) {
    var known = {
      models: "Models", agents: "Agents", robotics: "Robotics", funding: "Funding",
      companies: "Companies", research: "Research", chips: "Chips",
      "open-source": "Open source", policy: "Policy", creative: "Creative", all: "All"
    };
    if (known[id]) return known[id];
    if (known[label]) return known[label];
    var raw = String(label || id || "");
    if (known[raw.toLowerCase()]) return known[raw.toLowerCase()];
    var m = raw.match(/AI\s+Companies/i);
    if (m) return "Companies";
    m = raw.match(/AI\s+Community/i);
    if (m) return "Community";
    m = raw.match(/AI\s+Labs/i);
    if (m) return "Labs";
    return raw.replace(/\s+#?\d+\s+of\s+\d+/i, "").replace(/\s+#\d+/i, "").trim() || raw;
  }

  function engagementScore(item) {
    var e = item && item.engagement;
    if (!e) return item && item.engagement_score != null ? Number(item.engagement_score) : 0;
    return (e.like_count || 0) * 3 + (e.retweet_count || 0) * 4 + (e.reply_count || 0) * 2 + (e.quote_count || 0) * 3 + Math.round((e.impression_count || 0) / 100);
  }

  var AI_RE = /\b(ai|llm|gpt|claude|gemini|openai|anthropic|nvidia|model|agent|robot|chip|gpu|ml|neural|transformer|cursor|fireworks|scoble|aligned|startup|funding|benchmark|inference|open[- ]?source|agi|sota)\b/i;

  
  function isRetweetNoise(item) {
    var h = String((item && (item.headline || item.title || item.text)) || "");
    var body = String((item && (item.summary || item.body || item.text)) || "");
    var t = (h + "\n" + body).trim();
    if (/^RT\s+@/i.test(h) || /^RT\s+@/i.test(t)) {
      // allow RT if clearly AI/tech
      if (!/\b(AI|LLM|model|agent|robot|GPU|OpenAI|Anthropic|NVIDIA|Google|Meta|xAI|Claude|GPT|funding|launch|benchmark|SOTA)\b/i.test(t)) {
        return true;
      }
    }
    // entertainment / sports junk
    if (/\b(Aegon|Game of Thrones|House of the Dragon|NFL|NBA|soccer|football|Taylor Swift|spoiler)\b/i.test(t) &&
        !/\b(AI|model|agent|LLM|robot)\b/i.test(t)) {
      return true;
    }
    return false;
  }

  function isAiRelevant(item) {
    var t = [
      item && item.headline,
      item && item.title,
      item && item.summary,
      item && item.body,
      item && item.text,
      item && item.section_label,
      item && item.source_list
    ].join(" ");
    return /\b(AI|A\.I\.|LLM|GPT|Claude|Grok|model|agent|robot|robotics|GPU|chip|semiconductor|OpenAI|Anthropic|NVIDIA|Google DeepMind|DeepMind|Meta Superintelligence|xAI|Mistral|funding|Series [ABC]|benchmark|SOTA|inference|transformer|diffusion|multimodal|MCP|Cursor)\b/i.test(t);
  }

  function relevanceScore(item) {
    var hay = [item.headline, item.summary, item.body, item.section_label, item.source_list, item.author_name, item.title, item.text]
      .join(" ");
    var score = 0;
    var m = hay.match(new RegExp(AI_RE.source, "gi"));
    if (m) score += Math.min(m.length, 8) * 12;
    if (/^RT\s+@/i.test(String(item.headline || item.title || ""))) score -= 25;
    if (/\b(game of thrones|aegon|season\s+\d+|nba|nfl|soccer|football|celebrity|actor|actress|tv show)\b/i.test(hay)) score -= 220;
    if (item.signal_badge) score += 8;
    if (item._from_x_api) score += 2;
    return score;
  }

  function rankScore(item) {
    if (isRetweetNoise(item)) return -1e12;
    var base = engagementScore(item) + relevanceScore(item) * 8;
    if (!isAiRelevant(item)) base -= 5000;
    if (/^RT\s+@/i.test(String((item && (item.headline || item.title)) || ""))) base -= 800;
    return base;
  }


  function engagementPillHtml(item) {
    var e = item && item.engagement;
    if (!e) {
      if (item && item.engagement_score != null) {
        return '<span class="eng-pill" title="Confidence">' + escapeHtml(String(item.engagement_score)) + " conf.</span>";
      }
      return "";
    }
    var likes = e.like_count || 0;
    var rts = e.retweet_count || 0;
    var imp = e.impression_count || 0;
    var bits = [];
    if (likes) bits.push(likes + " likes");
    if (rts) bits.push(rts + " rts");
    if (!bits.length && imp) bits.push(imp + " views");
    if (!bits.length) return "";
    return '<span class="eng-pill" title="Engagement">' + escapeHtml(bits.join(" · ")) + "</span>";
  }

  function staggerStyle(i) {
    /* Snappy stagger: max ~384ms across 12 steps */
    var delay = Math.min(i, 12) * 0.032;
    return 'style="--i:' + Math.min(i, 12) + ";animation-delay:" + delay.toFixed(3) + 's"';
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
    var title = displayText(sig.title || sig.text || "").trim();
    var cleaned = displayText(sig.analysis || "");
    if (!cleaned) return "";
    if (cleaned.toLowerCase() === title.toLowerCase()) return "";
    var first = cleaned.split(/\n/)[0].trim();
    if (first.toLowerCase() === title.toLowerCase()) return "";
    return first;
  }

  function storyBodyParagraphs(story) {
    var raw = String(story.body || "");
    var hadPh = hasSamplePlaceholder(raw) || !!story._body_placeholder;
    var cleaned = displayText(raw);
    if (hadPh) {
      var paras = [];
      var summary = displayText(story.summary || "").trim();
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
    companies: "linear-gradient(145deg,#374151,#d1d5db)",
    industry: "linear-gradient(145deg,#374151,#d1d5db)",
    scoble: "linear-gradient(145deg,#7c2d12,#fdba74)",
    general: "linear-gradient(145deg,#334155,#93c5fd)"
  };

  function sectionThumbStyle(key) {
    var k = String(key || "");
    if (SECTION_GRADIENTS[k]) return SECTION_GRADIENTS[k];
    if (k.indexOf("compan") !== -1) return SECTION_GRADIENTS.industry;
    if (k.indexOf("community") !== -1) {
      var n = parseInt((k.match(/(\d+)/) || [])[1] || "1", 10);
      var keys = ["models","agents","research","open-source","creative","compute","funding","chips"];
      return SECTION_GRADIENTS[keys[(n - 1) % keys.length]];
    }
    return SECTION_GRADIENTS.general;
  }

  /** Topic glyphs for designed row tiles when a story has no media. */
  function topicGlyphSvg(key) {
    var k = String(key || "general");
    if (k.indexOf("compan") !== -1 || k === "industry") k = "companies";
    if (k.indexOf("open") !== -1) k = "open-source";
    var paths = {
      models: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4"/><path d="M8 12h8"/>',
      agents: '<rect x="4" y="7" width="7" height="10" rx="1.5"/><rect x="13" y="7" width="7" height="10" rx="1.5"/><path d="M11 12h2M7 4v3M17 4v3"/>',
      robotics: '<rect x="7" y="9" width="10" height="9" rx="2"/><circle cx="10" cy="13" r="1.2"/><circle cx="14" cy="13" r="1.2"/><path d="M12 4v5M9 4h6M8 18v2M16 18v2"/>',
      funding: '<path d="M12 3v18M16.5 7.5c0-1.7-2-3-4.5-3s-4.5 1.3-4.5 3 2 3 4.5 3 4.5 1.3 4.5 3-2 3-4.5 3-4.5-1.3-4.5-3"/>',
      companies: '<path d="M4 20V8l8-4 8 4v12"/><path d="M9 20v-6h6v6M9 11h.01M15 11h.01M12 11h.01"/>',
      research: '<path d="M9 4h6v6l-3 2-3-2V4z"/><path d="M9 10v8a3 3 0 006 0v-8"/><path d="M8 20h8"/>',
      chips: '<rect x="6" y="6" width="12" height="12" rx="1.5"/><path d="M9 9h6v6H9zM3 10h3M3 14h3M18 10h3M18 14h3M10 3v3M14 3v3M10 18v3M14 18v3"/>',
      "open-source": '<circle cx="12" cy="12" r="3"/><path d="M12 5a7 7 0 017 7M12 19a7 7 0 01-7-7M5.5 8.5A7 7 0 0112 5"/><circle cx="12" cy="5" r="1.3"/><circle cx="18.2" cy="15.5" r="1.3"/><circle cx="5.8" cy="15.5" r="1.3"/>',
      policy: '<path d="M6 4h9l3 3v13H6V4z"/><path d="M14 4v4h4M9 12h6M9 16h6"/>',
      creative: '<path d="M12 3l2.2 6.5L21 12l-6.8 2.5L12 21l-2.2-6.5L3 12l6.8-2.5L12 3z"/>',
      compute: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>',
      events: '<rect x="4" y="6" width="16" height="14" rx="2"/><path d="M8 3v4M16 3v4M4 11h16"/>',
      scoble: '<path d="M8 19V8l4-3 4 3v11"/><path d="M10 12h4M10 15h4"/>',
      general: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 2.5"/>'
    };
    var body = paths[k] || paths.general;
    return '<svg class="row-thumb-icon" viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + "</svg>";
  }


  function storyMediaUrl(item) {
    if (!item) return "";
    return item.media_url || item.image_url || item.mediaUrl || item.imageUrl || "";
  }

  /** Square profile art — not a magazine photo. Row thumbs may still use it. */
  function isAvatarMedia(url) {
    var u = String(url || "").toLowerCase();
    if (!u) return false;
    if (u.indexOf("unavatar.io") !== -1) return true;
    if (u.indexOf("pbs.twimg.com/profile_images") !== -1) return true;
    if (u.indexOf("abs.twimg.com") !== -1) return true;
    if (u.indexOf("avatars.githubusercontent.com") !== -1) return true;
    if (u.indexOf("gravatar.com") !== -1) return true;
    if (u.indexOf("ui-avatars.com") !== -1) return true;
    if (u.indexOf("i.pravatar.cc") !== -1) return true;
    if (/\/profile[_-]?images?\//.test(u)) return true;
    return false;
  }

  function leadHeroHtml(s, key, sectionPretty) {
    var media = storyMediaUrl(s);
    var label = String((s && s.topic_label) || sectionPretty || "Today");
    var bg = sectionThumbStyle(key);
    if (media && !isAvatarMedia(media)) {
      return (
        '<div class="lead-hero">' +
          '<img src="' + escapeHtml(String(media)) + '" alt="" loading="eager" ' +
          "onerror=\"var h=this.parentNode;if(h){this.remove();h.classList.add('lead-hero-topic');}\" />" +
        "</div>"
      );
    }
    return (
      '<div class="lead-hero lead-hero-topic" style="--lead-topic-bg:' + bg + '">' +
        '<span class="lead-hero-glyph">' + topicGlyphSvg(key) + "</span>" +
        '<span class="lead-hero-topic-label">' + escapeHtml(label) + "</span>" +
      "</div>"
    );
  }

  function rowThumbHtml(s, key, sectionPretty) {
    var label = String((s && s.topic_label) || sectionPretty || "AI").split(" ")[0] || "AI";
    var media = storyMediaUrl(s);
    var tile =
      '<div class="row-thumb-tile" style="background:' + sectionThumbStyle(key) + '">' +
        '<span class="row-thumb-glyph">' + topicGlyphSvg(key) + "</span>" +
      "</div>";
    var img = "";
    if (media) {
      img =
        '<img class="row-thumb-img" src="' + escapeHtml(String(media)) + '" alt="" loading="lazy" ' +
        "onerror=\"var p=this.parentNode;this.remove();if(p){p.classList.remove('has-media');}\" />";
    }
    return (
      '<div class="row-thumb' + (media ? " has-media" : "") + '" aria-hidden="true">' +
        tile +
        img +
        '<span class="row-thumb-label">' + escapeHtml(label) + "</span>" +
      "</div>"
    );
  }

  function nlEmailStored() {
    try { return String(localStorage.getItem("an-nl-email") || "").trim(); } catch (e) { return ""; }
  }

  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
  }

  function newsletterBannerHtml() {
    var saved = nlEmailStored();
    var inBar = isValidEmail(saved);
    return (
      '<li class="nl-subscribe' + (inBar ? " is-in" : "") + '">' +
        '<div class="nl-subscribe-inner">' +
          '<div class="nl-subscribe-copy">' +
            '<p class="nl-subscribe-kicker">Newsletter</p>' +
            '<p class="nl-subscribe-headline">Aligned Daily Intelligence.</p>' +
            '<p class="nl-subscribe-sub">Weekdays at 1 p.m. PT.</p>' +
          "</div>" +
          (inBar
            ? '<p class="nl-subscribe-done">You\u2019re in</p>'
            : '<form class="nl-subscribe-form" action="#" method="post" novalidate>' +
                '<input type="email" name="email" placeholder="you@example.com" autocomplete="email" aria-label="Email address" />' +
                '<button type="submit">Subscribe</button>' +
              "</form>") +
        "</div>" +
      "</li>"
    );
  }

  function bindNewsletterSubscribe() {
    if (document.documentElement.dataset.nlBound === "1") return;
    document.documentElement.dataset.nlBound = "1";
    document.addEventListener("submit", function (e) {
      var form = e.target;
      if (!form || !form.closest || !form.closest(".nl-subscribe")) return;
      e.preventDefault();
      var input = form.querySelector('input[type="email"]');
      var email = input ? String(input.value || "").trim() : "";
      if (!isValidEmail(email)) {
        if (input) input.focus();
        return;
      }
      try { localStorage.setItem("an-nl-email", email); } catch (err) {}
      var bar = form.closest(".nl-subscribe");
      if (!bar) return;
      bar.classList.add("is-in");
      var done = document.createElement("p");
      done.className = "nl-subscribe-done";
      done.textContent = "You\u2019re in";
      form.parentNode.replaceChild(done, form);
    });
  }

  function ensurePartnersRail() {
    var rail = document.getElementById("pageRail");
    if (!rail) return;
    if (pageName() === "newsletter") return;
    var el = document.getElementById("partnersRail");
    if (el) return;
    el = document.createElement("section");
    el.id = "partnersRail";
    el.className = "rail-card rail-card-partners";
    el.innerHTML =
      '<h2 class="rail-title">Partners</h2>' +
      '<p class="partners-kicker">UNALIGNED \u00d7 Scoble</p>' +
      '<p class="partners-line">Reach the lists that rank this desk.</p>' +
      '<a class="partners-link" href="https://unaligned.io" target="_blank" rel="noopener noreferrer">Open unaligned.io</a>';
    var top = document.getElementById("topSignals");
    if (top && top.parentNode === rail) {
      if (top.nextSibling) rail.insertBefore(el, top.nextSibling);
      else rail.appendChild(el);
    } else {
      rail.appendChild(el);
    }
  }

  function isProPlan(user) {
    var p = String((user && user.plan) || "Pro").toLowerCase();
    return p !== "free";
  }

  function resolvePlan(user) {
    // Mock default: Pro. Pass ?plan=free to demo Upgrade CTA in topbar.
    var q = getParam("plan");
    var u = user || { name: "Asher", plan: "Pro" };
    if (q) {
      u.plan = /^free$/i.test(String(q)) ? "Free" : "Pro";
    } else if (!u.plan) {
      u.plan = "Pro";
    }
    return u;
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
    var topSignals = document.getElementById("topSignals");
    // Today already has a main-column Signals module — don't repeat it in the rail.
    if (pageName() === "today" && topSignals) {
      topSignals.hidden = true;
    }
    var list = $("#topSignalsList");
    if (list && !(topSignals && topSignals.hidden)) {
      var items = (state.data.signals || []).slice().sort(function (a, b) {
            return (b.engagement_score || 0) - (a.engagement_score || 0);
          }).slice(0, 5);
      if (!items.length && state.data.forYou && state.data.forYou.length) {
        items = state.data.forYou.slice(0, 5);
      }
      if (!items.length) {
        list.innerHTML = '<li class="empty" style="padding:0.5rem 0;text-align:left;opacity:1;animation:none">No signals yet.</li>';
      } else {
        list.innerHTML = items.map(function (s) {
          var href = "story.html?id=" + encodeURIComponent("sigstory-" + s.id);
          var title = editorialTitle(s, 96);
          return (
            '<li class="rail-item">' +
              '<span class="rail-icon" style="background:' + signalIconColor(s.badge) + '">' +
                escapeHtml(String(s.badge || "sig").slice(0, 1).toUpperCase()) +
              "</span>" +
              "<div>" +
                '<h3 class="rail-item-title"><a href="' + href + '">' + escapeHtml(title) + "</a></h3>" +
                '<div class="rail-item-meta">' +
                  '<span class="' + badgeClass(s.badge) + '">' + escapeHtml((s.badge || "signal").toUpperCase()) + "</span>" +
                  '<span>' + escapeHtml(joinMeta([
                    s.topic_label || prettyChipLabel(s.section_key, s.section_label || s.source_list || ""),
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
        return '<a href="' + href + '">' + escapeHtml(prettyChipLabel(c.id, c.label)) + "</a>";
      }).join("");
    }

    var provenance = $("#provenanceCopy");
    if (provenance && state.data.meta) {
      var lists = state.data.meta.lists_sampled || [];
      var n = state.data.stats && state.data.stats.lists ? state.data.stats.lists : lists.length;
      provenance.textContent = n
        ? ("Live from @" + (state.data.meta.username || "Scobleizer") + " — " + n + " lists sampled this sweep.")
        : "Live from @Scobleizer lists via X API.";
    }

    var why = $("#whyCopy");
    if (why && !why.getAttribute("data-locked")) {
      var storiesN = (state.data.stories || []).filter(isTodayFeedKind).length;
      var sigN = (state.data.signals || []).length;
      var top = (state.data.stories || []).filter(isTodayFeedKind).slice().sort(function(a,b){return rankScore(b)-rankScore(a);})[0];
      if (top) {
        why.textContent = whyItMatters(top);
      } else {
        why.textContent = "Aligned News watches Scoble’s curated X lists, ranks cross-list spikes, and puts " +
          storiesN + " stories and " + sigN + " signals on your Pro desk — before the timeline does.";
      }
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
      var vibeCopy = $("#vibeCopy");
      if (vibeCopy) {
        vibeCopy.textContent = stories + " stories and " + signals + " signals on the desk this sweep — " +
          reports + " reports when you need depth.";
      }
    }

    ensurePartnersRail();
  }

  function badgeClass(badge) {
    var b = (badge || "").toLowerCase();
    return "badge badge-" + (b || "signal");
  }

  function pageName() {
    return document.body.getAttribute("data-page") || "today";
  }



  function dockIcon(id, filled) {
    var icons = {
      today: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z"/></svg>',
      signals: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h2M9.5 8v8M14.5 5v14M19 9v6"/></svg>',
      reports: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 19V9M12 19V5M18 19v-7"/><path d="M4 19h16"/></svg>',
      newsletter: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/></svg>',
      saved: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4h10a1 1 0 0 1 1 1v15l-6-3.5L6 20V5a1 1 0 0 1 1-1z"/></svg>'
    };
    if (filled && id === "today") {
      return '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z"/></svg>';
    }
    return icons[id] || icons.today;
  }

  function renderMobileDock(page) {
    if (page === "auth") {
      var old = $("#mobileDock");
      if (old) old.remove();
      document.documentElement.classList.remove("has-mobile-dock");
      return;
    }
    // Primary destinations (not topic chips). Saved stays in hamburger/sidebar.
    var items = [
      { id: "today", href: "index.html", label: "Today" },
      { id: "signals", href: "signals.html", label: "Signals" },
      { id: "reports", href: "reports.html", label: "Reports" },
      { id: "newsletter", href: "newsletter.html", label: "News" }
    ];
    var dock = $("#mobileDock");
    if (!dock) {
      dock = document.createElement("nav");
      dock.id = "mobileDock";
      dock.className = "mobile-dock";
      dock.setAttribute("aria-label", "Primary");
      var appEl = document.querySelector(".app") || document.body;
      appEl.appendChild(dock);
    }
    document.documentElement.classList.add("has-mobile-dock");
    dock.innerHTML =
      '<div class="mobile-dock-inner">' +
      items.map(function (item) {
        var active = item.id === page || (page === "story" && item.id === "today");
        if (item.id === "today") active = (page === "today" && getParam("view") !== "saved") || page === "story";
        return (
          '<a class="mobile-dock-item' + (active ? " is-active" : "") + '" href="' + item.href + '"' +
          (active ? ' aria-current="page"' : "") + ">" +
          '<span class="mobile-dock-ico">' + dockIcon(item.id, active) + "</span>" +
          '<span class="mobile-dock-label">' + escapeHtml(item.label) + "</span>" +
          "</a>"
        );
      }).join("") +
      "</div>";
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
      { id: "today", href: "index.html", label: "Today", count: counts.stories },
      { id: "signals", href: "signals.html", label: "Signals", count: counts.signals },
      { id: "reports", href: "reports.html", label: "Reports", count: counts.reports },
      { id: "newsletter", href: "newsletter.html", label: "Newsletter", count: NEWSLETTER_ISSUES.length },
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
        '<div class="side-box">' +
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
            '<li><a class="nav-link' + (active ? " active" : "") + '" href="' + item.href + '">' +
            escapeHtml(item.label) +
            (item.count != null ? '<span class="count">' + item.count + "</span>" : "") +
            "</a></li>"
          );
        }).join("") +
        "</ul>" +
        "</div>" +
        '<div class="side-box side-box-quiet sidebar-foot" id="sidebarFoot"></div>';
    }

    renderMobileDock(page);

    var user = resolvePlan(data.user || { name: "Asher", plan: "Pro" });
    data.user = user;
    var pro = isProPlan(user);
    var uname = user.name || "Asher";

    var foot = $("#sidebarFoot");
    if (foot) {
      foot.innerHTML = escapeHtml(uname) + " · " + (pro ? "Pro" : "Free") +
        "<br>" + (pro ? "63 curated X lists · interests first" : "Free desk · Upgrade for interests-first ranking");
    }

    var authCta = ensureAuthCta();
    if (authCta) {
      authCta.hidden = false;
      authCta.classList.add("is-on");
    }
    // Remove legacy Upgrade CTA — Sign up / Login is the primary action.
    var existingUp = $("#upgradeBtn");
    if (existingUp) existingUp.remove();

    var pill = $(".user-pill");
    if (pill) {
      if (pro) {
        pill.hidden = false;
        pill.classList.add("is-compact");
        var av = initialsFrom(uname).slice(0, 1);
        pill.innerHTML =
          '<span class="avatar" aria-hidden="true">' + escapeHtml(av) + "</span>" +
          '<span class="user-name">' + escapeHtml(uname) + "</span>" +
          '<span class="pro-badge">Pro</span>';
        pill.title = "Signed in · Pro";
      } else {
        // Free mock: Sign up / Login replaces the account chip.
        pill.hidden = true;
        pill.classList.remove("is-compact");
      }
    }

    var kicker = $(".desk-kicker");
    if (kicker) {
      kicker.textContent = pro ? "Scoble’s lists · Pro desk" : "Scoble’s lists · Free desk";
    }

    var siteFoot = $(".site-footer");
    if (siteFoot) {
      var spans = siteFoot.querySelectorAll("span");
      if (spans[0]) spans[0].textContent = "Aligned News · " + (pro ? "Pro desk" : "Free desk");
    }

    // Compact Pro rail / desk note — interests first, then the rest of the desk.
    var rail = $("#pageRail");
    var note = $("#proDeskNote");
    if (rail) {
      if (pro) {
        if (!note) {
          note = document.createElement("section");
          note.id = "proDeskNote";
          note.className = "rail-card rail-card-pro-note";
          note.innerHTML = '<p class="pro-desk-note">Curated to you — interests first, then the rest of the desk.</p>';
          rail.insertBefore(note, rail.firstChild);
        } else {
          note.hidden = false;
        }
      } else if (note) {
        note.hidden = true;
      }
    }


    var metaEl = $("#pageMeta");
    if (metaEl) {
      var todayLabel = new Date().toLocaleDateString(undefined, {
        weekday: "long", month: "long", day: "numeric", year: "numeric"
      });
      if (page === "today") {
        metaEl.textContent = todayLabel + (lastUpdated ? " · Updated " + lastUpdated : "");
      } else if (page === "signals") {
        metaEl.textContent = counts.signals + " signals" + (lastUpdated ? " · Updated " + lastUpdated : "");
      } else if (page === "reports") {
        metaEl.textContent = counts.reports + " reports";
      } else if (page === "newsletter") {
        metaEl.textContent = NEWSLETTER_ISSUES.length + " archive issues · Unaligned × Aligned";
      }
    }

    var liveTime = $("#liveTime");
    if (liveTime) {
      liveTime.textContent = lastUpdated || "desk";
    }

    var deskStats = $("#deskStats");
    if (deskStats) {
      var listCount = (data.stats && data.stats.lists) || (data.meta && data.meta.lists_sampled && data.meta.lists_sampled.length) || 63;
      deskStats.innerHTML =
        '<div class="desk-stat"><strong>' + counts.stories + '</strong><span>Stories</span></div>' +
        '<div class="desk-stat"><strong>' + counts.signals + '</strong><span>Signals</span></div>' +
        '<div class="desk-stat"><strong>' + listCount + '</strong><span>Lists</span></div>';
    }

    syncDensitySeg();
    syncChromeToggle();
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
      var key = story.topic_key || story.section_key || mapSectionKey(story.section || story.tag || "");
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

  function updateChipsOverflow(el) {
    if (!el) return;
    var overflowing = el.scrollWidth > el.clientWidth + 2;
    el.classList.toggle("is-overflowing", overflowing);
  }

  var chipsOverflowBound = false;
  function bindChipsOverflowResize() {
    if (chipsOverflowBound) return;
    chipsOverflowBound = true;
    var timer = null;
    window.addEventListener("resize", function () {
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        var el = $("#chips");
        if (el) updateChipsOverflow(el);
      }, 100);
    });
  }

  function renderChips(containerId) {
    var el = $(containerId);
    if (!el || !state.data) return;
    var chips = state.data.chips || [];
    el.innerHTML = chips.map(function (c) {
      return (
        '<button type="button" class="chip" data-filter="' + escapeHtml(c.id) + '" aria-pressed="' +
        (state.filter === c.id ? "true" : "false") + '">' + escapeHtml(prettyChipLabel(c.id, c.label)) + "</button>"
      );
    }).join("");
    $all(".chip", el).forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.filter = btn.getAttribute("data-filter") || "all";
        renderChips(containerId);
        showFeedSkeleton();
        hideFeedSkeletonThen(function () {
          if (pageName() === "today") renderTodayFeed();
          if (pageName() === "signals") renderSignals();
        });
      });
    });
    bindChipsOverflowResize();
    // Measure after paint so clientWidth reflects layout
    requestAnimationFrame(function () { updateChipsOverflow(el); });
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
          "<span>" + escapeHtml(editorialTitle(s, 72)) + "</span></a>"
        );
      }).join("");
  }

  function renderIntelStrip() {
    var el = $("#intelStrip");
    if (!el || !state.data) return;
    if (pageName() !== "today" || getParam("view") === "saved") {
      el.hidden = true;
      el.innerHTML = "";
      return;
    }
    // Stay collapsed while Focus / scroll auto-compact is active
    if (document.documentElement.getAttribute("data-chrome") === "compact") {
      el.hidden = true;
      el.classList.add("chrome-collapsed");
      return;
    }
    var stories = (state.data.stories || []).filter(function (s) {
      return isTodayFeedKind(s) && isAiRelevant(s) && !isRetweetNoise(s);
    }).slice().sort(function (a, b) {
      return rankScore(b) - rankScore(a);
    }).slice(0, 5);
    if (stories.length < 3) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    el.classList.remove("chrome-collapsed");
    el.innerHTML =
      '<div class="intel-head"><span class="intel-kicker">Desk glance</span><span class="intel-sub">What moved across Scoble lists</span></div>' +
      '<ol class="intel-list">' +
      stories.map(function (s, i) {
        var title = editorialTitle(s, 78);
        var topic = s.topic_label || labelFor(s.topic_key || topicKeyFor(s));
        return (
          '<li style="--i:' + i + '">' +
            '<a href="story.html?id=' + encodeURIComponent(s.id) + '">' +
              '<span class="intel-num">' + (i + 1) + "</span>" +
              '<span class="intel-title">' + escapeHtml(title) + "</span>" +
              '<span class="intel-topic">' + escapeHtml(topic) + "</span>" +
            "</a>" +
          "</li>"
        );
      }).join("") +
      "</ol>";
  }


  function storyTimeIso(item) {
    if (!item) return "";
    var keys = [
      "published_at", "created_at", "first_seen", "first_seen_at",
      "seen_at", "timestamp", "posted_at", "date"
    ];
    for (var i = 0; i < keys.length; i++) {
      var v = item[keys[i]];
      if (v == null || v === "") continue;
      if (typeof v === "number") {
        try {
          var d = new Date(v > 1e12 ? v : v * 1000);
          if (!isNaN(d.getTime())) return d.toISOString();
        } catch (e) {}
        continue;
      }
      if (Date.parse(v)) return v;
    }
    return resolveTimeIso(null);
  }

  function localDayKey(iso) {
    var d = new Date(Date.parse(iso) || Date.now());
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1);
    if (m.length < 2) m = "0" + m;
    var day = String(d.getDate());
    if (day.length < 2) day = "0" + day;
    return y + "-" + m + "-" + day;
  }

  function startOfLocalDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function daySectionLabel(dayKey) {
    var parts = String(dayKey || "").split("-");
    if (parts.length !== 3) return "Earlier";
    var dayDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (isNaN(dayDate.getTime())) return "Earlier";
    var today = startOfLocalDay(new Date());
    var yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    var sod = startOfLocalDay(dayDate);
    if (sod.getTime() === today.getTime()) return "Today";
    if (sod.getTime() === yesterday.getTime()) return "Yesterday";
    var ageDays = Math.round((today.getTime() - sod.getTime()) / 86400000);
    try {
      if (ageDays >= 0 && ageDays < 7) {
        return dayDate.toLocaleDateString(undefined, { weekday: "long" });
      }
      return dayDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch (e) {
      return dayKey;
    }
  }

  function groupStoriesByDay(stories) {
    var map = {};
    var order = [];
    for (var i = 0; i < stories.length; i++) {
      var s = stories[i];
      var key = localDayKey(storyTimeIso(s));
      if (!map[key]) {
        map[key] = [];
        order.push(key);
      }
      map[key].push(s);
    }
    order.sort(function (a, b) { return a < b ? 1 : a > b ? -1 : 0; });
    return order.map(function (key) {
      var items = map[key].slice().sort(function (a, b) {
        var ra = rankScore(a);
        var rb = rankScore(b);
        if (rb !== ra) return rb - ra;
        return Date.parse(storyTimeIso(b) || 0) - Date.parse(storyTimeIso(a) || 0);
      });
      return { key: key, label: daySectionLabel(key), items: items };
    });
  }

  function renderTodayFeed() {
    var list = $("#feed");
    if (!list || !state.data) return;
    renderRightRail();
    renderIntelStrip();
    var stories = (state.data.stories || []).filter(function (s) {
      if (!isTodayFeedKind(s)) return false;
      if (isRetweetNoise(s)) return false;
      return storyMatches(s);
    });
    if (!stories.length) {
      if (getParam("view") === "saved") {
        list.innerHTML =
          '<li class="empty empty-premium">' +
            '<p class="empty-premium-title">Nothing saved yet</p>' +
            '<p class="empty-premium-copy">Save stories from Today or Signals to build a shortlist worth revisiting — your private desk list.</p>' +
          "</li>";
      } else {
        list.innerHTML = '<li class="empty">No stories match this filter.</li>';
      }
      renderTodayDeskModules();
      return;
    }

    var isSaved = getParam("view") === "saved";
    var showLead = !isSaved && state.filter === "all" && !state.query;
    var html = "";
    var rankCounter = 0;
    var storyCount = 0;
    var bannerDone = false;

    function takeBanner() {
      storyCount += 1;
      if (bannerDone || isSaved || isCompactDensity()) return "";
      if (storyCount !== 5) return "";
      bannerDone = true;
      return newsletterBannerHtml();
    }

    function pickLeadInGroup(items) {
      if (!showLead || !items || !items.length) return items;
      var bestIdx = -1;
      var best = -1e9;
      for (var bi = 0; bi < Math.min(items.length, 40); bi++) {
        var cand = items[bi];
        if (!isAiRelevant(cand)) continue;
        if (/scoble\s*:-?\)|scoble smile/i.test(String(cand.headline || cand.title || ""))) continue;
        var rs = relevanceScore(cand);
        if (rs < 12) continue;
        var score = rankScore(cand) + rs * 2;
        if (/^RT\s+@/i.test(String(cand.headline || ""))) score -= 180;
        if (isEventItem(cand)) score -= 420;
        var candMedia = storyMediaUrl(cand);
        if (candMedia && !isAvatarMedia(candMedia)) score += 90;
        var sec = String(cand.section || cand.tag || "").toLowerCase();
        if (sec === "ten-things" || sec === "videos") score += 140;
        if (score > best) { best = score; bestIdx = bi; }
      }
      if (bestIdx < 0) return items;
      var next = items.slice();
      var lead = next.splice(bestIdx, 1)[0];
      next.unshift(lead);
      return next;
    }

    function renderStoryItem(s, i, allowLead) {
      var compact = isCompactDensity();
      var isRead = state.read.indexOf(s.id) !== -1;
      var sectionPretty = s.topic_label || prettyChipLabel(s.section_key, s.section_label || s.section || "");
      var metaLine = storyMetaLine(s);
      var href = "story.html?id=" + encodeURIComponent(s.id);
      var key = s.topic_key || s.section_key || mapSectionKey(s.section || s.tag || "");
      var headline = editorialTitle(s, 92);

      // Compact = dense headline+meta list — no lead hero / why box / excerpts / thumbs.
      if (!compact && allowLead && showLead && i === 0) {
        var leadHeadline = editorialTitle(s, 88);
        var dek = uniqueDek(s, leadHeadline, 140);
        var hero = leadHeroHtml(s, key, sectionPretty);
        rankCounter = 1;
        return (
          '<li class="lead-card lead-card-opener lead-card-photo' + (isRead ? " is-read" : "") + '" style="--i:0" data-href="' + href + '" role="link" tabindex="0">' +
            hero +
            '<div class="lead-copy">' +
              '<p class="lead-eyebrow">' + escapeHtml(sectionPretty || "Today") + "</p>" +
              '<h2 class="lead-title"><a href="' + href + '">' + escapeHtml(leadHeadline) + "</a></h2>" +
              (dek ? '<p class="lead-dek">' + escapeHtml(dek) + "</p>" : "") +
              '<div class="lead-meta">' +
                avatarStackHtml(s) +
                '<span class="meta-line">' + escapeHtml(metaLine) + "</span>" +
              "</div>" +
            "</div>" +
          "</li>"
        );
      }

      rankCounter += 1;
      var rank = rankCounter;
      var excerpt = compact ? "" : uniqueDek(s, headline, 140);
      return (
        '<li class="feed-row' + (isRead ? " is-read" : "") + '" style="--i:' + Math.min(rank, 12) + '" data-href="' + href + '" role="link" tabindex="0">' +
          '<div class="rank">' + rank + "</div>" +
          '<div class="feed-body">' +
            '<h2 class="story-title"><a href="' + href + '">' + escapeHtml(headline) + "</a></h2>" +
            (excerpt ? '<p class="excerpt">' + escapeHtml(excerpt) + "</p>" : "") +
            '<div class="meta">' +
              avatarStackHtml(s) +
              '<span class="meta-line">' + escapeHtml(metaLine) + "</span>" +
            "</div>" +
          "</div>" +
          (compact ? "" : rowThumbHtml(s, key, sectionPretty)) +
        "</li>"
      );
    }

    if (isSaved) {
      // Saved: flat ranked list, no day sections
      stories = stories.slice().sort(function (a, b) {
        var ra = rankScore(a);
        var rb = rankScore(b);
        if (rb !== ra) return rb - ra;
        return Date.parse(storyTimeIso(b) || 0) - Date.parse(storyTimeIso(a) || 0);
      });
      stories.forEach(function (s, i) {
        html += renderStoryItem(s, i, false);
        storyCount += 1;
      });
    } else {
      var groups = groupStoriesByDay(stories);
      groups.forEach(function (group, gi) {
        var items = group.items;
        // Comfortable: first story in the whole feed is the magazine opener,
        // even when that group is Yesterday (no stories dated today).
        var allowLead = gi === 0;
        if (allowLead) {
          items = pickLeadInGroup(items);
        }
        html +=
          '<li class="feed-day-head" role="presentation">' +
            '<h2 class="feed-day-label">' + escapeHtml(group.label) + "</h2>" +
          "</li>";
        items.forEach(function (s, i) {
          html += renderStoryItem(s, i, allowLead);
          html += takeBanner();
        });
      });
    }

    list.innerHTML = html;
    enableCardNavigation(list);
    renderTodayDeskModules();
  }

  function renderTodayDeskModules() {
    var sigHost = document.getElementById("todaySignalsList");
    var repHost = document.getElementById("todayReportsList");
    var sigMod = document.getElementById("todaySignalsMod");
    var repMod = document.getElementById("todayReportsMod");
    if (!sigHost && !repHost) return;
    var isSaved = getParam("view") === "saved";
    if (isSaved) {
      if (sigMod) sigMod.hidden = true;
      if (repMod) repMod.hidden = true;
      return;
    }
    if (sigMod) sigMod.hidden = false;
    if (repMod) repMod.hidden = false;

    if (sigHost) {
      var signals = ((state.data && state.data.signals) || []).slice();
      if (!signals.length) {
        sigHost.innerHTML = '<li class="desk-mod-empty">No signals yet.</li>';
      } else {
        sigHost.innerHTML = signals.map(function (s) {
          var title = editorialTitle(s, 96);
          var body = displayText(s.text || s.analysis || "").trim();
          if (body && body.toLowerCase() === title.toLowerCase()) body = "";
          if (body) body = firstSentence(body, 140);
          var provenance = displayText(s.source_list || "").trim();
          var href = "story.html?id=" + encodeURIComponent("sigstory-" + s.id);
          return (
            '<li class="desk-mod-item">' +
              '<a href="' + href + '">' +
                '<p class="desk-mod-title">' + escapeHtml(title) + "</p>" +
                (body ? '<p class="desk-mod-text">' + escapeHtml(body) + "</p>" : "") +
                (provenance ? '<p class="desk-mod-meta">' + escapeHtml(provenance) + "</p>" : "") +
              "</a>" +
            "</li>"
          );
        }).join("");
      }
    }

    if (repHost) {
      var reports = ((state.data && state.data.reports) || []).slice();
      if (!reports.length) {
        repHost.innerHTML = '<li class="desk-mod-empty">No reports yet.</li>';
      } else {
        repHost.innerHTML = reports.map(function (r) {
          var title = displayText(r.title || "").trim();
          var date = fmtDateShort(r.published_at) || fallbackTime(r.published_at);
          var href = r.url || "reports.html";
          return (
            '<li class="desk-mod-item">' +
              '<a href="' + escapeHtml(href) + '">' +
                '<p class="desk-mod-title">' + escapeHtml(title) + "</p>" +
                (date ? '<p class="desk-mod-meta">' + escapeHtml(date) + "</p>" : "") +
              "</a>" +
            "</li>"
          );
        }).join("");
      }
    }
  }

  function renderSignals() {
    var list = $("#feed");
    if (!list || !state.data) return;
    renderRightRail();
    var items = (state.data.signals || []).filter(function (s) {
      if (isRetweetNoise(s)) return false;
      if (state.filter && state.filter !== "all" && (s.topic_key || s.section_key || "") !== state.filter) return false;
      if (state.query) {
        var q = state.query.toLowerCase();
        var hay = [s.title, s.text, s.category, s.badge, s.source_list, s.analysis].join(" ").toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    }).slice().sort(function (a, b) {
      return rankScore(b) - rankScore(a);
    });
    if (!items.length) {
      list.innerHTML = '<li class="empty">No signals match.</li>';
      return;
    }
    var compact = isCompactDensity();
    list.innerHTML = items.map(function (s, i) {
      var title = editorialTitle(s, 100);
      var excerpt = "";
      if (!compact) {
        excerpt = signalExcerpt(s);
        if (excerpt) excerpt = firstSentence(excerpt, 180);
        if (!excerpt) {
          var a = displayText(s.analysis || "").trim();
          if (a && a.toLowerCase() !== title.toLowerCase()) excerpt = firstSentence(a, 180);
        }
      }
      var metaLine = joinMeta([
        s.topic_label || prettyChipLabel(s.section_key, s.section_label || s.category || ""),
        fallbackTime(s.created_at),
        (s.engagement_score != null ? s.engagement_score + "% conf." : "")
      ]);
      return (
        '<li class="feed-row" ' + staggerStyle(i) + ' data-href="story.html?id=' + encodeURIComponent("sigstory-" + s.id) + '" role="link" tabindex="0">' +
          '<div class="rank">' + (i + 1) + "</div>" +
          '<div class="feed-body">' +
            '<h2 class="story-title"><a href="story.html?id=' + encodeURIComponent("sigstory-" + s.id) + '">' +
              escapeHtml(title) + "</a></h2>" +
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
    enableCardNavigation(list);

  }

  var NEWSLETTER_ISSUES = [
    { title: "AI Is Making Timing More Valuable Than Intelligence", date: "", blurb: "Why being early — and decisive — now compounds faster than raw IQ in the AI economy." },
    { title: "The AI Experience Gap", date: "Aug 04, 2026", blurb: "Why human experience may become our greatest competitive advantage." },
    { title: "AI Is Quietly Creating a New Digital Economy", date: "", blurb: "Agents, marketplaces, and new rails forming under the hype cycle." },
    { title: "The AI Economy Is Running Out of Cheap Compute", date: "", blurb: "Power, chips, and capital constraints reshaping who can train and ship." },
    { title: "The Rise of AI Reputation Management", date: "", blurb: "Brands and founders learn to manage what models say about them." },
    { title: "AI Workers Enter the Real Economy", date: "", blurb: "From copilots to payroll — synthetic labor meets real workflows." },
    { title: "The New Uncanny Valley", date: "Jul 07, 2026", blurb: "When AI outputs feel almost human — and why that almost matters." },
    { title: "The AI Productivity Boom Is Becoming an AI Training Problem", date: "", blurb: "Gains at the desk collide with the data and eval debt behind them." },
    { title: "The Humanoid Robot Safety Race", date: "", blurb: "Hardware startups race on trust as much as torque." },
    { title: "The Public Trust Problem in AI", date: "", blurb: "Adoption stalls where institutions and users stop believing the pitch." },
    { title: "The New AI Investment Race", date: "", blurb: "Capital piles into infrastructure, applications, and the picks-and-shovels in between." },
    { title: "Why Governments Want a Stake in AI Companies", date: "Jun 09, 2026", blurb: "Industrial policy meets frontier models — equity, access, and control." },
    { title: "The AI IPO Race", date: "", blurb: "Public markets prepare for the next wave of AI listings." },
    { title: "AI Regulation Becomes a Moral Issue", date: "", blurb: "Rules shift from compliance checklists to questions of harm and agency." }
  ];

  function renderNewsletter() {
    var list = $("#newsletterArchive");
    if (!list) return;
    var items = NEWSLETTER_ISSUES.slice();
    if (state.query) {
      var q = state.query.toLowerCase();
      items = items.filter(function (issue) {
        return [issue.title, issue.blurb, issue.date, "unaligned"].join(" ").toLowerCase().indexOf(q) !== -1;
      });
    }
    var metaEl = $("#pageMeta");
    if (metaEl) {
      metaEl.textContent = items.length + " archive issue" + (items.length === 1 ? "" : "s") + " · Unaligned × Aligned";
    }
    if (!items.length) {
      list.innerHTML = '<li class="empty">No matching issues.</li>';
      return;
    }
    list.innerHTML = items.map(function (issue, i) {
      var featured = i === 0 && !state.query;
      var href = "https://unaligned.io";
      var metaBits = ["Unaligned"];
      if (issue.date) metaBits.push(issue.date);
      metaBits.push("Archive");
      var metaLine = metaBits.join(" · ");
      if (featured) {
        return (
          '<li class="nl-issue nl-issue-featured" ' + staggerStyle(i) + '>' +
            '<div class="nl-issue-badge">Featured</div>' +
            '<a class="nl-issue-link" href="' + href + '" target="_blank" rel="noopener noreferrer">' +
              '<h2 class="nl-issue-title">' + escapeHtml(issue.title) + "</h2>" +
              (issue.blurb ? '<p class="nl-issue-blurb">' + escapeHtml(issue.blurb) + "</p>" : "") +
              '<div class="meta"><span class="meta-line">' + escapeHtml(metaLine) + "</span></div>" +
            "</a>" +
          "</li>"
        );
      }
      return (
        '<li class="nl-issue" ' + staggerStyle(i) + '>' +
          '<a class="nl-issue-link" href="' + href + '" target="_blank" rel="noopener noreferrer">' +
            '<h2 class="nl-issue-title">' + escapeHtml(issue.title) + "</h2>" +
            (issue.blurb ? '<p class="nl-issue-blurb">' + escapeHtml(issue.blurb) + "</p>" : "") +
            '<div class="meta"><span class="meta-line">' + escapeHtml(metaLine) + "</span></div>" +
          "</a>" +
        "</li>"
      );
    }).join("");
    list.classList.add("is-ready");
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
    list.innerHTML = items.map(function (r, i) {
      return (
        '<li class="report-item" ' + staggerStyle(i) + '>' +
          "<h2>" + escapeHtml(displayText(r.title)) + "</h2>" +
          (r.summary ? "<p>" + escapeHtml(firstSentence(r.summary, 200)) + "</p>" : "") +
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
          body: displayText(sig.analysis || sig.text || ""),
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

    var storyMedia = storyMediaUrl(story);
    var showHero = !!storyMedia;
    var title = editorialTitle(story, 110);
    var dek = firstSentence(story.summary || "", 220);
    if (dek && dek.toLowerCase() === title.toLowerCase()) dek = "";
    var why = whyItMatters(story);
    // Prefer desk take / unique body paras only
    var uniqueBody = paragraphs.filter(function (p) {
      var t = p.trim().toLowerCase();
      return t && t !== title.toLowerCase() && (!dek || t !== dek.toLowerCase()) && t !== why.toLowerCase();
    });
    var originalPost = "";
    if (uniqueBody.length) {
      originalPost = uniqueBody.join("\n\n");
    } else if (story.body || story.summary) {
      originalPost = displayText(story.body || story.summary);
      if (originalPost.toLowerCase().indexOf(title.toLowerCase()) === 0) {
        originalPost = originalPost.slice(title.length).replace(/^[\s.:\-—–]+/, "");
      }
    }
    if (!originalPost) {
      originalPost = "Original post from " + (story.author_name || story.source_list || "Scoble lists") + ".";
    }
    var related = (state.data.stories || []).filter(function (x) {
      return x.id !== story.id && (x.topic_key || topicKeyFor(x)) === (story.topic_key || topicKeyFor(story));
    }).slice(0, 3);
    var relatedHtml = related.length ? (
      '<div class="related"><h2>Related on the desk</h2><ul>' +
      related.map(function (r) {
        return '<li><a href="story.html?id=' + encodeURIComponent(r.id) + '">' + escapeHtml(editorialTitle(r, 80)) + "</a></li>";
      }).join("") + "</ul></div>"
    ) : "";
    var dekFinal = dek || uniqueDek(story, title, 200);
    root.innerHTML =
      '<a class="back-link" href="index.html">← Back to Today</a>' +
      '<div class="article-kicker">' +
        (story.signal_badge ? '<span class="' + badgeClass(story.signal_badge) + '">' + escapeHtml(String(story.signal_badge).toUpperCase()) + "</span>" : "") +
        (story.topic_label ? '<span class="badge badge-signal">' + escapeHtml(story.topic_label) + "</span>" : "") +
        whyRankedHtml(story) +
        '<span class="meta-line">' + escapeHtml(joinMeta([
          storyMetaLine(story),
          fallbackTimeLong(story.published_at),
          (!story.signal_badge && story.author_name) ? decodeEntities(story.author_name) : ""
        ])) + "</span>" +
      "</div>" +
      "<h1>" + escapeHtml(title) + "</h1>" +
      (dekFinal ? '<p class="article-dek">' + escapeHtml(dekFinal) + "</p>" : "") +
      '<div class="article-why"><span class="lead-why-label">Why it matters</span><p>' + escapeHtml(why) + "</p></div>" +
      (showHero
        ? '<div class="article-hero"><img src="' + escapeHtml(String(storyMedia)) + '" alt="" loading="lazy" onerror="this.parentNode.style.display=\'none\'" /></div>'
        : "") +
      '<div class="article-actions">' +
        '<button type="button" class="btn" id="saveBtn">' + (saved ? "Saved" : "Save for later") + "</button>" +
        '<button type="button" class="btn" id="readBtn">Mark unread</button>' +
        (story.source_url ? '<a class="btn btn-primary" href="' + escapeHtml(story.source_url) + '" target="_blank" rel="noopener">Open source</a>' : "") +
      "</div>" +
      '<div class="article-body">' +
        '<h2 class="article-section-label">Original post</h2>' +
        originalPost.split(/\n\n+/).map(function (p) {
          return "<p>" + linkifyHtml(escapeHtml(p.trim())) + "</p>";
        }).join("") +
      "</div>" +
      relatedHtml +
      (sources.length
        ? '<div class="sources"><h2>Sources</h2><ul>' +
          sources.map(function (src) {
            return "<li><a href=\"" + escapeHtml(src.url) + "\" target=\"_blank\" rel=\"noopener\">" +
              escapeHtml(decodeEntities(src.name || src.url)) + "</a></li>";
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


  var GOD_MODE_BOOT_SRC = "god-mode/boot.js?v=an91";
  var godModeBootPromise = null;

  function ensureGodModeWidget() {
    var actions = document.querySelector(".top-actions");
    if (!actions) return null;
    var el = document.getElementById("godModeWidget");
    if (!el) {
      el = document.createElement("button");
      el.type = "button";
      el.className = "gm-widget";
      el.id = "godModeWidget";
      el.setAttribute("aria-label", "Open God Mode");
      el.title = "God Mode";
      el.innerHTML =
        '<span class="gm-widget-atm" aria-hidden="true"></span>' +
        '<canvas class="gm-widget-globe" width="72" height="72" aria-hidden="true"></canvas>' +
        '<span class="gm-widget-pulse" aria-hidden="true"></span>';
      var theme = document.getElementById("themeToggle");
      var focus = document.getElementById("chromeToggle");
      if (theme) actions.insertBefore(el, theme);
      else if (focus) actions.insertBefore(el, focus.nextSibling);
      else actions.appendChild(el);
    }
    return el;
  }

  function ensureGodModeOverlay() {
    var overlay = document.getElementById("godModeOverlay");
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = "godModeOverlay";
    overlay.className = "gm-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Aligned News God Mode");
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="gm-overlay-boot" id="godModeBoot">' +
        '<div class="gm-overlay-boot-copy">' +
          '<span class="gm-overlay-title">Aligned News / God Mode</span>' +
          '<span class="gm-overlay-sub" id="godModeBootSub">Starting live globe…</span>' +
        "</div>" +
        '<button type="button" class="gm-overlay-close" id="godModeClose" aria-label="Close God Mode">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
        "</button>" +
      "</div>" +
      '<div class="gm-overlay-mount" id="godModeMount"></div>' +
      '<div class="gm-overlay-error" id="godModeError" hidden></div>';
    document.body.appendChild(overlay);
    return overlay;
  }

  function startMiniGlobe(canvas) {
    if (!canvas || canvas.dataset.gmBound === "1") return;
    canvas.dataset.gmBound = "1";
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var reduce = false;
    try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
    var rot = 1.15;
    var t0 = 0;
    var running = true;
    var visible = true;
    var lands = [
      [42, -98, 0.42, 0.24],
      [58, -110, 0.28, 0.14],
      [15, -88, 0.12, 0.16],
      [-8, -58, 0.22, 0.38],
      [8, 18, 0.28, 0.38],
      [48, 10, 0.18, 0.14],
      [58, 40, 0.28, 0.14],
      [32, 88, 0.42, 0.22],
      [62, 100, 0.36, 0.16],
      [0, 114, 0.18, 0.12],
      [-22, 134, 0.18, 0.14],
      [-42, 172, 0.1, 0.12]
    ];
    var sats = [
      { inc: 0.55, speed: 0.62, phase: 0.2, r: 1.18 },
      { inc: -0.35, speed: -0.48, phase: 1.4, r: 1.26 },
      { inc: 0.18, speed: 0.9, phase: 2.1, r: 1.12 }
    ];

    function project(lat, lon, radius) {
      var la = lat * Math.PI / 180;
      var lo = lon * Math.PI / 180 + rot;
      var x = Math.cos(la) * Math.sin(lo);
      var y = Math.sin(la);
      var z = Math.cos(la) * Math.cos(lo);
      return { x: x * radius, y: -y * radius, z: z };
    }

    function draw(ts) {
      if (!running) return;
      if (!t0) t0 = ts;
      var dt = Math.min(48, (ts - t0) || 16);
      t0 = ts;
      if (!reduce && visible) rot += dt * 0.00022;
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      var css = canvas.clientWidth || 32;
      var size = Math.round(css * dpr);
      if (canvas.width !== size || canvas.height !== size) {
        canvas.width = size;
        canvas.height = size;
      }
      var w = canvas.width;
      var cx = w / 2;
      var r = w * 0.46;
      ctx.clearRect(0, 0, w, w);

      ctx.beginPath();
      ctx.arc(cx, cx, r, 0, Math.PI * 2);
      var ocean = ctx.createRadialGradient(cx - r * 0.35, cx - r * 0.4, r * 0.1, cx, cx, r);
      ocean.addColorStop(0, "#4aa3e8");
      ocean.addColorStop(0.45, "#1b6cb3");
      ocean.addColorStop(1, "#082445");
      ctx.fillStyle = ocean;
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cx, r, 0, Math.PI * 2);
      ctx.clip();

      var i, land, p, prx, pry;
      ctx.fillStyle = "rgba(164, 214, 122, 0.92)";
      for (i = 0; i < lands.length; i++) {
        land = lands[i];
        p = project(land[0], land[1], r);
        if (p.z <= 0.08) continue;
        prx = r * land[2] * (0.45 + p.z * 0.55);
        pry = r * land[3];
        ctx.beginPath();
        ctx.ellipse(cx + p.x, cx + p.y, prx, pry, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = "rgba(226, 246, 255, 0.16)";
      ctx.lineWidth = Math.max(0.6, w / 90);
      var mer, par, a, prev, pt;
      for (mer = -180; mer < 180; mer += 30) {
        prev = null;
        ctx.beginPath();
        for (a = -88; a <= 88; a += 6) {
          pt = project(a, mer, r);
          if (pt.z <= 0) { prev = null; continue; }
          if (!prev) ctx.moveTo(cx + pt.x, cx + pt.y);
          else ctx.lineTo(cx + pt.x, cx + pt.y);
          prev = pt;
        }
        ctx.stroke();
      }
      for (par = -60; par <= 60; par += 30) {
        prev = null;
        ctx.beginPath();
        for (a = -180; a <= 180; a += 8) {
          pt = project(par, a, r);
          if (pt.z <= 0) { prev = null; continue; }
          if (!prev) ctx.moveTo(cx + pt.x, cx + pt.y);
          else ctx.lineTo(cx + pt.x, cx + pt.y);
          prev = pt;
        }
        ctx.stroke();
      }

      var night = ctx.createLinearGradient(cx - r, cx, cx + r, cx);
      night.addColorStop(0, "rgba(2, 6, 18, 0.55)");
      night.addColorStop(0.42, "rgba(2, 6, 18, 0.08)");
      night.addColorStop(1, "rgba(2, 6, 18, 0)");
      ctx.fillStyle = night;
      ctx.fillRect(0, 0, w, w);

      var spec = ctx.createRadialGradient(cx - r * 0.32, cx - r * 0.38, 0, cx - r * 0.32, cx - r * 0.38, r * 0.7);
      spec.addColorStop(0, "rgba(255, 255, 255, 0.28)");
      spec.addColorStop(0.35, "rgba(186, 230, 253, 0.08)");
      spec.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = spec;
      ctx.beginPath();
      ctx.arc(cx, cx, r, 0, Math.PI * 2);
      ctx.fill();

      var s, ang, sx, sy, sz;
      for (i = 0; i < sats.length; i++) {
        s = sats[i];
        ang = rot * s.speed * 6 + s.phase;
        sx = Math.cos(ang) * s.r * r;
        sy = Math.sin(ang) * s.inc * r;
        sz = Math.sin(ang + 0.4);
        if (sz < -0.15) continue;
        ctx.beginPath();
        ctx.arc(cx + sx * 0.72, cx + sy, Math.max(1.1, w * 0.018), 0, Math.PI * 2);
        ctx.fillStyle = sz > 0.2 ? "#fde68a" : "rgba(253, 230, 138, 0.55)";
        ctx.fill();
      }
      ctx.restore();

      ctx.beginPath();
      ctx.arc(cx, cx, r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(186, 230, 253, 0.35)";
      ctx.lineWidth = Math.max(1, w / 70);
      ctx.stroke();

      if (!reduce && visible) requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);
    document.addEventListener("visibilitychange", function () {
      visible = !document.hidden && !document.documentElement.classList.contains("gm-overlay-open");
      if (visible) { t0 = 0; requestAnimationFrame(draw); }
    });
    if (typeof IntersectionObserver === "function") {
      var io = new IntersectionObserver(function (entries) {
        visible = !!(entries[0] && entries[0].isIntersecting) && !document.hidden &&
          !document.documentElement.classList.contains("gm-overlay-open");
        if (visible) { t0 = 0; requestAnimationFrame(draw); }
      });
      io.observe(canvas);
    }
    canvas._gmResume = function () {
      visible = true;
      t0 = 0;
      requestAnimationFrame(draw);
    };
  }

  function loadGodModeBoot() {
    if (window.AlignedNewsGodMode) return Promise.resolve(window.AlignedNewsGodMode);
    if (godModeBootPromise) return godModeBootPromise;
    godModeBootPromise = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = GOD_MODE_BOOT_SRC;
      s.async = true;
      s.onload = function () {
        if (window.AlignedNewsGodMode) resolve(window.AlignedNewsGodMode);
        else reject(new Error("God Mode boot missing"));
      };
      s.onerror = function () { reject(new Error("God Mode boot failed to load")); };
      document.head.appendChild(s);
    });
    return godModeBootPromise;
  }

  function closeGodModeOverlay() {
    var overlay = document.getElementById("godModeOverlay");
    var widget = document.getElementById("godModeWidget");
    if (overlay) {
      overlay.classList.remove("is-open", "is-blocked", "is-ready");
      overlay.hidden = true;
    }
    document.documentElement.classList.remove("gm-overlay-open");
    if (widget) widget.setAttribute("aria-expanded", "false");
    try { if (window.AlignedNewsGodMode) window.AlignedNewsGodMode.close(); } catch (e) {}
    var canvas = widget && widget.querySelector("canvas");
    if (canvas && canvas._gmResume) canvas._gmResume();
  }

  function openGodModeOverlay() {
    var overlay = ensureGodModeOverlay();
    var widget = document.getElementById("godModeWidget");
    var errEl = document.getElementById("godModeError");
    var bootSub = document.getElementById("godModeBootSub");
    overlay.hidden = false;
    overlay.classList.add("is-open");
    overlay.classList.remove("is-blocked", "is-ready");
    document.documentElement.classList.add("gm-overlay-open");
    if (widget) widget.setAttribute("aria-expanded", "true");
    if (errEl) { errEl.hidden = true; errEl.textContent = ""; }
    if (bootSub) bootSub.textContent = "Starting live globe…";
    loadGodModeBoot()
      .then(function (api) { return api.open({ onClose: closeGodModeOverlay }); })
      .then(function () { overlay.classList.add("is-ready"); })
      .catch(function (err) {
        overlay.classList.add("is-blocked");
        if (bootSub) bootSub.textContent = "God Mode failed to start";
        if (errEl) {
          errEl.hidden = false;
          errEl.textContent = String((err && err.message) || err || "God Mode failed");
        }
      });
  }

  function initGodModeChrome() {
    var widget = ensureGodModeWidget();
    if (!widget) return;
    widget.setAttribute("aria-expanded", "false");
    widget.setAttribute("aria-haspopup", "dialog");
    var canvas = widget.querySelector("canvas");
    if (canvas) startMiniGlobe(canvas);
    if (widget.dataset.gmBound === "1") return;
    widget.dataset.gmBound = "1";
    widget.addEventListener("click", function () {
      openGodModeOverlay();
    });
    var overlay = ensureGodModeOverlay();
    var closeBtn = document.getElementById("godModeClose");
    if (closeBtn) closeBtn.addEventListener("click", closeGodModeOverlay);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeGodModeOverlay();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && document.documentElement.classList.contains("gm-overlay-open")) {
        closeGodModeOverlay();
      }
    });
  }

  function bindShell() {

    // an57: floating capsule stays visible — no hide-on-scroll

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

    var densSeg = $("#densityToggle");
    if (densSeg) {
      densSeg.addEventListener("click", function (ev) {
        var t = ev.target;
        while (t && t !== densSeg && !(t.getAttribute && t.getAttribute("data-density-mode"))) {
          t = t.parentNode;
        }
        if (t && t !== densSeg && t.getAttribute) {
          setDensityMode(t.getAttribute("data-density-mode") || "comfortable");
          return;
        }
        // Legacy single-button toggle fallback
        if (densSeg.tagName === "BUTTON") {
          var next = document.documentElement.getAttribute("data-density") === "compact" ? "comfortable" : "compact";
          setDensityMode(next);
        }
      });
      syncDensitySeg();
    }
    ensureAuthCta();

    var chromeBtn = $("#chromeToggle");
    if (chromeBtn) {
      syncChromeToggle();
      chromeBtn.addEventListener("click", function () {
        // Toggle preference (not transient visual scroll state).
        setChromePreference(chromePref === "compact" ? "full" : "compact");
      });
    }

    bindChromeScrollListeners();
    syncTopbarSolid();

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
          if (pageName() === "newsletter") renderNewsletter();
        }, 120);
      });
    }

    initGodModeChrome();
    bindNewsletterSubscribe();
  }

  function setTitle(page) {
    var base = "Aligned News";
    if (page === "today") document.title = (getParam("view") === "saved" ? "Saved" : "Today") + " · " + base;
    else if (page === "signals") document.title = "Signals · " + base;
    else if (page === "reports") document.title = "Reports · " + base;
    else if (page === "newsletter") document.title = "Newsletter · " + base;
    else if (page === "story") document.title = "Story · " + base;
  }

  function boot() {
    applyPrefs();
    bindShell();
    setTitle(pageName());
    killEdgeGlowDom();
    var status = $("#loadStatus");
    if (status) {
      status.hidden = false;
      status.className = "status loading";
      status.setAttribute("aria-busy", "true");
      if (!status.querySelector(".feed-skeleton")) {
        status.innerHTML = '<div class="feed-skeleton" aria-hidden="true"><span></span><span></span><span></span></div>';
      }
    }

    showLoadBar();
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
        hideFeedSkeletonThen(function () {
          if (page === "today") {
            var h = $("#pageTitle");
            if (h) h.textContent = getParam("view") === "saved" ? "Saved" : "Today";
            renderForYou();
            renderTodayFeed();
          } else if (page === "signals") {
            renderSignals();
          } else if (page === "reports") {
            renderReports();
          } else if (page === "newsletter") {
            renderNewsletter();
          } else if (page === "story") {
            renderStory();
            if (state.data && findStory(getParam("id"))) {
              document.title = findStory(getParam("id")).headline + " · Aligned News";
            }
          }
        });
        if (status) {
          status.classList.remove("loading");
          status.classList.add("is-done");
          status.removeAttribute("aria-busy");
          status.innerHTML = "";
          status.remove();
        }
        document.documentElement.removeAttribute("data-loading");
        stopLoadWhisper();
        document.documentElement.setAttribute("data-revealed", "1");
        hideThinLoadBar();
      })
      .catch(function (err) {
        if (status) {
          status.hidden = false;
          status.className = "status error";
          status.textContent = "Could not load live-data.json. Open this folder via a local static server (file:// may block fetch).";
        }
        console.error(err);
        document.documentElement.removeAttribute("data-loading");
        stopLoadWhisper();
        hideFeedSkeletonThen(null);
        hideThinLoadBar();
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
