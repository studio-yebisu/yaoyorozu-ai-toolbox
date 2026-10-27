"""Print the computed timeline (scenes, events, captions with read-time check) using the scaffold deck."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import render  # noqa: E402
from film import deck  # noqa: E402

dk = deck.Deck("scaffold")
r = render.Renderer(dk)
tl = r.tl
print("duration", tl["duration"])
for s in tl["scenes"]:
    print("scene", s["id"], s["out"])
for e in tl["events"]:
    print("event", e["id"], e["frame"], e["out_t"])
bad = 0
for c in tl["captions"]:
    txt = dk[c["slot"]]
    need = max(2.0, len(txt) / 7 + 0.6)
    have = c["end"] - c["start"]
    flag = "" if have + 1e-6 >= need else "  <-- SHORT"
    bad += bool(flag)
    print(f"cap {c['slot']:28s} {c['start']:8.2f}-{c['end']:8.2f} have {have:5.2f} need {need:5.2f}{flag}")
print("short captions:", bad)
