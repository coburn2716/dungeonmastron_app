#!/usr/bin/env python3

import argparse
import csv
import json
import os
import re
import shutil
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple


def norm_text(s: str) -> str:
    s = (s or "").strip().lower()
    s = s.replace("’", "'")
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"[^a-z0-9' ]+", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def similarity(a: str, b: str) -> float:
    try:
        from rapidfuzz.fuzz import token_set_ratio  # type: ignore

        return float(token_set_ratio(a, b)) / 100.0
    except Exception:
        return SequenceMatcher(None, a, b).ratio()


def extract_leading_number(path: Path) -> Optional[int]:
    # Filenames like "001_Chapter 1.wav" should match; underscore counts as a word char,
    # so don't use \b word-boundary here.
    m = re.match(r"^(\d{3})", path.name)
    if not m:
        return None
    try:
        return int(m.group(1))
    except ValueError:
        return None


@dataclass
class Page:
    page_id: str
    text: str
    norm: str


def load_pages(game_json: Path) -> Dict[str, Page]:
    data = json.loads(game_json.read_text(encoding="utf-8"))
    pages = {}
    for page_id, payload in (data.get("pages") or {}).items():
        txt = payload.get("text") or ""
        pages[page_id] = Page(page_id=page_id, text=txt, norm=norm_text(txt))
    return pages


class Transcriber:
    def __init__(self, model: str, language: Optional[str], device: str):
        self.model_name = model
        self.language = language
        self.device = device
        self._impl = None

    def _load(self):
        if self._impl is not None:
            return

        # Prefer faster-whisper if installed.
        try:
            from faster_whisper import WhisperModel  # type: ignore

            self._impl = ("faster_whisper", WhisperModel(self.model_name, device=self.device))
            return
        except Exception:
            pass

        # Fallback to openai-whisper.
        try:
            import whisper  # type: ignore

            self._impl = ("whisper", whisper.load_model(self.model_name))
            return
        except Exception as e:
            raise RuntimeError(
                "No transcription backend found. Install one of:\n"
                "  python3 -m pip install -U rapidfuzz\n"
                "  python3 -m pip install -U faster-whisper\n"
                "or\n"
                "  python3 -m pip install -U openai-whisper\n"
                f"Original import error: {e}"
            )

    def transcribe(self, wav_path: Path) -> str:
        self._load()
        kind, model = self._impl

        if kind == "faster_whisper":
            segments, _info = model.transcribe(str(wav_path), language=self.language)
            return " ".join(seg.text.strip() for seg in segments).strip()

        # openai-whisper
        kwargs = {}
        if self.language:
            kwargs["language"] = self.language
        result = model.transcribe(str(wav_path), **kwargs)
        return (result.get("text") or "").strip()


def best_match(
    transcript: str,
    candidates: Iterable[Page],
) -> Tuple[Optional[Page], float, float]:
    tnorm = norm_text(transcript)
    best_p = None
    best_s = -1.0
    second_s = -1.0
    for p in candidates:
        if not p.norm:
            continue
        s = similarity(tnorm, p.norm)
        if s > best_s:
            second_s = best_s
            best_s = s
            best_p = p
        elif s > second_s:
            second_s = s
    return best_p, best_s, second_s


def safe_rename(src: Path, dst: Path, apply: bool) -> Path:
    if src.resolve() == dst.resolve():
        return dst
    if dst.exists():
        stem = dst.stem
        suffix = dst.suffix
        i = 2
        while True:
            cand = dst.with_name(f"{stem}__dup{i}{suffix}")
            if not cand.exists():
                dst = cand
                break
            i += 1
    if apply:
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(src), str(dst))
    return dst


def main() -> int:
    ap = argparse.ArgumentParser(
        description=(
            "Transcribe WAV files, match transcripts to game.json page text, and rename WAVs to page IDs.\n"
            "By default does a dry-run and writes a CSV mapping."
        )
    )
    ap.add_argument("--game-json", required=True, type=Path)
    ap.add_argument("--audio-dir", required=True, type=Path)
    ap.add_argument("--model", default="base", help="Whisper model name (e.g. tiny/base/small/medium/large-v3).")
    ap.add_argument("--language", default=None, help="Language code (e.g. en). Optional.")
    ap.add_argument("--device", default="cpu", help="Transcription device (cpu, cuda, metal depending on backend).")
    ap.add_argument("--min-score", type=float, default=0.55, help="Minimum similarity score to accept match.")
    ap.add_argument(
        "--min-gap",
        type=float,
        default=0.03,
        help="Minimum score gap (best - second_best) required to accept match (helps avoid ambiguous matches).",
    )
    ap.add_argument("--apply", action="store_true", help="Actually rename files. Without this, dry-run only.")
    ap.add_argument("--limit", type=int, default=0, help="Process only N files (0 = all).")
    ap.add_argument(
        "--no-transcribe-when-unambiguous",
        action="store_true",
        help=(
            "If a WAV has a leading 3-digit number and exactly one page_id matches that prefix, rename without transcribing."
        ),
    )
    args = ap.parse_args()

    pages = load_pages(args.game_json)
    pages_list = [p for p in pages.values() if p.norm]

    wavs = sorted([p for p in args.audio_dir.iterdir() if p.is_file() and p.suffix.lower() == ".wav"])
    if args.limit and args.limit > 0:
        wavs = wavs[: args.limit]

    transcriber = Transcriber(model=args.model, language=args.language, device=args.device)

    report_csv = args.audio_dir / "rename_report.csv"
    rows = []

    ok = 0
    skipped = 0
    for wav in wavs:
        # Only use filename-based narrowing when the filename already looks like a page id.
        # Many TTS exports are numbered arbitrarily (e.g. "001_Chapter 1.wav") and should NOT
        # be constrained to p001* candidates.
        prefix_candidates: List[Page] = []
        if wav.stem.lower().startswith("p"):
            m = re.match(r"^(p\d{3})", wav.stem.lower())
            if m:
                prefix = m.group(1)
                prefix_candidates = [p for pid, p in pages.items() if pid.startswith(prefix)]

        matched_page = None
        score = 0.0
        transcript = ""

        if args.no_transcribe_when_unambiguous and prefix_candidates and len(prefix_candidates) == 1:
            matched_page = prefix_candidates[0]
            score = 1.0
        else:
            transcript = transcriber.transcribe(wav)
            candidates = [p for p in prefix_candidates if p.norm] if prefix_candidates else pages_list
            matched_page, score, second = best_match(transcript, candidates)

        if matched_page is not None and transcript:
            # If we transcribed, apply ambiguity check.
            if (score - second) < args.min_gap:
                rows.append(
                    {
                        "src": wav.name,
                        "dst": "",
                        "page_id": "",
                        "score": f"{score:.3f}",
                        "note": f"AMBIGUOUS(best-second<{args.min_gap})",
                    }
                )
                skipped += 1
                continue

        if not matched_page or score < args.min_score:
            rows.append(
                {
                    "src": wav.name,
                    "dst": "",
                    "page_id": "",
                    "score": f"{score:.3f}",
                    "note": "NO_MATCH",
                }
            )
            skipped += 1
            continue

        dst = wav.with_name(f"{matched_page.page_id}.wav")
        final_dst = safe_rename(wav, dst, apply=args.apply)
        rows.append(
            {
                "src": wav.name,
                "dst": final_dst.name,
                "page_id": matched_page.page_id,
                "score": f"{score:.3f}",
                "note": "RENAMED" if args.apply else "DRY_RUN",
            }
        )
        ok += 1

    with report_csv.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["src", "dst", "page_id", "score", "note"])
        w.writeheader()
        w.writerows(rows)

    print(f"Processed: {len(wavs)}")
    print(f"Matched:   {ok}")
    print(f"Skipped:   {skipped}")
    print(f"Report:    {report_csv}")
    if not args.apply:
        print("Dry-run only. Re-run with --apply to rename.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
