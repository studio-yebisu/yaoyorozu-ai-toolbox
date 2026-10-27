"""Genuine capture frames (change-driven JPEGs) + the ONE shared raw->camera->output transform.

A shot never interpolates or redraws UI: an output time maps to a source time; the latest captured frame at or
before it is shown (sample-and-hold). Overlay rectangles go through the same transform as the pixels.
"""
from __future__ import annotations

import bisect
import json
from functools import lru_cache
from pathlib import Path

from PIL import Image

from .deck import INPUT

UI = INPUT / "new-ui"
SRC_W, SRC_H = 1280, 720


@lru_cache(None)
def frames(chunk: str):
    rows = [json.loads(l) for l in (UI / chunk / "frames.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()]
    out = []
    for i, r in enumerate(rows):
        m = r["metadata"]
        assert (m["deviceWidth"], m["deviceHeight"]) == (SRC_W, SRC_H), (chunk, i)
        out.append({"i": i, "file": r["file"], "t": float(m["timestamp"]), "scroll_y": float(m.get("scrollOffsetY", 0))})
    return out


@lru_cache(maxsize=64)
def image(chunk: str, i: int) -> Image.Image:
    return Image.open(UI / chunk / frames(chunk)[i]["file"]).convert("RGB")


def pointer(chunk: str, i: int) -> str:
    return f"input/new-ui/{chunk}/{frames(chunk)[i]['file']}"


def frame_at(chunk: str, src_t: float, lo: int, hi: int) -> int:
    fr = frames(chunk)
    ts = [f["t"] for f in fr[lo:hi + 1]]
    k = bisect.bisect_right(ts, src_t + 1e-9) - 1
    return lo + max(k, 0)


# --- camera / transform ----------------------------------------------------------------------------
def clamp_cam(cx, cy, w):
    w = min(max(w, 640.0), float(SRC_W))
    h = w * 9 / 16
    return min(max(cx, w / 2), SRC_W - w / 2), min(max(cy, h / 2), SRC_H - h / 2), w


def cam_at(keys, rel):
    """keys: [(rel_s, cx, cy, w)], smootherstep between keys."""
    if rel <= keys[0][0]:
        k = keys[0][1:]
    elif rel >= keys[-1][0]:
        k = keys[-1][1:]
    else:
        for a, b in zip(keys, keys[1:]):
            if a[0] <= rel <= b[0]:
                u = (rel - a[0]) / (b[0] - a[0])
                u = u * u * u * (u * (6 * u - 15) + 10)
                k = tuple(a[j] + (b[j] - a[j]) * u for j in (1, 2, 3))
                break
    return clamp_cam(*k)


def crop_box(cam):
    cx, cy, w = cam
    h = w * 9 / 16
    return cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2


def src_rect_to_win(rect, cam, win_w, win_h):
    """Source (x, y, w, h) -> window-local output (x0, y0, x1, y1). Same mapping as the pixel crop."""
    x0, y0, x1, _ = crop_box(cam)
    s = win_w / (x1 - x0)
    return ((rect[0] - x0) * s, (rect[1] - y0) * s, (rect[0] + rect[2] - x0) * s, (rect[1] + rect[3] - y0) * s)


def inside(rect, cam, margin=0.0):
    x0, y0, x1, y1 = crop_box(cam)
    return rect[0] >= x0 - margin and rect[1] >= y0 - margin and rect[0] + rect[2] <= x1 + margin and rect[1] + rect[3] <= y1 + margin


def window_pixels(chunk, i, cam, win_w, win_h):
    return image(chunk, i).transform((win_w, win_h), Image.EXTENT, crop_box(cam), Image.BICUBIC)
