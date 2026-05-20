#!/usr/bin/env python3
"""Fetch a YouTube transcript as provisional session text.

This is intended for fresh parliamentary sessions whose official Diario de
Sesiones PDF is not published yet. YouTube captions are provisional: use them
to detect topics and timestamps, not as authoritative quotes.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlparse


def die(message: str, code: int = 1) -> None:
    print(message, file=sys.stderr)
    raise SystemExit(code)


def video_id_from(value: str) -> str:
    value = value.strip()
    if re.fullmatch(r"[A-Za-z0-9_-]{6,}", value):
        return value

    parsed = urlparse(value)
    if parsed.netloc.endswith("youtu.be"):
        video_id = parsed.path.strip("/").split("/")[0]
        if video_id:
            return video_id

    qs = parse_qs(parsed.query)
    if "v" in qs and qs["v"]:
        return qs["v"][0]

    die(f"Could not parse YouTube video id from: {value}")


def timestamp(seconds: float) -> str:
    seconds = int(seconds)
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    return f"{h:02d}:{m:02d}:{s:02d}" if h else f"{m:02d}:{s:02d}"


def chunk_snippets(snippets: list[dict], max_seconds: int, max_chars: int) -> list[dict]:
    chunks: list[dict] = []
    current: list[dict] = []
    start: float | None = None
    end = 0.0

    def flush() -> None:
        nonlocal current, start, end
        if not current or start is None:
            return
        text = " ".join(item["text"].replace("\n", " ").strip() for item in current)
        text = re.sub(r"\s+", " ", text).strip()
        chunks.append(
            {
                "start": round(start, 3),
                "end": round(end, 3),
                "timestamp": timestamp(start),
                "url_at": f"https://www.youtube.com/watch?v={args.video_id}&t={int(start)}s",
                "text": text,
            }
        )
        current = []
        start = None
        end = 0.0

    for snippet in snippets:
        s = float(snippet["start"])
        e = s + float(snippet.get("duration", 0))
        text_len = sum(len(item["text"]) for item in current) + len(snippet["text"])

        if current and start is not None:
            too_long = (e - start) > max_seconds or text_len > max_chars
            gap = s - end > 8
            if too_long or gap:
                flush()

        if start is None:
            start = s
        current.append(snippet)
        end = max(end, e)

    flush()
    return chunks


parser = argparse.ArgumentParser()
parser.add_argument("--url", help="YouTube URL")
parser.add_argument("--video-id", help="YouTube video id")
parser.add_argument("--languages", default="es,en", help="Comma-separated language preference list")
parser.add_argument("--out", help="Write JSON here instead of stdout")
parser.add_argument("--chunk-seconds", type=int, default=90)
parser.add_argument("--chunk-chars", type=int, default=1400)
args = parser.parse_args()

if not args.video_id and not args.url:
    die("usage: fetch-youtube-transcript.py --url <youtube-url> [--out file.json]")

args.video_id = args.video_id or video_id_from(args.url)
languages = [lang.strip() for lang in args.languages.split(",") if lang.strip()]

try:
    from youtube_transcript_api import YouTubeTranscriptApi
except ImportError:
    die(
        "Missing dependency: youtube-transcript-api. "
        "Install with: python3 -m pip install youtube-transcript-api"
    )

ytt_api = YouTubeTranscriptApi()

try:
    transcript_list = ytt_api.list(args.video_id)
    available = [
        {
            "language": transcript.language,
            "language_code": transcript.language_code,
            "is_generated": transcript.is_generated,
            "is_translatable": transcript.is_translatable,
        }
        for transcript in transcript_list
    ]

    transcript = transcript_list.find_transcript(languages)
    fetched = transcript.fetch()
    snippets = fetched.to_raw_data()
except Exception as exc:  # Keep the exact class/message in JSON for CI debugging.
    result = {
        "video_id": args.video_id,
        "url": f"https://www.youtube.com/watch?v={args.video_id}",
        "source_label": "YouTube transcript (provisional)",
        "ok": False,
        "error_type": type(exc).__name__,
        "error": str(exc),
        "provisional": True,
    }
else:
    chunks = chunk_snippets(snippets, args.chunk_seconds, args.chunk_chars)
    result = {
        "video_id": fetched.video_id,
        "url": f"https://www.youtube.com/watch?v={fetched.video_id}",
        "source_label": "YouTube transcript (provisional)",
        "ok": True,
        "language": fetched.language,
        "language_code": fetched.language_code,
        "is_generated": fetched.is_generated,
        "provisional": True,
        "warning": (
            "YouTube captions are provisional. Use for topic discovery and timestamps; "
            "confirm literal quotes against the official Diario de Sesiones PDF when published."
        ),
        "available_transcripts": available,
        "snippets_count": len(snippets),
        "chunks_count": len(chunks),
        "snippets": snippets,
        "chunks": chunks,
    }

text = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
if args.out:
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(text, encoding="utf-8")
    print(f"WROTE {out}", file=sys.stderr)
else:
    print(text, end="")

if not result.get("ok"):
    raise SystemExit(2)
