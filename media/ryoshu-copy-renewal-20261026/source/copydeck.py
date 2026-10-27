"""Kimi copy decks: the only source of displayed product text.

Every displayed string is a `Txt` (a str that remembers its deck file and
JSON pointer). The drawing helpers refuse plain strings, so no text can reach
a frame without coming from a deck, and every text actually drawn (alpha > 0)
is recorded for rendered-copy.json.
"""
import json
from pathlib import Path

import os

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent


def _find_input():
    """Input folder holding new-real-ui.mp4: $RYOSHU_INPUT, else ./input or ../input
    or ../../input relative to this source folder (all relative, no host paths)."""
    cands = ([Path(os.environ["RYOSHU_INPUT"])] if os.environ.get("RYOSHU_INPUT") else []) + \
        [HERE / "input", HERE.parent / "input", HERE.parent.parent / "input", HERE.parents[2] / "input"]
    for c in cands:
        if (c / "new-real-ui.mp4").exists():
            return c
    raise SystemExit("new-real-ui.mp4 not found; set RYOSHU_INPUT to the folder that holds it")


INPUT = _find_input()
# decks: the bundled exact copies in ./input if present, else the input folder
DECKS = HERE / "input" if (HERE / "input" / "studio-copy-deck.json").exists() else INPUT


class Txt(str):
    deck: str
    ptr: str
    slot: str


class Deck:
    def __init__(self, filename):
        self.file = filename
        self.path = DECKS / filename
        data = json.loads(self.path.read_text(encoding="utf-8"))
        self.video = data["video"]
        self.items = {}
        for i, it in enumerate(data["items"]):
            t = Txt(it["text"])
            t.deck, t.ptr, t.slot = filename, f"/items/{i}/text", it["slot"]
            self.items[it["slot"]] = t

    def __getitem__(self, slot):
        return self.items[slot]


PROMO = Deck("promo-copy-deck.json")
STUDIO = Deck("studio-copy-deck.json")

LEGAL_FILE = "preserved-legal-credit.json"
_legal = json.loads((DECKS / LEGAL_FILE).read_text(encoding="utf-8"))
LEGAL = Txt(_legal["text"])
LEGAL.deck, LEGAL.ptr, LEGAL.slot = LEGAL_FILE, "/text", _legal["slot"]
LEGAL_SOURCE = _legal["source"]

SHOWN = {}  # (deck, ptr) -> record, filled while frames are drawn


def reset():
    SHOWN.clear()


def mark_shown(t, t_sec):
    if not isinstance(t, Txt):
        raise TypeError(f"display text must come from a deck: {t!r}")
    k = (t.deck, t.ptr)
    r = SHOWN.get(k)
    if r is None:
        SHOWN[k] = r = {"deck": t.deck, "pointer": t.ptr, "slot": t.slot, "text": str(t),
                        "first_shown_s": round(t_sec, 3), "last_shown_s": round(t_sec, 3)}
    r["last_shown_s"] = round(max(r["last_shown_s"], t_sec), 3)


def verify_and_dump(path, video_name, extra=None):
    decks = {d.file: d for d in (PROMO, STUDIO)}
    raw = {f: json.loads((DECKS / f).read_text(encoding="utf-8")) for f in decks}
    out = []
    for (deck, ptr), r in sorted(SHOWN.items(), key=lambda kv: kv[1]["first_shown_s"]):
        if deck == LEGAL_FILE:
            src = json.loads((DECKS / LEGAL_FILE).read_text(encoding="utf-8"))
            assert src["text"] == r["text"]
            r = dict(r, origin="preserved legal literal", input_file=f"input/{LEGAL_FILE}",
                     original_source=src["source"], license_source=src["license_source"])
        else:
            idx = int(ptr.split("/")[2])
            assert raw[deck]["items"][idx]["text"] == r["text"], (deck, ptr)
            r = dict(r, origin="Kimi copy deck", input_file=f"input/{deck}")
        out.append(r)
    doc = {"video": video_name, "rule": "each entry is displayed verbatim from the deck pointer; "
           "line breaks are automatic wrapping only", "items": out}
    if extra:
        doc.update(extra)
    Path(path).write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return out
