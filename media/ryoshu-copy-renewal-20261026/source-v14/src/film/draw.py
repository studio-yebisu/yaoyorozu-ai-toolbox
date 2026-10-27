"""Frame drawing. UI pixels are never redrawn: footage = genuine capture frames through footage.py's transform.
All Japanese = Kimi deck text (deck.Deck); numeric/technical values = approved facts. Visual system follows the adopted
102/126 films (palette, NotoSansJP/Bahnschrift, window, rings, chapter strip)."""
from __future__ import annotations

import os
from functools import lru_cache

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from . import footage as F
from .timeline import frame_out_rel, src_time

W, H = 1920, 1080
WIN_X, WIN_Y, WIN_W, WIN_H = 160, 44, 1600, 900
WIN_CX, WIN_CY = WIN_X + WIN_W / 2, WIN_Y + WIN_H / 2
FONTS = os.environ.get("RYOSHU_FONTS", "C:/Windows/Fonts/")
INK, INK2 = (11, 13, 26), (20, 23, 44)
PAPER, MUTED = (244, 241, 234), (150, 154, 178)
VERMILION, INDIGO, GREEN = (255, 91, 58), (120, 132, 255), (86, 196, 140)


def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def ease(x):
    x = clamp(x)
    return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2


def ease_out(x):
    return 1 - (1 - clamp(x)) ** 3


def prog(t, a, d):
    return clamp((t - a) / d)


@lru_cache(None)
def font(kind, size, w):
    if kind == "jp":
        f = ImageFont.truetype(FONTS + "NotoSansJP-VF.ttf", size)
        f.set_variation_by_axes([w])
    else:
        f = ImageFont.truetype(FONTS + "bahnschrift.ttf", size)
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


def th(key):
    a, d = font(*key).getmetrics()
    return a + d + 4


class Ctx:
    deck = None
    t = 0.0


def put(base, slot, key, fill, xy, alpha=1.0, anchor="l", dy=0.0, text=None, fmt=None):
    """Draw one deck slot (text verbatim; fmt fills only the deck's own {placeholders} with fact values)."""
    s = Ctx.deck[slot] if text is None else text
    if fmt:
        s = s.format(**fmt)
    if alpha <= 0.02:
        return tw(s, key)
    Ctx.deck.mark(slot, s, Ctx.t)
    im = _timg(s, key, fill)
    x, y = xy
    if anchor == "c":
        x -= im.width / 2
    elif anchor == "r":
        x -= im.width
    if alpha < 1:
        im = im.copy()
        im.putalpha(im.getchannel("A").point(lambda v: int(v * alpha)))
    base.alpha_composite(im, (int(x), int(y + dy)))
    return im.width


def fit(slot, kind, w, size, minsize, maxw, fmt=None):
    s = Ctx.deck[slot].format(**fmt) if fmt else Ctx.deck[slot]
    k = size
    while k > minsize and tw(s, (kind, k, w)) > maxw:
        k -= 1
    return (kind, k, w)


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


@lru_cache(None)
def _shadow(w, h, r):
    pad = 60
    s = Image.new("L", (w + 2 * pad, h + 2 * pad), 0)
    ImageDraw.Draw(s).rounded_rectangle((pad, pad + 14, pad + w, pad + h + 14), r, fill=150)
    s = s.filter(ImageFilter.GaussianBlur(26))
    im = Image.new("RGBA", s.size, (0, 0, 0, 0))
    im.putalpha(s)
    return im, pad


@lru_cache(None)
def _mask(w, h, r):
    m = Image.new("L", (w * 3, h * 3), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, w * 3 - 1, h * 3 - 1), r * 3, fill=255)
    return m.resize((w, h), Image.LANCZOS)


def window(base, content, w, h, cx, cy, scale=1.0, alpha=1.0, r=16):
    w2, h2 = int(w * scale), int(h * scale)
    if content.size != (w2, h2):
        content = content.resize((w2, h2), Image.LANCZOS)
    rr = max(6, int(r * scale))
    sh, pad = _shadow(w2, h2, rr)
    x, y = int(cx - w2 / 2), int(cy - h2 / 2)
    m = _mask(w2, h2, rr)
    if alpha < 1:
        m = m.point(lambda v: int(v * alpha))
        sh = sh.copy()
        sh.putalpha(sh.getchannel("A").point(lambda v: int(v * alpha)))
    base.alpha_composite(sh, (x - pad, y - pad))
    c = content.convert("RGBA")
    c.putalpha(m)
    base.alpha_composite(c, (x, y))
    b = Image.new("RGBA", (w2, h2), (0, 0, 0, 0))
    ImageDraw.Draw(b).rounded_rectangle((0, 0, w2 - 1, h2 - 1), rr, outline=(255, 255, 255, int(40 * alpha)), width=2)
    base.alpha_composite(b, (x, y))


# ---------------------------------------------------------------------------------------------- footage
def footage_content(tl, t):
    """Window content at output time t: (image RGBA, shot record, rel, frame index, cam) or None."""
    for k, sh in enumerate(tl["shots"]):
        if sh["out"][0] <= t < sh["out"][1]:
            break
    else:
        return None
    spec, rel = sh["spec"], t - sh["out"][0]
    fi = F.frame_at(sh["chunk"], src_time(spec, rel), sh["a"], sh["b"])
    cam = F.cam_at(spec["cam"], rel)
    img = F.window_pixels(sh["chunk"], fi, cam, WIN_W, WIN_H).convert("RGBA")
    # marks: same transform as the pixels; shown only while their frames are on screen
    ov = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    for m in tl["marks"]:
        if m["shot"] != k or not (m["out"][0] <= t < m["out"][1]):
            continue
        f0, f1 = m["frames"]
        if fi < f0 or (f1 is not None and fi > f1):
            continue
        p = ease_out((t - m["out"][0]) / 0.4)
        fade = clamp((m["out"][1] - t) / 0.2)
        x0, y0, x1, y1 = F.src_rect_to_win(m["rect"], cam, WIN_W, WIN_H)
        g = (1 - p) * 16
        d.rounded_rectangle((x0 - 7 - g, y0 - 7 - g, x1 + 7 + g, y1 + 7 + g), 10, fill=VERMILION + (int(24 * p * fade),),
                            outline=VERMILION + (int(255 * p * fade),), width=4)
    img.alpha_composite(ov)
    # No dissolves: shots are separate change-driven captures whose layouts differ; blending two of them would show a
    # double image that never existed on screen. Every shot change is a hard cut.
    return img, sh, rel, fi, cam


def draw_footage(base, tl, t, scene):
    r = footage_content(tl, t)
    if r is None:
        return
    img, sh, rel, fi, cam = r
    s0, s1 = scene["out"]
    scale, alpha = 1.0, 1.0
    p = ease_out(prog(t, s0, 0.5))
    if t - s0 < 0.5:
        scale, alpha = 0.94 + 0.06 * p, p
    q = ease(prog(t, s1 - 0.35, 0.35))
    if q > 0:
        scale, alpha = scale * (1 - 0.03 * q), alpha * (1 - q)
    window(base, img, WIN_W, WIN_H, WIN_CX, WIN_CY, scale, alpha)
    if sh["badge_speed"]:
        draw_speed_badge(base, t, sh)
    if sh["time_skip"] and rel < 1.1:
        draw_time_skip(base, rel)


def draw_speed_badge(base, t, sh):
    p = ease_out(prog(t, sh["out"][0], 0.3)) * clamp((sh["out"][1] - t) / 0.15)
    x = sh["badge_speed"]
    xs = str(int(x)) if float(x).is_integer() else f"{x:g}"
    key = ("jp", 34, 800)
    s = Ctx.deck["speed.badge"].format(x=xs)
    bw, bh = tw(s, key) + 56, 64
    x0, y0 = WIN_X + 28, WIN_Y + WIN_H - bh - 28
    lay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    d.rounded_rectangle((x0, y0, x0 + bw, y0 + bh), 32, fill=INK + (int(235 * p),))
    k = (t * 6) % 1
    for i in range(5):
        xx = x0 + bw - 34 - i * 10
        d.rectangle((xx, y0 - 14, xx + 5, y0 - 10), fill=VERMILION + (int(255 * p * (0.25 + 0.75 * ((i / 5 + k) % 1))),))
    base.alpha_composite(lay)
    put(base, "speed.badge", key, VERMILION, (x0 + 28, y0 + 8), p, fmt={"x": xs})


def draw_time_skip(base, rel):
    """Hard cut marker over the A5 frame: the ~131 s between A4 and A5 were not recorded."""
    p = ease_out(prog(rel, 0.0, 0.15)) * clamp((1.1 - rel) / 0.3)
    key = ("jp", 40, 800)
    w = tw(Ctx.deck["time.skip"], key) + 80
    lay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    d.rectangle((WIN_X, WIN_Y, WIN_X + WIN_W, WIN_Y + WIN_H), fill=INK + (int(150 * p),))
    d.rounded_rectangle((WIN_CX - w / 2, WIN_CY - 46, WIN_CX + w / 2, WIN_CY + 46), 46, fill=INK + (int(240 * p),),
                        outline=PAPER + (int(120 * p),), width=2)
    base.alpha_composite(lay)
    put(base, "time.skip", key, PAPER, (WIN_CX, WIN_CY - th(key) / 2), p, anchor="c")


def draw_strip(base, tl, t, scene):
    y = WIN_Y + WIN_H + 34
    cap_x = WIN_X + 330
    if scene.get("chapter"):
        num, lab = scene["chapter"]
        a, b = scene["out"]
        p = ease_out(prog(t, a, 0.45))
        al = p * clamp((b - t) / 0.25)
        w = put(base, num, ("lat", 40, "Bold"), VERMILION, (WIN_X, y - 4), al, dy=(1 - p) * 14)
        w2 = put(base, lab, ("jp", 24, 500), MUTED, (WIN_X + w + 14, y + 6), al, dy=(1 - p) * 14)
        cap_x = max(cap_x, WIN_X + w + 14 + w2 + 40)
    for c in tl["captions"]:
        if c["start"] <= t < c["end"]:
            p = ease_out(prog(t, c["start"], 0.35))
            o = clamp((c["end"] - t) / 0.2)
            key = fit(c["slot"], "jp", 700, 38, 28, WIN_X + WIN_W - cap_x)
            put(base, c["slot"], key, PAPER, (cap_x, y - 2 + (38 - key[1]) * 0.6), p * o, dy=(1 - p) * 16)


def draw_honesty(base, t, a, b):
    if a <= t < b:
        al = min(prog(t, a, 0.5), clamp((b - t) / 0.3))
        put(base, "honesty.footage", ("jp", 17, 500), MUTED, (WIN_X + WIN_W, 12), al * 0.9, anchor="r")
