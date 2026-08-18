/* Aligned News saved desk — local snapshots, separate from UNIFY.
   Storage key: alignednews-saved-v1 (never UNIFY / ops.html keys). */
(function (global) {
  "use strict";

  var KEY = "alignednews-saved-v1";
  var LEGACY_KEY = "an-saved";
  var items = [];

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (e) { return value; }
  }

  function snapshot(story) {
    if (!story || !story.id) return null;
    return {
      id: story.id,
      headline: story.headline || story.title || "",
      summary: story.summary || story.text || "",
      body: story.body || "",
      section: story.section,
      section_key: story.section_key,
      section_label: story.section_label,
      tag: story.tag,
      published_at: story.published_at || story.created_at,
      author_name: story.author_name,
      source_list: story.source_list,
      source_url: story.source_url,
      sources: story.sources,
      kind: story.kind,
      engagement: story.engagement,
      why_it_matters: story.why_it_matters,
      topic_key: story.topic_key,
      topic_label: story.topic_label,
      x_handle: story.x_handle,
      media_url: story.media_url,
      saved_at: new Date().toISOString()
    };
  }

  function normalize(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map(function (item) {
      if (item && typeof item === "object" && item.id) return item;
      if (typeof item === "string" && item) return { id: item };
      return null;
    }).filter(Boolean);
  }

  function readKey(name) {
    try { return JSON.parse(global.localStorage.getItem(name) || "[]"); }
    catch (e) { return []; }
  }

  function load() {
    var fresh = normalize(readKey(KEY));
    if (fresh.length) {
      items = fresh;
      return items;
    }
    var legacy = normalize(readKey(LEGACY_KEY));
    if (legacy.length) {
      items = legacy;
      persist();
      try { global.localStorage.removeItem(LEGACY_KEY); } catch (e) {}
    } else {
      items = [];
    }
    return items;
  }

  function persist() {
    try { global.localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {}
  }

  function entryId(entry) {
    return entry && (entry.id || entry);
  }

  function isSaved(id) {
    id = String(id || "");
    for (var i = 0; i < items.length; i++) {
      if (String(entryId(items[i])) === id) return true;
    }
    return false;
  }

  function find(id) {
    id = String(id || "");
    for (var i = 0; i < items.length; i++) {
      var entry = items[i];
      if (String(entryId(entry)) === id) return entry.headline ? entry : null;
    }
    return null;
  }

  function toggle(story) {
    if (!story || !story.id) return false;
    var id = String(story.id);
    for (var i = 0; i < items.length; i++) {
      if (String(entryId(items[i])) === id) {
        items.splice(i, 1);
        persist();
        return false;
      }
    }
    var snap = snapshot(story);
    if (snap) items.unshift(snap);
    persist();
    return true;
  }

  function storiesForFeed(live) {
    var liveById = {};
    (live || []).forEach(function (s) { if (s && s.id) liveById[s.id] = s; });
    var out = [];
    items.forEach(function (entry) {
      var id = entryId(entry);
      if (liveById[id]) out.push(liveById[id]);
      else if (entry && entry.headline) out.push(entry);
    });
    return out;
  }

  global.AlignedSaved = {
    KEY: KEY,
    load: load,
    persist: persist,
    snapshot: snapshot,
    isSaved: isSaved,
    find: find,
    toggle: toggle,
    storiesForFeed: storiesForFeed,
    all: function () { return items; },
    count: function () { return items.length; }
  };
})(window);
