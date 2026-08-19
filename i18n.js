/* an125: English / Español for chrome + live story text */
(function () {
  var KEY = "an-lang";
  var CACHE_KEY = "an-tx-es-v1";
  var dict = {
    en: {
      today: "Today",
      yesterday: "Yesterday",
      earlier: "Earlier",
      stories: "Stories",
      signals: "Signals",
      reports: "Reports",
      newsletter: "Newsletter",
      news: "News",
      saved: "Saved",
      browse: "Browse",
      collabs: "Collabs",
      search: "Search",
      search_ph: "Search stories & signals",
      sign_up_login: "Sign up / Login",
      dark_mode: "Dark mode",
      light_mode: "Light mode",
      switch_dark: "Switch to dark mode",
      switch_light: "Switch to light mode",
      lang_to_es: "Español",
      lang_to_en: "English",
      sponsors: "Sponsors",
      viture_line: "XR glasses that turn your phone, laptop, or console into a private cinema screen.",
      subscribe: "Subscribe",
      youre_in: "You’re in",
      email: "Email address",
      why_matters: "Why this matters",
      why_copy: "Aligned News watches Scoble’s 63 hand-curated X lists, ranks what crosses lists and keywords, and surfaces the signal before the timeline does.",
      lists_title: "63 lists",
      lists_kicker: "Scoble’s curated X lists.",
      lists_copy: "AI Community, AI Leaders, AI Newsmakers, Investors, Companies, Robot AI, AR/VR, Spatial, Crypto, News, Neuroscience, Quantum, Security, and more.",
      lists_together: "Together: the most comprehensive real-time view of the AI ecosystem.",
      topics: "Topics",
      topics_copy: "Filter by topic — list provenance stays in each row.",
      last7: "Last 7 days",
      last7_copy: "Desk velocity across models, agents, and companies.",
      open_menu: "Open menu",
      god_mode: "God Mode",
      expanded: "Expanded",
      compact: "Compact",
      feed_density: "Feed density",
      events: "Events",
      no_stories: "No stories match this filter.",
      no_events: "No events on the desk.",
      no_signals: "No signals yet.",
      back_today: "Back to Today",
      desk_rank: "Today’s rank",
      scoble_pro: "Scoble’s lists · Pro desk",
      scoble_free: "Scoble’s lists · Free desk",
      pro_desk: "Pro desk",
      free_desk: "Free desk",
      curated: "Curated to you — interests first, then the rest of the desk.",
      updated: "Updated",
      nl_kicker: "Unaligned",
      nl_headline: "The X-list briefing, written here.",
      nl_sub: "The AI conversation on X. Weekdays at 1 p.m. PT.",
      nl_meta: "X-list briefing · written here",
      ranked_from: "Ranked from Scoble’s curated X lists — not from ads.",
      saved_copy: "Save stories from Today or Signals to build a shortlist worth revisiting — your private desk list.",
      primary: "Primary",
      filter_topic: "Filter by topic",
      stories_n: "stories",
      signals_n: "signals",
      reports_n: "reports",
      on_desk: "on the desk this sweep —"
    },
    es: {
      today: "Hoy",
      yesterday: "Ayer",
      earlier: "Antes",
      stories: "Historias",
      signals: "Señales",
      reports: "Reportes",
      newsletter: "Boletín",
      news: "News",
      saved: "Guardado",
      browse: "Explorar",
      collabs: "Colabs",
      search: "Buscar",
      search_ph: "Buscar historias y señales",
      sign_up_login: "Registrarse / Entrar",
      dark_mode: "Modo oscuro",
      light_mode: "Modo claro",
      switch_dark: "Cambiar a modo oscuro",
      switch_light: "Cambiar a modo claro",
      lang_to_es: "Español",
      lang_to_en: "English",
      sponsors: "Patrocinadores",
      viture_line: "Gafas XR que convierten tu teléfono, laptop o consola en una pantalla de cine privada.",
      subscribe: "Suscribirse",
      youre_in: "Ya estás dentro",
      email: "Correo",
      why_matters: "Por qué importa",
      why_copy: "Aligned News observa las 63 listas de X que curó Scoble, ordena lo que cruza listas y palabras clave, y saca la señal antes que el timeline.",
      lists_title: "63 listas",
      lists_kicker: "Las listas de X que curó Scoble.",
      lists_copy: "AI Community, AI Leaders, AI Newsmakers, Investors, Companies, Robot AI, AR/VR, Spatial, Crypto, News, Neuroscience, Quantum, Security y más.",
      lists_together: "Juntas: la vista en tiempo real más completa del ecosistema de IA.",
      topics: "Temas",
      topics_copy: "Filtra por tema. La lista de origen se queda en cada fila.",
      last7: "Últimos 7 días",
      last7_copy: "Ritmo del escritorio entre modelos, agentes y compañías.",
      open_menu: "Abrir menú",
      god_mode: "God Mode",
      expanded: "Ampliado",
      compact: "Compacto",
      feed_density: "Densidad del feed",
      events: "Eventos",
      no_stories: "Ninguna historia coincide con este filtro.",
      no_events: "No hay eventos en el escritorio.",
      no_signals: "Aún no hay señales.",
      back_today: "Volver a Hoy",
      desk_rank: "Puesto de hoy",
      scoble_pro: "Listas de Scoble · escritorio Pro",
      scoble_free: "Listas de Scoble · escritorio Free",
      pro_desk: "escritorio Pro",
      free_desk: "escritorio Free",
      curated: "Curado para ti: primero tus intereses, después el resto del escritorio.",
      updated: "Actualizado",
      nl_kicker: "Unaligned",
      nl_headline: "El briefing de las listas de X, escrito aquí.",
      nl_sub: "La conversación de IA en X. Entre semana a la 1 p.m. PT.",
      nl_meta: "Briefing de listas de X · escrito aquí",
      ranked_from: "Ordenado desde las listas de X que curó Scoble, no desde anuncios.",
      saved_copy: "Guarda historias de Hoy o Señales para armar una lista corta que valga volver a ver.",
      primary: "Principal",
      filter_topic: "Filtrar por tema",
      stories_n: "historias",
      signals_n: "señales",
      reports_n: "reportes",
      on_desk: "en el escritorio de este barrido —"
    }
  };

  function getLang() {
    try {
      var v = localStorage.getItem(KEY);
      if (v === "es" || v === "en") return v;
    } catch (e) {}
    return "en";
  }

  function setLang(next) {
    var lang = next === "es" ? "es" : "en";
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    document.documentElement.lang = lang === "es" ? "es" : "en";
    document.documentElement.setAttribute("data-lang", lang);
    if (typeof window.anOnLangChange === "function") window.anOnLangChange(lang);
  }

  function t(key) {
    var lang = getLang();
    var pack = dict[lang] || dict.en;
    if (pack[key] != null) return pack[key];
    return (dict.en[key] != null) ? dict.en[key] : key;
  }

  function loc() {
    return getLang() === "es" ? "es-ES" : "en-US";
  }

  var cache = {};
  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") || {}; } catch (e) { cache = {}; }
  function saveCache() {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch (e) {}
  }

  function skipText(s) {
    var t0 = String(s || "").trim();
    if (t0.length < 4) return true;
    if (/^https?:|^[\d#@.,:\s]+$/i.test(t0)) return true;
    if (/^(Aligned News|Aligned|VITURE|UNALIGNED|Unaligned|Scoble|Pro|Free|LIVE)$/i.test(t0)) return true;
    return false;
  }

  function translateRemote(text) {
    if (getLang() !== "es") return Promise.resolve(text);
    if (skipText(text)) return Promise.resolve(text);
    if (cache[text]) return Promise.resolve(cache[text]);
    var q = encodeURIComponent(text.slice(0, 480));
    var url = "https://api.mymemory.translated.net/get?langpair=en|es&q=" + q;
    return fetch(url).then(function (r) { return r.json(); }).then(function (j) {
      var out = j && j.responseData && j.responseData.translatedText;
      if (out && !/MYMEMORY WARNING/i.test(out)) {
        cache[text] = out;
        saveCache();
        return out;
      }
      return text;
    }).catch(function () { return text; });
  }

  function applyStatic() {
    var nodes = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var key = el.getAttribute("data-i18n");
      if (!key) continue;
      var val = t(key);
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") el.placeholder = val;
      else el.textContent = val;
    }
    var ph = document.querySelectorAll("[data-i18n-placeholder]");
    for (var p = 0; p < ph.length; p++) ph[p].placeholder = t(ph[p].getAttribute("data-i18n-placeholder"));
    var ar = document.querySelectorAll("[data-i18n-aria]");
    for (var a = 0; a < ar.length; a++) ar[a].setAttribute("aria-label", t(ar[a].getAttribute("data-i18n-aria")));
    var ti = document.querySelectorAll("[data-i18n-title]");
    for (var b = 0; b < ti.length; b++) ti[b].title = t(ti[b].getAttribute("data-i18n-title"));
  }

  var walkTimer = null;
  function translatePage() {
    applyStatic();
    if (getLang() !== "es") return;
    clearTimeout(walkTimer);
    walkTimer = setTimeout(runWalk, 40);
  }

  function runWalk() {
    var roots = document.querySelectorAll(".feed, .article, .lead-card, .desk-mod-list, .nl-subscribe, .sponsors-in-feed, .rail-card-partners, .why-here, .original-post-copy");
    var nodes = [];
    function collect(node) {
      if (!node) return;
      if (node.nodeType === 3) {
        var s = node.nodeValue;
        if (s && s.trim() && !skipText(s)) nodes.push(node);
        return;
      }
      if (node.nodeType !== 1) return;
      if (node.hasAttribute && (node.hasAttribute("data-i18n") || node.hasAttribute("data-no-tx"))) return;
      if (node.closest && node.closest(".brand, .count, script, style, svg, .avatar, .partners-logo")) return;
      var kids = node.childNodes;
      for (var i = 0; i < kids.length; i++) collect(kids[i]);
    }
    for (var r = 0; r < roots.length; r++) collect(roots[r]);
    var uniq = [];
    var seen = {};
    for (var n = 0; n < nodes.length; n++) {
      var raw = nodes[n].nodeValue;
      if (seen[raw]) continue;
      seen[raw] = 1;
      uniq.push(raw);
    }
    var i = 0;
    function next() {
      if (i >= uniq.length || i > 80) return;
      var src = uniq[i++];
      translateRemote(src).then(function (out) {
        if (out && out !== src) {
          for (var k = 0; k < nodes.length; k++) {
            if (nodes[k].nodeValue === src) nodes[k].nodeValue = out;
          }
        }
        next();
      });
    }
    next();
  }

  document.documentElement.lang = getLang() === "es" ? "es" : "en";
  document.documentElement.setAttribute("data-lang", getLang());
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", applyStatic);
  else applyStatic();

  window.anT = t;
  window.anLang = getLang;
  window.anSetLang = setLang;
  window.anLoc = loc;
  window.anTranslatePage = translatePage;
})();
