(function () {
  "use strict";

  try {
    var standalone = (window.navigator && window.navigator.standalone === true) ||
      (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      (window.matchMedia && window.matchMedia("(display-mode: fullscreen)").matches);
    if (standalone) document.documentElement.classList.add("is-standalone");
  } catch (e) {}
  if (document.body && document.body.getAttribute("data-page") !== "auth" &&
      (window.innerWidth || 0) > 0 && (window.innerWidth || 0) <= 899) {
    document.documentElement.classList.add("has-mobile-dock");
  }


  function t(key, vars) {
    if (window.anT) return window.anT(key, vars);
    return key;
  }

  function txSrc(s) {
    return ' data-tx-src="' + escapeHtml(String(s == null ? "" : s)) + '"';
  }

  function afterContentPaint() {
    if (!window.anTranslatePage) return;
    requestAnimationFrame(function () { window.anTranslatePage(); });
  }

  var DATA_URL = "live-data.json?v=an200";
  var NEWSLETTER_DATA_URL = "newsletter-data.json?v=an130";
  var state = {
    data: null,
    newsletter: [],
    filter: "all",
    query: "",
    saved: loadSaved(),
    read: loadRead(),
  };



  function topicKeyFor(item) {
    if (item.topic_key && /^(models|agents|robotics|funding|companies|research|chips|open-source|policy|creative|jobs|events|videos|labs|breaking)$/.test(item.topic_key)) {
      return item.topic_key;
    }
    var hay = [
      item.headline, item.title, item.text, item.summary, item.body,
      item.section_label, item.section, item.category, item.source_list, item.tag
    ].join(" ").toLowerCase();
    var sec = String(item.section || item.tag || "").toLowerCase();
    if (sec.indexOf("event") !== -1 || /hackathon|dinner|conference/.test(sec)) return "events";
    if (sec === "jobs") return "jobs";
    if (sec === "videos") return "videos";
    if (sec === "openclaw") return "open-source";
    if (/open[- ]?source|open[- ]?weight/.test(hay)) return "open-source";
    if (/robot|humanoid|physical ai|openusd/.test(hay) || sec === "robotics") return "robotics";
    if (/fund|raised|\$|series [a-d]|acquisition|ipo|valuation|invest/.test(hay) || sec === "funding") return "funding";
    if (/regulat|polic|congress|eu ai|white house|antitrust/.test(hay) || sec === "policy") return "policy";
    if (/agentic|\bagents?\b|orchestrat|tool call/.test(hay) || sec === "agents") return "agents";
    if (/gpu|chip|semiconductor|tpu|hardware|inference chip/.test(hay) || sec === "chips") return "chips";
    if (/benchmark|paper|arxiv|research|eval|sota/.test(hay) || sec === "papers" || sec === "science") return "research";
    if (/video|image gen|creative|midjourney|sora|flux/.test(hay) || sec === "creatives") return "creative";
    if (/model|llm|gpt|claude|gemini|fireworks|muse|token|grok|\bxai\b|deepseek/.test(hay) || sec === "models") return "models";
    if (/nvidia/.test(hay)) return "chips";
    if (sec === "labs") return "labs";
    if (/compan|startup|industry/.test(hay)) return "companies";
    var sl = String(item.section_label || item.source_list || item.section || "").toLowerCase();
    if (sl.indexOf("compan") !== -1) return "companies";
    return "companies";
  }


  function itemHay(item) {
    return [
      item && item.headline, item && item.title, item && item.summary, item && item.body,
      item && item.text, item && item.section, item && item.tag, item && item.topic_key,
      item && item.section_key, item && item.category
    ].join(" ").toLowerCase();
  }

  function isEventItem(item) {
    var hay = [
      item && item.section, item && item.tag, item && item.topic_key,
      item && item.section_key, item && item.category
    ].join(" ").toLowerCase();
    return /event|hackathon|dinner|conference/.test(hay);
  }

  function isSideDeskItem(item) {
    var sec = String((item && (item.section || item.tag || item.topic_key)) || "").toLowerCase();
    return sec === "jobs" || sec === "videos" || sec.indexOf("jobs") === 0;
  }

  function isOpenSourceItem(item) {
    if (!item) return false;
    var sec = String(item.section || item.tag || item.topic_key || item.section_key || "").toLowerCase();
    if (sec === "openclaw" || sec === "open-source") return true;
    var hay = itemHay(item);
    return /open[- ]?source|open[- ]?weight|hugging\s*face|openclaw|\boss\b/.test(hay);
  }

  function isHardNewsItem(item) {
    var sec = String((item && (item.section || item.tag)) || "").toLowerCase();
    if (/^(breaking|models|labs|chips|papers|robotics|openclaw)$/.test(sec)) return true;
    var hay = itemHay(item);
    return /\b(release[sd]?|launches?|launched|announces?|unveils?|arxiv|paper|benchmark|sota|parameter|moe|open[- ]?weight|550-billion|deepseek|grok 4)\b/i.test(hay);
  }

  function isHotTakeItem(item) {
    var title = String((item && (item.headline || item.title)) || "").replace(/\s+/g, " ").trim();
    if (/^(it says a lot that|someone asked my thoughts|why\?\s*because they are the one)/i.test(title)) return true;
    var hay = itemHay(item);
    var sec = String((item && item.section) || "").toLowerCase();
    if (sec === "anomalies" && !isHardNewsItem(item)) return true;
    return /\b(hot take|i think|imo\b|seems like|hype cycle|vibes?|can't believe|wild that|this is fine)\b|\?{2,}|!{2,}/i.test(hay);
  }

  function storySectionKey(story) {
    var k = String((story && (story.section_key || story.section || story.topic_key)) || "").toLowerCase();
    if (k === "research") k = "papers";
    if (k === "creative") k = "creatives";
    if (k === "breaking") k = "world";
    return k;
  }

  var PILL_ORDER = ["models", "products", "papers", "robotics", "labs", "chips", "funding", "policy", "creatives", "world"];

  function storyMatchesChip(story, filter) {
    if (!filter || filter === "all") return true;
    return storySectionKey(story) === filter;
  }

  function deskChipsFromStories(stories) {
    var have = {};
    (stories || []).forEach(function (s) {
      var k = storySectionKey(s);
      if (PILL_ORDER.indexOf(k) >= 0) have[k] = true;
    });
    var chips = [{ id: "all", label: "All" }];
    PILL_ORDER.forEach(function (k) {
      chips.push({ id: k, label: labelFor(k, k) });
    });
    return chips;
  }

  function deskTakeFor(item) {
    var title = displayText(item.title || item.text || item.headline || "").replace(/\s+/g, " ").trim();
    var list = item.section_label || item.topic_label || "the desk";
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
    var when = fallbackTime(item.published_at || item.created_at) || t("recently");
    var handle = xHandleFrom(item);
    if (handle) return "@" + handle + " · " + when;
    var parts = [];
    var n = sourceCount(item);
    parts.push(n + " " + (n === 1 ? t("source_one") : t("sources")));
    parts.push(when);
    return parts.join(" · ");
  }

  function storyFeedMeta(item) {
    var when = fallbackTime(item.published_at || item.created_at) || t("recently");
    var bits = [];
    var n = 0;
    if (item.sources && item.sources.length) n = item.sources.length;
    else if (item.source_url) n = 1;
    if (n > 0) bits.push(n + " " + (n === 1 ? t("source_one") : t("sources")));
    bits.push(t("first_seen") + " " + when);
    var eng = item.engagement || {};
    var views = Number(eng.impression_count || eng.view_count || item.views || item.view_count || 0);
    var likes = Number(eng.like_count || item.likes || 0);
    var replies = Number(eng.reply_count || item.replies || 0);
    var reposts = Number(eng.retweet_count || item.reposts || 0);
    var shown = compactCount(views);
    if (shown) bits.push(shown + " " + t("views_n"));
    shown = compactCount(likes);
    if (shown) bits.push(shown + " " + t("likes_n"));
    shown = compactCount(replies);
    if (shown) bits.push(shown + " " + t("replies_n"));
    shown = compactCount(reposts);
    if (shown) bits.push(shown + " " + t("reposts_n"));
    return bits.join(" · ");
  }

  function viewerFollowsHandle(handle) {
    var h = String(handle || "").replace(/^@/, "").trim().toLowerCase();
    if (!h) return false;
    var pool = [];
    var user = state.data && state.data.user;
    if (user) {
      ["follows", "following", "x_follows"].forEach(function (k) {
        var v = user[k];
        if (Array.isArray(v)) pool = pool.concat(v);
      });
    }
    try {
      var stored = JSON.parse(localStorage.getItem("an-follows") || "[]");
      if (Array.isArray(stored)) pool = pool.concat(stored);
    } catch (e) {}
    for (var i = 0; i < pool.length; i++) {
      if (String(pool[i] || "").replace(/^@/, "").trim().toLowerCase() === h) return true;
    }
    return false;
  }

  function whyHereLine(item) {
    if (!item) return "";
    if (isEventItem(item) || isSideDeskItem(item)) return "";
    var cap = displayText(item.why_it_matters || "").trim();
    if (cap && !/^from scoble lists/i.test(cap)) return cap;
    var lists = displayText(item.source_list || "").trim();
    var who = item.x_handle ? ("@" + String(item.x_handle).replace(/^@/, "")) : "";
    if (lists && !/^from scoble lists/i.test(lists)) {
      return who ? (who + " · " + lists) : lists;
    }
    return who;
  }

  function whyHereHtml(item) {
    var line = whyHereLine(item);
    if (!line) return "";
    return '<p class="why-here"' + txSrc(line) + '>' + escapeHtml(line) + "</p>";
  }

  function whyRankedLabel(item) {
    var hay = [item.headline, item.summary, item.body, item.title, item.text].join(" ");
    var hits = 0;
    try { hits = (hay.match(new RegExp(AI_RE.source, "gi")) || []).length; } catch (e) { hits = 0; }
    if (item.signal_badge && String(item.signal_badge).toLowerCase() === "bullish") return t("rising");
    if (hits >= 3) return t("keyword_hit");
    if ((item.engagement && (item.engagement.retweet_count || 0) >= 10) || (item.engagement_score || 0) >= 60) return t("list_spike");
    return t("scoble_list");
  }

  function whyRankedHtml(item) {
    var label = whyRankedLabel(item);
    return '<span class="why-ranked" title="' + t("why_ranked") + '">' + escapeHtml(label) + "</span>";
  }

  function leadBrief(item, headline) {
    var body = displayText((item && (item.body || item.summary)) || "").replace(/\s+/g, " ").trim();
    if (!body) return uniqueDek(item, headline, 220);
    var parts = body.split(/(?<=[.!?])\s+/).filter(Boolean);
    var out = [];
    var n = 0;
    for (var i = 0; i < parts.length && out.length < 4; i++) {
      out.push(parts[i]);
      n += parts[i].length;
      if (n > 380) break;
    }
    var t = out.join(" ");
    return t.length > 520 ? softClamp(t, 500) : t;
  }

  function renderPullCard(s, i) {
    var href = "story.html?id=" + encodeURIComponent(s.id);
    var headline = editorialTitle(s, 72);
    var dek = uniqueDek(s, headline, 92);
    return (
      '<li class="top-pull" data-href="' + href + '" role="link" tabindex="0">' +
        '<h3 class="top-pull-title"><a href="' + href + '"' + txSrc(headline) + '>' + escapeHtml(headline) + "</a></h3>" +
        (dek ? '<p class="top-pull-dek"' + txSrc(dek) + '>' + escapeHtml(dek) + "</p>" : "") +
      "</li>"
    );
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
    if (s.indexOf("openclaw") !== -1 || s.indexOf("open-source") !== -1 || s.indexOf("open source") !== -1) return "open-source";
    if (s.indexOf("robot") !== -1) return "robotics";
    if (s.indexOf("fund") !== -1 || s.indexOf("deal") !== -1 || s.indexOf("acquisit") !== -1) return "funding";
    if (s.indexOf("polic") !== -1 || s.indexOf("regulat") !== -1) return "policy";
    if (s.indexOf("agent") !== -1) return "agents";
    if (s.indexOf("model") !== -1 || s.indexOf("benchmark") !== -1 || s.indexOf("big stuff") !== -1) return "models";
    if (s.indexOf("chip") !== -1 || s.indexOf("hardware") !== -1) return "chips";
    if (s.indexOf("job") !== -1) return "jobs";
    if (s.indexOf("hackathon") !== -1 || s.indexOf("dinner") !== -1 || s.indexOf("conference") !== -1 || s.indexOf("event") !== -1) return "events";
    if (s.indexOf("paper") !== -1) return "papers";
    if (s.indexOf("science") !== -1 || s.indexOf("research") !== -1) return "papers";
    if (s.indexOf("infra") !== -1 || s.indexOf("compute") !== -1) return "chips";
    if (s.indexOf("lab") !== -1) return "labs";
    if (s.indexOf("creative") !== -1) return "creative";
    if (s.indexOf("video") !== -1) return "videos";
    if (s.indexOf("compan") !== -1 || s.indexOf("industry") !== -1) return "companies";
    if (s.indexOf("scoble") !== -1) return "scoble";
    if (s.indexOf("breaking") !== -1) return "breaking";
    return s.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "general";
  }

  function labelFor(key, fallback) {
    var map = {
      models: "Models", agents: "Agents", robotics: "Robotics", funding: "Funding",
      policy: "Policy", chips: "Chips", "open-source": "Open source", events: "Events",
      research: "Papers", papers: "Papers", creative: "Creatives", creatives: "Creatives", compute: "Compute", industry: "Industry",
      scoble: "Scoble", labs: "Labs", jobs: "Jobs", companies: "Companies", industry: "Companies",
      breaking: "Breaking", videos: "Videos", world: "World"
    };
    var tkey = "topic_" + String(key || "").replace(/-/g, "_");
    var translated = t(tkey);
    if (translated && translated !== tkey) return translated;
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
      data.chips = deskChipsFromStories(data.stories);
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

    stories.forEach(function (s) {
      var tk = topicKeyFor(s);
      s.topic_key = tk;
      s.topic_label = labelFor(tk, s.section_label);
    });
    signals.forEach(function (s) {
      var tk = topicKeyFor(s);
      s.topic_key = tk;
      s.section_key = s.section_key || tk;
      s.topic_label = labelFor(tk, s.section_label);
      // Fill empty analysis with a short desk take so Signals feels real
      if (!s.analysis || !String(s.analysis).trim()) {
        s.analysis = deskTakeFor(s);
        s._analysis_placeholder = false;
      }
    });
    var chips = deskChipsFromStories(stories);
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
    if (window.AlignedSaved) return window.AlignedSaved.load();
    return [];
  }
  function persistSaved() {
    if (window.AlignedSaved) window.AlignedSaved.persist();
  }
  function isSavedId(id) {
    return !!(window.AlignedSaved && window.AlignedSaved.isSaved(id));
  }
  function savedSnapshot(id) {
    return window.AlignedSaved ? window.AlignedSaved.find(id) : null;
  }
  function toggleSavedStory(story) {
    if (!window.AlignedSaved) return false;
    var now = window.AlignedSaved.toggle(story);
    state.saved = window.AlignedSaved.all();
    return now;
  }
  function savedStoriesForFeed(live) {
    return window.AlignedSaved ? window.AlignedSaved.storiesForFeed(live) : [];
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
    syncThemeButtons();
    lastScrollY = getScrollY();
  }

  function isDarkTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark";
  }

  function themeOrbHtml() {
    var rays = "";
    for (var i = 0; i < 8; i++) {
      rays += '<span class="theme-ray" style="--i:' + i + '"></span>';
    }
    return (
      '<span class="theme-orb" aria-hidden="true">' +
        '<span class="theme-sun-core"></span>' +
        rays +
        '<span class="theme-moon-cut"></span>' +
      "</span>"
    );
  }

  function syncThemeButtons() {
    var dark = isDarkTheme();
    var label = dark ? t("switch_light") : t("switch_dark");
    var title = dark ? t("light_mode") : t("dark_mode");
    var btn = document.getElementById("themeToggleSide");
    if (btn) {
      btn.setAttribute("aria-label", label);
      btn.title = title;
      var text = btn.querySelector(".sidebar-theme-label");
      if (text) text.textContent = title;
    }
    var tile = document.querySelector('.dock-tile[data-act="theme"]');
    if (tile) {
      var tl = tile.querySelector(".dock-tile-label");
      if (tl) tl.textContent = title;
      tile.setAttribute("aria-label", label);
    }
  }

  function toggleTheme() {
    var root = document.documentElement;
    if (isDarkTheme()) {
      root.removeAttribute("data-theme");
      try { localStorage.setItem("an-theme", "light"); } catch (e) {}
    } else {
      root.setAttribute("data-theme", "dark");
      try { localStorage.setItem("an-theme", "dark"); } catch (e) {}
    }
    syncThemeButtons();
  }



  function syncChromeToggle() {
    // Button reflects preference (an-chrome), not transient scroll visual state.
    var prefCompact = chromePref === "compact";
    var visualCompact = document.documentElement.getAttribute("data-chrome") === "compact";
    var btn = $("#chromeToggle");
    if (btn) {
      btn.setAttribute("aria-pressed", prefCompact ? "true" : "false");
      // Pref full → "Focus" (action to collapse). Pref compact → "Desk" (action to restore).
      btn.textContent = prefCompact ? t("desk") : t("focus");
      btn.title = prefCompact ? t("show_desk") : t("hide_desk");
      btn.setAttribute("aria-label", prefCompact ? t("show_desk_aria") : t("focus_aria"));
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
      if (seg.tagName === "BUTTON") seg.textContent = compact ? t("compact") : t("comfortable");
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
      el.textContent = t("sign_up_login");
      actions.appendChild(el);
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
    var ts = Date.parse(iso);
    if (!ts) return "";
    var diff = Date.now() - ts;
    var mins = Math.round(diff / 60000);
    if (mins < 1) return t("just_now");
    if (mins < 60) return t("ago_m", { n: mins });
    var hrs = Math.round(mins / 60);
    if (hrs < 36) return t("ago_h", { n: hrs });
    var days = Math.round(hrs / 24);
    if (days < 14) return t("ago_d", { n: days });
    try {
      return new Date(ts).toLocaleDateString(window.anLoc ? window.anLoc() : undefined, { month: "short", day: "numeric" });
    } catch (e) { return ""; }
  }

  function fmtDateLong(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString(window.anLoc ? window.anLoc() : undefined, {
        weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
      });
    } catch (e) { return ""; }
  }

  function fmtDateShort(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString(window.anLoc ? window.anLoc() : undefined, { month: "short", day: "numeric", year: "numeric" });
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
      companies: "Companies", research: "Papers", papers: "Papers", chips: "Chips",
      "open-source": "Open source", policy: "Policy", creative: "Creative", all: "All",
      breaking: "Breaking", labs: "Labs", products: "Products", jobs: "Jobs", events: "Events", videos: "Videos", creatives: "Creatives", world: "World"
    };
    var tkey = "topic_" + String(id || "").replace(/-/g, "_");
    var translated = t(tkey);
    if (translated && translated !== tkey) return translated;
    if (id === "all" || label === "all") return t("all");
    if (known[id]) {
      var k2 = "topic_" + String(id).replace(/-/g, "_");
      var tr = t(k2);
      if (tr && tr !== k2) return tr;
      return known[id];
    }
    if (known[label]) return t("topic_" + String(label).replace(/-/g, "_")) !== ("topic_" + String(label).replace(/-/g, "_")) ? t("topic_" + String(label).replace(/-/g, "_")) : known[label];
    var raw = String(label || id || "");
    if (known[raw.toLowerCase()]) return known[raw.toLowerCase()];
    var m = raw.match(/AI\s+Companies/i);
    if (m) return t("topic_companies");
    m = raw.match(/AI\s+Community/i);
    if (m) return t("community");
    m = raw.match(/AI\s+Labs/i);
    if (m) return t("topic_labs");
    return raw.replace(/\s+#?\d+\s+of\s+\d+/i, "").replace(/\s+#\d+/i, "").trim() || raw;
  }

  function engagementScore(item) {
    var e = item && item.engagement;
    if (!e) return item && item.engagement_score != null ? Number(item.engagement_score) : 0;
    return 0;
  }

  var AI_RE = /\b(ai|llm|gpt|claude|gemini|openai|anthropic|nvidia|model|agent|robot|chip|gpu|ml|neural|transformer|cursor|fireworks|scoble|aligned|startup|funding|benchmark|inference|open[- ]?source|agi|sota|copilot|qwen|lindy|github)\b/i;

  
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
    // entertainment / sports / gamer junk — never under Tech
    if (/\b(Aegon|Game of Thrones|House of the Dragon|NFL|NBA|soccer|football|Taylor Swift|spoiler|Call of Duty|Fortnite|PlayStation|Xbox|esports|World Cup|Super Bowl)\b/i.test(t)) {
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
    return /\b(AI|A\.I\.|LLM|GPT|Claude|Grok|model|agent|robot|robotics|GPU|chip|semiconductor|OpenAI|Anthropic|NVIDIA|Google DeepMind|DeepMind|Meta Superintelligence|xAI|Mistral|funding|Series [ABC]|benchmark|SOTA|inference|transformer|diffusion|multimodal|MCP|Cursor|Copilot|Qwen|Lindy|GitHub)\b/i.test(t);
  }

  function relevanceScore(item) {
    var hay = [item.headline, item.summary, item.body, item.section_label, item.source_list, item.author_name, item.title, item.text]
      .join(" ");
    var score = 0;
    var m = hay.match(new RegExp(AI_RE.source, "gi"));
    if (m) score += Math.min(m.length, 8) * 12;
    if (/^RT\s+@/i.test(String(item.headline || item.title || ""))) score -= 25;
    if (/\b(game of thrones|aegon|season\s+\d+|nba|nfl|soccer|football|celebrity|actor|actress|tv show|fortnite|playstation)\b/i.test(hay)) score -= 400;
    if (isHardNewsItem(item)) score += 28;
    if (isHotTakeItem(item)) score -= 40;
    if (isEventItem(item) || isSideDeskItem(item)) score -= 80;
    if (item.signal_badge) score += 8;
    if (item._from_x_api) score += 2;
    return score;
  }

  function rankScore(item) {
    if (isRetweetNoise(item)) return -1e12;
    if (isEventItem(item)) return -1e6;
    var base = engagementScore(item) + relevanceScore(item) * 8;
    var sec = String((item && (item.section || item.tag)) || "").toLowerCase();
    var topic = String((item && item.topic_key) || "").toLowerCase();
    if (isSideDeskItem(item)) base -= 900;
    if (sec === "breaking") base += 320;
    if (sec === "models" || topic === "models") base += 200;
    if (sec === "labs") base += 180;
    if (sec === "chips" || topic === "chips") base += 180;
    if (sec === "papers" || topic === "research") base += 160;
    if (sec === "robotics" || topic === "robotics") base += 150;
    if (sec === "openclaw" || topic === "open-source") base += 140;
    if (isHardNewsItem(item)) base += 120;
    if (isHotTakeItem(item)) base -= 360;
    if (sec === "anomalies" && !isHardNewsItem(item)) base -= 220;
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
    return fmtRelative(resolveTimeIso(iso)) || t("recently");
  }

  function fallbackTimeLong(iso) {
    return fmtDateLong(resolveTimeIso(iso)) || t("recently");
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
      if (story.kind === "ai-item" || story.ai_section) paras.push(t("from_ai_briefing"));
      else if (story.signal_badge || story.kind === "signal-story") paras.push(t("from_signals_desk"));
      else paras.push(t("from_briefing"));
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

  function sponsorsFeedHtml() {
    return (
      '<li class="sponsors-in-feed">' +
        '<h2 class="rail-title">' + t("sponsors") + '</h2>' +
        '<a class="partners-brand" href="https://www.viture.com/" target="_blank" rel="noopener noreferrer">' +
          '<img class="partners-logo" src="viture-logo.png" alt="VITURE" />' +
        "</a>" +
        '<p class="partners-line">' + t("viture_line") + '</p>' +
        '<a class="partners-link" href="https://www.viture.com/" target="_blank" rel="noopener noreferrer">viture.com</a>' +
      "</li>"
    );
  }

  function newsletterBannerHtml() {
    var saved = nlEmailStored();
    var inBar = isValidEmail(saved);
    return (
      '<li class="nl-subscribe' + (inBar ? " is-in" : "") + '">' +
        '<div class="nl-subscribe-inner">' +
          '<div class="nl-subscribe-copy">' +
            '<p class="nl-subscribe-kicker">' + t("nl_kicker") + '</p>' +
            '<p class="nl-subscribe-headline">' + t("nl_headline") + '</p>' +
            '<p class="nl-subscribe-sub">' + t("nl_sub") + '</p>' +
          "</div>" +
          (inBar
            ? '<p class="nl-subscribe-done">' + t("youre_in") + '</p>'
            : '<form class="nl-subscribe-form" action="#" method="post" novalidate>' +
                '<input type="email" name="email" placeholder="' + t("email_ph") + '" autocomplete="email" aria-label="' + t("email") + '" />' +
                '<button type="submit">' + t("subscribe") + '</button>' +
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
      done.textContent = t("youre_in");
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
      '<h2 class="rail-title">' + t("sponsors") + '</h2>' +
      '<a class="partners-brand" href="https://www.viture.com/" target="_blank" rel="noopener noreferrer">' +
      '<img class="partners-logo" src="viture-logo.png" alt="VITURE" />' +
      '</a>' +
      '<p class="partners-line">' + t("viture_line") + '</p>' +
      '<a class="partners-link" href="https://www.viture.com/" target="_blank" rel="noopener noreferrer">viture.com</a>';
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
      var items = (state.data.signals || []).slice(0, 5);
      if (!items.length) {
        list.innerHTML = '<li class="empty" style="padding:0.5rem 0;text-align:left;opacity:1;animation:none">' + t("no_signals") + '</li>';
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
                '<h3 class="rail-item-title"><a href="' + href + '"' + txSrc(title) + '>' + escapeHtml(title) + "</a></h3>" +
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
    if (provenance && state.data.meta && !provenance.getAttribute("data-i18n")) {
      var lists = state.data.meta.lists_sampled || [];
      var n = state.data.stats && state.data.stats.lists ? state.data.stats.lists : lists.length;
      provenance.textContent = n
        ? t("live_from_n", { user: (state.data.meta.username || "Scobleizer"), n: n })
        : t("live_from_fallback");
    }

    var why = $("#whyCopy");
    if (why && !why.getAttribute("data-locked") && !why.getAttribute("data-i18n")) {
      var storiesN = (state.data.stories || []).filter(isTodayFeedKind).length;
      var sigN = (state.data.signals || []).length;
      var top = (state.data.stories || []).filter(isTodayFeedKind).slice().sort(function(a,b){return rankScore(b)-rankScore(a);})[0];
      if (top) {
        why.textContent = whyItMatters(top);
      } else {
        why.textContent = t("why_copy");
      }
    }

    var vibeStats = $("#vibeStats");
    if (vibeStats) {
      var stories = (state.data.stories || []).filter(isTodayFeedKind).length;
      var signals = (state.data.signals || []).length;
      var reports = (state.data.reports || []).length;
      vibeStats.innerHTML =
        '<div class="vibe-stat"><span>' + t("stories") + '</span><strong>' + stories + "</strong></div>" +
        '<div class="vibe-stat"><span>' + t("signals") + '</span><strong>' + signals + "</strong></div>" +
        '<div class="vibe-stat"><span>' + t("reports") + '</span><strong>' + reports + "</strong></div>";
      var vibeCopy = $("#vibeCopy");
      if (vibeCopy && !vibeCopy.getAttribute("data-i18n")) {
        vibeCopy.textContent = t("vibe_line", { stories: stories, signals: signals, reports: reports });
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




  var dockMetalRaf = 0;

  function stadiumPath(ctx, x, y, w, h) {
    var r = Math.max(0.5, h / 2);
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(x + r, y + h);
    ctx.arc(x + r, y + r, r, Math.PI / 2, -Math.PI / 2);
    ctx.closePath();
  }

  function stadiumPoint(w, h, dist) {
    var r = h / 2;
    var straight = Math.max(0, w - h);
    var halfCirc = Math.PI * r;
    var per = 2 * straight + 2 * halfCirc;
    if (per <= 0) return { x: w / 2, y: h / 2, per: 1 };
    var d = ((dist % per) + per) % per;
    var x, y;
    if (d < straight) {
      x = r + d;
      y = 0;
    } else if ((d -= straight) < halfCirc) {
      var a = -Math.PI / 2 + d / r;
      x = r + straight + r * Math.cos(a);
      y = r + r * Math.sin(a);
    } else if ((d -= halfCirc) < straight) {
      x = r + straight - d;
      y = h;
    } else {
      d -= straight;
      var a2 = Math.PI / 2 + d / r;
      x = r + r * Math.cos(a2);
      y = r + r * Math.sin(a2);
    }
    return { x: x, y: y, per: per };
  }

  function wrapDist(a, b) {
    var d = Math.abs(a - b) % 1;
    return d > 0.5 ? 1 - d : d;
  }

  function metalColor(u, sec) {
    var flow = u - sec / 4.8;
    var k = 0.5 + 0.5 * Math.sin(flow * Math.PI * 2);
    var k2 = 0.5 + 0.5 * Math.sin(flow * Math.PI * 4 + 0.8);
    var v = 34 + k * 162 + k2 * 24;
    var r = v;
    var g = v;
    var b = v + 6;

    var peak = (sec / 2.85 + 0.055 * Math.sin(sec * 1.37) + 0.025 * Math.sin(sec * 2.63)) % 1;
    if (peak < 0) peak += 1;
    var breathe = 0.5 + 0.5 * Math.sin(sec * 2.05);
    var width = 0.05 + 0.045 * breathe;
    var d = wrapDist(u, peak);
    var spec = Math.pow(Math.max(0, 1 - d / width), 2.15);
    var signed = u - peak;
    if (signed > 0.5) signed -= 1;
    if (signed < -0.5) signed += 1;

    if (spec > 0.015) {
      r = r + (255 - r) * spec;
      g = g + (255 - g) * spec;
      b = b + (255 - b) * spec;
      var fringe = spec * (1 - spec) * 3.4;
      if (fringe > 0) {
        if (signed < 0) {
          r = Math.max(0, r - fringe * 28);
          g = Math.min(255, g + fringe * 36);
          b = Math.min(255, b + fringe * 95);
        } else {
          r = Math.min(255, r + fringe * 95);
          g = Math.min(255, g + fringe * 22);
          b = Math.max(0, b - fringe * 38);
        }
      }
    }

    var peak2 = (peak + 0.5) % 1;
    var spec2 = Math.pow(Math.max(0, 1 - wrapDist(u, peak2) / 0.13), 2) * 0.2;
    r = r + (255 - r) * spec2;
    g = g + (255 - g) * spec2;
    b = b + (255 - b) * spec2;
    return "rgb(" + (r | 0) + "," + (g | 0) + "," + (b | 0) + ")";
  }

  function paintDockMetal(cv, sec) {
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    var cssW = cv.offsetWidth;
    var cssH = cv.offsetHeight;
    if (cssW < 12 || cssH < 12) return;
    cv.style.width = cssW + "px";
    cv.style.height = cssH + "px";
    var needW = Math.round(cssW * dpr);
    var needH = Math.round(cssH * dpr);
    if (cv.width !== needW || cv.height !== needH) {
      cv.width = needW;
      cv.height = needH;
    }
    var ctx = cv.getContext("2d", { alpha: true });
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    var pad = 6;
    var W = cssW - pad * 2;
    var H = cssH - pad * 2;
    var tube = Math.max(4.5, H * 0.13);
    var ox = pad + tube / 2;
    var oy = pad + tube / 2;
    var mw = Math.max(1, W - tube);
    var mh = Math.max(1, H - tube);
    var sample = stadiumPoint(mw, mh, 0);
    var per = sample.per;
    var n = 120;

    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    ctx.save();
    ctx.beginPath();
    stadiumPath(ctx, pad, pad, W, H);
    ctx.fillStyle = dark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.08)";
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    stadiumPath(ctx, pad, pad, W, H);
    stadiumPath(ctx, pad + tube, pad + tube, W - tube * 2, H - tube * 2);
    ctx.clip("evenodd");

    ctx.fillStyle = "#2a2a30";
    ctx.fillRect(0, 0, cssW, cssH);

    ctx.lineCap = "butt";
    ctx.lineJoin = "round";
    ctx.lineWidth = tube * 0.98;
    var i;
    for (i = 0; i < n; i++) {
      var a = stadiumPoint(mw, mh, (i / n) * per);
      var bpt = stadiumPoint(mw, mh, ((i + 1) / n) * per);
      var u = i / n;
      ctx.strokeStyle = metalColor(u, sec);
      ctx.beginPath();
      ctx.moveTo(ox + a.x, oy + a.y);
      ctx.lineTo(ox + bpt.x, oy + bpt.y);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    stadiumPath(ctx, pad, pad, W, H);
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    stadiumPath(ctx, pad + tube, pad + tube, W - tube * 2, H - tube * 2);
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  function startDockMetal() {
    if (dockMetalRaf) return;
    function tick(now) {
      layoutDockMetal();
      var cvs = document.querySelectorAll(".dock-metal-cv");
      if (!cvs.length) {
        dockMetalRaf = 0;
        return;
      }
      var sec = now / 1000;
      for (var i = 0; i < cvs.length; i++) paintDockMetal(cvs[i], sec);
      dockMetalRaf = requestAnimationFrame(tick);
    }
    dockMetalRaf = requestAnimationFrame(tick);
  }

  function layoutDockMetal() {
    var inner = document.querySelector("#mobileDock .mobile-dock-inner");
    if (!inner) return;
    var cv = inner.querySelector(".dock-metal-cv");
    var active = inner.querySelector(".mobile-dock-item.is-active");
    if (!cv || !active) return;
    var ir = inner.getBoundingClientRect();
    var ar = active.getBoundingClientRect();
    var pad = 5;
    cv.style.left = (ar.left - ir.left - pad) + "px";
    cv.style.top = (ar.top - ir.top - pad) + "px";
    cv.style.width = (ar.width + pad * 2) + "px";
    cv.style.height = (ar.height + pad * 2) + "px";
  }

  function dockItemIdFromHref(href) {
    href = href || "";
    if (href.indexOf("signals") >= 0) return "signals";
    if (href.indexOf("reports") >= 0) return "reports";
    if (href.indexOf("newsletter") >= 0) return "newsletter";
    return "today";
  }

  function morphDockTo(dock, tab, href) {
    var reduce = false;
    try {
      reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (e) {}
    if (reduce) {
      window.location.href = href;
      return;
    }
    dock.dataset.morphing = "1";
    dock.classList.add("is-morphing");
    var inner = dock.querySelector(".mobile-dock-inner");
    var cur = inner ? inner.querySelector(".mobile-dock-item.is-active") : null;
    if (cur && cur !== tab) {
      cur.classList.remove("is-active");
      cur.removeAttribute("aria-current");
      var ico = cur.querySelector(".mobile-dock-ico");
      if (ico) ico.innerHTML = dockIcon(dockItemIdFromHref(cur.getAttribute("href")), false);
    }
    tab.classList.add("is-active");
    tab.setAttribute("aria-current", "page");
    var tabIco = tab.querySelector(".mobile-dock-ico");
    if (tabIco) tabIco.innerHTML = dockIcon(dockItemIdFromHref(tab.getAttribute("href")), true);
    pinMobileDockLayout(dock);
    var start = performance.now();
    function follow(now) {
      layoutDockMetal();
      if (now - start < 440) requestAnimationFrame(follow);
      else window.location.href = href;
    }
    requestAnimationFrame(follow);
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

  function dockTileIcon(id) {
    var icons = {
      god: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
      signin: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.2"/><path d="M5.5 19.2c1.2-3 3.6-4.5 6.5-4.5s5.3 1.5 6.5 4.5"/></svg>',
      saved: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4h10a1 1 0 0 1 1 1v15l-6-3.5L6 20V5a1 1 0 0 1 1-1z"/></svg>',
      collabs: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 11a3 3 0 1 0-2.2-5M8 11a3 3 0 1 1 2.2-5M4.8 19a4.2 4.2 0 0 1 7.4-2.5M19.2 19a4.2 4.2 0 0 0-7.4-2.5"/></svg>',
      compact: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h14"/></svg>',
      expanded: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="4" y="5" width="16" height="5" rx="1.6" fill="currentColor"/><rect x="4" y="14" width="16" height="5" rx="1.6" fill="currentColor"/></svg>',
      theme: themeOrbHtml()
    };
    return icons[id] || icons.god;
  }


  function isPhoneViewport() {
    var w = window.innerWidth || document.documentElement.clientWidth || 0;
    if (w >= 900) return false;
    if (w > 0 && w <= 899) return true;
    try {
      return !!(window.matchMedia && window.matchMedia("(max-width: 899px)").matches);
    } catch (e) {
      return false;
    }
  }

  function teardownMobileDock() {
    var old = $("#mobileDock");
    if (old) old.remove();
    document.documentElement.classList.remove("has-mobile-dock");
  }

  function wireDockScroll(dock) {
    if (!dock || dock.dataset.scrollWired === "1") return;
    dock.dataset.scrollWired = "1";
    var lastY = window.scrollY || document.documentElement.scrollTop || 0;
    var ticking = false;
    function yNow() {
      var y = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      var main = document.querySelector(".main");
      if (main) y = Math.max(y, main.scrollTop || 0);
      return y;
    }
    function apply() {
      if (!isPhoneViewport() || dock.classList.contains("is-open")) return;
      var y = yNow();
      if (y > lastY + 8 && y > 24) dock.classList.add("is-compact");
      else if (y < lastY - 6) dock.classList.remove("is-compact");
      lastY = y;
      pinMobileDockLayout(dock);
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        apply();
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    var main = document.querySelector(".main");
    if (main) main.addEventListener("scroll", onScroll, { passive: true });
  }

  function pinMobileDockLayout(dock) {
    if (!dock || !isPhoneViewport()) return;
    var pin = function (el, props) {
      if (!el) return;
      Object.keys(props).forEach(function (k) {
        el.style.setProperty(k, props[k], "important");
      });
    };
    pin(dock, {
      position: "fixed",
      left: "0",
      right: "0",
      top: "auto",
      bottom: "0",
      width: "100%",
      "max-width": "100%",
      margin: "0",
      transform: "none",
      "z-index": "60",
      padding: "0 8px calc(10px + env(safe-area-inset-bottom, 0px))",
      "box-sizing": "border-box",
      "pointer-events": "none"
    });
    pin(dock.querySelector(".mobile-dock-stage"), {
      width: "100%",
      "max-width": "100%",
      "box-sizing": "border-box"
    });
    pin(dock.querySelector(".mobile-dock-bar"), {
      display: "flex",
      width: "100%",
      "max-width": "100%",
      "align-items": "center",
      gap: "8px",
      "box-sizing": "border-box",
      "pointer-events": "none"
    });
    var compact = dock.classList.contains("is-compact");
    var h = compact ? "36px" : "48px";
    pin(dock.querySelector(".mobile-dock-inner"), {
      display: "flex",
      flex: "1 1 auto",
      width: "100%",
      "max-width": "100%",
      height: h,
      "align-items": "center",
      "justify-content": "space-evenly",
      "box-sizing": "border-box",
      "pointer-events": "auto"
    });
    pin(dock.querySelector(".mobile-dock-plus"), {
      display: "inline-flex",
      flex: "0 0 " + h,
      width: h,
      height: h,
      "pointer-events": "auto"
    });
    var items = dock.querySelectorAll(".mobile-dock-item");
    for (var i = 0; i < items.length; i++) {
      var on = items[i].classList.contains("is-active");
      pin(items[i], {
        flex: (on && !compact) ? "2.2 1 auto" : "1 1 auto",
        width: "auto",
        "min-width": compact ? "32px" : "44px",
        "max-width": "none",
        overflow: compact ? "hidden" : "visible"
      });
    }
  }

  function renderMobileDock(page) {
    if (page === "auth" || !isPhoneViewport()) {
      teardownMobileDock();
      return;
    }
    var items = [
      { id: "today", href: "index.html", label: t("today") },
      { id: "signals", href: "signals.html", label: t("signals") },
      { id: "reports", href: "reports.html", label: t("reports") },
      { id: "newsletter", href: "newsletter.html", label: t("news") }
    ];
    var tiles = [
      { act: "god", label: t("god_mode"), icon: "god" },
      { href: "auth.html", label: t("sign_up_login"), icon: "signin" },
      { href: "index.html?view=saved", label: t("saved"), icon: "saved" },
      { href: "https://agentdashboard.cloud/connect", label: t("collabs"), icon: "collabs", ext: true },
      { act: "expanded", label: t("expanded"), icon: "expanded" },
      { act: "compact", label: t("compact"), icon: "compact" },
      { act: "theme", label: isDarkTheme() ? t("light_mode") : t("dark_mode"), icon: "theme" }
    ];
    var dock = $("#mobileDock");
    if (!dock) {
      dock = document.createElement("nav");
      dock.id = "mobileDock";
      dock.className = "mobile-dock";
      dock.setAttribute("aria-label", t("primary"));
    }
    if (dock.parentNode !== document.body) document.body.appendChild(dock);
    document.documentElement.classList.add("has-mobile-dock");
    var wasOpen = dock.classList.contains("is-open");
    if (dock.dataset.built === "1" && dock.querySelector(".mobile-dock-inner") && !dock.querySelector(".dock-metal-cv")) {
      if (dock.dataset.morphing !== "1") {
        var nodes = dock.querySelectorAll(".mobile-dock-item");
        for (var si = 0; si < items.length && si < nodes.length; si++) {
          var spec = items[si];
          var a = nodes[si];
          var on = spec.id === page;
          if (spec.id === "today") on = (page === "today" && getParam("view") !== "saved") || page === "story";
          a.setAttribute("href", spec.href);
          a.setAttribute("title", spec.label);
          var lab = a.querySelector(".mobile-dock-label");
          if (lab) lab.textContent = spec.label;
          a.classList.toggle("is-active", on);
          if (on) a.setAttribute("aria-current", "page");
          else a.removeAttribute("aria-current");
          var ico = a.querySelector(".mobile-dock-ico");
          if (ico) ico.innerHTML = dockIcon(spec.id, on);
        }
      }
      pinMobileDockLayout(dock);
      wireDockScroll(dock);
      return;
    }
    dock.innerHTML =
      '<div class="mobile-dock-stage">' +
        '<div class="mobile-dock-sheet" id="mobileDockSheet">' +
          tiles.map(function (tile) {
            var tag = tile.href ? "a" : "button";
            var extra = tile.href
              ? ' href="' + tile.href + '"' + (tile.ext ? ' target="_blank" rel="noopener noreferrer"' : "")
              : ' type="button"';
            return (
              "<" + tag + ' class="dock-tile" data-act="' + (tile.act || "") + '"' + extra + ">" +
              '<span class="dock-tile-ico">' + dockTileIcon(tile.icon) + "</span>" +
              '<span class="dock-tile-label">' + escapeHtml(tile.label) + "</span>" +
              "</" + tag + ">"
            );
          }).join("") +
        "</div>" +
        '<div class="mobile-dock-bar">' +
          '<div class="mobile-dock-inner">' +
          items.map(function (item) {
            var active = item.id === page;
            if (item.id === "today") active = (page === "today" && getParam("view") !== "saved") || page === "story";
            return (
              '<a class="mobile-dock-item' + (active ? " is-active" : "") + '" href="' + item.href + '"' +
              (active ? ' aria-current="page"' : "") + ' title="' + escapeHtml(item.label) + '">' +
              '<span class="mobile-dock-ico">' + dockIcon(item.id, active) + "</span>" +
              '<span class="mobile-dock-label">' + escapeHtml(item.label) + "</span>" +
              "</a>"
            );
          }).join("") +
          "</div>" +
          '<button type="button" class="mobile-dock-plus" id="mobileDockPlus" aria-expanded="' + (wasOpen ? "true" : "false") + '" aria-controls="mobileDockSheet" aria-label="+">' +
            '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>' +
          "</button>" +
        "</div>" +
      "</div>";
    if (wasOpen) dock.classList.add("is-open");
    dock.dataset.built = "1";
    pinMobileDockLayout(dock);
    wireDockScroll(dock);
    if (!dock.dataset.wired) {
      dock.dataset.wired = "1";
      dock.addEventListener("click", function (e) {
        var plus = e.target.closest(".mobile-dock-plus");
        if (plus) {
          e.preventDefault();
          var open = !dock.classList.contains("is-open");
          dock.classList.toggle("is-open", open);
          if (open) dock.classList.remove("is-compact");
          plus.setAttribute("aria-expanded", open ? "true" : "false");
          pinMobileDockLayout(dock);
          return;
        }
        var tab = e.target.closest(".mobile-dock-item");
        if (tab) {
          if (tab.classList.contains("is-active") || dock.dataset.morphing === "1") {
            e.preventDefault();
            return;
          }
          var href = tab.getAttribute("href");
          if (!href) return;
          e.preventDefault();
          morphDockTo(dock, tab, href);
          return;
        }
        var tile = e.target.closest(".dock-tile");
        if (!tile) return;
        var act = tile.getAttribute("data-act");
        if (act === "god") {
          e.preventDefault();
          dock.classList.remove("is-open");
          var gm = document.getElementById("godModeWidget");
          if (gm) gm.click();
        } else if (act === "compact" || act === "expanded") {
          e.preventDefault();
          var btn = document.querySelector('[data-density-mode="' + (act === "compact" ? "compact" : "comfortable") + '"]');
          if (btn) btn.click();
          dock.classList.remove("is-open");
        } else if (act === "theme") {
          e.preventDefault();
          toggleTheme();
        } else {
          dock.classList.remove("is-open");
        }
      });
    }
  }


  function ensureHeaderLang() {
    if (!isPhoneViewport()) {
      var existing = document.getElementById("headerLang");
      if (existing) existing.remove();
      return;
    }
    var actions = document.querySelector(".top-actions");
    if (!actions) return;
    var langs = window.anLangs || ["en", "es", "pt", "ja", "zh"];
    var native = window.anLangNative || { en: "English", es: "Español", pt: "Português", ja: "日本語", zh: "中文" };
    var shortN = { en: "EN", es: "ES", pt: "PT", ja: "日本語", zh: "中文" };
    var cur = window.anLang ? window.anLang() : "en";
    var el = document.getElementById("headerLang");
    if (!el) {
      el = document.createElement("div");
      el.id = "headerLang";
      el.className = "header-lang";
      actions.appendChild(el);
    }
    el.innerHTML =
      '<button type="button" class="header-lang-btn" id="headerLangBtn" aria-expanded="false" aria-haspopup="listbox" aria-label="' + t("language") + '">' +
      escapeHtml(shortN[cur] || "EN") +
      "</button>" +
      '<div class="header-lang-menu" role="listbox">' +
      langs.map(function (code) {
        var on = code === cur ? " is-on" : "";
        return (
          '<button type="button" class="header-lang-opt' + on + '" role="option" data-lang="' + code + '" aria-selected="' + (code === cur ? "true" : "false") + '">' +
          escapeHtml(native[code] || code) +
          "</button>"
        );
      }).join("") +
      "</div>";
    if (!el.dataset.wired) {
      el.dataset.wired = "1";
      el.addEventListener("click", function (e) {
        var opt = e.target.closest(".header-lang-opt");
        if (opt && window.anSetLang) {
          e.preventDefault();
          e.stopPropagation();
          window.anSetLang(opt.getAttribute("data-lang"));
          el.classList.remove("is-open");
          return;
        }
        var btn = e.target.closest(".header-lang-btn");
        if (btn) {
          e.preventDefault();
          e.stopPropagation();
          var open = !el.classList.contains("is-open");
          el.classList.toggle("is-open", open);
          btn.setAttribute("aria-expanded", open ? "true" : "false");
        }
      });
    }
    if (!document.documentElement.dataset.langHeadWired) {
      document.documentElement.dataset.langHeadWired = "1";
      document.addEventListener("click", function (e) {
        var box = document.getElementById("headerLang");
        if (!box || !box.classList.contains("is-open")) return;
        if (box.contains(e.target)) return;
        box.classList.remove("is-open");
        var b = document.getElementById("headerLangBtn");
        if (b) b.setAttribute("aria-expanded", "false");
      });
    }
  }

  function wireMobileDockMq() {
    if (wireMobileDockMq.wired) return;
    wireMobileDockMq.wired = true;
    var onChange = function () {
      renderMobileDock(pageName());
      ensureHeaderLang();
    };
    try {
      var mq = window.matchMedia("(max-width: 899px)");
      if (mq.addEventListener) mq.addEventListener("change", onChange);
      else if (mq.addListener) mq.addListener(onChange);
    } catch (e) {}
    window.addEventListener("resize", onChange);
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
      { id: "today", href: "index.html", label: t("today"), count: counts.stories },
      { id: "signals", href: "signals.html", label: t("signals"), count: counts.signals },
      { id: "reports", href: "reports.html", label: t("reports"), count: counts.reports },
      { id: "newsletter", href: "newsletter.html", label: t("newsletter"), count: newsletterIssues().length || undefined },
      { id: "saved", href: "index.html?view=saved", label: t("saved"), count: counts.saved },
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
        '<div class="nav-label">' + t("browse") + '</div>' +
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
    ensureHeaderLang();

    var user = resolvePlan(data.user || { name: "Asher", plan: "Pro" });
    data.user = user;
    var pro = isProPlan(user);
    var uname = user.name || "Asher";

    function langPickerHtml() {
      var langs = (window.anLangs || ["en", "es", "pt", "ja", "zh"]);
      var native = window.anLangNative || { en: "English", es: "Espa\u00f1ol", pt: "Portugu\u00eas", ja: "\u65e5\u672c\u8a9e", zh: "\u4e2d\u6587" };
      var cur = window.anLang ? window.anLang() : "en";
      var bits = ['<div class="sidebar-langs" role="group" aria-label="' + t("language") + '">'];
      for (var i = 0; i < langs.length; i++) {
        var code = langs[i];
        var on = code === cur ? " is-on" : "";
        bits.push(
          '<button type="button" class="sidebar-lang' + on + '" data-lang="' + code + '" aria-pressed="' + (code === cur ? "true" : "false") + '">' +
          (native[code] || code) +
          "</button>"
        );
      }
      bits.push("</div>");
      return bits.join("");
    }

    var foot = $("#sidebarFoot");
    if (foot) {
      var dark = isDarkTheme();
      var av = initialsFrom(uname).slice(0, 1);
      foot.innerHTML =
        '<div class="sidebar-account">' +
        '<span class="avatar" aria-hidden="true">' + escapeHtml(av) + "</span>" +
        '<span class="sidebar-account-meta">' +
        '<span class="sidebar-account-name">' + escapeHtml(uname) + "</span>" +
        '<span class="' + (pro ? "pro-badge" : "plan-badge plan-free") + '">' + (pro ? "Pro" : "Free") + "</span>" +
        "</span>" +
        "</div>" +
        '<button type="button" class="sidebar-theme" id="themeToggleSide" aria-label="' +
        (dark ? t("switch_light") : t("switch_dark")) + '" title="' +
        (dark ? t("light_mode") : t("dark_mode")) + '">' +
        themeOrbHtml() +
        '<span class="sidebar-theme-label">' + (dark ? t("light_mode") : t("dark_mode")) + "</span>" +
        "</button>" +
        langPickerHtml();
    }

    var authCta = ensureAuthCta();
    if (authCta) {
      authCta.hidden = !!pro;
      authCta.classList.toggle("is-on", !pro);
    }
    if (pro) document.documentElement.setAttribute("data-signed-in", "1");
    else document.documentElement.removeAttribute("data-signed-in");
    // Remove legacy Upgrade CTA — Sign up / Login is the primary action.
    var existingUp = $("#upgradeBtn");
    if (existingUp) existingUp.remove();

    var kicker = $(".desk-kicker");
    if (kicker) {
      if (page === "newsletter") kicker.textContent = t("nl_kicker");
      else kicker.textContent = pro ? t("scoble_pro") : t("scoble_free");
    }

    var siteFoot = $(".site-footer");
    if (siteFoot) {
      var spans = siteFoot.querySelectorAll("span");
      if (spans[0]) spans[0].textContent = "Aligned News · " + (pro ? t("pro_desk") : t("free_desk"));
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
          note.innerHTML = '<p class="pro-desk-note">' + t("curated") + '</p>';
          rail.insertBefore(note, rail.firstChild);
        } else {
          note.hidden = false;
          var np = note.querySelector(".pro-desk-note");
          if (np) np.textContent = t("curated");
        }
      } else if (note) {
        note.hidden = true;
      }
    }


    var metaEl = $("#pageMeta");
    if (metaEl) {
      var todayLabel = new Date().toLocaleDateString(window.anLoc ? window.anLoc() : undefined, {
        weekday: "long", month: "long", day: "numeric", year: "numeric"
      });
      if (page === "today") {
        metaEl.textContent = todayLabel + (lastUpdated ? " · " + t("updated") + " " + lastUpdated : "");
      } else if (page === "signals") {
        metaEl.textContent = counts.signals + " " + t("signals_n") + (lastUpdated ? " · " + t("updated") + " " + lastUpdated : "");
      } else if (page === "reports") {
        metaEl.textContent = counts.reports + " " + t("reports_n");
      } else if (page === "newsletter") {
        metaEl.textContent = t("nl_meta");
      }
    }

    var liveTime = $("#liveTime");
    if (liveTime) {
      liveTime.textContent = lastUpdated || t("desk_word");
    }

    var deskStats = $("#deskStats");
    if (deskStats) {
      var listCount = (data.stats && data.stats.lists) || (data.meta && data.meta.lists_sampled && data.meta.lists_sampled.length) || 63;
      deskStats.innerHTML =
        '<div class="desk-stat"><strong>' + counts.stories + '</strong><span>' + t("stories") + '</span></div>' +
        '<div class="desk-stat"><strong>' + counts.signals + '</strong><span>' + t("signals") + '</span></div>' +
        '<div class="desk-stat"><strong>' + listCount + '</strong><span>' + t("lists") + '</span></div>';
    }

    syncDensitySeg();
    syncChromeToggle();
    syncThemeButtons();
  }

  function getParam(name) {
    try {
      return new URLSearchParams(location.search).get(name);
    } catch (e) { return null; }
  }

  function storyMatches(story) {
    if (state.filter && state.filter !== "all") {
      if (!storyMatchesChip(story, state.filter)) return false;
    }
    if (state.query) {
      var q = state.query.toLowerCase();
      var hay = [story.headline, story.summary, story.section_label, story.section, story.signal_badge]
        .join(" ").toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    if (getParam("view") === "saved") {
      if (!isSavedId(story.id)) return false;
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
      '<div class="foryou-label">' + t("for_you") + '</div>' +
      items.map(function (s) {
        return (
          '<a href="story.html?id=' + encodeURIComponent("sigstory-" + s.id) + '">' +
          '<span class="' + badgeClass(s.badge) + '">' + escapeHtml((s.badge || "signal").toUpperCase()) + "</span>" +
          "<span" + txSrc(editorialTitle(s, 72)) + ">" + escapeHtml(editorialTitle(s, 72)) + "</span></a>"
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
      return isTodayFeedKind(s) && isAiRelevant(s) && !isRetweetNoise(s) && !isEventItem(s) && !isSideDeskItem(s) && !isHotTakeItem(s);
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
      '<div class="intel-head"><span class="intel-kicker">' + t("desk_glance") + '</span><span class="intel-sub">' + t("intel_sub") + '</span></div>' +
      '<ol class="intel-list">' +
      stories.map(function (s, i) {
        var title = editorialTitle(s, 78);
        var topic = s.topic_label || labelFor(s.topic_key || topicKeyFor(s));
        return (
          '<li style="--i:' + i + '">' +
            '<a href="story.html?id=' + encodeURIComponent(s.id) + '">' +
              '<span class="intel-num">' + (i + 1) + "</span>" +
              '<span class="intel-title"' + txSrc(title) + '>' + escapeHtml(title) + "</span>" +
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
    if (parts.length !== 3) return t("earlier");
    var dayDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (isNaN(dayDate.getTime())) return t("earlier");
    var today = startOfLocalDay(new Date());
    var yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    var sod = startOfLocalDay(dayDate);
    if (sod.getTime() === today.getTime()) return t("today");
    if (sod.getTime() === yesterday.getTime()) return t("yesterday");
    var ageDays = Math.round((today.getTime() - sod.getTime()) / 86400000);
    try {
      if (ageDays >= 0 && ageDays < 7) {
        return dayDate.toLocaleDateString(window.anLoc ? window.anLoc() : undefined, { weekday: "long" });
      }
      return dayDate.toLocaleDateString(window.anLoc ? window.anLoc() : undefined, { month: "short", day: "numeric" });
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


  var leadScatter = {
    raf: 0,
    canvas: null,
    hero: null,
    particles: [],
    lastX: -1,
    lastY: -1,
    mouseX: -9999,
    mouseY: -9999,
    inside: false,
    lastTs: 0,
    unbind: null
  };
  var leadRevealSeen = {};

  function isLeadScatterDesktop() {
    if (prefersReducedMotion()) return false;
    if (document.documentElement.classList.contains("is-standalone")) return false;
    if (isCompactDensity()) return false;
    try {
      if (window.matchMedia("(max-width: 720px)").matches) return false;
      if (window.matchMedia("(pointer: coarse)").matches) return false;
      if (window.matchMedia("(hover: none)").matches) return false;
    } catch (e) {
      return false;
    }
    return true;
  }

  function destroyLeadScatter() {
    if (leadScatter.raf) {
      cancelAnimationFrame(leadScatter.raf);
      leadScatter.raf = 0;
    }
    if (leadScatter.unbind) {
      leadScatter.unbind();
      leadScatter.unbind = null;
    }
    if (leadScatter.canvas && leadScatter.canvas.parentNode) {
      leadScatter.canvas.parentNode.removeChild(leadScatter.canvas);
    }
    leadScatter.canvas = null;
    leadScatter.hero = null;
    leadScatter.particles = [];
    leadScatter.inside = false;
    leadScatter.lastTs = 0;
    leadScatter.lastX = -1;
    leadScatter.lastY = -1;
  }

  function sizeLeadScatterCanvas() {
    var canvas = leadScatter.canvas;
    var hero = leadScatter.hero;
    if (!canvas || !hero) return;
    var w = hero.clientWidth;
    var h = hero.clientHeight;
    if (w < 8 || h < 8) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    var ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawnLeadDots(mx, my) {
    var dots = leadScatter.particles;
    var n = Math.random() < 0.4 ? 2 : 1;
    var i;
    for (i = 0; i < n; i++) {
      if (dots.length >= 56) return;
      var ang = Math.random() * Math.PI * 2;
      var dist = Math.random() * 12;
      var pick = Math.random();
      var rgb = pick < 0.62 ? "240,239,236" : pick < 0.84 ? "13,15,20" : "217,204,172";
      var a = pick < 0.62 ? 0.34 : 0.18;
      dots.push({
        x: mx + Math.cos(ang) * dist,
        y: my + Math.sin(ang) * dist,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4 - 0.05,
        r: 1.05 + Math.random() * 1.55,
        life: 0,
        max: 280 + Math.random() * 420,
        rgb: rgb,
        a: a
      });
    }
  }

  function tickLeadScatter(ts) {
    leadScatter.raf = 0;
    var canvas = leadScatter.canvas;
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var w = canvas.clientWidth;
    var h = canvas.clientHeight;
    var dt = leadScatter.lastTs ? Math.min(32, ts - leadScatter.lastTs) : 16;
    leadScatter.lastTs = ts;
    ctx.clearRect(0, 0, w, h);
    var mx = leadScatter.mouseX;
    var my = leadScatter.mouseY;
    var inside = leadScatter.inside;
    var next = [];
    var dots = leadScatter.particles;
    var i, p, dx, dy, d2, d, f, t, alpha;
    for (i = 0; i < dots.length; i++) {
      p = dots[i];
      if (inside) {
        dx = p.x - mx;
        dy = p.y - my;
        d2 = dx * dx + dy * dy;
        if (d2 < 2304 && d2 > 0.25) {
          d = Math.sqrt(d2);
          f = (1 - d / 48) * 0.72;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
        }
      }
      p.vx *= 0.93;
      p.vy *= 0.93;
      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);
      p.life += dt;
      if (p.life >= p.max) continue;
      if (p.x < -6 || p.y < -6 || p.x > w + 6 || p.y > h + 6) continue;
      t = 1 - p.life / p.max;
      alpha = p.a * t * t;
      ctx.fillStyle = "rgba(" + p.rgb + "," + alpha + ")";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      next.push(p);
    }
    leadScatter.particles = next;
    if (next.length || inside) {
      leadScatter.raf = requestAnimationFrame(tickLeadScatter);
    } else {
      leadScatter.lastTs = 0;
    }
  }

  function mountLeadScatter() {
    destroyLeadScatter();
    var hero = document.querySelector("#feed .lead-card-opener .lead-hero");
    if (!hero) return;
    var img = hero.querySelector("img");
    if (img && !prefersReducedMotion()) {
      var key = img.getAttribute("src") || "photo";
      if (!leadRevealSeen[key]) {
        leadRevealSeen[key] = 1;
        hero.classList.add("lead-hero-reveal");
      }
    }
    if (!isLeadScatterDesktop()) return;
    if (!img) return;
    if (img.complete && !img.naturalWidth) return;

    var canvas = document.createElement("canvas");
    canvas.className = "lead-scatter";
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.pointerEvents = "none";
    hero.appendChild(canvas);
    leadScatter.canvas = canvas;
    leadScatter.hero = hero;
    sizeLeadScatterCanvas();

    function onMove(e) {
      if (e.pointerType && e.pointerType !== "mouse") return;
      var rect = hero.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      leadScatter.mouseX = x;
      leadScatter.mouseY = y;
      leadScatter.inside = true;
      var dx = x - leadScatter.lastX;
      var dy = y - leadScatter.lastY;
      if (dx * dx + dy * dy > 16) {
        spawnLeadDots(x, y);
        leadScatter.lastX = x;
        leadScatter.lastY = y;
      }
      if (!leadScatter.raf) leadScatter.raf = requestAnimationFrame(tickLeadScatter);
    }
    function onLeave() {
      leadScatter.inside = false;
      leadScatter.lastX = -1;
      leadScatter.lastY = -1;
    }
    function onResize() {
      if (!isLeadScatterDesktop()) {
        destroyLeadScatter();
        return;
      }
      sizeLeadScatterCanvas();
    }
    function onImgErr() {
      img.removeEventListener("error", onImgErr);
      destroyLeadScatter();
    }
    hero.addEventListener("pointermove", onMove);
    hero.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", onResize);
    img.addEventListener("error", onImgErr);
    leadScatter.unbind = function () {
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", onResize);
      img.removeEventListener("error", onImgErr);
    };
  }

  function bindLeadScatterMedia() {
    try {
      var mq = window.matchMedia("(max-width: 720px), (pointer: coarse), (hover: none), (prefers-reduced-motion: reduce)");
      var onChange = function () { mountLeadScatter(); };
      if (mq.addEventListener) mq.addEventListener("change", onChange);
      else if (mq.addListener) mq.addListener(onChange);
    } catch (e) {}
  }

  function renderTodayFeed() {
    destroyLeadScatter();
    var list = $("#feed");
    if (!list || !state.data) return;
    renderRightRail();
    renderIntelStrip();
    var live = state.data.stories || [];
    var stories = (getParam("view") === "saved" ? savedStoriesForFeed(live) : live).filter(function (s) {
      if (getParam("view") === "saved") return storyMatches(s);
      if (!isTodayFeedKind(s)) return false;
      if (isRetweetNoise(s)) return false;
      return storyMatches(s);
    });
    if (!stories.length) {
      if (getParam("view") === "saved") {
        list.innerHTML =
          '<li class="empty empty-premium">' +
            '<p class="empty-premium-title">' + t("nothing_saved") + '</p>' +
            '<p class="empty-premium-copy">' + t("saved_copy") + '</p>' +
          "</li>";
      } else {
        list.innerHTML = '<li class="empty">' + t("no_stories") + '</li>';
      }
      renderTodayDeskModules();
      afterContentPaint();
      return;
    }


    function eventKind(item) {
      var sec = String((item && (item.section || item.tag)) || "").toLowerCase();
      var hay = itemHay(item);
      if (sec.indexOf("hackathon") !== -1 || hay.indexOf("hackathon") !== -1) return "hackathons";
      if (sec.indexOf("dinner") !== -1 || hay.indexOf("dinner") !== -1 || hay.indexOf("night summit") !== -1) return "dinners";
      return "conferences";
    }

    function eventsBoxHtml(items) {
      if (!items || !items.length) return "";
      var groups = { conferences: [], hackathons: [], dinners: [] };
      items.forEach(function (ev) { groups[eventKind(ev)].push(ev); });
      function col(title, arr) {
        if (!arr.length) return "";
        return '<section class="events-col">' +
          '<h3 class="events-col-title">' + escapeHtml(title) + "</h3>" +
          "<ul>" + arr.slice(0, 6).map(function (ev) {
            var href = "story.html?id=" + encodeURIComponent(ev.id);
            var et = editorialTitle(ev, 72);
            return '<li><a href="' + href + '"' + txSrc(et) + '>' + escapeHtml(et) + "</a></li>";
          }).join("") + "</ul></section>";
      }
      return (
        '<li class="events-box" role="region" aria-label="' + t("events") + '">' +
          '<div class="events-box-head">' +
            '<h2 class="events-box-title">' + t("this_week") + '</h2>' +
            '<p class="events-box-kicker">' + t("events_kicker") + '</p>' +
          "</div>" +
          '<div class="events-box-cols">' +
            col(t("conferences"), groups.conferences) +
            col(t("hackathons"), groups.hackathons) +
            col(t("dinners"), groups.dinners) +
          "</div>" +
        "</li>"
      );
    }

    if (!getParam("view") && state.filter === "events") {
      var onlyEvents = stories.filter(isEventItem);
      list.innerHTML = onlyEvents.length ? eventsBoxHtml(onlyEvents) : '<li class="empty">' + t("no_events") + '</li>';
      enableCardNavigation(list);
      renderTodayDeskModules();
      afterContentPaint();
      return;
    }

    var isSaved = getParam("view") === "saved";
    var showLead = !isSaved && state.filter === "all" && !state.query;
    var html = "";
    var rankCounter = 0;
    var storyCount = 0;
    var bannerDone = false;
    var boxedEvents = [];
    var eventsInserted = false;
    if (!isSaved && !state.query && (state.filter === "all" || state.filter === "events")) {
      boxedEvents = stories.filter(isEventItem);
      if (state.filter === "all") {
        stories = stories.filter(function (s) { return !isEventItem(s); });
      }
    }

    function takeBanner() {
      storyCount += 1;
      if (bannerDone || isSaved) return "";
      if (storyCount !== 5) return "";
      bannerDone = true;
      var html = "";
      if (!isCompactDensity()) html += newsletterBannerHtml();
      html += sponsorsFeedHtml();
      return html;
    }

    function pickLeadInGroup(items) {
      if (!showLead || !items || !items.length) return items;
      return items.slice().sort(function (a, b) {
        return Number(a.desk_rank || 9999) - Number(b.desk_rank || 9999);
      });
    }

    function renderStoryItem(s, i, allowLead, rest) {
      var compact = isCompactDensity();
      var quiet = compact || !!rest;
      var isRead = state.read.indexOf(s.id) !== -1;
      var sectionPretty = s.topic_label || prettyChipLabel(s.section_key, s.section_label || s.section || "");
      var metaLine = storyFeedMeta(s);
      var href = "story.html?id=" + encodeURIComponent(s.id);
      var key = s.topic_key || s.section_key || mapSectionKey(s.section || s.tag || "");
      var headline = editorialTitle(s, 92);
      var media = storyMediaUrl(s);
      var photoThumb = media ? rowThumbHtml(s, key, sectionPretty) : "";

      // Compact / rest-of-desk = dense headline+meta — no lead hero / why.
      if (!quiet && allowLead && showLead && i === 0) {
        var leadHeadline = editorialTitle(s, 88);
        var dek = leadBrief(s, leadHeadline);
        var hero = leadHeroHtml(s, key, sectionPretty);
        rankCounter = 1;
        return (
          '<li class="lead-card lead-card-opener lead-card-photo' + (isRead ? " is-read" : "") + '" style="--i:0" data-href="' + href + '" role="link" tabindex="0">' +
            '<div class="rank">1</div>' +
            hero +
            '<div class="lead-copy">' +
              '<p class="lead-eyebrow">' + escapeHtml(sectionPretty || t("today")) + "</p>" +
              '<h2 class="lead-title"><a href="' + href + '"' + txSrc(leadHeadline) + '>' + escapeHtml(leadHeadline) + "</a></h2>" +
              (dek ? '<p class="lead-dek"' + txSrc(dek) + '>' + escapeHtml(dek) + "</p>" : "") +
              '<div class="lead-meta">' +
                avatarStackHtml(s) +
                '<span class="meta-line">' + escapeHtml(metaLine) + "</span>" +
              "</div>" +
              whyHereHtml(s) +
            "</div>" +
          "</li>"
        );
      }

      rankCounter += 1;
      var rank = rankCounter;
      var excerpt = uniqueDek(s, headline, 110);
      var thumb = photoThumb || (quiet ? "" : rowThumbHtml(s, key, sectionPretty));
      return (
        '<li class="feed-row' + (rest && !compact ? " feed-row-rest" : "") + (isRead ? " is-read" : "") + '" style="--i:' + Math.min(rank, 12) + '" data-href="' + href + '" role="link" tabindex="0">' +
          '<div class="rank">' + rank + "</div>" +
          '<div class="feed-body">' +
            '<h2 class="story-title"><a href="' + href + '"' + txSrc(headline) + '>' + escapeHtml(headline) + "</a></h2>" +
            (excerpt ? '<p class="excerpt"' + txSrc(excerpt) + '>' + escapeHtml(excerpt) + "</p>" : "") +
            '<div class="meta">' +
              avatarStackHtml(s) +
              '<span class="meta-line">' + escapeHtml(metaLine) + "</span>" +
            "</div>" +
            whyHereHtml(s) +
          "</div>" +
          thumb +
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
    } else if (showLead) {
      var items = stories.slice().sort(function (a, b) {
        return Number(a.desk_rank || 9999) - Number(b.desk_rank || 9999);
      });
      items = pickLeadInGroup(items);
      if (items.length) {
        html += renderStoryItem(items[0], 0, true, false);
        html += takeBanner();
      }
      var pullIds = ((state.data && state.data.top_pulls) || []).slice();
      var used = {};
      if (items[0]) used[items[0].id] = true;
      var pulls = [];
      pullIds.forEach(function (id) {
        for (var pi = 0; pi < items.length; pi++) {
          if (items[pi].id === id && !used[id]) {
            pulls.push(items[pi]);
            used[id] = true;
            break;
          }
        }
      });
      if (pulls.length) {
        html += '<li class="top-pulls-wrap" role="presentation"><ul class="top-pulls">' +
          pulls.map(renderPullCard).join("") + "</ul></li>";
      }
      var rest = items.filter(function (s) { return !used[s.id]; });
      var sectionOrder = ["models", "products", "papers", "funding", "policy", "robotics", "labs", "chips", "creatives", "world"];
      sectionOrder.forEach(function (key) {
        var bucket = rest.filter(function (s) {
          return storySectionKey(s) === key;
        });
        if (!bucket.length) return;
        bucket.sort(function (a, b) {
          var ma = Number(a.list_count || 0) >= 2 ? 1 : 0;
          var mb = Number(b.list_count || 0) >= 2 ? 1 : 0;
          if (mb !== ma) return mb - ma;
          return Date.parse(storyTimeIso(b) || 0) - Date.parse(storyTimeIso(a) || 0);
        });
        html += '<li class="feed-rest-head" role="presentation"><h2 class="feed-rest-label">' + escapeHtml(prettyChipLabel(key, key)) + "</h2></li>";
        bucket.forEach(function (s) {
          html += renderStoryItem(s, 1, false, false);
          html += takeBanner();
        });
      });
      if (boxedEvents.length) html += eventsBoxHtml(boxedEvents);
    } else {
      var groups = groupStoriesByDay(stories);
      groups.forEach(function (group, gi) {
        var items = group.items;
        html +=
          '<li class="feed-day-head" role="presentation">' +
            '<h2 class="feed-day-label">' + escapeHtml(group.label) + "</h2>" +
          "</li>";
        items.forEach(function (s, i) {
          html += renderStoryItem(s, i, false, false);
          html += takeBanner();
        });
      });
      if (boxedEvents.length) html += eventsBoxHtml(boxedEvents);
    }

    list.innerHTML = html;
    enableCardNavigation(list);
    renderTodayDeskModules();
    mountLeadScatter();
    afterContentPaint();
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
        sigHost.innerHTML = '<li class="desk-mod-empty">' + t("no_signals") + '</li>';
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
                '<p class="desk-mod-title"' + txSrc(title) + '>' + escapeHtml(title) + "</p>" +
                (body ? '<p class="desk-mod-text"' + txSrc(body) + '>' + escapeHtml(body) + "</p>" : "") +
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
        repHost.innerHTML = '<li class="desk-mod-empty">' + t("no_reports_yet") + '</li>';
      } else {
        repHost.innerHTML = reports.map(function (r) {
          var title = displayText(r.title || "").trim();
          var date = fmtDateShort(r.published_at) || fallbackTime(r.published_at);
          var href = r.url || "reports.html";
          return (
            '<li class="desk-mod-item">' +
              '<a href="' + escapeHtml(href) + '">' +
                '<p class="desk-mod-title"' + txSrc(title) + '>' + escapeHtml(title) + "</p>" +
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
      if (state.filter && state.filter !== "all" && !storyMatchesChip(s, state.filter)) return false;
      if (state.query) {
        var q = state.query.toLowerCase();
        var hay = [s.title, s.text, s.category, s.badge, s.source_list, s.analysis].join(" ").toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    if (!items.length) {
      list.innerHTML = '<li class="empty">' + t("no_signals_match") + '</li>';
      afterContentPaint();
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
        (s.engagement_score != null ? t("conf_pct", { n: s.engagement_score }) : "")
      ]);
      return (
        '<li class="feed-row" ' + staggerStyle(i) + ' data-href="story.html?id=' + encodeURIComponent("sigstory-" + s.id) + '" role="link" tabindex="0">' +
          '<div class="rank">' + (i + 1) + "</div>" +
          '<div class="feed-body">' +
            '<h2 class="story-title"><a href="story.html?id=' + encodeURIComponent("sigstory-" + s.id) + '"' + txSrc(title) + '>' +
              escapeHtml(title) + "</a></h2>" +
            (excerpt ? '<p class="excerpt"' + txSrc(excerpt) + '>' + escapeHtml(excerpt) + "</p>" : "") +
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
    afterContentPaint();
  }

  function newsletterIssues() {
    return Array.isArray(state.newsletter) ? state.newsletter : [];
  }

  function isDeskIssue(issue) {
    if (!issue) return false;
    if (issue.in_house === true || issue.origin === "desk" || issue.desk === true) return true;
    var authors = String(issue.authors || "");
    if (/Irena/i.test(authors)) return false;
    return false;
  }

  function findNewsletterIssue(id) {
    var slug = String(id || "").replace(/^nl-/, "");
    var items = newsletterIssues();
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === slug || items[i].slug === slug || items[i].id === id) return items[i];
    }
    return null;
  }

  function formatNewsletterDate(iso) {
    if (!iso) return "";
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso);
      return d.toLocaleDateString(window.anLoc ? window.anLoc() : "en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch (e) {
      return String(iso);
    }
  }

  function sanitizeNewsletterBody(html) {
    var box = document.createElement("div");
    box.innerHTML = String(html || "");
    box.querySelectorAll("script,style,iframe,object,embed,form,link,meta,video,audio").forEach(function (n) {
      n.remove();
    });
    box.querySelectorAll("a").forEach(function (a) {
      var href = String(a.getAttribute("href") || "");
      if (!/^https?:\/\//i.test(href)) a.removeAttribute("href");
      else {
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
      }
    });
    box.querySelectorAll("img").forEach(function (img) {
      var src = String(img.getAttribute("src") || "");
      if (!/^https?:\/\//i.test(src)) img.remove();
      else {
        img.setAttribute("loading", "lazy");
        img.removeAttribute("srcset");
        img.removeAttribute("onerror");
        img.removeAttribute("onclick");
      }
    });
    return box.innerHTML;
  }

  function setNewsletterMode(reading) {
    document.body.classList.toggle("nl-reading", !!reading);
    var merge = document.querySelector(".merge-strip");
    if (merge) merge.hidden = true;
    var layout = document.getElementById("nlListLayout") || document.querySelector(".page-layout");
    if (layout) layout.hidden = false;
  }

  function newsletterIssueHref(id) {
    return "newsletter.html?id=" + encodeURIComponent(id) + "&v=an119";
  }

  function openNewsletterIssue(id, push) {
    var url = newsletterIssueHref(id);
    if (push !== false) {
      try { history.pushState({ nl: id }, "", url); } catch (e) {}
    }
    renderNewsletter();
    var reader = document.getElementById("nlReader");
    if (reader) {
      try { reader.scrollIntoView({ block: "start", behavior: "smooth" }); }
      catch (err) { reader.scrollIntoView(true); }
    }
  }

  function bindNewsletterNav() {
    if (bindNewsletterNav.bound) return;
    bindNewsletterNav.bound = true;
    document.addEventListener("click", function (ev) {
      if (pageName() !== "newsletter") return;
      if (ev.defaultPrevented || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      if (ev.button) return;
      var a = ev.target && ev.target.closest ? ev.target.closest("a.nl-issue-link") : null;
      if (!a) return;
      var href = a.getAttribute("href") || "";
      var id = "";
      try { id = new URL(href, location.href).searchParams.get("id") || ""; } catch (e) {}
      if (!id) return;
      ev.preventDefault();
      openNewsletterIssue(id, true);
    });
    window.addEventListener("popstate", function () {
      if (pageName() === "newsletter") renderNewsletter();
    });
  }

  function renderNewsletterIssue(issue, opts) {
    var root = document.getElementById("nlReader");
    if (!root || !issue) return;
    opts = opts || {};
    setNewsletterMode(true);
    var title = issue.title || t("untitled");
    var dek = issue.subtitle || "";
    var date = formatNewsletterDate(issue.date);
    var authors = issue.authors || "Robert Scoble";
    var read = issue.reading_time || "";
    var desk = isDeskIssue(issue);
    var badge = desk ? "Unaligned" : t("archive");
    var credit = desk ? t("written_desk") : t("from_archive");
    var source = desk
      ? 'Ranked from Robert Scoble’s lists.'
      : t("nl_source_archive");
    root.hidden = false;
    root.innerHTML =
      '<header class="story-header">' +
        '<div class="article-kicker">' +
          '<span class="badge badge-signal">' + escapeHtml(badge) + "</span>" +
          '<span class="meta-line">' + escapeHtml([authors, date, read].filter(Boolean).join(" \u00b7 ")) + "</span>" +
        "</div>" +
        "<h1" + txSrc(title) + ">" + escapeHtml(title) + "</h1>" +
        (dek ? '<p class="article-dek"' + txSrc(dek) + '>' + escapeHtml(dek) + "</p>" : "") +
        '<p class="nl-credit">' + escapeHtml(credit) + "</p>" +
      "</header>" +
      '<div class="article-body nl-prose">' + sanitizeNewsletterBody(issue.body_html) + "</div>" +
      '<p class="nl-source">' + (desk ? source : escapeHtml(source)) + "</p>";
    document.title = title + " \u00b7 Unaligned \u00b7 Aligned News";
  }

  function renderPreviousIssues(current, items) {
    var list = $("#newsletterArchive");
    if (!list) return;
    var currentId = current && (current.id || current.slug);
    var rows = (items || []).filter(function (issue) {
      return (issue.id || issue.slug) !== currentId;
    });
    if (!rows.length) {
      list.innerHTML = '<li class="empty">' + t("no_earlier") + '</li>';
      list.classList.add("is-ready");
      return;
    }
    list.innerHTML = rows.map(function (issue, i) {
      var href = newsletterIssueHref(issue.id || issue.slug);
      var date = formatNewsletterDate(issue.date) || issue.date || "";
      var blurb = issue.excerpt || issue.subtitle || "";
      return (
        '<li class="nl-issue" ' + staggerStyle(i) + '>' +
          '<a class="nl-issue-link" href="' + href + '">' +
            (date ? '<span class="nl-issue-date">' + escapeHtml(date) + "</span>" : "") +
            '<h2 class="nl-issue-title"' + txSrc(issue.title) + '>' + escapeHtml(issue.title) + "</h2>" +
            (blurb ? '<p class="nl-issue-blurb"' + txSrc(blurb) + '>' + escapeHtml(blurb) + "</p>" : "") +
          "</a>" +
        "</li>"
      );
    }).join("");
    list.classList.add("is-ready");
    afterContentPaint();
  }

  function renderNewsletter() {
    var id = getParam("id");
    var root = document.getElementById("nlReader");
    var all = newsletterIssues().slice();
    var items = all;
    if (state.query) {
      var q = state.query.toLowerCase();
      items = all.filter(function (issue) {
        return [issue.title, issue.subtitle, issue.excerpt, issue.authors, issue.date].join(" ").toLowerCase().indexOf(q) !== -1;
      });
    }
    var issue = id ? findNewsletterIssue(id) : (items[0] || all[0] || null);
    if (id && !issue) {
      setNewsletterMode(true);
      if (root) {
        root.hidden = false;
        root.innerHTML = '<p class="status error">' + t("issue_not_found") + ' <a href="newsletter.html">' + t("back_nl") + '</a></p>';
      }
      renderPreviousIssues(null, items.length ? items : all);
      afterContentPaint();
      return;
    }
    if (!issue) {
      if (root) {
        root.hidden = false;
        root.innerHTML = '<p class="status">' + t("no_issues") + '</p>';
      }
      renderPreviousIssues(null, []);
      afterContentPaint();
      return;
    }
    renderNewsletterIssue(issue, { standalone: false });
    renderPreviousIssues(issue, state.query ? items : all);
    var metaEl = $("#pageMeta");
    if (metaEl) {
      var n = Math.max(0, (state.query ? items : all).length - 1);
      metaEl.textContent = n === 1 ? t("nl_issue_one") : t("nl_issues", { n: n });
    }
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
      list.innerHTML = '<li class="empty">' + t("no_reports") + '</li>';
      afterContentPaint();
      return;
    }
    list.innerHTML = items.map(function (r, i) {
      return (
        '<li class="report-item" ' + staggerStyle(i) + '>' +
          "<h2" + txSrc(displayText(r.title)) + ">" + escapeHtml(displayText(r.title)) + "</h2>" +
          (r.summary ? "<p" + txSrc(firstSentence(r.summary, 200)) + ">" + escapeHtml(firstSentence(r.summary, 200)) + "</p>" : "") +
          '<div class="meta"><span class="meta-line">' + escapeHtml(joinMeta([
            (r.type || "report").replace(/_/g, " "),
            r.reading_time_min ? t("min_read", { n: r.reading_time_min }) : "",
            fallbackTime(r.published_at),
            r.author || ""
          ])) + "</span></div>" +
        "</li>"
      );
    }).join("");
    afterContentPaint();
  }

  function findStory(id) {
    var stories = (state.data && state.data.stories) || [];
    for (var i = 0; i < stories.length; i++) if (stories[i].id === id) return stories[i];
    var kept = savedSnapshot(id);
    if (kept) return kept;
    if (!state.data) return null;
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

  function realSourceUrl(value) {
    var url = String(value || "").trim();
    return /^https?:\/\//i.test(url) ? url : "";
  }

  function uniqueStorySources(story) {
    var out = [];
    var seen = {};
    function add(url, label) {
      url = realSourceUrl(url);
      if (!url) return;
      var key = url.replace(/\/$/, "").toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      var host = "Source";
      try { host = new URL(url).hostname.replace(/^www\./, ""); } catch (e) {}
      label = displayText(label || "").trim();
      if (!label || label.toLowerCase() === host.toLowerCase() || /^(source|story)$/i.test(label)) {
        label = url === realSourceUrl(story.source_url) ? t("original_post") : t("source");
      }
      out.push({ url: url, label: label, host: host });
    }
    (story.sources || []).forEach(function (source) {
      if (!source) return;
      var raw = source.name || source.label || source.title || "";
      var m = String(raw).match(/^Original X post by @([A-Za-z0-9_]+)$/i);
      add(source.url, m ? t("original_x_post", { user: m[1] }) : raw);
    });
    add(story.source_url, story.source_list || t("original_post"));
    return out;
  }

  function normalizedStoryCopy(value) {
    return displayText(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }

  function storyDeskRank(story) {
    var stories = (state.data && state.data.stories ? state.data.stories.slice() : []);
    if (!stories.some(function (item) { return item.id === story.id; })) stories.push(story);
    stories = stories.filter(function (item) { return !isEventItem(item); });
    stories.sort(function (a, b) {
      var score = rankScore(b) - rankScore(a);
      if (score) return score;
      var time = Date.parse(storyTimeIso(b) || 0) - Date.parse(storyTimeIso(a) || 0);
      if (time) return time;
      return String(a.id || "").localeCompare(String(b.id || ""));
    });
    for (var i = 0; i < stories.length; i++) if (stories[i].id === story.id) return i + 1;
    return Number(story.desk_rank) || 0;
  }

  function compactCount(value) {
    value = Number(value);
    if (!isFinite(value) || value <= 0) return "";
    if (value < 1000) return String(Math.round(value));
    var units = [
      { div: 1e9, suffix: "B" },
      { div: 1e6, suffix: "M" },
      { div: 1e3, suffix: "K" }
    ];
    for (var i = 0; i < units.length; i++) {
      if (value >= units[i].div) {
        var n = value / units[i].div;
        var s = n >= 100 ? n.toFixed(0) : n.toFixed(1);
        s = s.replace(/\.0$/, "");
        return s + units[i].suffix;
      }
    }
    return String(Math.round(value));
  }

  function measuredValue(value) {
    return compactCount(value) || t("not_measured");
  }

  function intelIcon(kind) {
    var d = {
      like: '<path d="M12 21s-6.8-4.35-9.2-8.15C.7 9.6 2.15 6 5.9 6c2.05 0 3.4 1.15 4.1 2.2C10.7 7.15 12.05 6 14.1 6c3.75 0 5.2 3.6 3.1 6.85C18.8 16.65 12 21 12 21z"/>',
      reply: '<path d="M21 11.5a8.4 8.4 0 0 1-12.2 7.5L3 20.5l1.6-4.6A8.4 8.4 0 1 1 21 11.5z"/>',
      repost: '<path d="M17 4l3.5 3.5L17 11"/><path d="M7 20l-3.5-3.5L7 13"/><path d="M20.5 7.5H9"/><path d="M3.5 16.5H15"/>',
      save: '<path d="M7 4h10v16l-5-3.2L7 20V4z"/>'
    };
    return '<svg class="story-intel-ico" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">' + (d[kind] || "") + "</svg>";
  }

  function intelReaction(kind, label, count) {
    var n = compactCount(count);
    if (!n) return "";
    return "<li class=\"story-intel-stat\"><span class=\"sr-only\">" + escapeHtml(label) + "</span>" + intelIcon(kind) + "<strong>" + escapeHtml(n) + "</strong><span>" + escapeHtml(label) + "</span></li>";
  }

  function sentimentValue(value) {
    if (value == null || value === "") return "";
    value = Number(value);
    if (!isFinite(value)) return "";
    if (Math.abs(value) <= 1) value *= 100;
    return Math.round(value) + "%";
  }

  function sentimentHtml(story) {
    var sentiment = story.sentiment;
    var sample = sentiment && Number(sentiment.sample_size);
    if (!sentiment || !isFinite(sample) || sample <= 0) {
      return "<p class=\"sentiment-empty-line\">" + t("not_enough_reactions") + "</p>";
    }
    var positive = sentimentValue(sentiment.positive);
    var negative = sentimentValue(sentiment.negative);
    var posN = parseFloat(positive) || 0;
    var negN = parseFloat(negative) || 0;
    var bar = "<div class=\"sentiment-bar\" role=\"img\" aria-label=\"" + t("sentiment_mix") + "\"><span class=\"sentiment-bar-pos\" style=\"flex-grow:" + posN + "\"></span><span class=\"sentiment-bar-neg\" style=\"flex-grow:" + Math.max(negN, 0.01) + "\"></span></div>";
    var read = sentiment.summary
      ? "<p" + txSrc(displayText(sentiment.summary)) + ">" + escapeHtml(displayText(sentiment.summary)) + "</p>"
      : "<p>" + escapeHtml(positive || "0%") + " " + t("positive") + " · " + escapeHtml(negative || "0%") + " " + t("negative") + " · " + escapeHtml(sample.toLocaleString(window.anLoc ? window.anLoc() : undefined)) + " " + t("public_reactions") + "</p>";
    return "<section class=\"sentiment-panel sentiment-has\"><div class=\"story-panel-heading\"><span>" + t("sentiment") + "</span></div>" + bar + read + "</section>";
  }

  function renderStory() {
    var root = $("#article");
    if (!root) return;
    var story = findStory(getParam("id"));
    if (!story) {
      root.innerHTML = "<p class=\"status error\">" + t("story_not_found") + " <a href=\"index.html\">" + t("back_today") + "</a></p>";
      afterContentPaint();
      return;
    }
    if (state.read.indexOf(story.id) === -1) {
      state.read.push(story.id);
      persistRead();
    }

    var saved = isSavedId(story.id);
    var title = editorialTitle(story, 110);
    var summary = displayText(story.summary || "").trim();
    var body = displayText(story.body || "").trim();
    var whatHappened = summary || body;
    if (!whatHappened) whatHappened = title;
    var why = displayText(story.why_it_matters || "").trim();
    var whyIsDifferent = why && normalizedStoryCopy(why) !== normalizedStoryCopy(whatHappened) && normalizedStoryCopy(why) !== normalizedStoryCopy(title);
    var watch = displayText(story.what_to_watch || story.watch || story.watch_next || "").trim();
    var sourceUrl = realSourceUrl(story.source_url);
    var sources = uniqueStorySources(story);
    var media = storyMediaUrl(story);
    var rank = storyDeskRank(story);
    var engagement = story.engagement || {};
    var views = Number(engagement.impression_count || engagement.view_count || story.views || story.view_count || 0);
    var likes = Number(engagement.like_count || 0);
    var replies = Number(engagement.reply_count || 0);
    var reposts = Number(engagement.retweet_count || 0);
    var bookmarks = Number(engagement.bookmark_count || 0);
    var handle = String(story.x_handle || xHandleFrom(story) || "").replace(/^@/, "");
    var author = displayText(story.author_name || handle || story.source_list || t("original_source"));
    var originalText = "";

    var firstSeen = story.published_at ? fallbackTime(story.published_at) : "";
    var sourceBit = sources.length ? (String(sources.length) + " " + (sources.length === 1 ? t("source_one") : t("sources"))) : "";
    var subBits = [];
    if (sourceBit) subBits.push(sourceBit);
    if (firstSeen) subBits.push(t("first_seen") + " " + firstSeen);
    var viewsLabel = compactCount(views) || t("not_measured");
    var rankHtml = rank
      ? "<div class=\"story-intel-hero\"><span class=\"story-intel-kicker\">" + t("desk_rank") + "</span><strong class=\"story-intel-num\">#" + rank + "</strong></div>"
      : "";
    var viewsHtml = "<div class=\"story-intel-hero\"><span class=\"story-intel-kicker\">" + t("views") + "</span><strong class=\"story-intel-num\">" + escapeHtml(viewsLabel) + "</strong>" +
      (subBits.length ? "<p class=\"story-intel-sub\">" + escapeHtml(subBits.join(" · ")) + "</p>" : "") + "</div>";
    var reactions = [
      intelReaction("like", t("likes"), likes),
      intelReaction("reply", t("replies"), replies),
      intelReaction("repost", t("reposts"), reposts),
      intelReaction("save", t("saves"), bookmarks)
    ].filter(Boolean).join("");
    var intelHtml = "<section class=\"story-intel\" aria-label=\"" + t("original_metrics") + "\">" +
      "<div class=\"story-intel-heroes\">" + rankHtml + viewsHtml + "</div>" +
      (reactions ? "<ul class=\"story-intel-reactions\">" + reactions + "</ul>" : "") +
      "</section>";

    var originalHtml = sourceUrl ? (
      "<section class=\"story-block original-post-section\"><h2>" + t("original_post") + "</h2>" +
        "<a class=\"original-post-card\" href=\"" + escapeHtml(sourceUrl) + "\" target=\"_blank\" rel=\"noopener\">" +
          "<span class=\"original-post-meta\"><span><strong>" + escapeHtml(author) + "</strong>" + (handle ? " <span>@" + escapeHtml(handle) + "</span>" : "") + "</span><time>" + escapeHtml(story.published_at ? fallbackTimeLong(story.published_at) : "") + "</time></span>" +
          (media ? "<span class=\"original-post-media\"><img src=\"" + escapeHtml(String(media)) + "\" alt=\"\" loading=\"lazy\" referrerpolicy=\"no-referrer\"></span>" : "") +
          "<span class=\"open-on-x\">" + t("open_on_x") + "</span>" +
        "</a></section>"
    ) : "";

    var usefulLinksHtml = sources.length ? (
      "<section class=\"story-block useful-links\"><h2>" + t("useful_links") + "</h2><div class=\"useful-link-grid\">" +
      sources.map(function (source) {
        return "<a href=\"" + escapeHtml(source.url) + "\" target=\"_blank\" rel=\"noopener\"><strong>" + escapeHtml(source.label) + "</strong><span>" + escapeHtml(source.host) + " ↗</span></a>";
      }).join("") + "</div></section>"
    ) : "";

    var paras = storyBodyParagraphs(story).slice(0, 3);
    if (!paras.length && whatHappened) paras = [whatHappened];
    var articleHtml = paras.map(function (p) {
      return "<p" + txSrc(p) + ">" + escapeHtml(p) + "</p>";
    }).join("");
    var heroHtml = (media && !isAvatarMedia(media))
      ? "<div class=\"story-lead-media\"><img src=\"" + escapeHtml(String(media)) + "\" alt=\"\" loading=\"eager\" referrerpolicy=\"no-referrer\"></div>"
      : "";

    var topic = story.topic_key || topicKeyFor(story);
    var related = (state.data.stories || []).filter(function (item) {
      return item.id !== story.id && !isEventItem(item) && (item.topic_key || topicKeyFor(item)) === topic;
    }).sort(function (a, b) { return rankScore(b) - rankScore(a); }).slice(0, 3);
    var relatedHtml = related.length ? (
      "<section class=\"story-block related\"><h2>" + t("related") + "</h2><div class=\"related-card-grid\">" +
      related.map(function (item) {
        var relatedTitle = editorialTitle(item, 88);
        var relatedDek = uniqueDek(item, relatedTitle, 130);
        return "<a class=\"related-card\" href=\"story.html?id=" + encodeURIComponent(item.id) + "\"><span class=\"related-card-meta\">" + escapeHtml(joinMeta([item.topic_label || labelFor(item.topic_key || topicKeyFor(item)), fallbackTime(item.published_at)])) + "</span><strong" + txSrc(relatedTitle) + ">" + escapeHtml(relatedTitle) + "</strong>" + (relatedDek ? "<span" + txSrc(relatedDek) + ">" + escapeHtml(relatedDek) + "</span>" : "") + "</a>";
      }).join("") + "</div></section>"
    ) : "";

    root.innerHTML =
      "<a class=\"back-link\" href=\"index.html\">← " + t("back_today") + "</a>" +
      "<header class=\"story-header\"><div class=\"article-kicker\"><span class=\"badge badge-signal\">" + escapeHtml(story.topic_label || labelFor(topic)) + "</span><span class=\"meta-line\">" + escapeHtml(storyMetaLine(story)) + "</span></div><h1" + txSrc(title) + ">" + escapeHtml(title) + "</h1></header>" +
      intelHtml +
      heroHtml +
      originalHtml +
      "<div class=\"article-actions article-actions-quiet\"><button type=\"button\" class=\"text-action\" id=\"saveBtn\">" + (saved ? t("saved") : t("save_later")) + "</button><button type=\"button\" class=\"text-action\" id=\"readBtn\">" + t("mark_unread") + "</button></div>" +
      "<div class=\"story-layout\"><div class=\"story-main\">" +
        "<section class=\"story-block story-explainer\"><div class=\"story-prose\">" + articleHtml + "</div></section>" +
        (whyIsDifferent ? "<section class=\"story-block story-explainer\"><h2>" + t("why_it_matters") + "</h2><div class=\"story-prose\"><p" + txSrc(why) + ">" + escapeHtml(why) + "</p></div></section>" : "") +
        (watch ? "<section class=\"story-block story-explainer\"><h2>" + t("what_to_watch") + "</h2><div class=\"story-prose\"><p" + txSrc(watch) + ">" + escapeHtml(watch) + "</p></div></section>" : "") +
        usefulLinksHtml + relatedHtml +
      "</div><aside class=\"story-aside\">" + sentimentHtml(story) + "</aside></div>";

    var saveBtn = $("#saveBtn");
    if (saveBtn) saveBtn.addEventListener("click", function () {
      var nowSaved = toggleSavedStory(story);
      saveBtn.textContent = nowSaved ? t("saved") : t("save_later");
    });
    var readBtn = $("#readBtn");
    if (readBtn) readBtn.addEventListener("click", function () {
      state.read = state.read.filter(function (id) { return id !== story.id; });
      persistRead();
      readBtn.textContent = t("marked_unread");
    });
    afterContentPaint();
  }


  var GOD_MODE_BOOT_SRC = "god-mode/boot.js?v=an169";
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
      var focus = document.getElementById("chromeToggle");
      var auth = document.getElementById("authCta");
      if (auth) actions.insertBefore(el, auth);
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
    bindLeadScatterMedia();

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

    if (sidebar) {
      sidebar.addEventListener("click", function (ev) {
        var t = ev.target;
        while (t && t !== sidebar && !(t.id === "themeToggleSide") && !(t.classList && t.classList.contains("sidebar-lang"))) t = t.parentNode;
        if (t && t.id === "themeToggleSide") toggleTheme();
        if (t && t.getAttribute && t.getAttribute("data-lang") && window.anSetLang) {
          window.anSetLang(t.getAttribute("data-lang"));
        }
      });
    }
    syncThemeButtons();

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
    bindNewsletterNav();
  }

  function setTitle(page) {
    var base = "Aligned News";
    if (page === "today") document.title = (getParam("view") === "saved" ? t("saved") : t("today")) + " · " + base;
    else if (page === "signals") document.title = t("signals") + " · " + base;
    else if (page === "reports") document.title = t("reports") + " · " + base;
    else if (page === "newsletter") document.title = (getParam("id") ? t("issue") : t("newsletter")) + " · " + base;
    else if (page === "story") document.title = "Story · " + base;
  }

  function boot() {
    applyPrefs();
    bindShell();
    setTitle(pageName());
    killEdgeGlowDom();
    wireMobileDockMq();
    renderMobileDock(pageName());
    ensureHeaderLang();
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
    var liveP = fetch(DATA_URL, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("Could not load " + DATA_URL);
        return res.json();
      });
    var newsP = pageName() === "newsletter"
      ? fetch(NEWSLETTER_DATA_URL, { cache: "no-store" })
          .then(function (res) {
            if (!res.ok) throw new Error("Could not load " + NEWSLETTER_DATA_URL);
            return res.json();
          })
          .then(function (nl) {
            state.newsletter = (nl && nl.issues) || [];
          })
          .catch(function (err) {
            console.error(err);
            state.newsletter = [];
          })
      : Promise.resolve();
    var txP = window.anTxReady || Promise.resolve();
    Promise.all([liveP, newsP, txP])
      .then(function (pair) {
        var data = pair[0];
        state.data = normalizeData(data);
        var section = getParam("section");
        if (section) state.filter = section;
        renderChrome();
        renderChips("#chips");
        var page = pageName();
        hideFeedSkeletonThen(function () {
          if (page === "today") {
            var h = $("#pageTitle");
            if (h) h.textContent = getParam("view") === "saved" ? t("saved") : t("today");
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
          if (window.anTranslatePage) window.anTranslatePage();
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
          status.textContent = t("could_not_load");
        }
        console.error(err);
        document.documentElement.removeAttribute("data-loading");
        stopLoadWhisper();
        hideFeedSkeletonThen(null);
        hideThinLoadBar();
      });
  }

  window.anOnLangChange = function () {
    try {
      renderChrome();
      renderChips("#chips");
      var page = pageName();
      if (page === "today") {
        var h = $("#pageTitle");
        if (h) h.textContent = getParam("view") === "saved" ? t("saved") : t("today");
        setTitle(page);
        renderForYou();
        renderTodayFeed();
      } else if (page === "signals") {
        setTitle(page);
        renderSignals();
      } else if (page === "reports") {
        setTitle(page);
        renderReports();
      } else if (page === "newsletter") {
        setTitle(page);
        renderNewsletter();
      } else if (page === "story") {
        renderStory();
      } else if (page === "auth") {
        renderChrome();
      }
      afterContentPaint();
      try { document.dispatchEvent(new CustomEvent("an-lang")); } catch (e2) {}
    } catch (e) {}
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
