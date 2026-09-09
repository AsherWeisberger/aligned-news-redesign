# ChatGPT handoff — Aligned News Pages redesign

**Date:** 2026-09-09

This GitHub Pages build mirrors **live alignednews.com chrome** as of Fly **v129-ish** (static HTML/CSS/JS stand-in, not the production React/Bun app).

## Point ChatGPT here

- `index.html` — home shell
- `styles.css` — desk + chrome styles (incl. an274 live deltas)
- `app.js` — feed + chrome behavior

## Synced chrome (2026-09-09)

- **Report a bug** in More list (red outline, `0.88rem` like sibling nav links) and in the mobile plus sheet (red bug tile — not “God mode”)
- Story **bookmark/save** button top-right; title `padding-right` so titles wrap before the icon
- Header **Collaborations** spelled out; brand sizing/spacing toward live sidebar column
- **Slim newsletter strip** (link to `newsletter.html`, not a huge email-capture briefing bar)
- Saved section + `an-saved.js` Clerk-user-keyed `localStorage` (`alignednews-saved-v1` / `alignednews-saved-v1:userId`); guests stay on the base key
- Footer with Asher / `@AsherWeisberger`, plus **Account** in the plus menu when signed-in mock is on

## Still production elsewhere

Live product remains the React app at **https://alignednews.com/** (blevlabs/aligned-news on Fly). Do **not** treat this Pages repo as the production source of truth.

Unaligned newsletter issue bodies / collab copy may be edited separately — prefer not to rewrite `newsletter-data.json` issue content from this chrome sync.

Hard-refresh with bust: https://asherweisberger.github.io/aligned-news-redesign/?bust=an274
