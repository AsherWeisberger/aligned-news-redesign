/* an129: EN / ES / PT / JA / ZH — chrome dict + full story translation */
(function () {
  var KEY = "an-lang";
  var CACHE_KEY = "an-tx-v3";
  var LANGS = ["en", "es", "pt", "ja", "zh"];
  var HTML_LANG = { en: "en", es: "es", pt: "pt-BR", ja: "ja", zh: "zh-CN" };
  var LOCALE = { en: "en-US", es: "es-ES", pt: "pt-BR", ja: "ja-JP", zh: "zh-CN" };
  var PAIR = { es: "en|es", pt: "en|pt", ja: "en|ja", zh: "en|zh-CN" };
  var NATIVE = { en: "English", es: "Español", pt: "Português", ja: "日本語", zh: "中文" };
  var CONCURRENCY = 4;
  var MAX_UNIQUE = 500;

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
      search_signals: "Search signals",
      search_reports: "Search reports",
      search_nl: "Search newsletter",
      search_label: "Search",
      sign_up_login: "Sign up / Login",
      dark_mode: "Dark mode",
      light_mode: "Light mode",
      switch_dark: "Switch to dark mode",
      switch_light: "Switch to light mode",
      sponsors: "Sponsors",
      viture_line: "XR glasses that turn your phone, laptop, or console into a private cinema screen.",
      subscribe: "Subscribe",
      youre_in: "You’re in",
      email: "Email address",
      email_ph: "you@example.com",
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
      comfortable: "Comfortable",
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
      on_desk: "on the desk this sweep —",
      language: "Language",
      tagline: "AI signal from 63 curated X lists",
      loading: "Loading…",
      loading_story: "Loading story…",
      loading_signals: "Loading signals…",
      loading_reports: "Loading reports…",
      loading_nl: "Loading newsletter…",
      live_desk: "Live desk",
      focus: "Focus",
      desk: "Desk",
      hide_desk: "Hide desk for more feed space",
      show_desk: "Show desk overview",
      focus_aria: "Focus — hide desk for more space",
      show_desk_aria: "Show desk",
      lists: "Lists",
      this_week: "This week",
      events_kicker: "Conferences · hackathons · dinners",
      conferences: "Conferences",
      hackathons: "Hackathons",
      dinners: "Dinners",
      rest_desk: "Rest of the desk",
      nothing_saved: "Nothing saved yet",
      for_you: "For you",
      desk_glance: "Desk glance",
      intel_sub: "What moved across Scoble lists",
      no_signals_match: "No signals match.",
      no_reports: "No reports.",
      no_reports_yet: "No reports yet.",
      no_earlier: "No earlier issues.",
      no_issues: "No issues yet.",
      issue_not_found: "Issue not found.",
      back_nl: "Back to Newsletter",
      story_not_found: "Story not found.",
      save_later: "Save for later",
      mark_unread: "Mark unread",
      marked_unread: "Marked unread",
      what_happened: "What happened",
      why_it_matters: "Why it matters",
      what_to_watch: "What to watch",
      original_post: "Original post",
      original_x_post: "Original X post by @{user}",
      useful_links: "Useful links",
      related: "Related on the desk",
      open_on_x: "Open on X ↗",
      views: "Views",
      views_n: "views",
      likes: "Likes",
      replies: "Replies",
      reposts: "Reposts",
      saves: "Saves",
      sentiment: "Sentiment",
      not_measured: "Not measured",
      not_enough_reactions: "Not enough public reactions yet.",
      source: "Source",
      source_one: "source",
      sources: "sources",
      first_seen: "first seen",
      recently: "recently",
      just_now: "just now",
      ago_m: "{n}m ago",
      ago_h: "{n}h ago",
      ago_d: "{n}d ago",
      archive: "Archive",
      written_desk: "Written at the Aligned News desk",
      from_archive: "From the Unaligned archive",
      nl_source_archive: "Earlier Unaligned issue, kept on this desk.",
      nl_desk_value: "The AI conversation on X, written from this desk. Sixty-three lists. Paper and ink.",
      previous: "Previous",
      earlier_issues: "Earlier issues",
      signals_value: "Cross-list spikes, keyword hits, and high-engagement posts from Scoble’s lists.",
      signals_why: "Signals are the desk’s early-warning layer — engagement-weighted posts that crossed curated lists before they went mainstream.",
      top_signals: "Top Signals",
      list_provenance: "List provenance",
      signals_prov: "Filter by the Scoble list that surfaced each signal.",
      signals_vibe: "Signal velocity across the desk — confidence-ranked movers first.",
      reports_value: "Longer reads when the week needs depth — archives, evening runs, and briefings.",
      reports_why: "Reports package the day’s firehose into durable briefings — useful when you need the narrative, not just the spike.",
      reports_prov: "Research draws on the same Scoble list corpus as the live desk.",
      reports_vibe: "Research desk cadence — long reads when the week needs depth.",
      filter_list: "Filter by list",
      sidebar_modules: "Sidebar modules",
      footer_signal: "Signal from Scoble’s X lists",
      footer_api: "Pro API · alignednews.com/v1",
      footer_nl: "Unaligned · from this desk",
      all: "All",
      topic_models: "Models",
      topic_agents: "Agents",
      topic_robotics: "Robotics",
      topic_funding: "Funding",
      topic_companies: "Companies",
      topic_research: "Research",
      topic_chips: "Chips",
      topic_open_source: "Open source",
      topic_policy: "Policy",
      topic_creative: "Creative",
      topic_events: "Events",
      topic_jobs: "Jobs",
      topic_labs: "Labs",
      topic_breaking: "Breaking",
      topic_videos: "Videos",
      topic_compute: "Compute",
      topic_industry: "Industry",
      topic_scoble: "Scoble",
      community: "Community",
      hit_n_lists: "Hit {n} of Scoble's lists",
      talking: "people are talking, not just liking",
      likes_wont: "likes won't carry this on For You",
      rising: "Rising",
      keyword_hit: "Keyword hit",
      list_spike: "List spike",
      scoble_list: "Scoble list",
      why_ranked: "Why this ranked",
      min_read: "{n} min",
      conf_pct: "{n}% conf.",
      original_source: "Original source",
      original_metrics: "Original post metrics",
      positive: "positive",
      negative: "negative",
      public_reactions: "public reactions",
      sentiment_mix: "Sentiment mix",
      desk_word: "desk",
      nl_issues: "{n} earlier issues",
      nl_issue_one: "1 earlier issue",
      issue: "Issue",
      create_desk: "Create your desk",
      welcome_back: "Welcome back",
      auth_sub_signup: "Join the Aligned News Pro desk mock. Backend wiring comes later.",
      auth_sub_login: "Log in to your Aligned News desk mock.",
      create_account: "Create account",
      sign_up: "Sign up",
      log_in: "Log in",
      name: "Name",
      optional: "(optional)",
      password: "Password",
      confirm_password: "Confirm password",
      or: "or",
      continue_google: "Continue with Google",
      google_note: "Google sign-in is mocked for now.",
      demo_note: "Demo UI — auth wiring coming soon",
      auth_toast: "You’re in — backend not wired yet",
      auth_need: "Add an email and password to continue",
      auth_mismatch: "Passwords don’t match — try again",
      coming_soon: "Coming soon",
      auth_mode: "Auth mode",
      from_ai_briefing: "From the /ai briefing.",
      from_signals_desk: "From the Aligned News signals desk.",
      from_briefing: "From the Aligned News briefing.",
      could_not_load: "Could not load live-data.json. Open this folder via a local static server (file:// may block fetch).",
      vibe_line: "{stories} stories and {signals} signals on the desk this sweep — {reports} reports when you need depth.",
      live_from_n: "Live from @{user} — {n} lists sampled this sweep.",
      live_from_fallback: "Live from @Scobleizer lists via X API.",
      untitled: "Untitled",
      desk_overview: "Desk overview",
      signals_overview: "Signals overview",
      reports_overview: "Reports overview",
      nl_overview: "Newsletter overview",
      desk_stats: "Desk stats",
      desk_glance_aria: "Desk glance"
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
      search_signals: "Buscar señales",
      search_reports: "Buscar reportes",
      search_nl: "Buscar el boletín",
      search_label: "Buscar",
      sign_up_login: "Registrarse / Entrar",
      dark_mode: "Modo oscuro",
      light_mode: "Modo claro",
      switch_dark: "Cambiar a modo oscuro",
      switch_light: "Cambiar a modo claro",
      sponsors: "Patrocinadores",
      viture_line: "Gafas XR que convierten tu teléfono, laptop o consola en una pantalla de cine privada.",
      subscribe: "Suscribirse",
      youre_in: "Ya estás dentro",
      email: "Correo",
      email_ph: "tu@correo.com",
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
      comfortable: "Cómodo",
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
      on_desk: "en el escritorio de este barrido —",
      language: "Idioma",
      tagline: "Señal de IA de 63 listas de X curadas",
      loading: "Cargando…",
      loading_story: "Cargando historia…",
      loading_signals: "Cargando señales…",
      loading_reports: "Cargando reportes…",
      loading_nl: "Cargando el boletín…",
      live_desk: "Escritorio en vivo",
      focus: "Enfoque",
      desk: "Escritorio",
      hide_desk: "Ocultar el escritorio para más espacio",
      show_desk: "Mostrar el escritorio",
      focus_aria: "Enfoque: ocultar el escritorio",
      show_desk_aria: "Mostrar escritorio",
      lists: "Listas",
      this_week: "Esta semana",
      events_kicker: "Conferencias · hackathons · cenas",
      conferences: "Conferencias",
      hackathons: "Hackathons",
      dinners: "Cenas",
      rest_desk: "Resto del escritorio",
      nothing_saved: "Aún no hay nada guardado",
      for_you: "Para ti",
      desk_glance: "Vistazo al escritorio",
      intel_sub: "Lo que se movió en las listas de Scoble",
      no_signals_match: "Ninguna señal coincide.",
      no_reports: "No hay reportes.",
      no_reports_yet: "Aún no hay reportes.",
      no_earlier: "No hay números anteriores.",
      no_issues: "Aún no hay números.",
      issue_not_found: "Número no encontrado.",
      back_nl: "Volver al boletín",
      story_not_found: "Historia no encontrada.",
      save_later: "Guardar para después",
      mark_unread: "Marcar no leído",
      marked_unread: "Marcado no leído",
      what_happened: "Qué pasó",
      why_it_matters: "Por qué importa",
      what_to_watch: "Qué vigilar",
      original_post: "Publicación original",
      original_x_post: "Publicación original en X de @{user}",
      useful_links: "Enlaces útiles",
      related: "Relacionado en el escritorio",
      open_on_x: "Abrir en X ↗",
      views: "Vistas",
      views_n: "vistas",
      likes: "Me gusta",
      replies: "Respuestas",
      reposts: "Reposts",
      saves: "Guardados",
      sentiment: "Sentimiento",
      not_measured: "Sin medir",
      not_enough_reactions: "Aún no hay suficientes reacciones públicas.",
      source: "Fuente",
      source_one: "fuente",
      sources: "fuentes",
      first_seen: "visto por primera vez",
      recently: "hace poco",
      just_now: "ahora mismo",
      ago_m: "hace {n} min",
      ago_h: "hace {n} h",
      ago_d: "hace {n} d",
      archive: "Archivo",
      written_desk: "Escrito en el escritorio de Aligned News",
      from_archive: "Del archivo de Unaligned",
      nl_source_archive: "Un número anterior de Unaligned, guardado en este escritorio.",
      nl_desk_value: "La conversación de IA en X, escrita desde este escritorio. Sesenta y tres listas. Papel y tinta.",
      previous: "Anteriores",
      earlier_issues: "Números anteriores",
      signals_value: "Picos entre listas, aciertos de palabras clave y posts de alto engagement de las listas de Scoble.",
      signals_why: "Las señales son la alerta temprana del escritorio: posts ponderados por engagement que cruzaron listas curadas antes de volverse mainstream.",
      top_signals: "Señales destacadas",
      list_provenance: "Procedencia de lista",
      signals_prov: "Filtra por la lista de Scoble que sacó cada señal.",
      signals_vibe: "Velocidad de señales en el escritorio: primero los que más confianza tienen.",
      reports_value: "Lecturas más largas cuando la semana pide profundidad: archivos, pases de tarde y briefings.",
      reports_why: "Los reportes empaquetan el firehose del día en briefings duraderos: útiles cuando hace falta la narrativa, no solo el pico.",
      reports_prov: "La investigación usa el mismo corpus de listas de Scoble que el escritorio en vivo.",
      reports_vibe: "Cadencia del escritorio de investigación: lecturas largas cuando la semana pide profundidad.",
      filter_list: "Filtrar por lista",
      sidebar_modules: "Módulos laterales",
      footer_signal: "Señal de las listas de X de Scoble",
      footer_api: "Pro API · alignednews.com/v1",
      footer_nl: "Unaligned · desde este escritorio",
      all: "Todo",
      topic_models: "Modelos",
      topic_agents: "Agentes",
      topic_robotics: "Robótica",
      topic_funding: "Financiación",
      topic_companies: "Compañías",
      topic_research: "Investigación",
      topic_chips: "Chips",
      topic_open_source: "Código abierto",
      topic_policy: "Política",
      topic_creative: "Creativo",
      topic_events: "Eventos",
      topic_jobs: "Empleo",
      topic_labs: "Labs",
      topic_breaking: "Última hora",
      topic_videos: "Videos",
      topic_compute: "Cómputo",
      topic_industry: "Industria",
      topic_scoble: "Scoble",
      community: "Comunidad",
      hit_n_lists: "Cruzó {n} listas de Scoble",
      talking: "la gente comenta, no solo da like",
      likes_wont: "los likes no lo llevarán a For You",
      rising: "Al alza",
      keyword_hit: "Acierto de palabra clave",
      list_spike: "Pico de lista",
      scoble_list: "Lista de Scoble",
      why_ranked: "Por qué rankeó",
      min_read: "{n} min",
      conf_pct: "{n}% conf.",
      original_source: "Fuente original",
      original_metrics: "Métricas de la publicación original",
      positive: "positivo",
      negative: "negativo",
      public_reactions: "reacciones públicas",
      sentiment_mix: "Mezcla de sentimiento",
      desk_word: "escritorio",
      nl_issues: "{n} números anteriores",
      nl_issue_one: "1 número anterior",
      issue: "Número",
      create_desk: "Crea tu escritorio",
      welcome_back: "Bienvenido de nuevo",
      auth_sub_signup: "Únete al mock del escritorio Pro de Aligned News. El backend llega después.",
      auth_sub_login: "Entra a tu mock de escritorio de Aligned News.",
      create_account: "Crear cuenta",
      sign_up: "Registrarse",
      log_in: "Entrar",
      name: "Nombre",
      optional: "(opcional)",
      password: "Contraseña",
      confirm_password: "Confirmar contraseña",
      or: "o",
      continue_google: "Continuar con Google",
      google_note: "El acceso con Google está simulado por ahora.",
      demo_note: "UI de demo — el auth se conecta pronto",
      auth_toast: "Ya estás dentro — el backend aún no está conectado",
      auth_need: "Añade un correo y una contraseña para seguir",
      auth_mismatch: "Las contraseñas no coinciden — inténtalo de nuevo",
      coming_soon: "Próximamente",
      auth_mode: "Modo de acceso",
      from_ai_briefing: "Del briefing /ai.",
      from_signals_desk: "Del escritorio de señales de Aligned News.",
      from_briefing: "Del briefing de Aligned News.",
      could_not_load: "No se pudo cargar live-data.json. Abre esta carpeta con un servidor estático local (file:// puede bloquear el fetch).",
      vibe_line: "{stories} historias y {signals} señales en el escritorio de este barrido — {reports} reportes cuando hace falta profundidad.",
      live_from_n: "En vivo desde @{user} — {n} listas muestreadas en este barrido.",
      live_from_fallback: "En vivo desde las listas de @Scobleizer vía X API.",
      untitled: "Sin título",
      desk_overview: "Resumen del escritorio",
      signals_overview: "Resumen de señales",
      reports_overview: "Resumen de reportes",
      nl_overview: "Resumen del boletín",
      desk_stats: "Estadísticas del escritorio",
      desk_glance_aria: "Vistazo al escritorio"
    },
    pt: {
      today: "Hoje",
      yesterday: "Ontem",
      earlier: "Antes",
      stories: "Histórias",
      signals: "Sinais",
      reports: "Relatórios",
      newsletter: "Newsletter",
      news: "News",
      saved: "Salvos",
      browse: "Explorar",
      collabs: "Collabs",
      search: "Buscar",
      search_ph: "Buscar histórias e sinais",
      search_signals: "Buscar sinais",
      search_reports: "Buscar relatórios",
      search_nl: "Buscar a newsletter",
      search_label: "Buscar",
      sign_up_login: "Cadastrar / Entrar",
      dark_mode: "Modo escuro",
      light_mode: "Modo claro",
      switch_dark: "Mudar para modo escuro",
      switch_light: "Mudar para modo claro",
      sponsors: "Patrocinadores",
      viture_line: "Óculos XR que transformam seu celular, laptop ou console numa tela de cinema privada.",
      subscribe: "Assinar",
      youre_in: "Você está dentro",
      email: "E-mail",
      email_ph: "voce@email.com",
      why_matters: "Por que isso importa",
      why_copy: "Aligned News acompanha as 63 listas do X curadas por Scoble, ranqueia o que cruza listas e palavras-chave, e traz o sinal antes do timeline.",
      lists_title: "63 listas",
      lists_kicker: "As listas do X curadas por Scoble.",
      lists_copy: "AI Community, AI Leaders, AI Newsmakers, Investors, Companies, Robot AI, AR/VR, Spatial, Crypto, News, Neuroscience, Quantum, Security e mais.",
      lists_together: "Juntas: a visão em tempo real mais completa do ecossistema de IA.",
      topics: "Temas",
      topics_copy: "Filtre por tema. A lista de origem fica em cada linha.",
      last7: "Últimos 7 dias",
      last7_copy: "Ritmo da mesa entre modelos, agentes e empresas.",
      open_menu: "Abrir menu",
      god_mode: "God Mode",
      expanded: "Expandido",
      compact: "Compacto",
      comfortable: "Confortável",
      feed_density: "Densidade do feed",
      events: "Eventos",
      no_stories: "Nenhuma história combina com este filtro.",
      no_events: "Nenhum evento na mesa.",
      no_signals: "Ainda não há sinais.",
      back_today: "Voltar para Hoje",
      desk_rank: "Posição de hoje",
      scoble_pro: "Listas do Scoble · mesa Pro",
      scoble_free: "Listas do Scoble · mesa Free",
      pro_desk: "mesa Pro",
      free_desk: "mesa Free",
      curated: "Curado para você: primeiro seus interesses, depois o resto da mesa.",
      updated: "Atualizado",
      nl_kicker: "Unaligned",
      nl_headline: "O briefing das listas do X, escrito aqui.",
      nl_sub: "A conversa de IA no X. Dias úteis às 13h PT.",
      nl_meta: "Briefing das listas do X · escrito aqui",
      ranked_from: "Ranqueado a partir das listas do X curadas por Scoble, não de anúncios.",
      saved_copy: "Salve histórias de Hoje ou Sinais para montar uma lista curta que valha revisitar.",
      primary: "Principal",
      filter_topic: "Filtrar por tema",
      stories_n: "histórias",
      signals_n: "sinais",
      reports_n: "relatórios",
      on_desk: "na mesa desta varredura —",
      language: "Idioma",
      tagline: "Sinal de IA de 63 listas do X curadas",
      loading: "Carregando…",
      loading_story: "Carregando história…",
      loading_signals: "Carregando sinais…",
      loading_reports: "Carregando relatórios…",
      loading_nl: "Carregando a newsletter…",
      live_desk: "Mesa ao vivo",
      focus: "Foco",
      desk: "Mesa",
      hide_desk: "Ocultar a mesa para mais espaço",
      show_desk: "Mostrar a mesa",
      focus_aria: "Foco: ocultar a mesa",
      show_desk_aria: "Mostrar mesa",
      lists: "Listas",
      this_week: "Esta semana",
      events_kicker: "Conferências · hackathons · jantares",
      conferences: "Conferências",
      hackathons: "Hackathons",
      dinners: "Jantares",
      rest_desk: "Resto da mesa",
      nothing_saved: "Nada salvo ainda",
      for_you: "Para você",
      desk_glance: "Olhada na mesa",
      intel_sub: "O que se moveu nas listas do Scoble",
      no_signals_match: "Nenhum sinal combina.",
      no_reports: "Nenhum relatório.",
      no_reports_yet: "Ainda não há relatórios.",
      no_earlier: "Nenhuma edição anterior.",
      no_issues: "Ainda não há edições.",
      issue_not_found: "Edição não encontrada.",
      back_nl: "Voltar à newsletter",
      story_not_found: "História não encontrada.",
      save_later: "Salvar para depois",
      mark_unread: "Marcar não lido",
      marked_unread: "Marcado não lido",
      what_happened: "O que aconteceu",
      why_it_matters: "Por que importa",
      what_to_watch: "O que observar",
      original_post: "Post original",
      original_x_post: "Post original no X de @{user}",
      useful_links: "Links úteis",
      related: "Relacionado na mesa",
      open_on_x: "Abrir no X ↗",
      views: "Visualizações",
      views_n: "visualizações",
      likes: "Curtidas",
      replies: "Respostas",
      reposts: "Reposts",
      saves: "Salvos",
      sentiment: "Sentimento",
      not_measured: "Não medido",
      not_enough_reactions: "Ainda não há reações públicas suficientes.",
      source: "Fonte",
      source_one: "fonte",
      sources: "fontes",
      first_seen: "visto pela primeira vez",
      recently: "há pouco",
      just_now: "agora mesmo",
      ago_m: "há {n} min",
      ago_h: "há {n} h",
      ago_d: "há {n} d",
      archive: "Arquivo",
      written_desk: "Escrito na mesa da Aligned News",
      from_archive: "Do arquivo Unaligned",
      nl_source_archive: "Edição anterior do Unaligned, guardada nesta mesa.",
      nl_desk_value: "A conversa de IA no X, escrita desta mesa. Sessenta e três listas. Papel e tinta.",
      previous: "Anteriores",
      earlier_issues: "Edições anteriores",
      signals_value: "Picos entre listas, acertos de palavras-chave e posts de alto engajamento das listas do Scoble.",
      signals_why: "Sinais são a camada de alerta da mesa — posts ponderados por engajamento que cruzaram listas curadas antes de virar mainstream.",
      top_signals: "Principais sinais",
      list_provenance: "Procedência da lista",
      signals_prov: "Filtre pela lista do Scoble que trouxe cada sinal.",
      signals_vibe: "Velocidade dos sinais na mesa — primeiro os de maior confiança.",
      reports_value: "Leituras mais longas quando a semana pede profundidade — arquivos, rodadas da noite e briefings.",
      reports_why: "Relatórios empacotam o firehose do dia em briefings duráveis — úteis quando você precisa da narrativa, não só do pico.",
      reports_prov: "A pesquisa usa o mesmo corpus de listas do Scoble que a mesa ao vivo.",
      reports_vibe: "Ritmo da mesa de pesquisa — leituras longas quando a semana pede profundidade.",
      filter_list: "Filtrar por lista",
      sidebar_modules: "Módulos laterais",
      footer_signal: "Sinal das listas do X do Scoble",
      footer_api: "Pro API · alignednews.com/v1",
      footer_nl: "Unaligned · desta mesa",
      all: "Tudo",
      topic_models: "Modelos",
      topic_agents: "Agentes",
      topic_robotics: "Robótica",
      topic_funding: "Funding",
      topic_companies: "Empresas",
      topic_research: "Pesquisa",
      topic_chips: "Chips",
      topic_open_source: "Código aberto",
      topic_policy: "Política",
      topic_creative: "Criativo",
      topic_events: "Eventos",
      topic_jobs: "Vagas",
      topic_labs: "Labs",
      topic_breaking: "Urgente",
      topic_videos: "Vídeos",
      topic_compute: "Computação",
      topic_industry: "Indústria",
      topic_scoble: "Scoble",
      community: "Comunidade",
      hit_n_lists: "Cruzou {n} listas do Scoble",
      talking: "as pessoas estão falando, não só curtindo",
      likes_wont: "curtidas não vão levar isso ao For You",
      rising: "Em alta",
      keyword_hit: "Acerto de palavra-chave",
      list_spike: "Pico de lista",
      scoble_list: "Lista do Scoble",
      why_ranked: "Por que ranqueou",
      min_read: "{n} min",
      conf_pct: "{n}% conf.",
      original_source: "Fonte original",
      original_metrics: "Métricas do post original",
      positive: "positivo",
      negative: "negativo",
      public_reactions: "reações públicas",
      sentiment_mix: "Mistura de sentimento",
      desk_word: "mesa",
      nl_issues: "{n} edições anteriores",
      nl_issue_one: "1 edição anterior",
      issue: "Edição",
      create_desk: "Crie sua mesa",
      welcome_back: "Bem-vindo de volta",
      auth_sub_signup: "Entre no mock da mesa Pro da Aligned News. O backend vem depois.",
      auth_sub_login: "Entre no mock da sua mesa Aligned News.",
      create_account: "Criar conta",
      sign_up: "Cadastrar",
      log_in: "Entrar",
      name: "Nome",
      optional: "(opcional)",
      password: "Senha",
      confirm_password: "Confirmar senha",
      or: "ou",
      continue_google: "Continuar com o Google",
      google_note: "O login com Google está simulado por enquanto.",
      demo_note: "UI de demo — auth em breve",
      auth_toast: "Você está dentro — o backend ainda não está ligado",
      auth_need: "Adicione um e-mail e uma senha para continuar",
      auth_mismatch: "As senhas não coincidem — tente de novo",
      coming_soon: "Em breve",
      auth_mode: "Modo de acesso",
      from_ai_briefing: "Do briefing /ai.",
      from_signals_desk: "Da mesa de sinais da Aligned News.",
      from_briefing: "Do briefing da Aligned News.",
      could_not_load: "Não foi possível carregar live-data.json. Abra esta pasta num servidor estático local (file:// pode bloquear o fetch).",
      vibe_line: "{stories} histórias e {signals} sinais na mesa desta varredura — {reports} relatórios quando você precisa de profundidade.",
      live_from_n: "Ao vivo de @{user} — {n} listas amostradas nesta varredura.",
      live_from_fallback: "Ao vivo das listas de @Scobleizer via X API.",
      untitled: "Sem título",
      desk_overview: "Visão da mesa",
      signals_overview: "Visão dos sinais",
      reports_overview: "Visão dos relatórios",
      nl_overview: "Visão da newsletter",
      desk_stats: "Estatísticas da mesa",
      desk_glance_aria: "Olhada na mesa"
    },
    ja: {
      today: "今日",
      yesterday: "昨日",
      earlier: "それ以前",
      stories: "ストーリー",
      signals: "シグナル",
      reports: "レポート",
      newsletter: "ニュースレター",
      news: "News",
      saved: "保存",
      browse: "見る",
      collabs: "Collabs",
      search: "検索",
      search_ph: "ストーリーとシグナルを検索",
      search_signals: "シグナルを検索",
      search_reports: "レポートを検索",
      search_nl: "ニュースレターを検索",
      search_label: "検索",
      sign_up_login: "登録 / ログイン",
      dark_mode: "ダークモード",
      light_mode: "ライトモード",
      switch_dark: "ダークモードに切り替え",
      switch_light: "ライトモードに切り替え",
      sponsors: "スポンサー",
      viture_line: "スマホ、ノートPC、ゲーム機をプライベート映画館にするXRグラス。",
      subscribe: "購読する",
      youre_in: "登録しました",
      email: "メール",
      email_ph: "you@example.com",
      why_matters: "なぜ重要か",
      why_copy: "Aligned NewsはScobleが手がける63のXリストを追い、リストとキーワードを横断する動きを順位づけ、タイムラインより先にシグナルを出します。",
      lists_title: "63リスト",
      lists_kicker: "ScobleがキュレーションしたXリスト。",
      lists_copy: "AI Community, AI Leaders, AI Newsmakers, Investors, Companies, Robot AI, AR/VR, Spatial, Crypto, News, Neuroscience, Quantum, Security ほか。",
      lists_together: "合わせて、AIエコシステムの最も包括的なリアルタイムビュー。",
      topics: "トピック",
      topics_copy: "トピックで絞る。出所のリストは各行に残します。",
      last7: "過去7日",
      last7_copy: "モデル、エージェント、企業の机上の速度。",
      open_menu: "メニューを開く",
      god_mode: "God Mode",
      expanded: "拡大",
      compact: "コンパクト",
      comfortable: "ゆったり",
      feed_density: "フィードの密度",
      events: "イベント",
      no_stories: "このフィルタに合うストーリーはありません。",
      no_events: "机上にイベントはありません。",
      no_signals: "まだシグナルがありません。",
      back_today: "今日に戻る",
      desk_rank: "今日の順位",
      scoble_pro: "Scobleのリスト · Proデスク",
      scoble_free: "Scobleのリスト · Freeデスク",
      pro_desk: "Proデスク",
      free_desk: "Freeデスク",
      curated: "あなた向けにキュレーション。関心が先、そのあと机の残り。",
      updated: "更新",
      nl_kicker: "Unaligned",
      nl_headline: "Xリストのブリーフィング。ここで書いています。",
      nl_sub: "X上のAIの会話。平日午後1時 PT。",
      nl_meta: "Xリストのブリーフィング · ここで執筆",
      ranked_from: "広告ではなく、Scobleが手がけるXリストから順位づけ。",
      saved_copy: "今日やシグナルから保存して、読み返す価値のある短いリストを作る。",
      primary: "メイン",
      filter_topic: "トピックで絞る",
      stories_n: "件",
      signals_n: "シグナル",
      reports_n: "レポート",
      on_desk: "今回のスイープの机上 —",
      language: "言語",
      tagline: "63の厳選XリストからのAIシグナル",
      loading: "読み込み中…",
      loading_story: "ストーリーを読み込み中…",
      loading_signals: "シグナルを読み込み中…",
      loading_reports: "レポートを読み込み中…",
      loading_nl: "ニュースレターを読み込み中…",
      live_desk: "ライブデスク",
      focus: "フォーカス",
      desk: "デスク",
      hide_desk: "デスクを隠してフィードを広く",
      show_desk: "デスク概要を表示",
      focus_aria: "フォーカス — デスクを隠す",
      show_desk_aria: "デスクを表示",
      lists: "リスト",
      this_week: "今週",
      events_kicker: "カンファレンス · ハッカソン · ディナー",
      conferences: "カンファレンス",
      hackathons: "ハッカソン",
      dinners: "ディナー",
      rest_desk: "デスクの残り",
      nothing_saved: "まだ保存がありません",
      for_you: "あなた向け",
      desk_glance: "デスク一瞥",
      intel_sub: "Scobleのリストで動いたもの",
      no_signals_match: "一致するシグナルはありません。",
      no_reports: "レポートはありません。",
      no_reports_yet: "まだレポートがありません。",
      no_earlier: "以前の号はありません。",
      no_issues: "まだ号がありません。",
      issue_not_found: "号が見つかりません。",
      back_nl: "ニュースレターに戻る",
      story_not_found: "ストーリーが見つかりません。",
      save_later: "あとで読む",
      mark_unread: "未読にする",
      marked_unread: "未読にしました",
      what_happened: "何が起きたか",
      why_it_matters: "なぜ重要か",
      what_to_watch: "注目ポイント",
      original_post: "元の投稿",
      original_x_post: "@{user} の元の X 投稿",
      useful_links: "関連リンク",
      related: "デスクの関連",
      open_on_x: "Xで開く ↗",
      views: "表示",
      views_n: "表示",
      likes: "いいね",
      replies: "返信",
      reposts: "リポスト",
      saves: "保存",
      sentiment: "感情",
      not_measured: "未計測",
      not_enough_reactions: "公開の反応がまだ足りません。",
      source: "ソース",
      source_one: "ソース",
      sources: "ソース",
      first_seen: "初確認",
      recently: "ついさっき",
      just_now: "たった今",
      ago_m: "{n}分前",
      ago_h: "{n}時間前",
      ago_d: "{n}日前",
      archive: "アーカイブ",
      written_desk: "Aligned Newsのデスクで執筆",
      from_archive: "Unalignedアーカイブから",
      nl_source_archive: "以前のUnalignedの号。このデスクに残しています。",
      nl_desk_value: "X上のAIの会話。このデスクから書いています。63のリスト。紙とインク。",
      previous: "過去の号",
      earlier_issues: "以前の号",
      signals_value: "Scobleのリストから、横断スパイク、キーワードヒット、高エンゲージメントの投稿。",
      signals_why: "シグナルはデスクの早期警戒。主流になる前にキュレーションリストを横断した、エンゲージメント加重の投稿です。",
      top_signals: "トップシグナル",
      list_provenance: "リストの出所",
      signals_prov: "各シグナルを出したScobleのリストで絞る。",
      signals_vibe: "デスク全体のシグナル速度。信頼度の高い動きが先。",
      reports_value: "週に深さが要るときの長めの読み物。アーカイブ、夜のラン、ブリーフィング。",
      reports_why: "レポートは一日の火の手を残るブリーフィングにまとめる。スパイクだけでなく物語が要るときに。",
      reports_prov: "リサーチはライブデスクと同じScobleリストのコーパスを使う。",
      reports_vibe: "リサーチデスクのリズム。週に深さが要るときの長文。",
      filter_list: "リストで絞る",
      sidebar_modules: "サイドモジュール",
      footer_signal: "ScobleのXリストからのシグナル",
      footer_api: "Pro API · alignednews.com/v1",
      footer_nl: "Unaligned · このデスクから",
      all: "すべて",
      topic_models: "モデル",
      topic_agents: "エージェント",
      topic_robotics: "ロボティクス",
      topic_funding: "資金調達",
      topic_companies: "企業",
      topic_research: "研究",
      topic_chips: "チップ",
      topic_open_source: "オープンソース",
      topic_policy: "政策",
      topic_creative: "クリエイティブ",
      topic_events: "イベント",
      topic_jobs: "求人",
      topic_labs: "Labs",
      topic_breaking: "速報",
      topic_videos: "動画",
      topic_compute: "コンピュート",
      topic_industry: "業界",
      topic_scoble: "Scoble",
      community: "コミュニティ",
      hit_n_lists: "Scobleのリスト{n}件にヒット",
      talking: "いいねだけでなく会話が起きている",
      likes_wont: "いいねだけではFor Youに乗らない",
      rising: "上昇",
      keyword_hit: "キーワードヒット",
      list_spike: "リストスパイク",
      scoble_list: "Scobleのリスト",
      why_ranked: "なぜ順位がついたか",
      min_read: "{n}分",
      conf_pct: "信頼度 {n}%",
      original_source: "元ソース",
      original_metrics: "元投稿の指標",
      positive: "ポジティブ",
      negative: "ネガティブ",
      public_reactions: "公開の反応",
      sentiment_mix: "感情の内訳",
      desk_word: "デスク",
      nl_issues: "以前の号 {n} 件",
      nl_issue_one: "以前の号 1 件",
      issue: "号",
      create_desk: "デスクを作る",
      welcome_back: "おかえり",
      auth_sub_signup: "Aligned News Proデスクのモックに参加。バックエンドは後から。",
      auth_sub_login: "Aligned Newsデスクのモックにログイン。",
      create_account: "アカウント作成",
      sign_up: "登録",
      log_in: "ログイン",
      name: "名前",
      optional: "（任意）",
      password: "パスワード",
      confirm_password: "パスワード確認",
      or: "または",
      continue_google: "Googleで続ける",
      google_note: "Googleログインは今はモックです。",
      demo_note: "デモUI — 認証の配線はこれから",
      auth_toast: "入れました — バックエンドは未接続",
      auth_need: "続けるにはメールとパスワードを入力",
      auth_mismatch: "パスワードが一致しません",
      coming_soon: "近日公開",
      auth_mode: "認証モード",
      from_ai_briefing: "/aiブリーフィングから。",
      from_signals_desk: "Aligned Newsのシグナルデスクから。",
      from_briefing: "Aligned Newsのブリーフィングから。",
      could_not_load: "live-data.jsonを読み込めません。ローカルの静的サーバで開いてください（file://はfetchを止めることがあります）。",
      vibe_line: "今回のスイープの机上はストーリー{stories}件、シグナル{signals}件 — 深さが要るときのレポート{reports}件。",
      live_from_n: "@{user}からライブ — 今回のスイープで{n}リストをサンプリング。",
      live_from_fallback: "X API経由の@Scobleizerリストからライブ。",
      untitled: "無題",
      desk_overview: "デスク概要",
      signals_overview: "シグナル概要",
      reports_overview: "レポート概要",
      nl_overview: "ニュースレター概要",
      desk_stats: "デスクの統計",
      desk_glance_aria: "デスク一瞥"
    },
    zh: {
      today: "今天",
      yesterday: "昨天",
      earlier: "更早",
      stories: "新闻",
      signals: "信号",
      reports: "报道",
      newsletter: "简报",
      news: "News",
      saved: "收藏",
      browse: "浏览",
      collabs: "Collabs",
      search: "搜索",
      search_ph: "搜索新闻和信号",
      search_signals: "搜索信号",
      search_reports: "搜索报道",
      search_nl: "搜索简报",
      search_label: "搜索",
      sign_up_login: "注册 / 登录",
      dark_mode: "深色模式",
      light_mode: "浅色模式",
      switch_dark: "切换到深色模式",
      switch_light: "切换到浅色模式",
      sponsors: "赞助",
      viture_line: "把手机、笔记本或主机变成私人影院的 XR 眼镜。",
      subscribe: "订阅",
      youre_in: "已订阅",
      email: "邮箱",
      email_ph: "you@example.com",
      why_matters: "为什么重要",
      why_copy: "Aligned News 跟踪 Scoble 手选的 63 个 X 列表，给跨列表和关键词的内容排序，在时间线之前把信号拿出来。",
      lists_title: "63 个列表",
      lists_kicker: "Scoble 策划的 X 列表。",
      lists_copy: "AI Community, AI Leaders, AI Newsmakers, Investors, Companies, Robot AI, AR/VR, Spatial, Crypto, News, Neuroscience, Quantum, Security 等。",
      lists_together: "合在一起：AI 生态最完整的实时视图。",
      topics: "主题",
      topics_copy: "按主题筛选。来源列表留在每一行。",
      last7: "近 7 天",
      last7_copy: "模型、智能体和公司在工作台上的速度。",
      open_menu: "打开菜单",
      god_mode: "God Mode",
      expanded: "展开",
      compact: "紧凑",
      comfortable: "宽松",
      feed_density: "信息流密度",
      events: "活动",
      no_stories: "没有符合此筛选的新闻。",
      no_events: "工作台上没有活动。",
      no_signals: "还没有信号。",
      back_today: "返回今天",
      desk_rank: "今日排名",
      scoble_pro: "Scoble 的列表 · Pro 工作台",
      scoble_free: "Scoble 的列表 · Free 工作台",
      pro_desk: "Pro 工作台",
      free_desk: "Free 工作台",
      curated: "为你策划：先看兴趣，再看工作台上的其余内容。",
      updated: "已更新",
      nl_kicker: "Unaligned",
      nl_headline: "X 列表简报，写在这里。",
      nl_sub: "X 上的 AI 对话。工作日下午 1 点 PT。",
      nl_meta: "X 列表简报 · 写在这里",
      ranked_from: "按 Scoble 策划的 X 列表排序，不是广告。",
      saved_copy: "从今天或信号里收藏，做成一份值得回头看的短名单。",
      primary: "主要",
      filter_topic: "按主题筛选",
      stories_n: "条新闻",
      signals_n: "个信号",
      reports_n: "篇报道",
      on_desk: "本轮扫描的工作台上 —",
      language: "语言",
      tagline: "来自 63 个精选 X 列表的 AI 信号",
      loading: "加载中…",
      loading_story: "正在加载新闻…",
      loading_signals: "正在加载信号…",
      loading_reports: "正在加载报道…",
      loading_nl: "正在加载简报…",
      live_desk: "实时工作台",
      focus: "专注",
      desk: "工作台",
      hide_desk: "隐藏工作台，腾出信息流空间",
      show_desk: "显示工作台概览",
      focus_aria: "专注 — 隐藏工作台",
      show_desk_aria: "显示工作台",
      lists: "列表",
      this_week: "本周",
      events_kicker: "会议 · 黑客松 · 晚宴",
      conferences: "会议",
      hackathons: "黑客松",
      dinners: "晚宴",
      rest_desk: "工作台其余内容",
      nothing_saved: "还没有收藏",
      for_you: "为你推荐",
      desk_glance: "工作台速览",
      intel_sub: "Scoble 列表上的动向",
      no_signals_match: "没有符合的信号。",
      no_reports: "没有报道。",
      no_reports_yet: "还没有报道。",
      no_earlier: "没有更早的期次。",
      no_issues: "还没有期次。",
      issue_not_found: "找不到这一期。",
      back_nl: "返回简报",
      story_not_found: "找不到这篇新闻。",
      save_later: "稍后阅读",
      mark_unread: "标为未读",
      marked_unread: "已标为未读",
      what_happened: "发生了什么",
      why_it_matters: "为什么重要",
      what_to_watch: "接下来看什么",
      original_post: "原始帖",
      original_x_post: "@{user} 的原始 X 帖",
      useful_links: "有用链接",
      related: "工作台上的相关内容",
      open_on_x: "在 X 上打开 ↗",
      views: "浏览",
      views_n: "次浏览",
      likes: "喜欢",
      replies: "回复",
      reposts: "转发",
      saves: "收藏",
      sentiment: "情绪",
      not_measured: "未统计",
      not_enough_reactions: "公开反应还不够。",
      source: "来源",
      source_one: "个来源",
      sources: "个来源",
      first_seen: "首次出现",
      recently: "刚刚",
      just_now: "刚刚",
      ago_m: "{n} 分钟前",
      ago_h: "{n} 小时前",
      ago_d: "{n} 天前",
      archive: "归档",
      written_desk: "写于 Aligned News 工作台",
      from_archive: "来自 Unaligned 归档",
      nl_source_archive: "更早的 Unaligned 期次，留在这张工作台上。",
      nl_desk_value: "X 上的 AI 对话，写自这张工作台。六十三个列表。纸与墨。",
      previous: "往期",
      earlier_issues: "更早的期次",
      signals_value: "来自 Scoble 列表的跨列表峰值、关键词命中和高互动帖。",
      signals_why: "信号是工作台的预警层：在成为主流之前就穿过精选列表的、按互动加权的帖子。",
      top_signals: "热门信号",
      list_provenance: "列表出处",
      signals_prov: "按带出每条信号的 Scoble 列表筛选。",
      signals_vibe: "工作台上的信号速度：置信度高的变动排在前面。",
      reports_value: "这一周需要深度时的长文：归档、晚间稿和简报。",
      reports_why: "报道把当天的信息洪流打成耐读的简报——你需要叙事、而不只是峰值的时候有用。",
      reports_prov: "研究用的是和实时工作台同一套 Scoble 列表语料。",
      reports_vibe: "研究工作台的节奏：这一周需要深度时上长文。",
      filter_list: "按列表筛选",
      sidebar_modules: "侧栏模块",
      footer_signal: "来自 Scoble 的 X 列表的信号",
      footer_api: "Pro API · alignednews.com/v1",
      footer_nl: "Unaligned · 来自这张工作台",
      all: "全部",
      topic_models: "模型",
      topic_agents: "智能体",
      topic_robotics: "机器人",
      topic_funding: "融资",
      topic_companies: "公司",
      topic_research: "研究",
      topic_chips: "芯片",
      topic_open_source: "开源",
      topic_policy: "政策",
      topic_creative: "创意",
      topic_events: "活动",
      topic_jobs: "职位",
      topic_labs: "实验室",
      topic_breaking: "突发",
      topic_videos: "视频",
      topic_compute: "算力",
      topic_industry: "产业",
      topic_scoble: "Scoble",
      community: "社区",
      hit_n_lists: "命中 Scoble 的 {n} 个列表",
      talking: "人们在讨论，不只是点赞",
      likes_wont: "光靠点赞上不了 For You",
      rising: "上升",
      keyword_hit: "关键词命中",
      list_spike: "列表峰值",
      scoble_list: "Scoble 列表",
      why_ranked: "为何上榜",
      min_read: "{n} 分钟",
      conf_pct: "{n}% 置信",
      original_source: "原始来源",
      original_metrics: "原始帖数据",
      positive: "正面",
      negative: "负面",
      public_reactions: "公开反应",
      sentiment_mix: "情绪构成",
      desk_word: "工作台",
      nl_issues: "{n} 期往期",
      nl_issue_one: "1 期往期",
      issue: "期",
      create_desk: "创建你的工作台",
      welcome_back: "欢迎回来",
      auth_sub_signup: "加入 Aligned News Pro 工作台演示。后端稍后接入。",
      auth_sub_login: "登录你的 Aligned News 工作台演示。",
      create_account: "创建账户",
      sign_up: "注册",
      log_in: "登录",
      name: "姓名",
      optional: "（选填）",
      password: "密码",
      confirm_password: "确认密码",
      or: "或",
      continue_google: "使用 Google 继续",
      google_note: "Google 登录目前是演示。",
      demo_note: "演示界面 — 登录接入即将到来",
      auth_toast: "你已进入 — 后端尚未接通",
      auth_need: "请填写邮箱和密码以继续",
      auth_mismatch: "两次密码不一致，请重试",
      coming_soon: "即将推出",
      auth_mode: "登录方式",
      from_ai_briefing: "来自 /ai 简报。",
      from_signals_desk: "来自 Aligned News 信号工作台。",
      from_briefing: "来自 Aligned News 简报。",
      could_not_load: "无法加载 live-data.json。请用本地静态服务器打开（file:// 可能会拦住 fetch）。",
      vibe_line: "本轮扫描的工作台上有 {stories} 条新闻、{signals} 个信号 — 需要深度时有 {reports} 篇报道。",
      live_from_n: "来自 @{user} 的实时 — 本轮扫描了 {n} 个列表。",
      live_from_fallback: "通过 X API 来自 @Scobleizer 列表的实时内容。",
      untitled: "无标题",
      desk_overview: "工作台概览",
      signals_overview: "信号概览",
      reports_overview: "报道概览",
      nl_overview: "简报概览",
      desk_stats: "工作台数据",
      desk_glance_aria: "工作台速览"
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
    txQuotaHit = false;
    if (typeof window.anOnLangChange === "function") window.anOnLangChange(lang);
  }

  function t(key, vars) {
    var pack = dict[getLang()] || dict.en;
    var val = pack[key] != null ? pack[key] : (dict.en[key] != null ? dict.en[key] : key);
    if (vars) {
      val = String(val).replace(/\{(\w+)\}/g, function (_, k) {
        return vars[k] != null ? String(vars[k]) : "{" + k + "}";
      });
    }
    return val;
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
    if (/^https?:|^[\d#@.,:%\s]+$/i.test(t0)) return true;
    if (/^(Aligned News|Aligned|VITURE|UNALIGNED|Unaligned|Scoble|Pro|Free|LIVE|News)$/i.test(t0)) return true;
    var pack = dict[getLang()];
    if (pack) {
      for (var k in pack) if (pack[k] === t0) return true;
    }
    return false;
  }

  var txQuotaHit = false;
  var inFlight = {};

  function isUsefulTx(src, out, lang) {
    if (!out) return false;
    var a = String(src).trim();
    var b = String(out).trim();
    if (!b || b === a) return false;
    if (/MYMEMORY WARNING/i.test(b)) return false;
    if ((lang === "zh" || lang === "ja") && !/[\u3040-\u30ff\u3400-\u9fff]/.test(b)) return false;
    return true;
  }

  function lookupCache(src, lang) {
    if (!cache[lang]) return "";
    if (cache[lang][src]) return cache[lang][src];
    var best = "";
    for (var k in cache[lang]) {
      if (!k) continue;
      if (k === src || (src.length >= 24 && k.indexOf(src) === 0) || (k.length >= 24 && src.indexOf(k) === 0)) {
        if (k.length > best.length) best = k;
      }
    }
    return best ? cache[lang][best] : "";
  }

  function translateRemote(text) {
    var lang = getLang();
    var src = String(text == null ? "" : text);
    if (lang === "en") return Promise.resolve(src);
    if (skipText(src)) return Promise.resolve(src);
    if (!cache[lang]) cache[lang] = {};
    var hit = lookupCache(src, lang);
    if (hit) {
      cache[lang][src] = hit;
      return Promise.resolve(hit);
    }
    if (txQuotaHit) return Promise.resolve(src);
    var pair = PAIR[lang];
    if (!pair) return Promise.resolve(src);
    var fk = lang + "\0" + src;
    if (inFlight[fk]) return inFlight[fk];
    var q = encodeURIComponent(src.slice(0, 480));
    var url = "https://api.mymemory.translated.net/get?langpair=" + encodeURIComponent(pair) + "&q=" + q + "&de=" + encodeURIComponent("asherunaligned@gmail.com");
    inFlight[fk] = fetch(url).then(function (r) { return r.json(); }).then(function (j) {
      var out = j && j.responseData && j.responseData.translatedText;
      var status = j && j.responseStatus;
      if (status === 429 || status === 403 || (out && /MYMEMORY WARNING/i.test(String(out)))) {
        txQuotaHit = true;
        return src;
      }
      if (isUsefulTx(src, out, lang)) {
        cache[lang][src] = out;
        saveCache();
        return out;
      }
      return src;
    }).catch(function () { return src; }).then(function (out) {
      delete inFlight[fk];
      return out;
    });
    return inFlight[fk];
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

  function setElText(el, text) {
    if (!el) return;
    if (el.childElementCount === 0) {
      el.textContent = text;
      return;
    }
    var kids = el.childNodes;
    var onlyText = true;
    var textNode = null;
    for (var i = 0; i < kids.length; i++) {
      if (kids[i].nodeType === 3) {
        if (String(kids[i].nodeValue).trim()) {
          if (textNode) { onlyText = false; break; }
          textNode = kids[i];
        }
      } else if (kids[i].nodeType === 1) {
        onlyText = false;
        break;
      }
    }
    if (onlyText && textNode) textNode.nodeValue = text;
    else el.textContent = text;
  }

  function applyTxAttrs() {
    var lang = getLang();
    var els = document.querySelectorAll("[data-tx-src]");
    var pending = [];
    var seen = {};
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var src = el.getAttribute("data-tx-src");
      if (!src) continue;
      if (lang === "en") {
        setElText(el, src);
        continue;
      }
      var hit = lookupCache(src, lang);
      if (hit) {
        setElText(el, hit);
      } else if (!skipText(src) && !seen[src]) {
        seen[src] = 1;
        pending.push({ el: el, src: src });
      } else if (!skipText(src)) {
        pending.push({ el: el, src: src });
      }
    }
    return pending;
  }

  function visScore(node) {
    var el = node && (node.nodeType === 1 ? node : node.parentElement);
    if (!el || !el.closest) return 0;
    if (el.closest(".lead-card, .lead-title, .lead-dek, .story-header, .article-dek, .nl-prose, .story-prose, .original-post-copy")) return 3;
    try {
      var r = el.getBoundingClientRect();
      if (r.bottom > 0 && r.top < (window.innerHeight || 800) + 240) return 2;
    } catch (e) {}
    return 1;
  }

  var walkTimer = null;
  var walkGen = 0;

  function translatePage() {
    applyStatic();
    var pending = applyTxAttrs();
    if (getLang() === "en") return;
    clearTimeout(walkTimer);
    var gen = ++walkGen;
    walkTimer = setTimeout(function () {
      if (gen !== walkGen) return;
      fetchPending(pending, gen);
      runWalk(gen);
    }, 20);
  }

  function applySrcToAll(src, out) {
    var els = document.querySelectorAll("[data-tx-src]");
    for (var i = 0; i < els.length; i++) {
      if (els[i].getAttribute("data-tx-src") === src) setElText(els[i], out);
    }
  }

  function fetchPending(pending, gen) {
    if (!pending || !pending.length) return;
    var lang = getLang();
    var uniq = [];
    var seen = {};
    for (var p = 0; p < pending.length; p++) {
      if (seen[pending[p].src]) continue;
      seen[pending[p].src] = 1;
      uniq.push(pending[p].src);
    }
    var i = 0;
    function pump() {
      if (gen !== walkGen || txQuotaHit || getLang() !== lang) return;
      if (i >= uniq.length) return;
      var src = uniq[i++];
      translateRemote(src).then(function (out) {
        if (gen !== walkGen || getLang() !== lang) return;
        if (out) applySrcToAll(src, out);
        pump();
      });
    }
    for (var c = 0; c < CONCURRENCY; c++) pump();
  }

  function runWalk(gen) {
    var roots = document.querySelectorAll(
      ".lead-title, .lead-dek, .story-title, .excerpt, .why-here, .desk-mod-title, .desk-mod-text, .nl-prose, .article-body, .story-prose, .original-post-copy, .intel-title, .nl-issue-title, .nl-issue-blurb, .related-card, .events-col a, .rail-item-title, .article-dek, .story-block, .report-item, article h1"
    );
    var nodes = [];
    function collect(node) {
      if (!node || gen !== walkGen) return;
      if (node.nodeType === 3) {
        var s = node.nodeValue;
        if (s && s.trim() && !skipText(s)) nodes.push(node);
        return;
      }
      if (node.nodeType !== 1) return;
      if (node.hasAttribute && (node.hasAttribute("data-i18n") || node.hasAttribute("data-no-tx") || node.hasAttribute("data-tx-src"))) return;
      if (node.closest && node.closest("[data-tx-src], [data-i18n], [data-no-tx], .brand, .count, script, style, svg, .avatar, .partners-logo, .sidebar-langs, .rank, code, pre, .live-label")) return;
      var kids = node.childNodes;
      for (var i = 0; i < kids.length; i++) collect(kids[i]);
    }
    for (var r = 0; r < roots.length; r++) collect(roots[r]);

    var groups = [];
    var seen = {};
    for (var n = 0; n < nodes.length; n++) {
      var raw = nodes[n].nodeValue;
      if (seen[raw] != null) {
        groups[seen[raw]].score = Math.max(groups[seen[raw]].score, visScore(nodes[n]));
        continue;
      }
      seen[raw] = groups.length;
      groups.push({ src: raw, score: visScore(nodes[n]) });
    }
    groups.sort(function (a, b) { return b.score - a.score; });
    if (groups.length > MAX_UNIQUE) groups = groups.slice(0, MAX_UNIQUE);

    var lang = getLang();
    var i = 0;
    function pump() {
      if (gen !== walkGen || txQuotaHit || getLang() !== lang) return;
      if (i >= groups.length) return;
      var item = groups[i++];
      var src = item.src;
      translateRemote(src).then(function (out) {
        if (gen !== walkGen || getLang() !== lang) return;
        if (out && out !== src) {
          for (var k = 0; k < nodes.length; k++) {
            if (nodes[k].nodeValue !== src) continue;
            var parent = nodes[k].parentElement;
            if (parent && !parent.getAttribute("data-tx-src") && parent.childElementCount === 0) {
              parent.setAttribute("data-tx-src", src);
            }
            nodes[k].nodeValue = out;
          }
        }
        pump();
      });
    }
    for (var c = 0; c < CONCURRENCY; c++) pump();
  }

  document.documentElement.lang = HTML_LANG[getLang()] || "en";
  document.documentElement.setAttribute("data-lang", getLang());
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", applyStatic);
  else applyStatic();


  window.anTxReady = fetch("tx.json?v=an129").then(function (r) {
    if (!r.ok) throw new Error("tx");
    return r.json();
  }).then(function (map) {
    if (!map) return;
    var langs = Object.keys(map);
    for (var i = 0; i < langs.length; i++) {
      var lang = langs[i];
      if (!cache[lang]) cache[lang] = {};
      var pack = map[lang] || {};
      for (var k in pack) if (pack[k]) cache[lang][k] = pack[k];
    }
    try { saveCache(); } catch (e) {}
    if (getLang() !== "en" && typeof window.anTranslatePage === "function") window.anTranslatePage();
  }).catch(function () { return null; });

  window.anT = t;
  window.anLang = getLang;
  window.anSetLang = setLang;
  window.anLoc = loc;
  window.anTranslatePage = translatePage;
  window.anTranslateRemote = translateRemote;
  window.anLangs = LANGS;
  window.anLangNative = NATIVE;
})();
