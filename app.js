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

  function diggMetaLine(item) {
    var parts = [];
    var n = sourceCount(item);
    parts.push(n + (n === 1 ? " source" : " sources"));
    var listPretty = prettyChipLabel("", item.source_list || item.section_label || "");
    if (listPretty && !/^(Models|Agents|Robotics|Funding|Companies|Research|Chips)$/i.test(listPretty)) {
      parts.push(listPretty);
    } else if (item.topic_label) {
      parts.push(item.topic_label);
    }
    parts.push("first seen " + (fallbackTime(item.published_at || item.created_at) || "recently"));
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
    var y = getScrollY();
    var dy = y - lastScrollY;
    var visualCompact = document.documentElement.getAttribute("data-chrome") === "compact";

    // Soft pin: auto-clear on clear downward motion.
    if (dy > 16) chromeScrollPinned = false;

    // Digg-like: any downward scroll past ~40px always collapses desk chrome.
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
  var clusterHideTimer = null;
  var clusterAnimTimer = null;
  var clusterShownAt = 0;
  var clusterPctValue = 8;
  var CLUSTER_TICK_COUNT = 32;
  var CLUSTER_MIN_MS = 750;

  function prefersReducedMotion() {
    try {
      return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {
      return false;
    }
  }

  function ensureClusterTicks() {
    var ticks = document.getElementById("clusterTicks");
    if (!ticks) return null;
    if (ticks.childElementCount !== CLUSTER_TICK_COUNT) {
      var html = "";
      var i;
      for (i = 0; i < CLUSTER_TICK_COUNT; i++) {
        html += '<span class="cluster-tick"></span>';
      }
      ticks.innerHTML = html;
    }
    return ticks;
  }

  function paintClusterPct(pct) {
    clusterPctValue = Math.max(0, Math.min(100, Math.round(pct)));
    var label = document.getElementById("clusterPct");
    if (label) label.textContent = clusterPctValue + "% COMPLETE.";
    var ticks = ensureClusterTicks();
    if (!ticks) return;
    var filled = Math.round((clusterPctValue / 100) * CLUSTER_TICK_COUNT);
    var nodes = ticks.children;
    var i;
    for (i = 0; i < nodes.length; i++) {
      if (i < filled) nodes[i].classList.add("is-filled");
      else nodes[i].classList.remove("is-filled");
    }
  }

  function stopClusterAnim() {
    if (clusterAnimTimer) {
      clearInterval(clusterAnimTimer);
      clusterAnimTimer = null;
    }
  }

  function startClusterAnim(fromPct, toPct, durationMs) {
    stopClusterAnim();
    var start = fromPct == null ? 8 : fromPct;
    var end = toPct == null ? 92 : toPct;
    var dur = prefersReducedMotion() ? 0 : (durationMs == null ? 2200 : durationMs);
    paintClusterPct(start);
    if (dur <= 0) {
      paintClusterPct(end);
      return;
    }
    var t0 = Date.now();
    clusterAnimTimer = setInterval(function () {
      var u = Math.min(1, (Date.now() - t0) / dur);
      // Ease-out toward end so it feels like Digg clustering.
      var eased = 1 - Math.pow(1 - u, 2.2);
      paintClusterPct(start + (end - start) * eased);
      if (u >= 1) stopClusterAnim();
    }, 50);
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

  function showClusterProgress() {
    var card = document.getElementById("clusterCard");
    if (clusterHideTimer) {
      clearTimeout(clusterHideTimer);
      clusterHideTimer = null;
    }
    if (loadBarHideTimer) {
      clearTimeout(loadBarHideTimer);
      loadBarHideTimer = null;
    }
    showThinLoadBar();
    if (!card) return;
    card.classList.remove("is-leaving");
    card.hidden = false;
    card.setAttribute("aria-hidden", "false");
    clusterShownAt = Date.now();
    ensureClusterTicks();
    startClusterAnim(8, 92, 2400);
  }

  function hideClusterProgress(forceImmediate) {
    var card = document.getElementById("clusterCard");
    if (clusterHideTimer) {
      clearTimeout(clusterHideTimer);
      clusterHideTimer = null;
    }
    if (loadBarHideTimer) {
      clearTimeout(loadBarHideTimer);
      loadBarHideTimer = null;
    }

    function finishHide() {
      stopClusterAnim();
      paintClusterPct(100);
      var pause = prefersReducedMotion() || forceImmediate ? 0 : 320;
      clusterHideTimer = setTimeout(function () {
        clusterHideTimer = null;
        hideThinLoadBar();
        if (!card) return;
        card.classList.add("is-leaving");
        var leaveMs = prefersReducedMotion() ? 0 : 260;
        setTimeout(function () {
          card.hidden = true;
          card.setAttribute("aria-hidden", "true");
          card.classList.remove("is-leaving");
          paintClusterPct(8);
        }, leaveMs);
      }, pause);
    }

    // Always show card briefly even when fetch is instant/cached.
    var elapsed = clusterShownAt ? (Date.now() - clusterShownAt) : CLUSTER_MIN_MS;
    var wait = forceImmediate ? 0 : Math.max(0, CLUSTER_MIN_MS - elapsed);
    if (wait > 0) {
      clusterHideTimer = setTimeout(function () {
        clusterHideTimer = null;
        finishHide();
      }, wait);
    } else {
      finishHide();
    }
  }

  function showLoadBar() {
    showClusterProgress();
  }

  function hideLoadBar() {
    hideClusterProgress(false);
  }

  function flashLoadBar(ms) {
    showClusterProgress();
    var dur = prefersReducedMotion() ? 0 : (ms == null ? 700 : Math.max(ms, CLUSTER_MIN_MS));
    if (dur <= 0) {
      hideClusterProgress(true);
      return;
    }
    // Fast chip-filter pulse: climb toward ~70% then complete.
    startClusterAnim(12, 78, Math.min(dur, 900));
    loadBarHideTimer = setTimeout(function () {
      loadBarHideTimer = null;
      hideClusterProgress(false);
    }, dur);
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
      { id: "today", href: "index.html", label: "Today", count: counts.stories },
      { id: "signals", href: "signals.html", label: "Signals", count: counts.signals },
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
            '<li><a class="nav-link' + (active ? " active" : "") + '" href="' + item.href + '">' +
            escapeHtml(item.label) +
            (item.count != null ? '<span class="count">' + item.count + "</span>" : "") +
            "</a></li>"
          );
        }).join("") +
        "</ul>" +
        '<div class="sidebar-foot">Asher · Pro<br>63 curated X lists</div>';
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

    var densBtn = $("#densityToggle");
    if (densBtn) {
      var compact = document.documentElement.getAttribute("data-density") === "compact";
      densBtn.setAttribute("aria-pressed", compact ? "true" : "false");
      densBtn.textContent = compact ? "Compact" : "Comfortable";
    }
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
        flashLoadBar(750);
        renderChips(containerId);
        if (pageName() === "today") renderTodayFeed();
        if (pageName() === "signals") renderSignals();
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

  function renderTodayFeed() {
    var list = $("#feed");
    if (!list || !state.data) return;
    renderRightRail();
    renderIntelStrip();
    var stories = (state.data.stories || []).filter(function (s) {
      if (!isTodayFeedKind(s)) return false;
      if (isRetweetNoise(s)) return false;
      return storyMatches(s);
    }).slice().sort(function (a, b) {
      var ra = rankScore(a);
      var rb = rankScore(b);
      if (rb !== ra) return rb - ra;
      return Date.parse(b.published_at || 0) - Date.parse(a.published_at || 0);
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
      return;
    }

    var showLead = getParam("view") !== "saved" && state.filter === "all" && !state.query;
    if (showLead && stories.length > 1) {
      var bestIdx = -1;
      var best = -1e9;
      for (var bi = 0; bi < Math.min(stories.length, 40); bi++) {
        var cand = stories[bi];
        if (!isAiRelevant(cand)) continue;
        var rs = relevanceScore(cand);
        if (rs < 12) continue;
        var score = rankScore(cand) + rs * 2;
        if (/^RT\s+@/i.test(String(cand.headline || ""))) score -= 180;
        if (score > best) { best = score; bestIdx = bi; }
      }
      if (bestIdx >= 0) {
        var lead = stories.splice(bestIdx, 1)[0];
        stories.unshift(lead);
      }
    }
    var html = "";

    stories.forEach(function (s, i) {
      var badge = s.signal_badge
        ? '<span class="' + badgeClass(s.signal_badge) + '">' + escapeHtml(String(s.signal_badge).toUpperCase()) + "</span>"
        : "";
      var isRead = state.read.indexOf(s.id) !== -1;
      var sectionPretty = s.topic_label || prettyChipLabel(s.section_key, s.section_label || s.section || "");
      var metaLine = diggMetaLine(s);
      var href = "story.html?id=" + encodeURIComponent(s.id);
      var key = s.topic_key || s.section_key || mapSectionKey(s.section || s.tag || "");
      var headline = editorialTitle(s, 92);

      if (showLead && i === 0) {
        var leadHeadline = editorialTitle(s, 72);
        var dek = uniqueDek(s, leadHeadline, 170);
        var why = whyItMatters(s);
        html +=
          '<li class="lead-card' + (isRead ? " is-read" : "") + '" style="--i:0">' +
            '<div class="lead-rank-row">' +
              '<div class="lead-eyebrow">Top Story</div>' +
              badge +
              (s.topic_label ? '<span class="badge badge-signal">' + escapeHtml(s.topic_label) + "</span>" : "") +
              whyRankedHtml(s) +
            "</div>" +
            '<h2 class="lead-title"><a href="' + href + '">' + escapeHtml(leadHeadline) + "</a></h2>" +
            (dek ? '<p class="lead-dek">' + escapeHtml(dek) + "</p>" : "") +
            '<div class="lead-why"><span class="lead-why-label">Why it matters</span><p>' + escapeHtml(why) + "</p></div>" +
            '<div class="lead-hero">' +
              '<img src="lead-hero.png" alt="" loading="eager" onerror="this.style.display=\'none\';this.parentNode.classList.add(\'lead-hero-fallback\')" />' +
            "</div>" +
            '<div class="lead-meta">' +
              avatarStackHtml(s) +
              '<span class="meta-line">' + escapeHtml(metaLine) + "</span>" +
            "</div>" +
          "</li>";
        return;
      }

      var rank = i + 1;
      var excerpt = uniqueDek(s, headline, 140);
      var callout = (i === 3 || i === 8) && s.signal_badge;
      html +=
        '<li class="feed-row' + (isRead ? " is-read" : "") + (callout ? " feed-row-callout" : "") + '" style="--i:' + Math.min(i, 12) + '">' +
          '<div class="rank">' + rank + "</div>" +
          '<div class="feed-body">' +
            '<h2 class="story-title"><a href="' + href + '">' + escapeHtml(headline) + "</a></h2>" +
            (excerpt ? '<p class="excerpt">' + escapeHtml(excerpt) + "</p>" : "") +
            '<div class="meta">' +
              avatarStackHtml(s) +
              badge +
              (s.topic_label ? '<span class="badge">' + escapeHtml(s.topic_label) + "</span>" : "") +
              whyRankedHtml(s) +
              '<span class="meta-line">' + escapeHtml(metaLine) + "</span>" +
            "</div>" +
          "</div>" +
          '<div class="row-thumb" aria-hidden="true">' +
            '<div class="row-thumb-tile" style="background:' + sectionThumbStyle(key) + '"></div>' +
            '<span class="row-thumb-label">' + escapeHtml(String(s.topic_label || sectionPretty).split(" ")[0] || "AI") + "</span>" +
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
    list.innerHTML = items.map(function (s, i) {
      var title = editorialTitle(s, 100);
      var excerpt = signalExcerpt(s);
      if (excerpt) excerpt = firstSentence(excerpt, 180);
      if (!excerpt) {
        var a = displayText(s.analysis || "").trim();
        if (a && a.toLowerCase() !== title.toLowerCase()) excerpt = firstSentence(a, 180);
      }
      var metaLine = joinMeta([
        s.topic_label || prettyChipLabel(s.section_key, s.section_label || s.category || ""),
        fallbackTime(s.created_at),
        (s.engagement_score != null ? s.engagement_score + "% conf." : "")
      ]);
      return (
        '<li class="feed-row" ' + staggerStyle(i) + '>' +
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

    var showHero = !!(story.kind === "story" || story.kind === "ai-item");
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
          diggMetaLine(story),
          fallbackTimeLong(story.published_at),
          (!story.signal_badge && story.author_name) ? decodeEntities(story.author_name) : ""
        ])) + "</span>" +
      "</div>" +
      "<h1>" + escapeHtml(title) + "</h1>" +
      (dekFinal ? '<p class="article-dek">' + escapeHtml(dekFinal) + "</p>" : "") +
      '<div class="article-why"><span class="lead-why-label">Why it matters</span><p>' + escapeHtml(why) + "</p></div>" +
      (showHero
        ? '<div class="article-hero"><img src="lead-hero.png" alt="" loading="lazy" onerror="this.parentNode.style.display=\'none\'" /></div>'
        : "") +
      '<div class="article-actions">' +
        '<button type="button" class="btn" id="saveBtn">' + (saved ? "Saved" : "Save for later") + "</button>" +
        '<button type="button" class="btn" id="readBtn">Mark unread</button>' +
        (story.source_url ? '<a class="btn btn-primary" href="' + escapeHtml(story.source_url) + '" target="_blank" rel="noopener">Open source</a>' : "") +
      "</div>" +
      '<div class="article-body">' +
        '<h2 class="article-section-label">Original post</h2>' +
        originalPost.split(/\n\n+/).map(function (p) {
          return "<p>" + escapeHtml(p.trim()) + "</p>";
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

    var chromeBtn = $("#chromeToggle");
    if (chromeBtn) {
      syncChromeToggle();
      chromeBtn.addEventListener("click", function () {
        // Toggle preference (not transient visual scroll state).
        setChromePreference(chromePref === "compact" ? "full" : "compact");
      });
    }

    bindChromeScrollListeners();

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
        if (status) {
          status.classList.remove("loading");
          status.classList.add("is-done");
          status.removeAttribute("aria-busy");
          status.innerHTML = "";
          status.remove();
        }
        hideLoadBar();
      })
      .catch(function (err) {
        if (status) {
          status.hidden = false;
          status.className = "status error";
          status.textContent = "Could not load live-data.json. Open this folder via a local static server (file:// may block fetch).";
        }
        console.error(err);
        hideLoadBar();
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
