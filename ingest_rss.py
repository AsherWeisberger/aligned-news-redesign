#!/usr/bin/env python3
"""Refresh live-data.json from alignednews.com RSS.

Keeps the existing JSON shape (meta/user/stats/chips/signals/reports/…)
and fills Today from real stories — ten-things first, never Scoble reply dump.
"""
from __future__ import annotations

import json
import re
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "live-data.json"
RSS_URLS = (
    "https://alignednews.com/rss",
    "https://alignednews.com/feed.xml",
)
UA = "AlignedNewsRedesign/an77 (+https://asherweisberger.github.io/aligned-news-redesign/)"

JUNK_TITLE_RE = re.compile(
    r"posted a brief reply|documents a current scoble development",
    re.I,
)
RT_RE = re.compile(r"^RT\s+@", re.I)
AI_HINT_RE = re.compile(
    r"\b(AI|LLM|model|agent|robot|GPU|OpenAI|Anthropic|NVIDIA|Google|Meta|xAI|"
    r"Claude|GPT|funding|launch|benchmark|SOTA)\b",
    re.I,
)
JUNK_TOPIC_RE = re.compile(
    r"\b(Aegon|Game of Thrones|House of the Dragon|NFL|NBA|soccer|football|"
    r"Taylor Swift|spoiler)\b",
    re.I,
)
AI_TOPIC_RE = re.compile(r"\b(AI|model|agent|LLM|robot)\b", re.I)

TOPIC_ORDER = [
    ("robotics", re.compile(r"\b(robot|humanoid|physical ai|openusd)\b", re.I), "Robotics"),
    ("funding", re.compile(r"\b(fund|raised|series [a-d]|acquisition|ipo|valuation|invest|buyout)\b|\$\d|sale of", re.I), "Funding"),
    ("policy", re.compile(r"\b(regulat(?:ion|ory)?|antitrust|judge|court|privacy)\b|white house|eu ai|cyber operations", re.I), "Policy"),
    ("agents", re.compile(r"agentic|\bagents?\b|openclaw|orchestrat|tool call", re.I), "Agents"),
    ("chips", re.compile(r"\b(gpu|chip|semiconductor|tpu|hardware|intel attestation)\b", re.I), "Chips"),
    ("open-source", re.compile(r"open[- ]?source|open.weight|hugging face|weights", re.I), "Open source"),
    ("research", re.compile(r"\b(benchmark|arxiv|research|eval|sota)\b", re.I), "Research"),
    ("creative", re.compile(r"video|image gen|creative|midjourney|sora|flux", re.I), "Creative"),
    ("models", re.compile(r"\b(model|llm|gpt|claude|gemini|fireworks|grok|xai|glm-?\d)\b", re.I), "Models"),
]

SECTION_LABELS = {
    "ten-things": "Latest Stories",
    "scoble": "Scoble",
}


def local(tag: str) -> str:
    return tag.split("}", 1)[-1]


def text_of(el) -> str:
    if el is None:
        return ""
    return "".join(el.itertext()).strip()


def child(item, name: str):
    for ch in list(item):
        if local(ch.tag) == name:
            return ch
    return None


def fetch_rss() -> tuple[bytes, str]:
    last_err = None
    for url in RSS_URLS:
        req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/rss+xml, application/xml, text/xml"})
        try:
            with urllib.request.urlopen(req, timeout=25) as resp:
                return resp.read(), url
        except (urllib.error.URLError, TimeoutError) as exc:
            last_err = exc
            continue
    raise RuntimeError(f"Could not fetch RSS: {last_err}")


def parse_pub(raw: str) -> str:
    raw = (raw or "").strip()
    if not raw:
        return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    try:
        dt = parsedate_to_datetime(raw)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        dt = dt.astimezone(timezone.utc)
        return dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")
    except (TypeError, ValueError, OverflowError):
        return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def host_name(url: str) -> str:
    try:
        host = urlparse(url).netloc.lower()
    except ValueError:
        return "source"
    host = host[4:] if host.startswith("www.") else host
    return host or "source"


def topic_for(headline: str, body: str, section: str) -> tuple[str, str]:
    # Prefer the headline so body words like "policies" do not steal the topic.
    for hay in (headline, " ".join([headline, body, section])):
        for key, rx, label in TOPIC_ORDER:
            if rx.search(hay):
                return key, label
    sl = (section or "").lower()
    if "compan" in sl or "event" in sl:
        return "companies", "Companies"
    blob = f"{headline} {body}".lower()
    if "nvidia" in blob:
        return "chips", "Chips"
    return "companies", "Companies"


def is_retweet_noise(title: str, body: str) -> bool:
    t = f"{title}\n{body}".strip()
    if RT_RE.match(title or "") or RT_RE.match(t):
        if not AI_HINT_RE.search(t):
            return True
    if JUNK_TOPIC_RE.search(t) and not AI_TOPIC_RE.search(t):
        return True
    return False


def looks_like_scoble_reply(title: str, body: str, category: str) -> bool:
    title = title or ""
    body = body or ""
    cat = (category or "").lower()
    if JUNK_TITLE_RE.search(title):
        return True
    if re.search(r"Robert Scoble posted a brief reply", title, re.I):
        return True
    if re.search(r"documents a current scoble development", title, re.I):
        return True
    if cat == "scoble":
        # Keep only if it looks like a real post (not a one-line reply).
        if re.search(r"\breshared\b", title, re.I) and len(title) > 72:
            return False
        return True
    return False


def keep_item(title: str, body: str, category: str) -> bool:
    if is_retweet_noise(title, body):
        return False
    if looks_like_scoble_reply(title, body, category):
        return False
    cat = (category or "").lower()
    if cat == "ten-things":
        return True
    # other non-scoble categories
    if cat and cat != "scoble":
        return True
    # uncategorized: keep if it has a real headline
    if not cat and title and not JUNK_TITLE_RE.search(title) and len(title) > 28:
        return True
    return False


def clamp(s: str, n: int) -> str:
    t = re.sub(r"\s+", " ", s or "").strip()
    if len(t) <= n:
        return t
    cut = t[: n - 1]
    sp = cut.rfind(" ")
    if sp > n * 0.5:
        cut = cut[:sp]
    return cut.rstrip(" ,;:—–-") + "…"


def item_to_story(item) -> dict | None:
    title = text_of(child(item, "title"))
    desc = text_of(child(item, "description"))
    link = text_of(child(item, "link"))
    guid = text_of(child(item, "guid")) or link
    author = text_of(child(item, "author"))
    category = text_of(child(item, "category"))
    pub = text_of(child(item, "pubDate"))
    if not title:
        return None
    if not keep_item(title, desc, category):
        return None
    published = parse_pub(pub)
    topic_key, topic_label = topic_for(title, desc, category)
    section = (category or "general").strip().lower() or "general"
    section_label = SECTION_LABELS.get(section, section.replace("-", " ").title())
    source_list = "Latest Stories" if section == "ten-things" else section_label
    host = host_name(link)
    author_name = author or host
    body = desc or title
    return {
        "id": guid,
        "headline": title,
        "summary": clamp(body, 240),
        "section": section,
        "section_key": topic_key,
        "section_label": section_label,
        "tag": section,
        "published_at": published,
        "author_name": author_name,
        "source_list": source_list,
        "source_url": link,
        "sources": [{"url": link, "name": host}] if link else [],
        "body": body,
        "kind": "story",
        "engagement": {
            "bookmark_count": 0,
            "impression_count": 0,
            "like_count": 0,
            "quote_count": 0,
            "reply_count": 0,
            "retweet_count": 0,
        },
        "why_it_matters": clamp(body, 220) if body else title,
        "topic_key": topic_key,
        "topic_label": topic_label,
    }


def story_to_foryou(story: dict) -> dict:
    return {
        "id": story["id"],
        "title": story["headline"],
        "text": story["body"],
        "badge": "story",
        "topic_key": story["topic_key"],
        "source_url": story["source_url"],
        "created_at": story["published_at"],
        "section_key": story["section_key"],
        "section_label": story["section_label"],
        "source_list": story["source_list"],
        "topic_label": story["topic_label"],
        "analysis": story.get("why_it_matters") or story["summary"],
    }


def main() -> int:
    existing: dict = {}
    if DATA_PATH.exists():
        existing = json.loads(DATA_PATH.read_text(encoding="utf-8"))

    raw, used_url = fetch_rss()
    root = ET.fromstring(raw)
    channel = None
    for el in root.iter():
        if local(el.tag) == "channel":
            channel = el
            break
    if channel is None:
        raise RuntimeError("RSS has no channel")

    last_build = ""
    items = []
    for el in list(channel):
        name = local(el.tag)
        if name == "lastBuildDate":
            last_build = text_of(el)
        elif name == "item":
            items.append(el)

    stories = []
    seen = set()
    for it in items:
        story = item_to_story(it)
        if not story:
            continue
        if story["id"] in seen:
            continue
        seen.add(story["id"])
        stories.append(story)

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    try:
        last_ts = int(parsedate_to_datetime(last_build).timestamp() * 1000) if last_build else int(datetime.now(timezone.utc).timestamp() * 1000)
    except (TypeError, ValueError, OverflowError):
        last_ts = int(datetime.now(timezone.utc).timestamp() * 1000)

    chips = existing.get("chips") or [
        {"id": "all", "label": "All"},
        {"id": "models", "label": "Models"},
        {"id": "agents", "label": "Agents"},
        {"id": "robotics", "label": "Robotics"},
        {"id": "funding", "label": "Funding"},
        {"id": "companies", "label": "Companies"},
        {"id": "research", "label": "Research"},
        {"id": "chips", "label": "Chips"},
        {"id": "open-source", "label": "Open source"},
    ]
    signals = existing.get("signals") if isinstance(existing.get("signals"), list) else []
    reports = existing.get("reports") if isinstance(existing.get("reports"), list) else []
    bundles = existing.get("bundles") if isinstance(existing.get("bundles"), list) else []
    ai_sections = existing.get("ai_sections") if isinstance(existing.get("ai_sections"), list) else []
    user = existing.get("user") or {"name": "Asher", "plan": "Pro"}

    out = {
        "meta": {
            "generatedAt": now,
            "scrapedAt": now,
            "source": "alignednews-rss",
            "note": f"Refreshed from {used_url}",
            "rssLastBuildDate": last_build,
            "rssItemCount": len(items),
            "rssKeptCount": len(stories),
            "lastUpdatedTs": last_ts,
        },
        "user": user,
        "stats": {
            "lists": 63,
            "stories": len(stories),
            "signals": len(signals),
            "reports": len(reports),
        },
        "chips": chips,
        "forYou": [story_to_foryou(s) for s in stories[:5]],
        "stories": stories,
        "signals": signals,
        "reports": reports,
        "bundles": bundles,
        "ai_sections": ai_sections,
    }
    DATA_PATH.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {DATA_PATH.name}: {len(stories)} stories from {len(items)} RSS items ({used_url})")
    print(f"lastBuildDate: {last_build}")
    for s in stories:
        print(f"  - [{s['section']}/{s['topic_key']}] {s['headline'][:88]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
