#!/usr/bin/env python3
"""Refresh live-data.json from alignednews.com /api/news-feed.

Keeps the existing JSON shape (meta/user/stats/chips/signals/reports/…)
and fills Today from the public desk. RSS is fallback only.
"""
from __future__ import annotations

import html as html_lib
import json
import os
import re
import sys
import threading
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import urljoin, urlparse

ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "live-data.json"
NEWS_FEED_URL = os.environ.get("AN_NEWS_FEED_URL", "https://alignednews.com/api/news-feed")
RSS_URLS = (
    "https://alignednews.com/rss",
    "https://alignednews.com/feed.xml",
)
LOCAL_FEED_CANDIDATES = [
    Path(p) for p in (
        os.environ.get("AN_NEWS_FEED_FILE") or "",
        str(ROOT / "aligned-news-feed.json"),
        "/tmp/an-news-feed.json",
        "/workspace/aligned-news-feed.json",
    ) if p
]
UA = "AlignedNewsRedesign/an105 (+https://asherweisberger.github.io/aligned-news-redesign/)"

JUNK_TITLE_RE = re.compile(
    r"posted a brief reply|documents a current scoble development|"
    r"scoble\s*:-?\)|scoble smile",
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
    r"Taylor Swift|spoiler|Call of Duty|Fortnite|PlayStation|Xbox|"
    r"esports|World Cup|Super Bowl)\b",
    re.I,
)
AI_TOPIC_RE = re.compile(r"\b(AI|model|agent|LLM|robot)\b", re.I)
OPEN_SOURCE_RE = re.compile(
    r"open[- ]?source|open[- ]?weight|hugging\s*face|openclaw|\boss\b|"
    r"weights on hugging|released? (?:the )?weights",
    re.I,
)
RELEASE_RE = re.compile(
    r"\b(release[sd]?|launches?|launched|announces?|announced|unveils?|"
    r"drops?|shipping|open[- ]?source[sd]?|weights|arxiv|paper|benchmark|"
    r"SOTA|parameter|MoE|GPU|chip|semiconductor|lab[s]?)\b",
    re.I,
)
HOT_TAKE_RE = re.compile(
    r"\b(hot take|I think|IMO\b|seems like|vibes?|hype cycle|"
    r"this is fine|lol\b|lmao|ngl\b|tbh\b|wild that|can't believe)\b|"
    r"\?{2,}|!{2,}",
    re.I,
)

TOPIC_ORDER = [
    ("robotics", re.compile(r"\b(robot|humanoid|physical ai|openusd)\b", re.I), "Robotics"),
    ("funding", re.compile(r"\b(fund|raised|series [a-d]|acquisition|ipo|valuation|invest|buyout)\b|\$\d|sale of", re.I), "Funding"),
    ("policy", re.compile(r"\b(regulat(?:ion|ory)?|antitrust|judge|court|privacy)\b|white house|eu ai|cyber operations", re.I), "Policy"),
    ("open-source", OPEN_SOURCE_RE, "Open source"),
    ("agents", re.compile(r"agentic|\bagents?\b|orchestrat|tool call", re.I), "Agents"),
    ("chips", re.compile(r"\b(gpu|chip|semiconductor|tpu|hardware|intel attestation|hbm|foundry)\b", re.I), "Chips"),
    ("research", re.compile(r"\b(benchmark|arxiv|research|eval|sota|paper)\b", re.I), "Research"),
    ("creative", re.compile(r"video|image gen|creative|midjourney|sora|flux", re.I), "Creative"),
    ("models", re.compile(r"\b(model|llm|gpt|claude|gemini|fireworks|grok|xai|glm-?\d|deepseek)\b", re.I), "Models"),
]

SKIP_SECTIONS = {"claw-feed", "rss-feed", "newsletter"}

NEWS_SECTION_RANK = {
    "breaking": 0,
    "models": 1,
    "labs": 2,
    "chips": 3,
    "papers": 4,
    "robotics": 5,
    "agents": 6,
    "products": 7,
    "funding": 8,
    "policy": 9,
    "science": 10,
    "anomalies": 11,
    "infrastructure": 12,
    "openclaw": 13,
    "creatives": 14,
    "notebook-lm": 15,
    "ten-things": 16,
}
SIDE_SECTION_RANK = {
    "jobs": 40,
    "videos": 41,
}

SECTION_LABELS = {
    "breaking": "Breaking",
    "products": "Products",
    "robotics": "Robotics",
    "creatives": "Creative",
    "funding": "Funding",
    "models": "Models",
    "labs": "Labs",
    "papers": "Research",
    "chips": "Chips",
    "agents": "Agents",
    "openclaw": "Open source",
    "infrastructure": "Infrastructure",
    "science": "Science",
    "videos": "Videos",
    "policy": "Policy",
    "jobs": "Jobs",
    "anomalies": "Anomalies",
    "events-conferences": "Events",
    "events-hackathons": "Events",
    "events-dinners": "Events",
    "notebook-lm": "Briefing",
    "ten-things": "Latest Stories",
    "scoble": "Scoble",
}

DESK_CHIPS = [
    {"id": "all", "label": "All"},
    {"id": "breaking", "label": "Breaking"},
    {"id": "models", "label": "Models"},
    {"id": "labs", "label": "Labs"},
    {"id": "chips", "label": "Chips"},
    {"id": "robotics", "label": "Robotics"},
    {"id": "agents", "label": "Agents"},
    {"id": "research", "label": "Research"},
    {"id": "funding", "label": "Funding"},
    {"id": "policy", "label": "Policy"},
    {"id": "open-source", "label": "Open source"},
    {"id": "jobs", "label": "Jobs"},
    {"id": "events", "label": "Events"},
    {"id": "companies", "label": "Companies"},
]


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



X_HANDLE_RE = re.compile(r"(?:x\.com|twitter\.com)/([A-Za-z0-9_]{1,15})(?:/|$)", re.I)
X_RESERVED = {"status", "i", "intent", "share", "search", "home", "explore", "settings"}


def x_handle(url: str, author: str = "") -> str:
    m = X_HANDLE_RE.search(url or "")
    if m:
        handle = m.group(1)
        if handle.lower() not in X_RESERVED:
            return handle
    a = (author or "").strip().lstrip("@")
    if re.fullmatch(r"[A-Za-z0-9_]{1,15}", a) and re.search(r"(?:x\.com|twitter\.com)/", url or "", re.I):
        return a
    return ""


def x_avatar_url(handle: str) -> str:
    if not handle:
        return ""
    if not re.fullmatch(r"[A-Za-z0-9_]{1,15}", handle):
        return ""
    return f"https://unavatar.io/twitter/{handle}"


def verify_unavatar(url: str) -> str:
    """Keep only well-formed unavatar twitter URLs; drop HTTP errors."""
    if not url or "unavatar.io/twitter/" not in url:
        return ""
    handle = url.rstrip("/").rsplit("/", 1)[-1]
    if not re.fullmatch(r"[A-Za-z0-9_]{1,15}", handle):
        return ""
    req = urllib.request.Request(
        url,
        headers={"User-Agent": UA, "Accept": "image/*"},
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            if getattr(resp, "status", 200) >= 400:
                return ""
            ctype = (resp.headers.get("Content-Type") or "").lower()
            if ctype and not (ctype.startswith("image") or "octet-stream" in ctype):
                return ""
            return f"https://unavatar.io/twitter/{handle}"
    except (urllib.error.URLError, TimeoutError, ValueError):
        # Network flake: keep the well-formed URL rather than stripping photos.
        return f"https://unavatar.io/twitter/{handle}"

META_PROP_Q = re.compile(r'(?:property|name)\s*=\s*["\']([^"\']+)["\']', re.I)
META_PROP_B = re.compile(r'(?:property|name)\s*=\s*([^\s>]+)', re.I)
META_CONTENT_Q = re.compile(r'content\s*=\s*["\']([^"\']+)["\']', re.I)
META_CONTENT_B = re.compile(r'content\s*=\s*([^\s>]+)', re.I)

X_STATUS_RE = re.compile(r"(?:x\.com|twitter\.com)/[^/\s]+/status/(\d+)", re.I)
AVATAR_HINT_RE = re.compile(
    r"unavatar\.io|pbs\.twimg\.com/profile_images|abs\.twimg\.com|"
    r"avatars\.githubusercontent|gravatar\.com|ui-avatars\.com|i\.pravatar\.cc|"
    r"profile[-_]?images",
    re.I,
)
VIDEO_EXT_RE = re.compile(r"\.(?:mp4|m3u8|mov|webm)(?:$|\?)", re.I)
HTML_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
)


def http_get(url: str, timeout: float, accept: str, ua: str = UA) -> bytes:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": ua,
            "Accept": accept,
            "Accept-Language": "en-US,en;q=0.9",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def is_real_photo(url: str) -> bool:
    u = (url or "").strip()
    if not u.startswith("http://") and not u.startswith("https://"):
        return False
    if AVATAR_HINT_RE.search(u):
        return False
    parsed = urlparse(u)
    host = parsed.netloc.lower()
    if host.startswith("www."):
        host = host[4:]
    if host in ("x.com", "twitter.com", "mobile.twitter.com", "mobile.x.com"):
        return False
    path = parsed.path.lower()
    if path.endswith(".svg"):
        return False
    if VIDEO_EXT_RE.search(u):
        return False
    return True


def first_photo(*cands) -> str:
    for c in cands:
        if isinstance(c, dict):
            for key in (
                "url",
                "src",
                "image",
                "thumbnail_url",
                "thumbnail",
                "poster",
                "preview_image_url",
                "preview",
                "original",
            ):
                v = first_photo(c.get(key))
                if v:
                    return v
        elif isinstance(c, list):
            for item in c:
                v = first_photo(item)
                if v:
                    return v
        elif isinstance(c, str) and is_real_photo(c):
            return c.strip()
    return ""


def photos_from_fx_tweet(tweet: dict) -> str:
    if not isinstance(tweet, dict):
        return ""
    media = tweet.get("media") or {}
    if isinstance(media, dict):
        got = first_photo(media.get("photos"))
        if got:
            return got
        for item in media.get("all") or []:
            if isinstance(item, dict) and str(item.get("type") or "").lower() == "photo":
                got = first_photo(item)
                if got:
                    return got
        got = first_photo(media.get("videos"), media.get("all"))
        if got:
            return got
    quote = tweet.get("quote")
    if isinstance(quote, dict):
        got = photos_from_fx_tweet(quote)
        if got:
            return got
    for key in ("retweet", "retweeted_tweet", "rt", "reposted_tweet"):
        nested = tweet.get(key)
        if isinstance(nested, dict):
            got = photos_from_fx_tweet(nested)
            if got:
                return got
    return ""


def photo_from_fxtwitter(status_id: str) -> str:
    for url in (
        f"https://api.fxtwitter.com/status/{status_id}",
        f"https://api.fxtwitter.com/i/status/{status_id}",
    ):
        try:
            raw = http_get(url, 10, "application/json")
            data = json.loads(raw.decode("utf-8", "replace"))
        except (urllib.error.URLError, TimeoutError, ValueError, json.JSONDecodeError):
            continue
        tweet = data.get("tweet") if isinstance(data, dict) else None
        if not isinstance(tweet, dict) and isinstance(data, dict):
            tweet = data
        got = photos_from_fx_tweet(tweet if isinstance(tweet, dict) else {})
        if got:
            return got
    return ""


def photo_from_vxtwitter(status_id: str) -> str:
    url = f"https://api.vxtwitter.com/Twitter/status/{status_id}"
    try:
        raw = http_get(url, 10, "application/json")
        data = json.loads(raw.decode("utf-8", "replace"))
    except (urllib.error.URLError, TimeoutError, ValueError, json.JSONDecodeError):
        return ""
    if not isinstance(data, dict):
        return ""
    got = first_photo(data.get("media_extended"), data.get("mediaURLs"))
    if got:
        return got
    qrt = data.get("qrt")
    if isinstance(qrt, dict):
        got = first_photo(qrt.get("media_extended"), qrt.get("mediaURLs"))
        if got:
            return got
    return ""


def photo_from_syndication(status_id: str) -> str:
    url = f"https://cdn.syndication.twimg.com/tweet-result?id={status_id}&lang=en"
    try:
        raw = http_get(url, 8, "application/json")
        data = json.loads(raw.decode("utf-8", "replace"))
    except (urllib.error.URLError, TimeoutError, ValueError, json.JSONDecodeError):
        return ""
    if not isinstance(data, dict):
        return ""
    got = first_photo(data.get("photos"), data.get("mediaDetails"))
    if got:
        return got
    video = data.get("video") or data.get("videoInfo") or {}
    if isinstance(video, dict):
        got = first_photo(video.get("poster"), video.get("thumbnail_url"), video)
        if got:
            return got
    return ""


def og_image_from_html(html: str, base: str) -> str:
    if not html:
        return ""
    prefer = []
    fallback = []
    for tag in re.findall(r"<meta\b[^>]*>", html, re.I):
        prop = ""
        content = ""
        m = META_PROP_Q.search(tag)
        if not m:
            m = META_PROP_B.search(tag)
        if m:
            prop = html_lib.unescape(m.group(1)).strip().lower()
        m = META_CONTENT_Q.search(tag)
        if not m:
            m = META_CONTENT_B.search(tag)
        if m:
            content = html_lib.unescape(m.group(1)).strip()
        if not prop or not content:
            continue
        if prop in ("og:image", "og:image:url", "og:image:secure_url"):
            prefer.append(content)
        elif prop in ("twitter:image", "twitter:image:src"):
            fallback.append(content)
    for content in prefer + fallback:
        abs_url = urljoin(base, content)
        if is_real_photo(abs_url):
            return abs_url
    return ""


def og_image(url: str, timeout: float = 8.0) -> str:
    try:
        raw = http_get(
            url,
            timeout,
            "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
            ua=HTML_UA,
        )
    except (urllib.error.URLError, TimeoutError, ValueError, OSError):
        return ""
    html = raw.decode("utf-8", "replace")
    try:
        return og_image_from_html(html, url)
    except Exception:
        return ""


def status_id_from_url(url: str) -> str:
    m = X_STATUS_RE.search(url or "")
    return m.group(1) if m else ""


def resolve_story_photo(source_url: str) -> str:
    url = (source_url or "").strip()
    if not url:
        return ""
    sid = status_id_from_url(url)
    if sid:
        got = photo_from_fxtwitter(sid)
        if got:
            return got
        got = photo_from_vxtwitter(sid)
        if got:
            return got
        got = photo_from_syndication(sid)
        if got:
            return got
        got = og_image(f"https://fxtwitter.com/i/status/{sid}", timeout=8)
        if got:
            return got
        got = og_image(url, timeout=8)
        if got:
            return got
        return ""
    return og_image(url, timeout=8)


def attach_photos(stories: list) -> dict:
    """Fill media_url with a real photo when one exists. Never use unavatar."""
    cache = {}
    lock = threading.Lock()
    found = 0
    empty = 0
    x_found = 0
    x_empty = 0
    x_total = 0

    def work(story):
        url = story.get("source_url") or ""
        with lock:
            if url in cache:
                return url, cache[url]
        photo = resolve_story_photo(url)
        with lock:
            cache[url] = photo
        return url, photo

    with ThreadPoolExecutor(max_workers=8) as pool:
        futs = {pool.submit(work, s): s for s in stories}
        for fut in as_completed(futs):
            story = futs[fut]
            try:
                _, photo = fut.result()
            except Exception:
                photo = ""
            is_x = bool(status_id_from_url(story.get("source_url") or ""))
            if is_x:
                x_total += 1
            if photo:
                story["media_url"] = photo
                found += 1
                if is_x:
                    x_found += 1
            else:
                story.pop("media_url", None)
                empty += 1
                if is_x:
                    x_empty += 1
    return {
        "found": found,
        "empty": empty,
        "x_total": x_total,
        "x_found": x_found,
        "x_empty": x_empty,
    }



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
    if sl.startswith("event"):
        return "events", "Events"
    if "compan" in sl:
        return "companies", "Companies"
    blob = f"{headline} {body}".lower()
    if "nvidia" in blob:
        return "chips", "Chips"
    return "companies", "Companies"


def topic_for_api(headline: str, body: str, section: str) -> tuple[str, str]:
    sec = (section or "").strip().lower()
    if sec.startswith("events") or "hackathon" in sec or "dinner" in sec or "conference" in sec:
        return "events", "Events"
    if sec == "jobs":
        return "jobs", "Jobs"
    if sec == "videos":
        return "videos", "Videos"
    if sec == "papers" or sec == "science":
        return "research", "Research"
    if sec == "openclaw":
        return "open-source", "Open source"
    if sec == "creatives":
        return "creative", "Creative"
    if sec == "jobs":
        return "jobs", "Jobs"
    blob = f"{headline} {body}"
    if sec == "anomalies":
        low = blob.lower()
        if re.search(r"\b(quit|depart|resign|drama|critic|evil|lawsuit|fire[ds]?|policy dispute)\b", low):
            return "companies", "Companies"
        key, label = topic_for(headline, body, section)
        return key, label
    if sec == "breaking":
        key, label = topic_for(headline, body, section)
        if key == "companies":
            return "models", "Models"
        return key, label
    if sec in ("models", "chips", "robotics", "agents", "funding", "policy"):
        return sec, SECTION_LABELS.get(sec, sec.title())
    if sec == "labs":
        key, label = topic_for(headline, body, section)
        return key, label
    if sec == "infrastructure":
        key, label = topic_for(headline, body, section)
        if key == "companies":
            return "chips", "Chips"
        return key, label
    if sec == "products":
        key, label = topic_for(headline, body, section)
        if key == "companies":
            return "models", "Models"
        return key, label
    if sec == "notebook-lm":
        return "models", "Models"
    return topic_for(headline, body, section)


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
    if re.search(r"scoble\s*:-?\)|scoble smile", title + " " + body, re.I):
        return True
    if cat == "scoble":
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
    if cat in SKIP_SECTIONS:
        return False
    if cat == "ten-things":
        return True
    if cat and cat != "scoble":
        return True
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


def parse_iso_pub(raw: str) -> str:
    raw = (raw or "").strip()
    if not raw:
        return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    try:
        dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        dt = dt.astimezone(timezone.utc)
        return dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")
    except (TypeError, ValueError, OverflowError):
        return parse_pub(raw)


def normalize_engagement(raw) -> dict:
    e = raw if isinstance(raw, dict) else {}
    def n(key, *alts):
        for k in (key,) + alts:
            v = e.get(k)
            if v is None:
                continue
            try:
                return int(v)
            except (TypeError, ValueError):
                continue
        return 0
    return {
        "bookmark_count": n("bookmark_count", "bookmarks"),
        "impression_count": n("impression_count", "impressions", "views"),
        "like_count": n("like_count", "likes"),
        "quote_count": n("quote_count", "quotes"),
        "reply_count": n("reply_count", "replies"),
        "retweet_count": n("retweet_count", "retweets", "reposts"),
    }


def normalize_sources(raw, source_url: str, host: str) -> list:
    out = []
    seen = set()
    items = raw if isinstance(raw, list) else []
    for src in items:
        if isinstance(src, str):
            url = src
            name = host_name(url) if url else host
        elif isinstance(src, dict):
            url = src.get("url") or ""
            name = src.get("name") or src.get("title") or host_name(url) or host
        else:
            continue
        key = (url or name).lower()
        if key in seen:
            continue
        seen.add(key)
        entry = {}
        if url:
            entry["url"] = url
        if name:
            entry["name"] = name
        if entry:
            out.append(entry)
    if source_url and source_url.lower() not in seen:
        out.append({"url": source_url, "name": host or host_name(source_url)})
    return out


def why_it_matters_for(headline: str, summary: str, why_raw: str) -> str:
    why = re.sub(r"\s+", " ", why_raw or "").strip()
    summ = re.sub(r"\s+", " ", summary or "").strip()
    head = re.sub(r"\s+", " ", headline or "").strip()
    if not why:
        return ""
    if why.lower() == summ.lower() or why.lower() == head.lower():
        return ""
    if summ and why.lower().startswith(summ[:80].lower()) and abs(len(why) - len(summ)) < 24:
        return ""
    return clamp(why, 220)


def api_item_to_story(item: dict, section_key: str) -> dict | None:
    if not isinstance(item, dict):
        return None
    headline = (item.get("headline") or item.get("title") or "").strip()
    if not headline:
        return None
    summary = (item.get("summary") or "").strip()
    body_raw = (item.get("body") or "").strip()
    section = (item.get("section") or section_key or "").strip().lower() or "general"
    if section in SKIP_SECTIONS:
        return None
    tag = (item.get("tag") or section).strip().lower()
    if not keep_item(headline, summary or body_raw, section):
        return None
    body = body_raw or summary or headline
    topic_key, topic_label = topic_for_api(headline, body, section)
    section_label = SECTION_LABELS.get(section, section.replace("-", " ").title())
    source_label = (item.get("source_label") or "").strip()
    source_list = source_label if source_label else section_label
    link = (item.get("source_url") or "").strip()
    host = host_name(link) if link else "alignednews.com"
    author_name = (item.get("author_name") or "").strip() or host
    handle = (item.get("author_handle") or "").strip().lstrip("@")
    if not handle:
        handle = x_handle(link, author_name)
    story_id = str(item.get("id") or link or headline)
    why = why_it_matters_for(headline, summary, item.get("whythismatters") or "")
    story = {
        "id": story_id,
        "headline": headline,
        "summary": clamp(summary or body, 240),
        "section": section,
        "section_key": topic_key,
        "section_label": section_label,
        "tag": tag or section,
        "published_at": parse_iso_pub(item.get("published_at") or ""),
        "author_name": author_name,
        "source_list": source_list,
        "source_url": link,
        "sources": normalize_sources(item.get("sources"), link, host),
        "body": body,
        "kind": "story",
        "engagement": normalize_engagement(item.get("engagement")),
        "why_it_matters": why,
        "topic_key": topic_key,
        "topic_label": topic_label,
    }
    if handle and re.fullmatch(r"[A-Za-z0-9_]{1,15}", handle):
        story["x_handle"] = handle
    rank = item.get("rank")
    if rank is not None:
        try:
            story["desk_rank"] = int(rank)
        except (TypeError, ValueError):
            pass
    return story


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
    topic_key, topic_label = topic_for_api(title, desc, category)
    section = (category or "general").strip().lower() or "general"
    section_label = SECTION_LABELS.get(section, section.replace("-", " ").title())
    source_list = "Latest Stories" if section == "ten-things" else section_label
    host = host_name(link)
    author_name = author or host
    body = desc or title
    story = {
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
        "why_it_matters": "",
        "topic_key": topic_key,
        "topic_label": topic_label,
    }
    handle = x_handle(link, author_name)
    if handle:
        story["x_handle"] = handle
    return story


def story_to_foryou(story: dict) -> dict:
    card = {
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
    if story.get("media_url"):
        card["media_url"] = story["media_url"]
    return card


def section_priority(story: dict) -> int:
    sec = (story.get("section") or "").lower()
    if sec in NEWS_SECTION_RANK:
        return NEWS_SECTION_RANK[sec]
    if sec in SIDE_SECTION_RANK:
        return SIDE_SECTION_RANK[sec]
    if sec.startswith("events") or "hackathon" in sec or "dinner" in sec or "conference" in sec:
        if "conference" in sec:
            return 80
        if "hackathon" in sec:
            return 81
        return 82
    return 30


def pub_ts(story: dict) -> float:
    try:
        return datetime.fromisoformat(story["published_at"].replace("Z", "+00:00")).timestamp()
    except (KeyError, ValueError, TypeError):
        return 0.0


def sort_stories(stories: list) -> list:
    stories.sort(key=lambda s: (section_priority(s), -pub_ts(s)))
    return stories


def http_json(url: str) -> dict:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": UA, "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=25) as resp:
        raw = resp.read()
    return json.loads(raw.decode("utf-8", "replace"))


def stories_from_news_feed(payload: dict) -> list:
    sections = payload.get("sections") if isinstance(payload, dict) else None
    if not isinstance(sections, dict):
        return []
    stories = []
    seen = set()
    for sec_key, items in sections.items():
        if (sec_key or "").lower() in SKIP_SECTIONS:
            continue
        if not isinstance(items, list):
            if isinstance(items, dict):
                items = items.get("items") or items.get("stories") or []
            else:
                continue
        for it in items:
            story = api_item_to_story(it, sec_key)
            if not story:
                continue
            if story["id"] in seen:
                continue
            seen.add(story["id"])
            stories.append(story)
    return stories


def load_local_feed() -> tuple[dict, str] | None:
    for path in LOCAL_FEED_CANDIDATES:
        try:
            if path.is_file():
                payload = json.loads(path.read_text(encoding="utf-8"))
                if isinstance(payload, dict) and payload.get("sections"):
                    return payload, str(path)
        except (OSError, json.JSONDecodeError):
            continue
    return None


def stories_from_rss() -> tuple[list, str, str]:
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
    return stories, used_url, last_build


def fetch_desk_stories() -> tuple[list, dict]:
    meta = {
        "source": "alignednews-news-feed",
        "note": "",
        "rssLastBuildDate": "",
        "rssItemCount": 0,
        "rssKeptCount": 0,
    }
    try:
        payload = http_json(NEWS_FEED_URL)
        stories = stories_from_news_feed(payload)
        if stories:
            sort_stories(stories)
            meta["note"] = (
                f"Pulled from /api/news-feed, {len(stories)} stories, events boxed"
            )
            meta["rssItemCount"] = len(stories)
            meta["rssKeptCount"] = len(stories)
            return stories, meta
        raise RuntimeError("news-feed returned no stories")
    except (urllib.error.URLError, TimeoutError, ValueError, json.JSONDecodeError, RuntimeError) as exc:
        print(f"news-feed fetch failed ({exc}); trying local copy / RSS", file=sys.stderr)

    local = load_local_feed()
    if local:
        payload, path = local
        stories = stories_from_news_feed(payload)
        if stories:
            sort_stories(stories)
            meta["note"] = (
                f"Pulled from local news-feed {path}, {len(stories)} stories, events boxed"
            )
            meta["rssItemCount"] = len(stories)
            meta["rssKeptCount"] = len(stories)
            return stories, meta

    stories, used_url, last_build = stories_from_rss()
    sort_stories(stories)
    meta["source"] = "alignednews-rss"
    meta["note"] = f"news-feed failed; RSS fallback {used_url}"
    meta["rssLastBuildDate"] = last_build
    meta["rssItemCount"] = len(stories)
    meta["rssKeptCount"] = len(stories)
    return stories, meta


def chips_for(stories: list, existing: list | None) -> list:
    have = {c["id"]: c for c in DESK_CHIPS}
    counts = {c["id"]: 0 for c in DESK_CHIPS}

    def bump(cid: str):
        if cid in counts:
            counts[cid] += 1

    for s in stories:
        sec = (s.get("section") or "").lower()
        topic = (s.get("topic_key") or "").lower()
        tag = (s.get("tag") or "").lower()
        hay = f"{s.get('headline','')} {s.get('summary','')} {sec} {topic}"
        bump("all")
        if sec == "breaking":
            bump("breaking")
        if sec == "labs":
            bump("labs")
        if topic == "models" or sec == "models":
            bump("models")
        if topic == "chips" or sec == "chips":
            bump("chips")
        if topic == "robotics" or sec == "robotics":
            bump("robotics")
        if topic == "agents" or sec == "agents":
            bump("agents")
        if topic == "research" or sec in ("papers", "science"):
            bump("research")
        if topic == "funding" or sec == "funding":
            bump("funding")
        if topic == "policy" or sec == "policy":
            bump("policy")
        if topic == "open-source" or sec == "openclaw" or OPEN_SOURCE_RE.search(hay):
            bump("open-source")
        if topic == "jobs" or sec == "jobs":
            bump("jobs")
        if topic == "events" or sec.startswith("events") or "hackathon" in sec or "dinner" in tag:
            bump("events")
        if topic == "companies":
            bump("companies")

    out = []
    for chip in DESK_CHIPS:
        cid = chip["id"]
        if cid == "all" or counts.get(cid):
            out.append(dict(chip))
    if existing:
        known = {c["id"] for c in out}
        for c in existing:
            cid = (c or {}).get("id")
            if cid and cid not in known and cid != "all":
                # drop stale chips that the desk no longer uses
                continue
    return out


def main() -> int:
    existing: dict = {}
    if DATA_PATH.exists():
        existing = json.loads(DATA_PATH.read_text(encoding="utf-8"))

    stories, feed_meta = fetch_desk_stories()
    photo_stats = attach_photos(stories)

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    last_ts = int(datetime.now(timezone.utc).timestamp() * 1000)

    chips = chips_for(stories, existing.get("chips"))
    signals = existing.get("signals") if isinstance(existing.get("signals"), list) else []
    reports = existing.get("reports") if isinstance(existing.get("reports"), list) else []
    bundles = existing.get("bundles") if isinstance(existing.get("bundles"), list) else []
    ai_sections = existing.get("ai_sections") if isinstance(existing.get("ai_sections"), list) else []
    lists = existing.get("lists") if isinstance(existing.get("lists"), list) else []
    user = existing.get("user") or {"name": "Asher", "plan": "Pro"}

    news_for_you = [
        s for s in stories
        if not str(s.get("section") or "").startswith("events")
        and s.get("topic_key") not in ("events", "jobs", "videos")
        and str(s.get("section") or "") not in ("jobs", "videos")
    ]
    out = {
        "meta": {
            "generatedAt": now,
            "scrapedAt": now,
            "source": feed_meta.get("source") or "alignednews-news-feed",
            "note": feed_meta.get("note") or f"Pulled from /api/news-feed, {len(stories)} stories, events boxed",
            "rssLastBuildDate": feed_meta.get("rssLastBuildDate") or "",
            "rssItemCount": feed_meta.get("rssItemCount") or len(stories),
            "rssKeptCount": len(stories),
            "lastUpdatedTs": last_ts,
        },
        "user": user,
        "stats": {
            "lists": (existing.get("stats") or {}).get("lists") or 63,
            "stories": len(stories),
            "signals": len(signals),
            "reports": len(reports),
        },
        "chips": chips,
        "forYou": [story_to_foryou(s) for s in news_for_you[:5]],
        "stories": stories,
        "signals": signals,
        "reports": reports,
        "bundles": bundles,
        "ai_sections": ai_sections,
    }
    if lists:
        out["lists"] = lists
    DATA_PATH.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {DATA_PATH.name}: {len(stories)} stories ({out['meta']['source']})")
    print(out["meta"]["note"])
    print(
        "photos: "
        f"{photo_stats['found']} real / {photo_stats['empty']} empty "
        f"(X {photo_stats['x_found']}/{photo_stats['x_total']} with photo, "
        f"{photo_stats['x_empty']} X empty)"
    )
    from collections import Counter
    sec_counts = Counter(s.get("section") for s in stories)
    for k, n in sec_counts.most_common():
        print(f"  section {k}: {n}")
    for s in stories[:12]:
        flag = "img" if s.get("media_url") else "   "
        print(f"  - [{flag}] [{s['section']}/{s['topic_key']}] {s['headline'][:88]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
