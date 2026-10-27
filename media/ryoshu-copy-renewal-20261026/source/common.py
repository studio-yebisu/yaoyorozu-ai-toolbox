"""Shared drawing, footage and camera code (from the previous promo's render.py).

The recording is never redrawn: every UI pixel comes from the source frame,
cropped/scaled by a virtual camera. Only type (from the Kimi decks), frames
and marks are added.
"""
import subprocess
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

import copydeck

import os

ROOT = Path(os.environ.get("RYOSHU_OUT") or Path(__file__).resolve().parent.parent)
SRC = copydeck.INPUT / "new-real-ui.mp4"
BUILD = ROOT / "build"
DELIVER = ROOT / "deliver"
FONTS = "C:/Windows/Fonts/"
FPS = 30
SW, SH = 1920, 1080  # recording size

# palette
INK = (11, 13, 26)
INK2 = (20, 23, 44)
PAPER = (244, 241, 234)
MUTED = (150, 154, 178)
VERMILION = (255, 91, 58)
INDIGO = (120, 132, 255)


# --- helpers -----------------------------------------------------------------
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def ease(x):
    x = clamp(x)
    return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2


def ease_out(x):
    x = clamp(x)
    return 1 - (1 - x) ** 3


def prog(t, a, d):
    return clamp((t - a) / d)


@lru_cache(None)
def jp(size, wght=700):
    f = ImageFont.truetype(FONTS + "NotoSansJP-VF.ttf", size)
    f.set_variation_by_axes([wght])
    return f


@lru_cache(None)
def lat(size, style="Bold"):
    f = ImageFont.truetype(FONTS + "bahnschrift.ttf", size)
    try:
        f.set_variation_by_name(style)
    except Exception:
        pass
    return f


def font(key):
    kind, size, w = key
    return jp(size, w) if kind == "jp" else lat(size, w)


@lru_cache(None)
def _text_img(text, font_key, fill):
    f = font(font_key)
    l, t, r, b = f.getbbox(text)
    asc, desc = f.getmetrics()
    im = Image.new("RGBA", (r - l + 4, asc + desc + 4), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((2 - l, 2), text, font=f, fill=fill)
    return im


def text_w(text, font_key):
    return _text_img(str(text), font_key, (255, 255, 255)).width


def text_h(font_key):
    f = font(font_key)
    a, d = f.getmetrics()
    return a + d + 4


class Clock:
    t = 0.0


def _paste(base, s, font_key, fill, xy, alpha, anchor, dy):
    im = _text_img(s, font_key, fill)
    x, y = xy
    if anchor == "c":
        x -= im.width // 2
    elif anchor == "r":
        x -= im.width
    if alpha < 1:
        im = im.copy()
        im.putalpha(im.getchannel("A").point(lambda v: int(v * alpha)))
    base.alpha_composite(im, (int(x), int(y + dy)))
    return im.width


def paste_text(base, text, font_key, fill, xy, alpha=1.0, anchor="l", dy=0):
    """Draw one deck text on one line."""
    if alpha <= 0.02:
        return text_w(text, font_key)
    copydeck.mark_shown(text, Clock.t)
    return _paste(base, str(text), font_key, fill, xy, alpha, anchor, dy)


NO_START = set("、。，．・：；？！ー）」』】〕）ぁぃぅぇぉっゃゅょァィゥェォッャュョ")


def wrap(text, font_key, maxw):
    """Automatic line wrapping; never changes characters, only break points."""
    s = str(text)
    lines, cur = [], ""
    i = 0
    while i < len(s):
        ch = s[i]
        if cur and text_w(cur + ch, font_key) > maxw:
            # keep Latin words together and avoid starting a line with punctuation
            cut = len(cur)
            if ch in NO_START:
                cut -= 1
            elif ch.isascii() and ch.isalnum():
                k = cut
                while k > 0 and cur[k - 1].isascii() and cur[k - 1].isalnum():
                    k -= 1
                if k > 0:
                    cut = k
            cut = max(1, cut)
            lines.append(cur[:cut])
            cur = cur[cut:]
            continue
        cur += ch
        i += 1
    if cur:
        lines.append(cur)
    assert "".join(lines) == s
    return lines


def paste_block(base, text, font_key, fill, xy, maxw, alpha=1.0, anchor="l", dy=0, leading=1.25):
    """Draw a deck text with automatic wrapping. Returns block height."""
    lines = wrap(text, font_key, maxw)
    lh = int(font_key[1] * leading * 1.18)
    if alpha > 0.02:
        copydeck.mark_shown(text, Clock.t)
        for k, ln in enumerate(lines):
            _paste(base, ln, font_key, fill, (xy[0], xy[1] + k * lh), alpha, anchor, dy)
    return lh * len(lines)


def fit_size(text, kind, w, size, min_size, maxw):
    s = size
    while s > min_size and text_w(text, (kind, s, w)) > maxw:
        s -= 1
    return (kind, s, w)


def rounded_mask(w, h, r, scale=3):
    m = Image.new("L", (w * scale, h * scale), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, w * scale - 1, h * scale - 1), r * scale, fill=255)
    return m.resize((w, h), Image.LANCZOS)


# --- static layers -----------------------------------------------------------
@lru_cache(None)
def background(W, H):
    y = np.linspace(0, 1, H)[:, None]
    x = np.linspace(0, 1, W)[None, :]
    c0, c1 = np.array(INK, float), np.array(INK2, float)
    mix = (0.65 * y + 0.35 * (1 - x))[..., None]
    img = c0 * (1 - mix) + c1 * mix
    yy, xx = np.mgrid[0:H, 0:W]
    dots = ((xx % 48 == 0) & (yy % 48 == 0))
    img[dots] += 18
    vign = 1 - 0.35 * (((x - 0.5) ** 2 + (y - 0.5) ** 2) * 2)
    img *= vign[..., None]
    rgba = np.dstack([np.clip(img, 0, 255).astype(np.uint8), np.full((H, W), 255, np.uint8)])
    return Image.fromarray(rgba, "RGBA")


@lru_cache(None)
def shadow(w, h, radius):
    pad = 60
    s = Image.new("L", (w + pad * 2, h + pad * 2), 0)
    ImageDraw.Draw(s).rounded_rectangle((pad, pad + 14, pad + w, pad + h + 14), radius, fill=150)
    s = s.filter(ImageFilter.GaussianBlur(26))
    im = Image.new("RGBA", s.size, (0, 0, 0, 0))
    im.putalpha(s)
    return im, pad


@lru_cache(None)
def cached_mask(w, h, r):
    return rounded_mask(w, h, r)


# --- source access -----------------------------------------------------------
class ShotReader:
    def __init__(self, shot):
        self.shot = shot
        self.n = int(round((shot["end"] - shot["start"]) * FPS))
        dur = (shot["end"] - shot["start"]) * shot["speed"] + 0.5
        vf = f"setpts=(PTS-STARTPTS)/{shot['speed']},fps={FPS}"
        self.proc = subprocess.Popen(
            ["ffmpeg", "-v", "error", "-ss", f"{shot['src']:.3f}", "-i", str(SRC), "-t", f"{dur:.3f}",
             "-vf", vf, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        self.i = -1
        self.last = None

    def frame(self, idx):
        while self.i < idx:
            raw = self.proc.stdout.read(SW * SH * 3)
            self.i += 1
            if len(raw) == SW * SH * 3:
                self.last = Image.frombuffer("RGB", (SW, SH), raw, "raw", "RGB", 0, 1)
        return self.last

    def close(self):
        self.proc.kill()
        self.proc.stdout.close()
        self.proc.wait()


def still(src_t):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{src_t:.3f}", "-i", str(SRC), "-frames:v", "1",
                          "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
    return Image.frombuffer("RGB", (SW, SH), raw, "raw", "RGB", 0, 1).copy()


# --- camera ------------------------------------------------------------------
def camera(keys, rel, aspect):
    """keys: [(t_rel, cx, cy, crop_width)], aspect = out_h / out_w."""
    if rel <= keys[0][0]:
        k = keys[0][1:]
    elif rel >= keys[-1][0]:
        k = keys[-1][1:]
    else:
        for a, b in zip(keys, keys[1:]):
            if a[0] <= rel <= b[0]:
                p = ease((rel - a[0]) / (b[0] - a[0]))
                k = tuple(a[i] + (b[i] - a[i]) * p for i in (1, 2, 3))
                break
    cx, cy, cw = k
    cw = min(cw, SW, SH / aspect)
    ch = cw * aspect
    cx = clamp(cx, cw / 2, SW - cw / 2)
    cy = clamp(cy, ch / 2, SH - ch / 2)
    return cx - cw / 2, cy - ch / 2, cw, ch


def window_content(frame, cam, size):
    x0, y0, cw, ch = cam
    return frame.transform(size, Image.EXTENT, (x0, y0, x0 + cw, y0 + ch), Image.BICUBIC)


def draw_marks(layer, marks, rel, cam):
    x0, y0, cw, ch = cam
    s = layer.width / cw
    ov = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    for a, b, (rx0, ry0, rx1, ry1) in marks:
        if not (a <= rel <= b):
            continue
        p = ease_out((rel - a) / 0.4)
        fade = clamp((b - rel) / 0.25)
        grow = (1 - p) * 18
        X0 = (rx0 - x0) * s - 8 - grow
        Y0 = (ry0 - y0) * s - 8 - grow
        X1 = (rx1 - x0) * s + 8 + grow
        Y1 = (ry1 - y0) * s + 8 + grow
        al = int(255 * p * fade)
        d.rounded_rectangle((X0, Y0, X1, Y1), 12, fill=VERMILION + (int(26 * p * fade),),
                            outline=VERMILION + (al,), width=4)
    layer.alpha_composite(ov)


def compose_window(base, content, w, h, cx, cy, scale=1.0, alpha=1.0, radius=16):
    w2, h2 = int(w * scale), int(h * scale)
    if (w2, h2) != content.size:
        content = content.resize((w2, h2), Image.LANCZOS)
    r = max(6, int(radius * scale))
    sh, pad = shadow(w2, h2, r)
    x, y = int(cx - w2 / 2), int(cy - h2 / 2)
    mask = cached_mask(w2, h2, r)
    if alpha < 1:
        mask = mask.point(lambda v: int(v * alpha))
        sh = sh.copy()
        sh.putalpha(sh.getchannel("A").point(lambda v: int(v * alpha)))
    base.alpha_composite(sh, (x - pad, y - pad))
    c = content.convert("RGBA")
    c.putalpha(mask)
    base.alpha_composite(c, (x, y))
    border = Image.new("RGBA", (w2, h2), (0, 0, 0, 0))
    ImageDraw.Draw(border).rounded_rectangle((0, 0, w2 - 1, h2 - 1), r,
                                             outline=(255, 255, 255, int(40 * alpha)), width=2)
    base.alpha_composite(border, (x, y))


def chevron(base, x, y, size, alpha):
    """Small vermilion arrow glyph drawn as a shape (no text)."""
    d = ImageDraw.Draw(base)
    s = size
    d.line((x, y - s / 2, x + s / 2, y, x, y + s / 2), fill=VERMILION + (int(255 * alpha),), width=4)


def encoder(path, W, H):
    return subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
         "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "16",
         "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(path)], stdin=subprocess.PIPE)


class Footage:
    """Streams shots in order; returns the camera-framed window content."""

    def __init__(self, shots, cam_key="cam"):
        self.shots = shots
        self.cam_key = cam_key
        self.readers = {}
        self.last_content = {}

    def shot_at(self, t):
        for i, s in enumerate(self.shots):
            if s["start"] <= t < s["end"]:
                return i, s
        return None, None

    def content(self, i, t, size):
        shot = self.shots[i]
        rel = t - shot["start"]
        idx = int(round(rel * FPS))
        if i not in self.readers:
            for j in list(self.readers):
                if j < i:
                    self.readers.pop(j).close()
            self.readers[i] = ShotReader(shot)
        frame = self.readers[i].frame(min(idx, self.readers[i].n - 1))
        cam = camera(shot[self.cam_key], rel, size[1] / size[0])
        img = window_content(frame, cam, size).convert("RGBA")
        draw_marks(img, shot.get("marks", []), rel, cam)
        prev = self.last_content.get(i - 1)
        if prev is not None and rel < 0.22 and self.shots[i - 1]["end"] == shot["start"] and prev.size == size:
            img = Image.blend(prev, img, rel / 0.22)
        self.last_content[i] = img
        return img

    def close(self):
        for r in self.readers.values():
            r.close()
        self.readers.clear()
