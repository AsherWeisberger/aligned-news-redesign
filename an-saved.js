/* Aligned News saved desk — per-user local snapshots (Clerk-keyed when known).
   Storage key: alignednews-saved-v1 or alignednews-saved-v1:userId (never UNIFY / ops.html keys). */
(function (global) {
  "use strict";

  var BASE_KEY = "alignednews-saved-v1";
  var LEGACY_KEY = "an-saved";
  var CHANGE_EVENT = "an-saved-change";
  var userId = null;
  var items = [];
  var loaded = false;

  function storageKey() {
    return userId ? BASE_KEY + ":" + userId : BASE_KEY;
  }

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (e) { return value; }
  }

  function snapshot(story) {
    if (!story || !story.id) return null;
    return {
      id: story.id,
      headline: story.headline || story.title || "",
      summary: story.summary || story.text || "",
      reader_summary: story.reader_summary,
      list_count: story.list_count,
      list_names: story.list_names,
      desk_rank: story.desk_rank,
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
      url: story.url || story.source_url || null,
      saved_at: new Date().toISOString()
    };
  }

  function normalize(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map(function (item) {
      if (item && typeof item === "object" && item.id) return item;
      if (typeof item === "string" && item) return { id: item, headline: "" };
      return null;
    }).filter(Boolean);
  }

  function readKey(name) {
    try { return JSON.parse(global.localStorage.getItem(name) || "[]"); }
    catch (e) { return []; }
  }

  function emitChange() {
    try {
      global.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { count: items.length } }));
    } catch (e) {}
  }

  function persist() {
    try { global.localStorage.setItem(storageKey(), JSON.stringify(items)); } catch (e) {}
    emitChange();
  }

  function load() {
    var key = storageKey();
    var fresh = normalize(readKey(key));
    if (fresh.length) {
      items = fresh;
      loaded = true;
      return items;
    }
    if (!userId) {
      var legacy = normalize(readKey(LEGACY_KEY));
      if (legacy.length) {
        items = legacy;
        persist();
        try { global.localStorage.removeItem(LEGACY_KEY); } catch (e) {}
        loaded = true;
        return items;
      }
    }
    items = [];
    loaded = true;
    return items;
  }

  function ensureLoaded() {
    if (!loaded) load();
  }

  function entryId(entry) {
    return entry && (entry.id || entry);
  }

  function isSaved(id) {
    ensureLoaded();
    id = String(id || "");
    for (var i = 0; i < items.length; i++) {
      if (String(entryId(items[i])) === id) return true;
    }
    return false;
  }

  function find(id) {
    ensureLoaded();
    id = String(id || "");
    for (var i = 0; i < items.length; i++) {
      var entry = items[i];
      if (String(entryId(entry)) === id) return entry.headline ? entry : null;
    }
    return null;
  }

  function toggle(story) {
    ensureLoaded();
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
    ensureLoaded();
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

  /** Call when Clerk user id is known (or null for guest). Reloads that user's list. */
  function setUserId(id) {
    var next = id ? String(id) : null;
    if (next === userId && loaded) return;
    userId = next;
    loaded = false;
    load();
    emitChange();
  }

  global.AlignedSaved = {
    KEY: BASE_KEY,
    SAVED_CHANGE_EVENT: CHANGE_EVENT,
    load: load,
    persist: persist,
    snapshot: snapshot,
    isSaved: isSaved,
    find: find,
    toggle: toggle,
    storiesForFeed: storiesForFeed,
    setUserId: setUserId,
    all: function () { ensureLoaded(); return items; },
    count: function () { ensureLoaded(); return items.length; }
  };
})(window);
