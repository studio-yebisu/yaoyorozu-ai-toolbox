"""Kimi copy decks: the only source of displayed product text.

Every displayed string is a `Txt` (a str that remembers its deck file and
JSON pointer). The drawing helpers refuse plain strings, so no text can reach
a frame without coming from a deck, and every text actually drawn (alpha > 0)
is recorded for rendered-copy.json and checked against the deck file at draw
time and again at dump time.

Two decks are used and stay separately attributable:
  promo-copy-deck.json     the prior Kimi promo deck (retained slots)
  revision-copy-deck-v2.json  the accepted Kimi revision deck v2 (new/changed slots)
A slot present in the revision deck replaces the prior slot of the same name.
"""
import json
import os
from pathlib import Path

HERE = Path(__file__).resolve().parent


def _find_input():
    """Input folder holding new-real-ui.mp4: $RYOSHU_INPUT, else ./input or ../input
    or ../../input relative to this source folder (all relative, no host paths)."""
    cands = ([Path(os.environ["RYOSHU_INPUT"])] if os.environ.get("RYOSHU_INPUT") else []) + \
        [HERE / "input", HERE.parent / "input", HERE.parent.parent / "input"]
    for c in cands:
        if (c / "new-real-ui.mp4").exists():
            return c
    raise SystemExit("new-real-ui.mp4 not found; set RYOSHU_INPUT to the folder that holds it")


INPUT = _find_input()
# decks: the bundled exact copies in ./input
DECKS = HERE / "input"
PRIOR_FILE = "promo-copy-deck.json"
REVISION_FILE = "revision-copy-deck-v2.json"


class Txt(str):
    deck: str
    ptr: str
    slot: str


class Deck:
    def __init__(self, filename):
        self.file = filename
        self.path = DECKS / filename
        self.raw = json.loads(self.path.read_text(encoding="utf-8"))
        self.video = self.raw["video"]
        self.items = {}
        for i, it in enumerate(self.raw["items"]):
            t = Txt(it["text"])
            t.deck, t.ptr, t.slot = filename, f"/items/{i}/text", it["slot"]
            self.items[it["slot"]] = t

    def __getitem__(self, slot):
        return self.items[slot]


PRIOR = Deck(PRIOR_FILE)
REVISION = Deck(REVISION_FILE)
DECK_BY_FILE = {PRIOR_FILE: PRIOR, REVISION_FILE: REVISION}

# merged lookup: revision slots replace prior slots of the same name
K = dict(PRIOR.items)
K.update(REVISION.items)

SHOWN = {}  # (deck, ptr) -> record, filled while frames are drawn


def reset():
    SHOWN.clear()


def _deck_text(deck, ptr):
    return DECK_BY_FILE[deck].raw["items"][int(ptr.split("/")[2])]["text"]


def mark_shown(t, t_sec):
    if not isinstance(t, Txt):
        raise TypeError(f"display text must come from a deck: {t!r}")
    k = (t.deck, t.ptr)
    r = SHOWN.get(k)
    if r is None:
        assert _deck_text(t.deck, t.ptr) == str(t), k  # equality at draw time
        SHOWN[k] = r = {"deck": t.deck, "pointer": t.ptr, "slot": t.slot, "text": str(t),
                        "first_shown_s": round(t_sec, 3), "last_shown_s": round(t_sec, 3)}
    r["last_shown_s"] = round(max(r["last_shown_s"], t_sec), 3)


def verify_and_dump(path, video_name, extra=None):
    raw = {f: json.loads((DECKS / f).read_text(encoding="utf-8")) for f in DECK_BY_FILE}
    out = []
    for (deck, ptr), r in sorted(SHOWN.items(), key=lambda kv: (kv[1]["first_shown_s"], kv[0])):
        idx = int(ptr.split("/")[2])
        assert raw[deck]["items"][idx]["text"] == r["text"], (deck, ptr)
        assert raw[deck]["items"][idx]["slot"] == r["slot"], (deck, ptr)
        role = "accepted revision deck" if deck == REVISION_FILE else "retained prior deck"
        out.append(dict(r, origin=f"Kimi copy deck ({role})", bundled_file=f"source/input/{deck}"))
    doc = {"video": video_name,
           "rule": "each entry is displayed verbatim from the deck pointer; line breaks are automatic wrapping only",
           "decks": {PRIOR_FILE: "retained prior Kimi promo deck (input/prior-promo-copy-deck.json)",
                     REVISION_FILE: "accepted Kimi revision deck v2 (input/revision-copy-deck-v2.json)"},
           "text_equality_asserted": "at first draw (mark_shown) and here at dump",
           "items": out}
    if extra:
        doc.update(extra)
    Path(path).write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return out
