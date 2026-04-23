"""
Fetch NHS + health news from public RSS feeds, then AI-triage each headline.
"""
import hashlib
import json
import logging
import re
from datetime import datetime, timedelta
from xml.etree import ElementTree as ET

import httpx
from sqlalchemy.orm import Session

log = logging.getLogger(__name__)

from ..models.ai_cache import AICache
from .ai_explain import _generate

RSS_FEEDS = [
    ("NHS England", "https://www.england.nhs.uk/feed/"),
    ("BBC Health", "https://feeds.bbci.co.uk/news/health/rss.xml"),
    ("The Guardian Health", "https://www.theguardian.com/society/nhs/rss"),
]

NEWS_CACHE_TTL_HOURS = 1

_TRIAGE_PROMPT = """You are an NHS waiting list analyst. Below are news headlines and descriptions.
For each article return a JSON object with:
- "tag": one of waiting_lists | funding | workforce | inequality | policy | digital | general
- "relevance": integer 1-10 (10 = directly about NHS waiting times/inequality)
- "comment": one sentence explaining why this matters for NHS waiting time inequality

Return ONLY a JSON array, one object per headline, in the same order. No markdown, no preamble.

Headlines:
{headlines}"""


def _parse_rss(xml_text: str, source: str) -> list[dict]:
    items = []
    try:
        root = ET.fromstring(xml_text)
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        # Handle both RSS 2.0 and Atom
        channel = root.find("channel")
        entries = channel.findall("item") if channel else root.findall("atom:entry", ns)
        for item in entries[:10]:
            title_el = item.find("title")
            link_el = item.find("link")
            desc_el = item.find("description") or item.find("atom:summary", ns)
            pub_el = item.find("pubDate") or item.find("atom:updated", ns)
            title = title_el.text.strip() if title_el is not None and title_el.text else ""
            link = link_el.text.strip() if link_el is not None and link_el.text else ""
            if not link:
                link = link_el.get("href", "") if link_el is not None else ""
            desc = (desc_el.text or "").strip() if desc_el is not None else ""
            desc = re.sub(r"<[^>]+>", "", desc)[:200]
            pub = (pub_el.text or "").strip() if pub_el is not None else ""
            if title:
                items.append({"title": title, "url": link, "summary": desc, "published": pub, "source": source})
    except ET.ParseError as exc:
        log.warning("Failed to parse RSS feed from %r: %s", source, exc)
    return items


async def _fetch_feeds() -> list[dict]:
    articles: list[dict] = []
    async with httpx.AsyncClient(timeout=8, follow_redirects=True) as http:
        for source, url in RSS_FEEDS:
            try:
                r = await http.get(url, headers={"User-Agent": "NHS-Intelligence/1.0"})
                if r.status_code == 200:
                    articles.extend(_parse_rss(r.text, source))
            except Exception as exc:
                log.warning("Failed to fetch RSS feed %r (%s): %s", url, source, exc)
    return articles[:30]


def _ai_triage(articles: list[dict]) -> list[dict]:
    if not articles:
        return articles

    headline_lines = "\n".join(
        f"{i+1}. [{a['source']}] {a['title']} — {a['summary'][:100]}"
        for i, a in enumerate(articles)
    )
    prompt = _TRIAGE_PROMPT.format(headlines=headline_lines)

    try:
        raw, _ = _generate(prompt, max_tokens=1500)
        raw = raw.strip()
        tags = json.loads(raw)
        for i, a in enumerate(articles):
            t = tags[i] if i < len(tags) else {}
            a["tag"] = t.get("tag", "general")
            a["relevance"] = int(t.get("relevance", 5))
            a["comment"] = t.get("comment", "")
    except Exception as exc:
        log.warning("AI triage failed, applying defaults: %s", exc)
        for a in articles:
            a.update({"tag": "general", "relevance": 5, "comment": ""})

    return sorted(articles, key=lambda x: x["relevance"], reverse=True)


async def get_news(db: Session) -> tuple[list[dict], bool]:
    """Returns triaged news articles, cached for 1 hour."""
    key = hashlib.sha256(b"nhs_news_feed_v1").hexdigest()[:64]
    ttl_cutoff = datetime.utcnow() - timedelta(hours=NEWS_CACHE_TTL_HOURS)

    cached = db.query(AICache).filter(
        AICache.cache_key == key,
        AICache.created_at >= ttl_cutoff,
    ).first()

    if cached:
        cached.hit_count += 1
        db.commit()
        return json.loads(cached.response), True

    articles = await _fetch_feeds()
    articles = _ai_triage(articles)

    entry = db.query(AICache).filter(AICache.cache_key == key).first()
    if entry:
        entry.response = json.dumps(articles)
        entry.created_at = datetime.utcnow()
        entry.hit_count = 0
    else:
        entry = AICache(
            cache_key=key,
            question="nhs_news_feed",
            region=None,
            response=json.dumps(articles),
            hit_count=0,
        )
        db.add(entry)
    db.commit()
    return articles, False
