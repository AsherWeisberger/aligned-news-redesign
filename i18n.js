/* an126: EN / ES / PT / JA / ZH */
(function () {
  var KEY = "an-lang";
  var CACHE_KEY = "an-tx-v2";
  var LANGS = ["en", "es", "pt", "ja", "zh"];
  var HTML_LANG = { en: "en", es: "es", pt: "pt-BR", ja: "ja", zh: "zh-CN" };
  var LOCALE = { en: "en-US", es: "es-ES", pt: "pt-BR", ja: "ja-JP", zh: "zh-CN" };
  var PAIR = { es: "en|es", pt: "en|pt", ja: "en|ja", zh: "en|zh-CN" };
  var NATIVE = { en: "English", es: "Español", pt: "Português", ja: "日本語", zh: "中文" };

  var dict = {
    en: {
      today: "Today", yesterday: "Yesterday", earlier: "Earlier",
      stories: "Stories", signals: "Signals", reports: "Reports",
      newsletter: "Newsletter", news: "News", saved: "Saved", browse: "Browse",
      collabs: "Collabs", search: "Search", search_ph: "Search stories & signals",
      sign_up_login: "Sign up / Login", dark_mode: "Dark mode", light_mode: "Light mode",
      switch_dark: "Switch to dark mode", switch_light: "Switch to light mode",
      sponsors: "Sponsors",
      viture_line: "XR glasses that turn your phone, laptop, or console into a private cinema screen.",
      subscribe: "Subscribe", youre_in: "You’re in", email: "Email address",
      why_matters: "Why this matters",
      why_copy: "Aligned News watches Scoble’s 63 hand-curated X lists, ranks what crosses lists and keywords, and surfaces the signal before the timeline does.",
      lists_title: "63 lists", lists_kicker: "Scoble’s curated X lists.",
      lists_copy: "AI Community, AI Leaders, AI Newsmakers, Investors, Companies, Robot AI, AR/VR, Spatial, Crypto, News, Neuroscience, Quantum, Security, and more.",
      lists_together: "Together: the most comprehensive real-time view of the AI ecosystem.",
      topics: "Topics", topics_copy: "Filter by topic — list provenance stays in each row.",
      last7: "Last 7 days", last7_copy: "Desk velocity across models, agents, and companies.",
      open_menu: "Open menu", god_mode: "God Mode", expanded: "Expanded", compact: "Compact",
      feed_density: "Feed density", events: "Events",
      no_stories: "No stories match this filter.", no_events: "No events on the desk.",
      no_signals: "No signals yet.", back_today: "Back to Today", desk_rank: "Today’s rank",
      scoble_pro: "Scoble’s lists · Pro desk", scoble_free: "Scoble’s lists · Free desk",
      pro_desk: "Pro desk", free_desk: "Free desk",
      curated: "Curated to you — interests first, then the rest of the desk.",
      updated: "Updated", nl_kicker: "Unaligned",
      nl_headline: "The X-list briefing, written here.",
      nl_sub: "The AI conversation on X. Weekdays at 1 p.m. PT.",
      nl_meta: "X-list briefing · written here",
      ranked_from: "Ranked from Scoble’s curated X lists — not from ads.",
      saved_copy: "Save stories from Today or Signals to build a shortlist worth revisiting — your private desk list.",
      primary: "Primary", filter_topic: "Filter by topic",
      stories_n: "stories", signals_n: "signals", reports_n: "reports",
      on_desk: "on the desk this sweep —", language: "Language"
    },
    es: {
      today: "Hoy", yesterday: "Ayer", earlier: "Antes",
      stories: "Historias", signals: "Señales", reports: "Reportes",
      newsletter: "Boletín", news: "News", saved: "Guardado", browse: "Explorar",
      collabs: "Colabs", search: "Buscar", search_ph: "Buscar historias y señales",
      sign_up_login: "Registrarse / Entrar", dark_mode: "Modo oscuro", light_mode: "Modo claro",
      switch_dark: "Cambiar a modo oscuro", switch_light: "Cambiar a modo claro",
      sponsors: "Patrocinadores",
      viture_line: "Gafas XR que convierten tu teléfono, laptop o consola en una pantalla de cine privada.",
      subscribe: "Suscribirse", youre_in: "Ya estás dentro", email: "Correo",
      why_matters: "Por qué importa",
      why_copy: "Aligned News observa las 63 listas de X que curó Scoble, ordena lo que cruza listas y palabras clave, y saca la señal antes que el timeline.",
      lists_title: "63 listas", lists_kicker: "Las listas de X que curó Scoble.",
      lists_copy: "AI Community, AI Leaders, AI Newsmakers, Investors, Companies, Robot AI, AR/VR, Spatial, Crypto, News, Neuroscience, Quantum, Security y más.",
      lists_together: "Juntas: la vista en tiempo real más completa del ecosistema de IA.",
      topics: "Temas", topics_copy: "Filtra por tema. La lista de origen se queda en cada fila.",
      last7: "Últimos 7 días", last7_copy: "Ritmo del escritorio entre modelos, agentes y compañías.",
      open_menu: "Abrir menú", god_mode: "God Mode", expanded: "Ampliado", compact: "Compacto",
      feed_density: "Densidad del feed", events: "Eventos",
      no_stories: "Ninguna historia coincide con este filtro.", no_events: "No hay eventos en el escritorio.",
      no_signals: "Aún no hay señales.", back_today: "Volver a Hoy", desk_rank: "Puesto de hoy",
      scoble_pro: "Listas de Scoble · escritorio Pro", scoble_free: "Listas de Scoble · escritorio Free",
      pro_desk: "escritorio Pro", free_desk: "escritorio Free",
      curated: "Curado para ti: primero tus intereses, después el resto del escritorio.",
      updated: "Actualizado", nl_kicker: "Unaligned",
      nl_headline: "El briefing de las listas de X, escrito aquí.",
      nl_sub: "La conversación de IA en X. Entre semana a la 1 p.m. PT.",
      nl_meta: "Briefing de listas de X · escrito aquí",
      ranked_from: "Ordenado desde las listas de X que curó Scoble, no desde anuncios.",
      saved_copy: "Guarda historias de Hoy o Señales para armar una lista corta que valga volver a ver.",
      primary: "Principal", filter_topic: "Filtrar por tema",
      stories_n: "historias", signals_n: "señales", reports_n: "reportes",
      on_desk: "en el escritorio de este barrido —", language: "Idioma"
    },
    pt: {
      today: "Hoje", yesterday: "Ontem", earlier: "Antes",
      stories: "Histórias", signals: "Sinais", reports: "Relatórios",
      newsletter: "Newsletter", news: "News", saved: "Salvos", browse: "Explorar",
      collabs: "Collabs", search: "Buscar", search_ph: "Buscar histórias e sinais",
      sign_up_login: "Cadastrar / Entrar", dark_mode: "Modo escuro", light_mode: "Modo claro",
      switch_dark: "Mudar para modo escuro", switch_light: "Mudar para modo claro",
      sponsors: "Patrocinadores",
      viture_line: "Óculos XR que transformam seu celular, laptop ou console numa tela de cinema privada.",
      subscribe: "Assinar", youre_in: "Você está dentro", email: "E-mail",
      why_matters: "Por que isso importa",
      why_copy: "Aligned News acompanha as 63 listas do X que Scoble curadoria, ranqueia o que cruza listas e palavras-chave, e traz o sinal antes do timeline.",
      lists_title: "63 listas", lists_kicker: "As listas do X que Scoble curadoria.",
      lists_copy: "AI Community, AI Leaders, AI Newsmakers, Investors, Companies, Robot AI, AR/VR, Spatial, Crypto, News, Neuroscience, Quantum, Security e mais.",
      lists_together: "Juntas: a visão em tempo real mais completa do ecossistema de IA.",
      topics: "Temas", topics_copy: "Filtre por tema. A lista de origem fica em cada linha.",
      last7: "Últimos 7 dias", last7_copy: "Ritmo da mesa entre modelos, agentes e empresas.",
      open_menu: "Abrir menu", god_mode: "God Mode", expanded: "Expandido", compact: "Compacto",
      feed_density: "Densidade do feed", events: "Eventos",
      no_stories: "Nenhuma história combina com este filtro.", no_events: "Nenhum evento na mesa.",
      no_signals: "Ainda não há sinais.", back_today: "Voltar para Hoje", desk_rank: "Posição de hoje",
      scoble_pro: "Listas do Scoble · mesa Pro", scoble_free: "Listas do Scoble · mesa Free",
      pro_desk: "mesa Pro", free_desk: "mesa Free",
      curated: "Curado para você: primeiro seus interesses, depois o resto da mesa.",
      updated: "Atualizado", nl_kicker: "Unaligned",
      nl_headline: "O briefing das listas do X, escrito aqui.",
      nl_sub: "A conversa de IA no X. Dias úteis à 13h PT.",
      nl_meta: "Briefing das listas do X · escrito aqui",
      ranked_from: "Ranqueado a partir das listas do X que Scoble curadoria, não de anúncios.",
      saved_copy: "Salve histórias de Hoje ou Sinais para montar uma lista curta que valha revisitar.",
      primary: "Principal", filter_topic: "Filtrar por tema",
      stories_n: "histórias", signals_n: "sinais", reports_n: "relatórios",
      on_desk: "na mesa desta varredura —", language: "Idioma"
    },
    ja: {
      today: "今日", yesterday: "昨日", earlier: "それ以前",
      stories: "ストーリー", signals: "シグナル", reports: "レポート",
      newsletter: "ニュースレター", news: "News", saved: "保存", browse: "見る",
      collabs: "Collabs", search: "検索", search_ph: "ストーリーとシグナルを検索",
      sign_up_login: "登録 / ログイン", dark_mode: "ダークモード", light_mode: "ライトモード",
      switch_dark: "ダークモードに切り替え", switch_light: "ライトモードに切り替え",
      sponsors: "スポンサー",
      viture_line: "スマホ、ノートPC、ゲーム機をプライベート映画館にするXRグラス。",
      subscribe: "購読する", youre_in: "登録しました", email: "メール",
      why_matters: "なぜ重要か",
      why_copy: "Aligned NewsはScobleが手がける63のXリストを追い、リストとキーワードを横断する動きを順位づけ、タイムラインより先にシグナルを出します。",
      lists_title: "63リスト", lists_kicker: "ScobleがキュレーションしたXリスト。",
      lists_copy: "AI Community, AI Leaders, AI Newsmakers, Investors, Companies, Robot AI, AR/VR, Spatial, Crypto, News, Neuroscience, Quantum, Security ほか。",
      lists_together: "合わせて、AIエコシステムの最も包括的なリアルタイムビュー。",
      topics: "トピック", topics_copy: "トピックで絞る。出所のリストは各行に残します。",
      last7: "過去7日", last7_copy: "モデル、エージェント、企業の机上の速度。",
      open_menu: "メニューを開く", god_mode: "God Mode", expanded: "拡大", compact: "コンパクト",
      feed_density: "フィードの密度", events: "イベント",
      no_stories: "このフィルタに合うストーリーはありません。", no_events: "机上にイベントはありません。",
      no_signals: "まだシグナルがありません。", back_today: "今日に戻る", desk_rank: "今日の順位",
      scoble_pro: "Scobleのリスト · Proデスク", scoble_free: "Scobleのリスト · Freeデスク",
      pro_desk: "Proデスク", free_desk: "Freeデスク",
      curated: "あなた向けにキュレーション。関心が先、そのあと机の残り。",
      updated: "更新", nl_kicker: "Unaligned",
      nl_headline: "Xリストのブリーフィング。ここで書いています。",
      nl_sub: "X上のAIの会話。平日午後1時 PT。",
      nl_meta: "Xリストのブリーフィング · ここで執筆",
      ranked_from: "広告ではなく、Scobleが手がけるXリストから順位づけ。",
      saved_copy: "今日やシグナルから保存して、読み返す価値のある短いリストを作る。",
      primary: "メイン", filter_topic: "トピックで絞る",
      stories_n: "件", signals_n: "シグナル", reports_n: "レポート",
      on_desk: "今回のスイープの机上 —", language: "言語"
    },
    zh: {
      today: "今天", yesterday: "昨天", earlier: "更早",
      stories: "新闻", signals: "信号", reports: "报道",
      newsletter: "简报", news: "News", saved: "收藏", browse: "浏览",
      collabs: "Collabs", search: "搜索", search_ph: "搜索新闻和信号",
      sign_up_login: "注册 / 登录", dark_mode: "深色模式", light_mode: "浅色模式",
      switch_dark: "切换到深色模式", switch_light: "切换到浅色模式",
      sponsors: "赞助",
      viture_line: "把手机、笔记本或主机变成私人影院的 XR 眼镜。",
      subscribe: "订阅", youre_in: "已订阅", email: "邮箱",
      why_matters: "为什么重要",
      why_copy: "Aligned News 跟踪 Scoble 手选的 63 个 X 列表，给跨列表和关键词的内容排序，在时间线之前把信号拿出来。",
      lists_title: "63 个列表", lists_kicker: "Scoble 策划的 X 列表。",
      lists_copy: "AI Community, AI Leaders, AI Newsmakers, Investors, Companies, Robot AI, AR/VR, Spatial, Crypto, News, Neuroscience, Quantum, Security 等。",
      lists_together: "合在一起：AI 生态最完整的实时视图。",
      topics: "主题", topics_copy: "按主题筛选。来源列表留在每一行。",
      last7: "近 7 天", last7_copy: "模型、智能体和公司在工作台上的速度。",
      open_menu: "打开菜单", god_mode: "God Mode", expanded: "展开", compact: "紧凑",
      feed_density: "信息流密度", events: "活动",
      no_stories: "没有符合此筛选的新闻。", no_events: "工作台上没有活动。",
      no_signals: "还没有信号。", back_today: "返回今天", desk_rank: "今日排名",
      scoble_pro: "Scoble 的列表 · Pro 工作台", scoble_free: "Scoble 的列表 · Free 工作台",
      pro_desk: "Pro 工作台", free_desk: "Free 工作台",
      curated: "为你策划：先看兴趣，再看工作台上的其余内容。",
      updated: "已更新", nl_kicker: "Unaligned",
      nl_headline: "X 列表简报，写在这里。",
      nl_sub: "X 上的 AI 对话。工作日下午 1 点 PT。",
      nl_meta: "X 列表简报 · 写在这里",
      ranked_from: "按 Scoble 策划的 X 列表排序，不是广告。",
      saved_copy: "从今天或信号里收藏，做成一份值得回头看的短名单。",
      primary: "主要", filter_topic: "按主题筛选",
      stories_n: "条新闻", signals_n: "个信号", reports_n: "篇报道",
      on_desk: "本轮扫描的工作台上 —", language: "语言"
    }
  };

  function getLang() {
    try {
      var v = localStorage.getItem(KEY);
      if (LANGS.indexOf(v) >= 0) return v;
    } catch (e) {}
    return "en";
  }

  function setLang(next) {
    var lang = LANGS.indexOf(next) >= 0 ? next : "en";
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    document.documentElement.lang = HTML_LANG[lang] || "en";
    document.documentElement.setAttribute("data-lang", lang);
    if (typeof window.anOnLangChange === "function") window.anOnLangChange(lang);
  }

  function t(key) {
    var pack = dict[getLang()] || dict.en;
    if (pack[key] != null) return pack[key];
    return dict.en[key] != null ? dict.en[key] : key;
  }

  function loc() { return LOCALE[getLang()] || "en-US"; }

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
    var lang = getLang();
    if (lang === "en") return Promise.resolve(text);
    if (skipText(text)) return Promise.resolve(text);
    if (!cache[lang]) cache[lang] = {};
    if (cache[lang][text]) return Promise.resolve(cache[lang][text]);
    var pair = PAIR[lang];
    if (!pair) return Promise.resolve(text);
    var q = encodeURIComponent(text.slice(0, 480));
    var url = "https://api.mymemory.translated.net/get?langpair=" + encodeURIComponent(pair) + "&q=" + q;
    return fetch(url).then(function (r) { return r.json(); }).then(function (j) {
      var out = j && j.responseData && j.responseData.translatedText;
      if (out && !/MYMEMORY WARNING/i.test(out)) {
        cache[lang][text] = out;
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
    if (getLang() === "en") return;
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
      if (node.closest && node.closest(".brand, .count, script, style, svg, .avatar, .partners-logo, .sidebar-langs")) return;
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

  document.documentElement.lang = HTML_LANG[getLang()] || "en";
  document.documentElement.setAttribute("data-lang", getLang());
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", applyStatic);
  else applyStatic();

  window.anT = t;
  window.anLang = getLang;
  window.anSetLang = setLang;
  window.anLoc = loc;
  window.anTranslatePage = translatePage;
  window.anLangs = LANGS;
  window.anLangNative = NATIVE;
})();
