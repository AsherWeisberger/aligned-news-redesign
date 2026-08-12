# Aligned News — Pro reader mock

Static, GitHub Pages–friendly mock of a **logged-in Pro** Aligned News experience.

Reading UX is **Digg-simple**: one vertical story feed, clear titles, short excerpts, quiet chrome. Not a marketing landing page and not a dense intel dashboard.

## Open locally

```bash
cd alignednews-redesign
python3 -m http.server 8080
# http://localhost:8080
```

`live-data.json` is fetched at runtime — use a static server so `fetch` works.

## Information architecture

| File | Role |
|------|------|
| `index.html` | **Today** — ranked vertical feed + compact “For you” (3 signals) + section chips |
| `signals.html` | Signals list, filterable by section/badge family |
| `reports.html` | Reports list |
| `story.html?id=` | Full article view (Pro, no paywall) + sources, Save / Mark unread |
| `live-data.json` | Content payload (refresh anytime) |
| `live-data.scraper-raw.json` | Backup of scraper schema |
| `app.js` / `styles.css` | Shared app + light-first Digg-like UI |

**Chrome:** left sidebar (Today · Signals · Stories · Reports · Saved · Sections); collapses to drawer on mobile. Top bar: search, density toggle (Comfortable / Compact → `localStorage`), theme, **Asher · Pro**. Footer: tiny “Preview mock · sample data”.

**Today hierarchy:** date + last updated → filter chips → short For you strip → chronological/ranked story list. Click row → `story.html`.

## Data

Normalized from live alignednews.com public API + `/ai` scrape. Titles/metadata are live; gated article bodies are sample Pro text marked in-article. `app.js` also accepts the scraper-raw schema if `live-data.json` is overwritten that way.

## Tone

Quiet product copy: Today, Saved, Filter, Mark unread. No hero, no newsletter hard-sell.
