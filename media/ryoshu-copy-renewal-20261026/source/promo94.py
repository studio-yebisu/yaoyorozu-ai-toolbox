"""94-second promo: timeline and frame drawing (re-edit of the previous promo).

Section boundaries are unchanged from the previous edit (120 BPM, one bar =
2.0 s) so the score lines up with the cuts. Source rectangles are in the
1920x1080 coordinates of input/new-real-ui.mp4. A camera keyframe is
(t_rel, cx, cy, crop_width).
"""
from PIL import Image, ImageDraw

import copydeck
from common import (FPS, INK, MUTED, PAPER, VERMILION, Clock, Footage, background, chevron, compose_window,
                    ease, ease_out, fit_size, paste_block, paste_text, prog, still, text_h, text_w)

K = copydeck.PROMO
W, H = 1920, 1080
DURATION = 94.0
BPM = 120
WIN_X, WIN_Y, WIN_W, WIN_H = 160, 44, 1600, 900
WIN_CX, WIN_CY = WIN_X + WIN_W / 2, WIN_Y + WIN_H / 2
FULL = (960, 540, 1920)
PAGE = (952, 540, 1640)  # app column without the empty margins

SHOTS = [
    # LOCAL: the header indicator of the real UI
    dict(start=4.0, end=8.0, src=2.0, speed=1.0,
         cam=[(0.0, *FULL), (1.3, *FULL), (2.6, 1540, 190, 760), (4.0, 1560, 180, 700)],
         marks=[(2.4, 4.0, (1732, 14, 1902, 42))]),
    # 01 load
    dict(start=12.0, end=16.0, src=11.5, speed=1.0,
         cam=[(0.0, 960, 420, 1300), (4.0, 960, 440, 1160)],
         marks=[(3.3, 4.0, (500, 464, 972, 492))]),
    dict(start=16.0, end=18.0, src=15.5, speed=1.0,
         cam=[(0.0, 1000, 470, 1160), (2.0, 1060, 520, 1060)],
         marks=[(0.1, 1.5, (1120, 560, 1330, 606))]),
    dict(start=18.0, end=26.0, src=18.0, speed=17.5, fast=True,
         cam=[(0.0, 952, 520, 1500), (1.5, 952, 460, 1200), (8.0, 952, 470, 1120)],
         marks=[(1.6, 8.0, (1340, 206, 1416, 266))]),
    # 02 compare
    dict(start=26.0, end=30.0, src=159.6, speed=1.0,
         cam=[(0.0, *PAGE), (1.2, 952, 470, 1500), (4.0, 952, 480, 1440)],
         marks=[(1.3, 4.0, (322, 252, 444, 280)), (1.3, 4.0, (466, 252, 574, 280)),
                (1.3, 4.0, (1376, 252, 1452, 280))]),
    dict(start=30.0, end=40.0, src=165.8, speed=1.0,
         cam=[(0.0, 952, 480, 1440), (3.6, 952, 540, 1500), (6.0, 940, 600, 1000), (10.0, 930, 640, 880)],
         marks=[(4.6, 7.0, (642, 452, 1240, 522)), (7.0, 10.0, (490, 722, 975, 782))]),
    # 03 fix
    dict(start=40.0, end=44.0, src=219.6, speed=1.0,
         cam=[(0.0, 952, 560, 1100), (4.0, 1000, 580, 880)],
         marks=[(2.3, 4.0, (960, 551, 1157, 593))]),
    dict(start=44.0, end=50.0, src=238.0, speed=1.0,
         cam=[(0.0, 1000, 580, 880), (6.0, 1000, 590, 840)],
         marks=[(2.6, 5.2, (1161, 573, 1207, 619))]),
    dict(start=50.0, end=54.0, src=244.0, speed=1.0,
         cam=[(0.0, 1000, 630, 1640), (4.0, 1040, 630, 1600)],
         marks=[(0.4, 4.0, (1384, 305, 1576, 377)), (0.6, 4.0, (808, 1012, 1098, 1056))]),
    # 04 export
    dict(start=54.0, end=61.0, src=293.0, speed=3.5,
         cam=[(0.0, 952, 420, 1500), (7.0, 952, 330, 1340)],
         marks=[(6.3, 7.0, (384, 180, 450, 472))]),
    dict(start=61.0, end=74.0, src=332.5, speed=2.0,
         cam=[(0.0, 952, 470, 1560), (13.0, 900, 420, 1400)],
         marks=[(3.0, 13.0, (334, 272, 732, 314))]),
]

CHAPTERS = [  # (start, end, number slot, label slot)
    (4.0, 8.0, "chapter.local.number", "chapter.local.label"),
    (12.0, 26.0, "chapter.01.number", "chapter.01.label"),
    (26.0, 40.0, "chapter.02.number", "chapter.02.label"),
    (40.0, 54.0, "chapter.03.number", "chapter.03.label"),
    (54.0, 74.0, "chapter.04.number", "chapter.04.label"),
]
CAPTIONS = [
    (4.2, 8.0, "caption.local"),
    (12.2, 18.0, "caption.01.select"),
    (18.0, 26.0, "caption.01.process"),
    (26.2, 30.0, "caption.02.results"),
    (30.0, 40.0, "caption.02.zoom"),
    (40.2, 50.0, "caption.03.account"),
    (50.0, 54.0, "caption.03.star"),
    (54.2, 61.0, "caption.04.review"),
    (61.0, 74.0, "caption.04.formats"),
]
FAST_BADGE = (18.2, 26.0, "fast_badge.big", "fast_badge.small")

# --- sound design cues (output seconds) --------------------------------------
WHOOSH = [3.6, 7.7, 11.6, 25.7, 39.6, 53.7, 73.6, 79.7, 85.7]
IMPACT = [4.0, 8.0, 12.0, 26.0, 40.0, 54.0, 74.0, 86.0]
TYPE_TICKS = [0.4, 1.2, 2.0, 2.9, 8.5, 8.8, 9.1, 74.6, 75.4, 76.2, 77.0, 80.4, 81.6, 82.8]
STAMPS = [8.0, 86.0]
# visible UI changes measured in the new recording (source seconds)
SOURCE_EVENTS = [14.63, 16.90, 158.07, 169.27, 200.70, 222.10, 240.83, 243.23, 256.57, 271.23,
                 311.93, 314.67, 332.63, 338.27, 349.77, 353.27, 355.67]


def ui_clicks():
    out = []
    for s in SHOTS:
        if s.get("fast"):
            continue
        for e in SOURCE_EVENTS:
            t = s["start"] + (e - s["src"]) / s["speed"]
            if s["start"] + 0.05 <= t < s["end"] - 0.05:
                out.append(round(t, 3))
    deduped = []
    for t in sorted(out):
        if not deduped or t - deduped[-1] > 0.4:
            deduped.append(t)
    return deduped


# --- overlays ----------------------------------------------------------------
def draw_caption_strip(base, t):
    y = WIN_Y + WIN_H + 34
    cap_x = WIN_X + 320
    for a, b, num, label in CHAPTERS:
        if a <= t < b:
            p = ease_out(prog(t, a, 0.45))
            al = p * min(1, (b - t) / 0.25)
            w = paste_text(base, K[num], ("lat", 40, "Bold"), VERMILION, (WIN_X, y - 4), al, dy=(1 - p) * 14)
            w2 = paste_text(base, K[label], ("jp", 24, 500), MUTED, (WIN_X + w + 14, y + 6), al, dy=(1 - p) * 14)
            cap_x = max(cap_x, WIN_X + w + 14 + w2 + 40)
    for a, b, slot in CAPTIONS:
        if a <= t < b:
            p = ease_out(prog(t, a, 0.4))
            o = min(1, (b - t) / 0.22)
            key = fit_size(K[slot], "jp", 700, 38, 28, WIN_X + WIN_W - cap_x)
            yy = y - 2 + (38 - key[1]) * 0.6
            paste_text(base, K[slot], key, PAPER, (cap_x, yy), p * o, dy=(1 - p) * 16)
    if 4.0 <= t < 74.0:  # honesty label while footage is shown
        al = min(prog(t, 4.0, 0.5), (74.0 - t) / 0.3)
        paste_text(base, K["honesty.footage"], ("jp", 17, 500), MUTED, (WIN_X + WIN_W, 12), al * 0.9, anchor="r")


def draw_fast_badge(base, t):
    a, b, big, small = FAST_BADGE
    if not (a <= t < b):
        return
    p = ease_out(prog(t, a, 0.4)) * min(1, (b - t) / 0.25)
    kb, ks = ("jp", 34, 800), ("jp", 22, 600)
    bw = 28 + text_w(K[big], kb) + 18 + text_w(K[small], ks) + 30
    bh = 64
    x0, y0 = WIN_X + 28, WIN_Y + WIN_H - bh - 28
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle((x0, y0, x0 + bw, y0 + bh), 32, fill=INK + (int(235 * p),))
    k = (t * 6) % 1
    for i in range(5):  # moving ticks: time passing
        xx = x0 + bw - 34 - i * 10
        d.rectangle((xx, y0 - 14, xx + 5, y0 - 10),
                    fill=VERMILION + (int(255 * p * (0.25 + 0.75 * ((i / 5 + k) % 1))),))
    base.alpha_composite(layer)
    w = paste_text(base, K[big], kb, VERMILION, (x0 + 28, y0 + 8), p)
    paste_text(base, K[small], ks, PAPER, (x0 + 28 + w + 18, y0 + 17), p)


def draw_intro(base, t):
    out = 1 - ease(prog(t, 3.65, 0.35))
    x = 300
    lines = [(0.4, "intro.line1", 72, 500, 290),
             (1.2, "intro.line2", 72, 500, 390),
             (2.0, "intro.line3", 150, 900, 500)]
    for a, slot, size, w, y in lines:
        p = ease_out(prog(t, a, 0.45))
        if p > 0:
            paste_text(base, K[slot], ("jp", size, w), PAPER, (x, y), p * out, dy=(1 - p) * 30)
    p = ease_out(prog(t, 2.25, 0.5))
    if p > 0:
        ImageDraw.Draw(base).rectangle((x + 4, 712, x + 4 + int(720 * p), 722), fill=VERMILION + (int(255 * out),))
    p = ease_out(prog(t, 2.9, 0.4))
    paste_text(base, K["intro.tagline"], ("jp", 40, 700), VERMILION, (x, 760), p * out, dy=(1 - p) * 14)


_TITLE = {}


def draw_title(base, t):
    if "still" not in _TITLE:
        _TITLE["still"] = still(3.0).transform((WIN_W, WIN_H), Image.EXTENT, (0, 0, 1920, 1080), Image.BICUBIC)
    pin = ease(prog(t, 8.0, 0.6))
    pout = ease(prog(t, 11.45, 0.55))
    k = pin * (1 - pout)
    scale = 1 - 0.46 * k
    cx = WIN_CX + (1330 - WIN_CX) * k
    cy = WIN_CY + (540 - WIN_CY) * k
    compose_window(base, _TITLE["still"], WIN_W, WIN_H, cx, cy, scale)
    a = k
    x = 130
    paste_text(base, K["title.product"], ("lat", 168, "Bold"), PAPER, (x - 6, 270), a, dy=(1 - pin) * 20)
    paste_text(base, K["title.line1"], ("jp", 52, 800), PAPER, (x, 490), a, dy=(1 - pin) * 26)
    paste_text(base, K["title.line2"], ("jp", 52, 800), PAPER, (x, 562), a, dy=(1 - pin) * 32)
    xx = x
    for i, s in enumerate(["title.step1", "title.step2", "title.step3"]):
        pi = ease_out(prog(t, 8.5 + i * 0.3, 0.4)) * (1 - pout)
        w = paste_text(base, K[s], ("jp", 26, 600), PAPER, (xx, 690), pi)
        xx += w + 16
        if i < 2:
            if pi > 0.02:
                chevron(base, xx, 690 + 22, 16, pi)
            xx += 26
    p = ease_out(prog(t, 9.4, 0.5)) * (1 - pout)
    paste_block(base, K["title.tagline"], ("jp", 26, 700), VERMILION, (x, 750), 700, p)


def draw_formats(base, t):
    p_in = ease_out(prog(t, 74.0, 0.5))
    out = 1 - ease(prog(t, 79.6, 0.4))
    paste_text(base, K["formats.heading"], ("jp", 64, 800), PAPER, (960, 330), p_in * out,
               anchor="c", dy=(1 - p_in) * 20)
    names = ["formats.card.generic", "formats.card.freee", "formats.card.mf", "formats.card.yayoi"]
    w, gap = 300, 28
    x = 960 - (w * 4 + gap * 3) / 2
    for i, n in enumerate(names):
        p = ease_out(prog(t, 74.6 + i * 0.8, 0.45)) * out
        y = 480 + (1 - p) * 24
        layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
        ImageDraw.Draw(layer).rounded_rectangle((x, y, x + w, y + 110), 18, fill=(255, 255, 255, int(16 * p)),
                                                outline=(255, 255, 255, int(110 * p)), width=2)
        base.alpha_composite(layer)
        key = ("jp", 38, 800)
        paste_text(base, K[n], key, PAPER, (x + w / 2, y + 55 - text_h(key) / 2), p, anchor="c")
        x += w + gap
    p = ease_out(prog(t, 77.6, 0.5)) * out
    paste_text(base, K["formats.note"], ("jp", 26, 500), MUTED, (960, 660), p, anchor="c")


NOTES = [(80.4, "notes.01"), (81.6, "notes.02"), (82.8, "notes.03")]


def draw_notes(base, t):
    out = 1 - ease(prog(t, 85.55, 0.4))
    p0 = ease_out(prog(t, 80.0, 0.4))
    paste_text(base, K["notes.heading"], ("jp", 30, 700), MUTED, (300, 230), p0 * out)
    for i, (a, n) in enumerate(NOTES):
        p = ease_out(prog(t, a, 0.45)) * out
        y = 310 + i * 180
        paste_text(base, K[n + ".number"], ("lat", 52, "Bold"), VERMILION, (300, y - 4), p, dy=(1 - p) * 18)
        paste_text(base, K[n + ".heading"], ("jp", 46, 800), PAPER, (400, y), p, dy=(1 - p) * 18)
        paste_block(base, K[n + ".body"], ("jp", 26, 500), MUTED, (402, y + 72), 1260, p, dy=(1 - p) * 18)


def draw_end(base, t):
    p = ease_out(prog(t, 86.0, 0.7))
    fade = 1 - prog(t, 92.6, 1.2)
    paste_text(base, K["end.product"], ("lat", 190, "Bold"), PAPER, (960, 300), p * fade, anchor="c", dy=(1 - p) * 20)
    paste_text(base, K["end.tagline"], ("jp", 44, 800), PAPER, (960, 540),
               ease_out(prog(t, 86.4, 0.6)) * fade, anchor="c")
    pu = ease_out(prog(t, 87.2, 0.6)) * fade
    paste_text(base, K["end.url"], ("lat", 40, "SemiBold"), VERMILION, (960, 650), pu, anchor="c")
    if pu > 0:
        ImageDraw.Draw(base).rectangle((960 - 60, 630, 960 + 60, 633), fill=VERMILION + (int(255 * pu),))
    paste_text(base, K["end.note"], ("jp", 20, 500), MUTED, (960, 960),
               ease_out(prog(t, 87.8, 0.6)) * fade, anchor="c")


class Renderer:
    W, H, FPS = W, H, FPS
    DURATION = DURATION

    def __init__(self):
        self.footage = Footage(SHOTS)

    def frame(self, t):
        Clock.t = t
        base = background(W, H).copy()
        if t < 4.0:
            draw_intro(base, t)
        elif 8.0 <= t < 12.0:
            draw_title(base, t)
        elif t < 74.0:
            i, shot = self.footage.shot_at(t)
            img = self.footage.content(i, t, (WIN_W, WIN_H))
            rel = t - shot["start"]
            scale, alpha = 1.0, 1.0
            if i == 0:
                p = ease_out(prog(rel, 0, 0.6))
                scale, alpha = 0.9 + 0.1 * p, p
            if any(abs(shot["start"] - c[0]) < 1e-6 for c in CHAPTERS) and i > 0 and rel < 0.45:
                scale = 1.025 - 0.025 * ease_out(rel / 0.45)
            if t >= 73.6:
                alpha = 1 - ease(prog(t, 73.6, 0.4))
                scale = 1 - 0.04 * ease(prog(t, 73.6, 0.4))
            compose_window(base, img, WIN_W, WIN_H, WIN_CX, WIN_CY, scale, alpha)
            draw_fast_badge(base, t)
            draw_caption_strip(base, t)
        elif t < 80.0:
            draw_formats(base, t)
        elif t < 86.0:
            draw_notes(base, t)
        else:
            draw_end(base, t)
        return base.convert("RGB")

    def close(self):
        self.footage.close()
