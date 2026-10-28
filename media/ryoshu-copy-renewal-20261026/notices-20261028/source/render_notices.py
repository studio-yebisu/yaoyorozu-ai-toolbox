#!/usr/bin/env python3
"""Ryoshu v1.4.0 film: notice-only ending supplement (design/plan.json).

Replaces base frames 4860..5129 (the 9 s 'notes' card) with three new notice cards N1/N2/N3 (990 frames, 13+10+10 s).
Base frames 0..4859 and 5130..5368 are decoded by ffmpeg and passed through unchanged into ONE final libx264 encode
(out frames 0..4859 and 5850..6088). All Japanese comes verbatim from the Kimi deck; this file contains no Japanese.

Drawing primitives (background, font/_timg/tw, ease/ease_out/prog/clamp, _fade, _card_bg idiom) are copied from the
approved v1.4 film source src/film/draw.py and src/film/cards.py (Studio Yebisu, Opus design) so the field, gradient, dot
grid and vignette are pixel-identical to the base. Audio uses the ORIGINAL standalone src/film/audio.py loaded by
importlib from --audio-source (copied unchanged next to this file in public packaging).

Standard library + Pillow + NumPy + ffmpeg/ffprobe on PATH (or --ffmpeg/--ffprobe).

  --stills : mid-hold PNG per card, contact sheet, layout report (sizes, measured ink boxes, overflow flags)
  final    : notice clip (lossless FFV1 intermediate) + audio assembly + one-generation x264 encode + measured QC
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import re
import shutil
import struct
import subprocess
import sys
import time
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

FPS, W, H, SR = 30, 1920, 1080, 48000
BASE_FRAMES = 5369
A_END = 4860                     # base/out frames 0..4859 preserved
B_START = 5130                   # base frames 5130..5368 -> out 5850..6088
N_FRAMES = 990
OUT_FRAMES = A_END + N_FRAMES + (BASE_FRAMES - B_START)       # 6089
SHIFT_S = 24.0                   # 720 frames = 12 bars at 120 bpm
OUT_NAME = "ryoshu-promo-v1.4.0-notice.mp4"
NOTES_SCENE = (161.9676, 170.9676)
CARDS = [  # id, scene id, scene start (out s, base +0.0009 grid), duration s, first out frame, frame count
    ("N1", "notice-req", 161.9676, 13.0, 4860, 390),
    ("N2", "notice-role", 174.9676, 10.0, 5250, 300),
    ("N3", "notice-tax", 184.9676, 10.0, 5550, 300),
]
STILL_FRAMES = {"N1": 5100, "N2": 5430, "N3": 5730}            # mid-hold (all reveals finished, before fade)
BOUNDARY_FRAMES = [list(range(4855, 4866)), list(range(5245, 5256)), list(range(5545, 5556)), list(range(5845, 5856))]
JOINS = [(4859, 4860), (5249, 5250), (5549, 5550), (5849, 5850)]
REF_PATH_LITERAL = "github.com/studio-yebisu/ryoshu (docs/REQUIREMENTS.md)"   # plan copy_contract.literal_non_copy
REQUIRED = ["req.kicker", "req.heading", "req.os.label", "req.os", "req.compute.label", "req.compute", "req.setup.label",
            "req.setup", "req.unmeasured.label", "req.unmeasured", "req.ref", "role.heading", "role.assist", "role.check",
            "role.files", "tax.heading", "tax.body.1", "tax.status"]
OPTIONAL = ["tax.body.2", "req.ref.path"]
MIN_PX, SAFE_R, DY, REVEAL = 30, 1760, 16, 0.45

# ------------------------------------------------------------------ palette + primitives (copied from src/film/draw.py)
INK, INK2 = (11, 13, 26), (20, 23, 44)
PAPER, MUTED = (244, 241, 234), (150, 154, 178)
VERMILION, INDIGO = (255, 91, 58), (120, 132, 255)
FONT_DIR = "C:/Windows/Fonts/"


def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def ease(x):
    x = clamp(x)
    return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2


def ease_out(x):
    return 1 - (1 - clamp(x)) ** 3


def prog(t, a, d):
    return clamp((t - a) / d)


def fade_out(t, dur):  # cards._fade
    return 1 - ease(prog(t, dur - 0.4, 0.4))


@lru_cache(None)
def font(kind, size, w):
    if kind == "jp":
        f = ImageFont.truetype(FONT_DIR + "NotoSansJP-VF.ttf", size)
        f.set_variation_by_axes([w])
    else:
        f = ImageFont.truetype(FONT_DIR + "bahnschrift.ttf", size)
        try:
            f.set_variation_by_name(w)
        except Exception:
            pass
    return f


@lru_cache(4096)
def _timg(text, key, fill):
    f = font(*key)
    l, t, r, b = f.getbbox(text)
    a, d = f.getmetrics()
    im = Image.new("RGBA", (max(1, r - l + 4), a + d + 4), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((2 - l, 2), text, font=f, fill=fill)
    return im


def tw(text, key):
    return _timg(text, key, (255, 255, 255)).width


@lru_cache(None)
def background():
    y = np.linspace(0, 1, H)[:, None]
    x = np.linspace(0, 1, W)[None, :]
    mix = (0.65 * y + 0.35 * (1 - x))[..., None]
    img = np.array(INK, float) * (1 - mix) + np.array(INK2, float) * mix
    yy, xx = np.mgrid[0:H, 0:W]
    img[(xx % 48 == 0) & (yy % 48 == 0)] += 18
    img *= (1 - 0.35 * (((x - 0.5) ** 2 + (y - 0.5) ** 2) * 2))[..., None]
    return Image.fromarray(np.dstack([np.clip(img, 0, 255).astype(np.uint8), np.full((H, W), 255, np.uint8)]), "RGBA")


# ------------------------------------------------------------------ deck
def sha256_file(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 22), b""):
            h.update(b)
    return h.hexdigest()


def _split_parts(s):
    i = s.rfind(" ")
    return [s] if i < 0 else [s[:i], s[i + 1:]]


class Deck:
    def __init__(self, path: Path):
        self.path, self.sha = path, sha256_file(path)
        d = json.loads(path.read_text(encoding="utf-8"))
        items = d.get("items")
        if not isinstance(items, dict):
            raise SystemExit("deck: 'items' must be an object {slot: text}")
        self.items = {k: v for k, v in items.items() if isinstance(v, str) and v.strip()}
        missing = [s for s in REQUIRED if s not in self.items]
        if missing:
            raise SystemExit(f"deck: required slots missing: {missing}")
        self.unknown = sorted(s for s in items if s not in REQUIRED + OPTIONAL)
        self.shown = {}

    def mark(self, slot, text, t, n):
        s = self.shown.setdefault((slot, text), {"slot": slot, "text": text, "first_s": t, "last_s": t, "first_frame": n, "last_frame": n})
        s["first_s"], s["last_s"] = min(s["first_s"], t), max(s["last_s"], t)
        s["first_frame"], s["last_frame"] = min(s["first_frame"], n), max(s["last_frame"], n)

    def origin(self, slot, text):
        if slot in self.items:
            return {"deck": self.path.name, "deck_sha256": self.sha, "pointer": f"/items/{slot}",
                    "verbatim": text == self.items[slot] or text in _split_parts(self.items[slot])}
        return {"literal": "design/plan.json#/copy_contract/literal_non_copy/req.ref.path",
                "verbatim": text == REF_PATH_LITERAL or text in _split_parts(REF_PATH_LITERAL)}

    def lint(self):
        """Report-only checks against plan hard rules (Kimi owns the copy; the host audits)."""
        hits = []
        for k, v in self.items.items():
            if "このPC" in v:
                hits.append({"slot": k, "rule": "このPC"})
            if re.search(r"\d+(\.\d+)?\s*(GB|MB|TB|ＧＢ)", v, re.I):
                hits.append({"slot": k, "rule": "storage/RAM number"})
        return hits


# ------------------------------------------------------------------ layout (plan.cards.*.layout)
def asc(key):
    return font(*key).getmetrics()[0]


def text_el(slot, text, kind, size, w, color, x, y, t_in, maxw, shrink=True):
    k = size
    if shrink:
        while k > MIN_PX and tw(text, (kind, k, w)) > maxw:
            k -= 1
    key = (kind, k, w)
    return {"type": "text", "slot": slot, "text": text, "key": key, "planned_px": size, "color": color,
            "x": x, "y": y + (size - k) * 0.6, "t_in": t_in, "maxw": maxw, "overflow": tw(text, key) > maxw}


def rect_el(box, color, t_in, owner):
    return {"type": "rect", "box": box, "color": color, "t_in": t_in, "owner": owner}


def layout(card, deck):
    D = deck.items
    els = []
    if card == "N1":
        els.append(text_el("req.kicker", D["req.kicker"], "jp", 30, 700, MUTED, 300, 214, 0.0, SAFE_R - 300))
        els.append(text_el("req.heading", D["req.heading"], "jp", 60, 800, PAPER, 300, 262, 0.1, SAFE_R - 300))
        for i, row in enumerate(["req.os", "req.compute", "req.setup", "req.unmeasured"]):
            y, a = 420 + 104 * i, 0.8 + 0.5 * i
            val = text_el(row, D[row], "jp", 40, 700, PAPER, 560, y, a, SAFE_R - 560)
            lab = text_el(row + ".label", D[row + ".label"], "jp", 30, 700, MUTED, 300, y, a, 560 - 300 - 24, shrink=False)
            lab["y"] = y + asc(val["key"]) - asc(lab["key"])          # baseline-align label with value
            els += [rect_el((270, y + 8, 276, y + 46), MUTED if row == "req.unmeasured" else VERMILION, a, row), lab, val]
        ref = text_el("req.ref", D["req.ref"], "jp", 30, 600, MUTED, 300, 862, 3.0, SAFE_R - 300 - 200)
        els.append(ref)
        path = D.get("req.ref.path", REF_PATH_LITERAL)
        px = 300 + tw(ref["text"], ref["key"]) + 20
        one = text_el("req.ref.path", path, "lat", 32, "SemiBold", PAPER, px, 864, 3.0, SAFE_R - px, shrink=False)
        if not one["overflow"]:
            els.append(one)
        else:   # two large readable lines (verbatim split at the last space), never a microscopic URL
            parts = _split_parts(path)
            y1 = 864
            l1 = text_el("req.ref.path", parts[0], "lat", 32, "SemiBold", PAPER, px, y1, 3.0, SAFE_R - px, shrink=False)
            if l1["overflow"]:      # move the path under the lead-in
                px, y1 = 300, 906
                l1 = text_el("req.ref.path", parts[0], "lat", 32, "SemiBold", PAPER, px, y1, 3.0, SAFE_R - px, shrink=False)
            els.append(l1)
            if len(parts) > 1:
                els.append(text_el("req.ref.path", parts[1], "lat", 32, "SemiBold", PAPER, px, y1 + 44, 3.0, SAFE_R - px, shrink=False))
    elif card == "N2":
        els.append(text_el("role.heading", D["role.heading"], "jp", 56, 800, PAPER, 300, 250, 0.0, SAFE_R - 300))
        for slot, size, w, col, y, a, mk, bar in [("role.assist", 40, 700, PAPER, 400, 0.7, INDIGO, (8, 46)),
                                                  ("role.check", 40, 700, PAPER, 500, 1.3, VERMILION, (8, 46)),
                                                  ("role.files", 34, 600, MUTED, 620, 1.9, MUTED, (7, 39))]:
            els.append(rect_el((300, y + bar[0], 306, y + bar[1]), mk, a, slot))
            els.append(text_el(slot, D[slot], "jp", size, w, col, 340, y, a, SAFE_R - 340))
    else:
        els.append({"type": "panel", "box": (260, 270, 1660, 560), "t_in": 0.0, "owner": "tax.heading"})
        inner = 1660 - 40 - 300
        els.append(text_el("tax.heading", D["tax.heading"], "jp", 56, 800, PAPER, 300, 300, 0.0, inner))
        els.append(text_el("tax.body.1", D["tax.body.1"], "jp", 38, 600, PAPER, 300, 420, 0.7, inner))
        if "tax.body.2" in D:
            els.append(text_el("tax.body.2", D["tax.body.2"], "jp", 38, 600, PAPER, 300, 484, 0.7, inner))
        els.append(text_el("tax.status", D["tax.status"], "jp", 34, 600, MUTED, 300, 600, 1.5, SAFE_R - 300))
    return els


def ink_box(e):
    im = _timg(e["text"], e["key"], (255, 255, 255))
    bb = im.getchannel("A").getbbox() or (0, 0, 0, 0)
    x, y = int(e["x"]), int(e["y"])
    return [x + bb[0], y + bb[1], x + bb[2], y + bb[3]]


def layout_report(deck, lay):
    cards = {}
    for cid, sid, *_ in CARDS:
        rows = []
        for e in lay[cid]:
            if e["type"] != "text":
                continue
            box = ink_box(e)
            rows.append({"slot": e["slot"], "text": e["text"], "font": [e["key"][0], e["key"][2]], "planned_px": e["planned_px"],
                         "used_px": e["key"][1], "shrunk": e["key"][1] < e["planned_px"], "min_px_ok": e["key"][1] >= MIN_PX,
                         "advance_width_px": tw(e["text"], e["key"]), "max_width_px": e["maxw"], "ink_box_xyxy": box,
                         "right_limit_x": e["x"] + e["maxw"],
                         "overflow": bool(e["overflow"] or box[2] > e["x"] + e["maxw"] or box[3] > H - 44), "reveal_s": e["t_in"]})
        last = max(e["t_in"] for e in lay[cid]) + REVEAL
        cards[cid] = {"scene": sid, "elements": rows, "last_reveal_end_s": round(last, 2)}
    flagged = [r["slot"] + ": " + r["text"] for c in cards.values() for r in c["elements"] if r["overflow"] or not r["min_px_ok"]]
    return {"deck": deck.path.name, "deck_sha256": deck.sha, "font_dir": FONT_DIR, "min_px": MIN_PX, "safe_right_x": SAFE_R,
            "cards": cards, "overflow_any": bool(flagged), "flagged_for_kimi": flagged, "deck_lint_report_only": deck.lint(),
            "deck_unknown_slots_not_drawn": deck.unknown, "measured": True}


# ------------------------------------------------------------------ frame rendering
def card_of(n):
    for c in CARDS:
        if c[4] <= n < c[4] + c[5]:
            return c
    raise ValueError(n)


def render_frame(n, lay, deck, record=True):
    """Out frame n (4860..5849) -> (state key, per-element (alpha, dy)). Scene-local time uses the base +0.0009 grid."""
    cid, _, start, dur, *_ = card_of(n)
    t_out = n / FPS
    t = t_out - start
    out = fade_out(t, dur)
    states = []
    for e in lay[cid]:
        p = ease_out(prog(t, e["t_in"], REVEAL))
        a = p * out
        states.append((round(a, 4), 0.0 if e["type"] == "panel" else round((1 - p) * DY, 2)))
        if record and e["type"] == "text" and a > 0.02:
            deck.mark(e["slot"], e["text"], round(t_out, 4), n)
    return (cid, tuple(states)), states


def compose(cid, lay, states):
    im = background().copy()
    shapes = [(e, s) for e, s in zip(lay[cid], states) if e["type"] in ("rect", "panel") and s[0] > 0.004]
    if shapes:
        ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(ov)
        for e, (a, dy) in shapes:
            x0, y0, x1, y1 = e["box"]
            if e["type"] == "panel":   # cards._card_bg
                d.rounded_rectangle((x0, y0, x1, y1), 22, fill=(255, 255, 255, int(12 * a)), outline=(255, 255, 255, int(60 * a)), width=2)
            else:                      # blended marker (base drew straight onto RGBA; see design-review.json)
                d.rectangle((x0, y0 + dy, x1, y1 + dy), fill=e["color"] + (int(255 * a),))
        im.alpha_composite(ov)
    for e, (a, dy) in zip(lay[cid], states):
        if e["type"] != "text" or a <= 0.02:
            continue
        ti = _timg(e["text"], e["key"], e["color"])
        if a < 1:
            ti = ti.copy()
            ti.putalpha(ti.getchannel("A").point(lambda v: int(v * a)))
        im.alpha_composite(ti, (int(e["x"]), int(e["y"] + dy)))
    return im.convert("RGB")


# ------------------------------------------------------------------ ffmpeg helpers
def run(cmd, **kw):
    p = subprocess.run(cmd, capture_output=True, **kw)
    if p.returncode != 0:
        err = p.stderr.decode("utf-8", "replace") if isinstance(p.stderr, bytes) else p.stderr
        raise SystemExit(f"command failed ({p.returncode}): {' '.join(map(str, cmd[:6]))} ...\n{err[-3000:]}")
    return p


def probe(args, path, count=False):
    cmd = [args.ffprobe, "-v", "error", "-show_streams", "-show_format", "-of", "json"]
    if count:
        cmd += ["-count_frames"]
    return json.loads(run(cmd + [str(path)]).stdout)


def vstream(pr):
    return next(s for s in pr["streams"] if s["codec_type"] == "video")


def astream(pr):
    return next(s for s in pr["streams"] if s["codec_type"] == "audio")


def extract_frames(args, path, frames):
    """Decode exact frame indices (ffmpeg select on decoded frame number) -> {n: RGB Image}."""
    frames = sorted(set(frames))
    sel = "+".join(f"eq(n\\,{k})" for k in frames)
    cmd = [args.ffmpeg, "-nostdin", "-v", "error", "-threads", str(args.threads), "-i", str(path), "-map", "0:v:0",
           "-vf", f"select='{sel}'", "-fps_mode", "passthrough", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    got = {}
    for k in frames:
        buf = p.stdout.read(W * H * 3)
        if len(buf) < W * H * 3:
            break
        got[k] = Image.frombytes("RGB", (W, H), buf)
    p.stdout.close()
    p.wait()
    if len(got) != len(frames):
        raise SystemExit(f"frame extraction from {path.name}: wanted {len(frames)}, got {len(got)}")
    return got


def mad(a, b):
    return round(float(np.mean(np.abs(np.asarray(a, np.int16) - np.asarray(b, np.int16)))), 4)


def maxd(a, b):
    return int(np.max(np.abs(np.asarray(a, np.int16) - np.asarray(b, np.int16))))


def sheet(tiles, cols, tw_, th_, path):
    rows = (len(tiles) + cols - 1) // cols
    lab = 26
    im = Image.new("RGB", (cols * tw_, rows * (th_ + lab)), INK)
    d = ImageDraw.Draw(im)
    f = font("lat", 18, "SemiBold")
    for i, (label, t) in enumerate(tiles):
        x, y = (i % cols) * tw_, (i // cols) * (th_ + lab)
        im.paste(t.resize((tw_, th_), Image.LANCZOS), (x, y + lab))
        d.text((x + 6, y + 3), label, font=f, fill=PAPER)
    im.save(path)


# ------------------------------------------------------------------ audio
def load_audio_module(path):
    spec = importlib.util.spec_from_file_location("ryoshu_film_audio_v14", str(path))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def timelines(manifest):
    base = {"duration": manifest["duration_s"], "scenes": manifest["scenes"], "shots": manifest["shots"],
            "events": manifest["events"], "captions": manifest["captions"]}
    cut = NOTES_SCENE[0]
    scenes = []
    for s in manifest["scenes"]:
        if s["id"] == "notes":
            scenes += [{"id": sid, "kind": "graphic", "out": [round(st, 4), round(st + du, 4)]} for _, sid, st, du, *_ in CARDS]
        elif s["id"] == "end":
            scenes.append({**s, "out": [round(s["out"][0] + SHIFT_S, 4), round(s["out"][1] + SHIFT_S, 4)]})
        else:
            scenes.append(s)
    ext = {"duration": round(manifest["duration_s"] + SHIFT_S, 4), "scenes": scenes,
           "shots": [x for x in manifest["shots"] if x["out"][0] < cut], "events": [x for x in manifest["events"] if x["out_t"] < cut],
           "captions": [x for x in manifest["captions"] if x["start"] < cut]}
    dropped = {"shots": len(manifest["shots"]) - len(ext["shots"]), "events": len(manifest["events"]) - len(ext["events"]),
               "captions": len(manifest["captions"]) - len(ext["captions"])}
    return base, ext, dropped


def synth(A, tl):
    """Same steps as audio.make(tl), also returning the normalisation peaks for evidence."""
    m = A.music(tl)
    cue = A.cues(tl)
    s = A.sfx(tl, cue)
    pm, ps = float(np.max(np.abs(m))), float(np.max(np.abs(s)))
    m *= 0.6 / (pm + 1e-9)
    s *= 0.7 / (ps + 1e-9)
    return A.soft_limit(m * 0.85 + s * 0.8), cue, {"music_peak_prenorm": pm, "sfx_peak_prenorm": ps}


def decode_audio(args, path):
    p = run([args.ffmpeg, "-nostdin", "-v", "error", "-i", str(path), "-map", "0:a:0", "-f", "f32le", "-acodec", "pcm_f32le",
             "-ar", str(SR), "-ac", "2", "-"])
    return np.frombuffer(p.stdout, "<f4").reshape(-1, 2).astype(np.float64)


def S(t):
    return int(round(t * SR))


def pearson(a, b):
    a, b = a.ravel() - a.mean(), b.ravel() - b.mean()
    return float(np.dot(a, b) / (np.sqrt(np.dot(a, a) * np.dot(b, b)) + 1e-20))


def rms_db(x):
    return round(float(20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)), 3)


def peak_db(x):
    return round(float(20 * np.log10(np.max(np.abs(x)) + 1e-12)), 3)


def best_lag(ref, sig, maxlag=1024):
    """D maximising sum ref[i]*sig[i-D] (mono), with normalised peak correlation."""
    a, b = ref.mean(1), sig.mean(1)
    n = 1 << int(np.ceil(np.log2(len(a) + len(b))))
    c = np.fft.irfft(np.fft.rfft(a, n) * np.conj(np.fft.rfft(b, n)), n)
    lags = np.r_[np.arange(0, maxlag + 1), np.arange(-maxlag, 0)]
    vals = np.r_[c[:maxlag + 1], c[-maxlag:]]
    k = int(np.argmax(vals))
    return int(lags[k]), float(vals[k] / (np.sqrt(np.dot(a, a) * np.dot(b, b)) + 1e-20))


def xfade(a, b):
    """Correlation-aware constant-power crossfade a -> b: equal-power when uncorrelated, constant-amplitude when identical,
    so neither a dip nor a +3 dB bump (phase-safe). Starts exactly at a, ends one sample before pure b."""
    rho = clamp(pearson(a, b), 0.0, 1.0)
    x = (np.arange(len(a)) / len(a))[:, None]
    wa, wb = 1 - x, x
    norm = np.sqrt(wa ** 2 + wb ** 2 + 2 * rho * wa * wb)
    return a * (wa / norm) + b * (wb / norm), rho


def edge_metrics(x, i, w=2400, e=16):
    d = np.abs(np.diff(x, axis=0)).max(axis=1)
    near = float(d[i - e:i + e].max())
    loc = np.r_[d[i - w:i - e], d[i + e:i + w]]
    med, mx = float(np.median(loc)), float(loc.max())
    return {"sample": i, "edge_max_delta_pm16": round(near, 6), "local_median_delta_pm50ms": round(med, 6),
            "local_p99_delta": round(float(np.percentile(loc, 99)), 6), "local_max_delta_excl_edge": round(mx, 6),
            "edge_le_local_max": near <= mx, "plan_rule_edge_lt_2x_median": near < 2 * med}


def build_audio(A, manifest, base_pcm):
    tl_base, tl_ext, dropped = timelines(manifest)
    t0 = time.time()
    ext, cue_ext, norm_ext = synth(A, tl_ext)
    base_syn, _, norm_base = synth(A, tl_base)
    rep = {"synth_seconds": round(time.time() - t0, 1), "ext_timeline_scenes": [[s["id"], s["out"]] for s in tl_ext["scenes"][-5:]],
           "ext_timeline_dropped_after_cut": dropped, "normalisation": {"ext": norm_ext, "base": norm_base,
           "music_peak_equal": abs(norm_ext["music_peak_prenorm"] - norm_base["music_peak_prenorm"]) < 1e-9,
           "sfx_peak_equal": abs(norm_ext["sfx_peak_prenorm"] - norm_base["sfx_peak_prenorm"]) < 1e-9},
           "insert_cues_out_s": {k: [v for v in vals if 161.9 <= v < 195.0] for k, vals in cue_ext.items() if any(161.9 <= v < 195.0 for v in vals)}}
    w0, w1 = S(163.0), S(170.0)
    rep["ext_vs_base_synth_163_170"] = {"max_abs_diff": round(float(np.max(np.abs(ext[w0:w1] - base_syn[w0:w1]))), 9)}
    m = min(len(base_syn), len(base_pcm))
    rep["base_synth_vs_decoded_base_full"] = {"pearson": round(pearson(base_syn[:m], base_pcm[:m]), 5)}
    del base_syn
    lag, c = best_lag(base_pcm[S(163.0):S(166.0)], ext[S(163.0):S(166.0)])
    D = lag if (abs(lag) < 1024 and c > 0.9) else 0
    rep["alignment"] = {"window_out_s": [163.0, 166.0], "best_lag_samples": lag, "peak_corr": round(c, 5), "applied_lag_samples": D}

    def E(a, b):
        return ext[a - D:b - D]

    n_out = S(OUT_FRAMES / FPS)
    sh = S(SHIFT_S)
    i0, i1, i2, i3 = S(163.0), S(163.3), S(194.3), S(194.55)
    out = np.zeros((n_out, 2))
    out[:i0] = base_pcm[:i0]
    out[i0:i1], rho1 = xfade(base_pcm[i0:i1], E(i0, i1))
    out[i1:i2] = E(i1, i2)
    out[i2:i3], rho2 = xfade(E(i2, i3), base_pcm[i2 - sh:i3 - sh])
    tail = base_pcm[i3 - sh:]
    k = min(len(tail), n_out - i3)
    out[i3:i3 + k] = tail[:k]
    a, b = base_pcm[i0:i1], E(i0, i1)
    rep["xfade_in"] = {"out_s": [163.0, 163.3], "rho_used": round(rho1, 5), "pearson_base_vs_new": round(pearson(a, b), 5),
                       "rms_db_base": rms_db(a), "rms_db_new": rms_db(b), "rms_diff_db": round(abs(rms_db(a) - rms_db(b)), 3),
                       "plan_within_1dB": abs(rms_db(a) - rms_db(b)) <= 1.0}
    a, b = E(i2, i3), base_pcm[i2 - sh:i3 - sh]
    rep["xfade_out"] = {"out_s": [194.3, 194.55], "base_s": [170.3, 170.55], "rho_used": round(rho2, 5), "rms_db_new": rms_db(a),
                        "rms_db_base": rms_db(b)}
    rep["base_tail_zero_padded_samples"] = int(n_out - i3 - k)
    rep["pcm_edges"] = [edge_metrics(out, i) for i in (i0, i1, i2, i3)]
    rep["pcm_peak_dbfs"] = peak_db(out)
    rep["pcm_clipped_samples"] = int(np.sum(np.abs(out) >= 0.9999))
    rep["pcm_samples"] = n_out
    return out, rep


def write_f32_wav(path, x):
    data = np.ascontiguousarray(x, dtype="<f4").tobytes()
    with open(path, "xb") as f:
        f.write(b"RIFF" + struct.pack("<I", 36 + len(data)) + b"WAVE")
        f.write(b"fmt " + struct.pack("<IHHIIHH", 16, 3, 2, SR, SR * 8, 8, 32))
        f.write(b"data" + struct.pack("<I", len(data)) + data)


def loudness(args, path):
    p = subprocess.run([args.ffmpeg, "-nostdin", "-hide_banner", "-nostats", "-i", str(path), "-map", "0:a:0", "-af", "ebur128",
                        "-f", "null", "-"], capture_output=True, text=True, errors="replace")
    m = re.findall(r"I:\s+(-?[\d.]+) LUFS", p.stderr)
    return float(m[-1]) if m else None


# ------------------------------------------------------------------ QC on the final file
def psnr_ssim(args, out, base, o0, b0, n):
    fc = (f"[0:v]trim=start_frame={o0}:end_frame={o0 + n},setpts=PTS-STARTPTS,split[o1][o2];"
          f"[1:v]trim=start_frame={b0}:end_frame={b0 + n},setpts=PTS-STARTPTS,split[b1][b2];"
          f"[o1][b1]psnr=stats_file=-[p];[o2][b2]ssim=stats_file=-[s]")
    p = run([args.ffmpeg, "-nostdin", "-v", "error", "-threads", str(args.threads), "-i", str(out), "-threads", str(args.threads),
             "-i", str(base), "-filter_complex", fc, "-map", "[p]", "-map", "[s]", "-f", "null", "-"], text=True, errors="replace")
    py, sy, sa = [], [], []
    for ln in p.stdout.splitlines():
        m = re.search(r"psnr_y:(\S+)", ln)
        if m:
            py.append(float("inf") if m.group(1) == "inf" else float(m.group(1)))
        m = re.search(r"\bY:([\d.]+).*All:([\d.]+)", ln)
        if m:
            sy.append(float(m.group(1)))
            sa.append(float(m.group(2)))
    fin = [v for v in py if np.isfinite(v)]
    return {"out_frames": [o0, o0 + n - 1], "base_frames": [b0, b0 + n - 1], "psnr_frames": len(py), "ssim_frames": len(sy),
            "psnr_y_min": round(min(py), 3) if py else None, "psnr_y_mean_finite": round(float(np.mean(fin)), 3) if fin else None,
            "psnr_y_inf_frames": len(py) - len(fin), "ssim_y_min": round(min(sy), 6) if sy else None,
            "ssim_all_min": round(min(sa), 6) if sa else None, "ssim_all_mean": round(float(np.mean(sa)), 6) if sa else None,
            "plan_psnr_ge_45": bool(py) and min(py) >= 45, "plan_ssim_ge_0_99": bool(sa) and min(sa) >= 0.99,
            "frames_complete": len(py) == n == len(sy)}


# ------------------------------------------------------------------ modes
def stills(args, deck, lay, out):
    rep = layout_report(deck, lay)
    tiles = []
    for cid, sid, *_ in CARDS:
        n = STILL_FRAMES[cid]
        _, states = render_frame(n, lay, deck, record=False)
        im = compose(cid, lay, states)
        im.save(out / f"still-{cid}-{sid}-f{n}.png")
        tiles.append((f"{cid} {sid}  out frame {n}  t={n / FPS:.3f}s", im))
    sheet(tiles, 3, 960, 540, out / "stills-contact.png")
    if args.base:
        fr = extract_frames(args, Path(args.base), [A_END - 1, B_START])
        bg = background().convert("RGB")
        rep["background_vs_decoded_base"] = {f"base_frame_{k}": {"mean_abs_diff": mad(bg, v), "max_abs_diff": maxd(bg, v)} for k, v in fr.items()}
    (out / "layout-report.json").write_text(json.dumps(rep, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(json.dumps({"stills": str(out), "overflow_any": rep["overflow_any"], "flagged_for_kimi": rep["flagged_for_kimi"]}, ensure_ascii=False))


def final(args, deck, lay, out):
    base = Path(args.base)
    qc = {"mode": "final", "started_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "not_performed": [
        "audible listening of any part (not possible in this execution; host must listen at out 162-164 s and 193-196 s)",
        "browser playback", "human visual review of the contact sheets"]}
    sha0 = sha256_file(base)
    qc["base"] = {"name": base.name, "sha256_before": sha0, "expected": args.expect_sha256,
                  "matches_expected": (sha0 == args.expect_sha256) if args.expect_sha256 else None}
    if args.expect_sha256 and sha0 != args.expect_sha256:
        raise SystemExit("base sha256 mismatch")
    bv = vstream(probe(args, base))
    if (bv["width"], bv["height"], bv["r_frame_rate"], bv["pix_fmt"], int(bv.get("nb_frames", 0))) != (W, H, "30/1", "yuv420p", BASE_FRAMES):
        raise SystemExit(f"unexpected base video stream: {bv}")
    color = {k: bv[k] for k in ("color_range", "color_space", "color_transfer", "color_primaries") if bv.get(k) and bv[k] != "unknown"}
    qc["base"]["color_tags"] = color or "untagged (no color tags written; RGB->YUV via ffmpeg default, same as the base encode)"
    rep = layout_report(deck, lay)
    (out / "layout-report.json").write_text(json.dumps(rep, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    if rep["overflow_any"]:
        raise SystemExit(f"layout overflow, returned for copy fix: {rep['flagged_for_kimi']}")
    work = out / "_work"
    work.mkdir()
    owned = []
    try:
        # audio
        A = load_audio_module(args.audio_source)
        qc["audio_source"] = {"name": Path(args.audio_source).name, "sha256": sha256_file(args.audio_source)}
        manifest = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
        qc["manifest_sha256"] = sha256_file(args.manifest)
        base_pcm = decode_audio(args, base)
        mix, qc["audio_build"] = build_audio(A, manifest, base_pcm)
        wav = work / "mix.f32.wav"
        owned.append(wav)
        write_f32_wav(wav, mix)
        del mix
        # notice clip: lossless FFV1 RGB intermediate
        mkv = work / "notice.ffv1.mkv"
        owned.append(mkv)
        enc = subprocess.Popen([args.ffmpeg, "-v", "error", "-n", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
                                "-i", "-", "-c:v", "ffv1", "-level", "3", "-slices", "16", "-g", "1", "-threads", str(args.threads),
                                "-pix_fmt", "gbrp", str(mkv)], stdin=subprocess.PIPE)
        prev_key, prev_bytes, t0, unique = None, None, time.time(), 0
        for n in range(A_END, A_END + N_FRAMES):
            key, states = render_frame(n, lay, deck)
            if key != prev_key:
                prev_bytes, prev_key = compose(key[0], lay, states).tobytes(), key
                unique += 1
            enc.stdin.write(prev_bytes)
            if (n - A_END) % 150 == 0:
                print(f"notice frame {n} ({time.time() - t0:.0f}s)", file=sys.stderr)
        enc.stdin.close()
        if enc.wait() != 0:
            raise SystemExit("ffv1 notice encode failed")
        qc["notice_clip"] = {"frames": N_FRAMES, "unique_frames_composed": unique, "render_seconds": round(time.time() - t0, 1)}
        # one-generation final encode
        mp4 = out / OUT_NAME
        fc = (f"[0:v]trim=start_frame=0:end_frame={A_END},setpts=PTS-STARTPTS,format=yuv420p,setsar=1[a];"
              f"[1:v]trim=start_frame=0:end_frame={N_FRAMES},setpts=PTS-STARTPTS,format=yuv420p,setsar=1[n];"
              f"[2:v]trim=start_frame={B_START}:end_frame={BASE_FRAMES},setpts=PTS-STARTPTS,format=yuv420p,setsar=1[b];"
              f"[a][n][b]concat=n=3:v=1:a=0,settb=1/{FPS},setpts=N[v]")
        flag = {"color_range": "-color_range", "color_space": "-colorspace", "color_transfer": "-color_trc", "color_primaries": "-color_primaries"}
        tags = sum([[flag[k], v] for k, v in color.items()], [])
        T = str(args.threads)
        cmd = [args.ffmpeg, "-nostdin", "-v", "error", "-n", "-threads", T, "-i", str(base), "-threads", T, "-i", str(mkv),
               "-threads", T, "-i", str(base), "-i", str(wav), "-filter_complex", fc, "-filter_complex_threads", "2",
               "-map", "[v]", "-map", "3:a:0", "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "14",
               "-pix_fmt", "yuv420p", *tags, "-threads", T, "-fps_mode", "cfr", "-r", str(FPS), "-video_track_timescale", "15360",
               "-c:a", "aac", "-b:a", "256k", "-ar", str(SR), "-ac", "2", "-map_metadata", "-1", "-movflags", "+faststart", str(mp4)]
        qc["final_encode_argv"] = [Path(c).name if c in (str(base), str(mkv), str(wav), str(mp4)) else c for c in cmd]
        t0 = time.time()
        run(cmd)
        qc["final_encode_seconds"] = round(time.time() - t0, 1)
        # measured QC
        op = probe(args, mp4, count=True)
        ov, oa = vstream(op), astream(op)
        nrf, ad = int(ov.get("nb_read_frames", 0)), float(oa.get("duration", 0))
        qc["output"] = {"file": OUT_NAME, "bytes": mp4.stat().st_size, "sha256": sha256_file(mp4),
                        "video": {k: ov.get(k) for k in ("codec_name", "profile", "pix_fmt", "width", "height", "r_frame_rate", "nb_frames",
                                                         "nb_read_frames", "duration", "color_space", "color_range")},
                        "audio": {k: oa.get(k) for k in ("codec_name", "profile", "sample_rate", "channels", "duration", "duration_ts", "bit_rate")},
                        "faststart_moov_first": _moov_first(mp4), "frame_count_ok": nrf == OUT_FRAMES,
                        "audio_duration_within_one_aac_frame": abs(ad - OUT_FRAMES / FPS) <= 1024 / SR}
        qc["preservation"] = {"A": psnr_ssim(args, mp4, base, 0, 0, A_END),
                              "B": psnr_ssim(args, mp4, base, A_END + N_FRAMES, B_START, BASE_FRAMES - B_START)}
        dec = decode_audio(args, mp4)
        qc["audio_output"] = {"samples": len(dec), "peak_dbfs": peak_db(dec), "clipped_samples": int(np.sum(np.abs(dec) >= 0.9999)),
                              "plan_peak_le_minus_0_5": bool(np.max(np.abs(dec)) <= 10 ** (-0.5 / 20)), "base_peak_dbfs": peak_db(base_pcm),
                              "edges_decoded": [edge_metrics(dec, S(t)) for t in (163.0, 163.3, 194.3, 194.55)]}
        li, lb = loudness(args, mp4), loudness(args, base)
        qc["audio_output"]["integrated_lufs"] = {"output": li, "base": lb,
                                                 "plan_within_0_5LU": (abs(li - lb) <= 0.5) if (li is not None and lb is not None) else None}
        del dec, base_pcm
        # frames: boundaries, mid-holds, joins
        want = sorted({k for g in BOUNDARY_FRAMES for k in g} | set(STILL_FRAMES.values()))
        fr = extract_frames(args, mp4, want)
        for g in BOUNDARY_FRAMES:
            sheet([(f"out {k}", fr[k]) for k in g], 11, 320, 180, out / f"boundary-{g[0]}-{g[-1]}.png")
        for cid, n in STILL_FRAMES.items():
            fr[n].save(out / f"midhold-{cid}-f{n}.png")
        qc["joins_mean_abs_rgb_diff"] = {f"{a}->{b}": mad(fr[a], fr[b]) for a, b in JOINS}
        bfr = extract_frames(args, base, [A_END - 1, B_START])
        bg = background().convert("RGB")
        qc["background_continuity"] = {"out4860_vs_base4859": mad(fr[4860], bfr[A_END - 1]), "out5849_vs_base5130": mad(fr[5849], bfr[B_START]),
                                       "rendered_bg_vs_base4859": mad(bg, bfr[A_END - 1]), "rendered_bg_vs_base5130": mad(bg, bfr[B_START])}
        # rendered copy
        notice_items = []
        for (slot, text), s in sorted(deck.shown.items(), key=lambda kv: (kv[1]["first_s"], kv[0][0])):
            notice_items.append({"slot": slot, "text": text, "first_s": round(s["first_s"], 3), "last_s": round(s["last_s"], 3),
                                 "first_frame": s["first_frame"], "last_frame": s["last_frame"], **deck.origin(slot, text)})
        shown_slots = {k[0] for k in deck.shown}
        missing = [s for s in REQUIRED + [x for x in OPTIONAL if x in deck.items] if s not in shown_slots]
        notice = {"deck": deck.path.name, "deck_sha256": deck.sha, "out_frames": [A_END, A_END + N_FRAMES - 1], "items": notice_items,
                  "deck_slots_not_displayed": missing, "all_verbatim": all(i["verbatim"] for i in notice_items)}
        (out / "notice.rendered-copy.json").write_text(json.dumps(notice, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        bc = json.loads(Path(args.base_copy).read_text(encoding="utf-8"))
        merged, spans = [], []
        for it in bc["items"]:
            if it["slot"].startswith("notes."):
                continue
            it = dict(it)
            if it["first_s"] < 171.0 < it["last_s"] or 162.0 <= it["first_s"] < 171.0:
                spans.append(it["slot"])
            for k in ("first_s", "last_s"):
                if it[k] >= 171.0:
                    it[k] = round(it[k] + SHIFT_S, 3)
            merged.append(it)
        merged = sorted(merged + notice_items, key=lambda i: i["first_s"])
        (out / "ryoshu-promo-v1.4.0-notice.rendered-copy.json").write_text(json.dumps(
            {"base_rendered_copy_sha256": sha256_file(args.base_copy), "notice_deck_sha256": deck.sha,
             "rule": "base items kept; notes.* removed; times >= 171.0 shifted +24.0; notice items in output time",
             "base_items_spanning_removed_range": spans, "items": merged}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        qc["rendered_copy"] = {"notice_items": len(notice_items), "all_verbatim": notice["all_verbatim"], "deck_slots_not_displayed": missing,
                               "base_items_spanning_removed_range": spans}
    finally:
        if not args.keep_intermediates:
            for f in owned:
                if f.exists():
                    f.unlink()
            if work.exists() and not any(work.iterdir()):
                work.rmdir()
    sha1 = sha256_file(base)
    qc["base"]["sha256_after"] = sha1
    qc["base"]["unchanged"] = sha1 == sha0
    qc["timings"] = timings()
    qc["finished_utc"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    (out / "notice.qc.json").write_text(json.dumps(qc, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(out / OUT_NAME), "frames": nrf, "base_unchanged": qc["base"]["unchanged"]}))


def _moov_first(p):
    with open(p, "rb") as f:
        pos = 0
        while True:
            hdr = f.read(8)
            if len(hdr) < 8:
                return None
            size, typ = struct.unpack(">I4s", hdr)
            if typ in (b"moov", b"mdat"):
                return typ == b"moov"
            if size == 1:
                size = struct.unpack(">Q", f.read(8))[0]
            if size == 0:
                return None
            pos += size
            f.seek(pos)


def timings():
    return {"fps": FPS, "frames": OUT_FRAMES, "duration_s": round(OUT_FRAMES / FPS, 6),
            "segments": [{"id": "A", "src": "base", "base_frames": [0, A_END - 1], "out_frames": [0, A_END - 1]}] +
                        [{"id": c[0], "scene": c[1], "out_frames": [c[4], c[4] + c[5] - 1],
                          "out_s": [round(c[4] / FPS, 6), round((c[4] + c[5]) / FPS, 6)]} for c in CARDS] +
                        [{"id": "B", "src": "base", "base_frames": [B_START, BASE_FRAMES - 1], "out_frames": [A_END + N_FRAMES, OUT_FRAMES - 1]}],
            "audio_out_s": {"base": [0.0, 163.0], "xfade_in": [163.0, 163.3], "new": [163.3, 194.3], "xfade_out": [194.3, 194.55],
                            "base_shifted_from_base_s": 170.55}}


def main():
    global FONT_DIR
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--base")
    ap.add_argument("--deck", required=True)
    ap.add_argument("--manifest")
    ap.add_argument("--base-copy")
    ap.add_argument("--audio-source")
    ap.add_argument("--out", required=True)
    ap.add_argument("--stills", action="store_true")
    ap.add_argument("--fonts", default="C:/Windows/Fonts")
    ap.add_argument("--expect-sha256")
    ap.add_argument("--threads", type=int, default=4)
    ap.add_argument("--ffmpeg", default="ffmpeg")
    ap.add_argument("--ffprobe", default="ffprobe")
    ap.add_argument("--keep-intermediates", action="store_true")
    args = ap.parse_args()
    FONT_DIR = str(Path(args.fonts)).replace("\\", "/").rstrip("/") + "/"
    if not args.stills:
        miss = [n for n in ("base", "manifest", "base_copy", "audio_source") if not getattr(args, n)]
        if miss:
            raise SystemExit("final mode needs " + ", ".join("--" + n.replace("_", "-") for n in miss))
    if (args.base or not args.stills) and not shutil.which(args.ffmpeg):
        raise SystemExit(f"ffmpeg not found: {args.ffmpeg}")
    deck = Deck(Path(args.deck))
    lay = {c[0]: layout(c[0], deck) for c in CARDS}
    out = Path(args.out)
    if out.exists():
        raise SystemExit(f"refusing to write into existing path: {out}")
    out.mkdir(parents=True)
    (stills if args.stills else final)(args, deck, lay, out)


if __name__ == "__main__":
    main()
