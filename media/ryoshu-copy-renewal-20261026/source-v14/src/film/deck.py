"""Kimi copy deck + facts loader and final-copy gate.

All drawn Japanese comes from Kimi's deck verbatim (schema canonicalized only). Mode:
  final    : input/final-copy/final-deck.json, accepted by input/final-copy/root-adoption.json (sha-bound)
  scaffold : input/kimi-batch-b/film-copy-merged-v2.json (root-adopted for implementation; internal previews only)
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
INPUT = Path(__import__("os").environ.get("RYOSHU_FILM_INPUT") or HERE.parents[2] / "input")
FACTS = INPUT / "fresh100" / "fresh100-approved-facts.json"
FACTS_SHA = "9256be4c28dd2912073e365a9b872781885d000b3ea3bc0780e5e04082bd6316"
SCAFFOLD = INPUT / "kimi-batch-b" / "film-copy-merged-v2.json"
SCAFFOLD_SHA = "283167bea8ae18e16a0da15f96f5c3a8540dafa0f390cbf570f395e710d383f2"
FINAL_DIR = INPUT / "final-copy"
ADOPTION_SHA = "bf2c594e1fc268a57d086c20c5131e5599630a53a85696ba36b063ab2cd18c48"


def sha256(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def gate_status() -> dict:
    """Final-copy gate: root-adoption.json accepted=true, bound to final-deck.json sha and the facts sha."""
    adoption, deck = FINAL_DIR / "root-adoption.json", FINAL_DIR / "final-deck.json"
    errors = []
    if not adoption.exists():
        return {"open": False, "errors": ["input/final-copy/root-adoption.json absent"]}
    if sha256(adoption) != ADOPTION_SHA:
        errors.append("root-adoption.json sha mismatch")
    rec = json.loads(adoption.read_text(encoding="utf-8"))
    if rec.get("root_adopted") is not True:          # formal adoption schema: ryoshu.film140.root-copy-adoption/1
        errors.append("root_adopted is not true")
    if not deck.exists():
        errors.append("final-deck.json absent")
    elif rec.get("final_deck_sha256") != sha256(deck):
        errors.append("final-deck sha != adoption final_deck_sha256")
    if rec.get("facts_sha256") != FACTS_SHA or sha256(FACTS) != FACTS_SHA:
        errors.append("facts sha mismatch")
    return {"open": not errors, "errors": errors, "adoption": rec, "deck_sha256": sha256(deck) if deck.exists() else None}


class Deck:
    def __init__(self, mode: str):
        if sha256(FACTS) != FACTS_SHA:
            raise SystemExit("facts sha mismatch")
        self.facts = json.loads(FACTS.read_text(encoding="utf-8"))
        if mode == "final":
            st = gate_status()
            if not st["open"]:
                raise SystemExit("FINAL COPY GATE CLOSED: " + "; ".join(st["errors"]))
            path, want = FINAL_DIR / "final-deck.json", st["deck_sha256"]
        elif mode == "candidate":   # PRIVATE layout stills only; never used by --final
            rec = json.loads((FINAL_DIR / "root-adoption.json").read_text(encoding="utf-8"))
            path, want = FINAL_DIR / "final-deck.json", rec.get("final_deck_sha256")
        elif mode == "scaffold":
            path, want = SCAFFOLD, SCAFFOLD_SHA
        else:
            raise ValueError(mode)
        raw = path.read_bytes()
        if hashlib.sha256(raw).hexdigest() != want:
            raise SystemExit(f"deck sha mismatch: {path.name}")
        self.mode, self.path, self.sha = mode, path, want
        items = json.loads(raw.decode("utf-8"))["items"]
        self.items, seen = [], set()
        for n, it in enumerate(items):
            slot, text = it.get("id"), it.get("text")
            if not isinstance(slot, str) or not isinstance(text, str):
                raise SystemExit(f"malformed /items/{n}")
            if slot in seen:
                raise SystemExit(f"duplicate slot {slot}")
            seen.add(slot)
            self.items.append({"slot": slot, "text": text, "pointer": f"/items/{n}/text", "disposition": it.get("disposition"),
                               "source": it.get("source"), "text_utf8_sha256": hashlib.sha256(text.encode("utf-8")).hexdigest()})
        self.by = {i["slot"]: i for i in self.items}
        self.shown = {}

    def __getitem__(self, slot: str) -> str:
        if slot not in self.by:
            raise KeyError(f"copy slot missing from deck: {slot}")
        return self.by[slot]["text"]

    def mark(self, slot: str, text: str, t: float):
        s = self.shown.setdefault((slot, text), {"slot": slot, "text": text, "first_s": t, "last_s": t})
        s["first_s"], s["last_s"] = min(s["first_s"], t), max(s["last_s"], t)

    def rendered_copy(self) -> list[dict]:
        out = []
        for (slot, text), s in sorted(self.shown.items(), key=lambda kv: kv[1]["first_s"]):
            item = self.by.get(slot)
            origin = ({"deck": self.path.name, "deck_sha256": self.sha, "pointer": item["pointer"], "verbatim": text == item["text"]}
                      if item else {"facts": FACTS.name, "facts_sha256": FACTS_SHA, "pointer": slot})
            out.append({**s, "first_s": round(s["first_s"], 3), "last_s": round(s["last_s"], 3), **origin})
        return out
