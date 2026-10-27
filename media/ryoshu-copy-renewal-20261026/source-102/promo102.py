"""102-second promo (revision of the 94 s promo): timeline and frame drawing.

0-4 s opener is the 94 s opener unchanged. 4-12 s is a graphic process
overview built from genuine raw-footage crops. Footage sections follow
architecture/edit-plan.json, refined against the distinct sampled frames of
the recording (see edit-manifest.json). 120 BPM, one bar = 2.0 s.

Source rectangles are in the 1920x1080 coordinates of input/new-real-ui.mp4.
A camera keyframe is (t_rel, cx, cy, crop_width). The recording is a ~10 Hz
JPEG sample stream with held gaps; shots never interpolate, a slowed shot only
holds the same sample longer.
"""
from PIL import Image, ImageDraw

from copydeck import K
from common import (FPS, INDIGO, MUTED, PAPER, VERMILION, Clock, Footage, background, chevron, compose_window,
                    ease, ease_out, fit_size, paste_block, paste_text, prog, still, text_h, text_w, INK)

W, H = 1920, 1080
DURATION = 102.0
BPM = 120
WIN_X, WIN_Y, WIN_W, WIN_H = 160, 44, 1600, 900
WIN_CX, WIN_CY = WIN_X + WIN_W / 2, WIN_Y + WIN_H / 2
FULL = (960, 540, 1920)
PAGE = (952, 540, 1640)  # app column without the empty margins

# caption.04.review (v2 deck) describes matching against originals and saving; it is shown
# over the held '5件を原本と照合' sample (311.933), and the saved result is the 314.667
# 確認済み sample. No tick is described or drawn (no sampled frame shows one).
SHOW_CAPTION_04_REVIEW = True

# --- genuine footage ---------------------------------------------------------
STAR = (1162, 575, 1205, 617)          # star button in the account dialog (raw 240.833)
FAV_CHIP = (700, 494, 806, 532)        # よく使う科目 chip (raw 240.833)
STAR_TOAST = (813, 1011, 1092, 1055)   # toast after the star (raw 240.833)
ROW1_ACCOUNT = (1384, 305, 1576, 377)  # row 1 account button after save (raw 243.233)
SAVE_TOAST = (808, 1012, 1098, 1056)   # toast after account save (raw 243.233)
CSV_SELECT_FREEE = (310, 185, 680, 222)
CSV_SELECT = (310, 254, 740, 318)      # 取り込み先 select at 338.267-355.667
CSV_TOAST = (650, 1011, 1268, 1056)
CSV_LAST_MADE = (345, 436, 640, 458)   # 前回CSV作成の日時 line appearing at 355.667

SHOTS = [
    # LOCAL: the header indicator of the real UI
    dict(start=12.0, end=16.0, src=2.0, speed=1.0,
         cam=[(0.0, *FULL), (1.3, *FULL), (2.6, 1540, 190, 760), (4.0, 1560, 180, 700)],
         marks=[(2.4, 4.0, (1732, 14, 1902, 42))]),
    # 01 load
    dict(start=20.0, end=24.0, src=11.5, speed=1.0,
         cam=[(0.0, 960, 420, 1300), (4.0, 960, 440, 1160)],
         marks=[(3.3, 4.0, (500, 464, 972, 492))]),
    dict(start=24.0, end=26.0, src=15.5, speed=1.0,
         cam=[(0.0, 1000, 470, 1160), (2.0, 1060, 520, 1060)],
         marks=[(0.1, 1.5, (1120, 560, 1330, 606))]),
    dict(start=26.0, end=34.0, src=18.0, speed=17.5, fast=True,
         cam=[(0.0, 952, 520, 1500), (1.5, 952, 460, 1200), (8.0, 952, 470, 1120)],
         marks=[(1.6, 8.0, (1340, 206, 1416, 266))]),
    # 02 compare
    dict(start=34.0, end=38.0, src=159.6, speed=1.0,
         cam=[(0.0, *PAGE), (1.2, 952, 470, 1500), (4.0, 952, 480, 1440)],
         marks=[(1.3, 4.0, (322, 252, 444, 280)), (1.3, 4.0, (466, 252, 574, 280)),
                (1.3, 4.0, (1376, 252, 1452, 280))]),
    dict(start=38.0, end=48.0, src=165.8, speed=1.0,
         cam=[(0.0, 952, 480, 1440), (3.6, 952, 540, 1500), (6.0, 940, 600, 1000), (10.0, 930, 640, 880)],
         marks=[(4.6, 7.0, (642, 452, 1240, 522)), (7.0, 10.0, (490, 722, 975, 782))]),
    # 03 fix: account change (sample 222.100 -> out 50.50)
    dict(start=48.0, end=51.6, src=219.6, speed=1.0,
         cam=[(0.0, 952, 560, 1100), (3.6, 1000, 590, 960)],
         marks=[(2.5, 3.6, (960, 551, 1157, 593))]),
    # 03 star: held 222.100 sample (empty star) then star sample 240.833 -> out 52.43;
    # ends at raw 243.2, before the save sample 243.233
    dict(start=51.6, end=54.8, src=240.0, speed=1.0,
         cam=[(0.0, 1000, 590, 960), (0.75, 955, 672, 1400), (3.2, 955, 672, 1400)],
         marks=[(0.85, 3.2, STAR), (0.95, 3.2, FAV_CHIP), (1.05, 3.2, STAR_TOAST)]),
    # 03 save: sample 243.233 -> out 54.83
    dict(start=54.8, end=58.0, src=243.2, speed=1.0,
         cam=[(0.0, 955, 672, 1400), (0.15, 955, 672, 1400), (0.9, 1000, 630, 1640), (3.2, 1040, 630, 1600)],
         marks=[(0.5, 3.2, ROW1_ACCOUNT), (0.6, 3.2, SAVE_TOAST)]),
    # 04 confirm: bulk panel (single held sample 292.633)
    dict(start=58.0, end=61.0, src=293.0, speed=1.0,
         cam=[(0.0, 945, 560, 1500), (3.0, 945, 565, 1400)],
         marks=[(0.3, 3.0, (298, 170, 336, 456)), (0.8, 3.0, (320, 543, 600, 570))]),
    # 04 matching modal (single held sample 311.933, ends just before 314.667)
    dict(start=61.0, end=65.0, src=312.0, speed=0.65,
         cam=[(0.0, 952, 545, 1300), (4.0, 952, 545, 1240)],
         marks=[(0.3, 4.0, (547, 195, 660, 213)), (1.0, 4.0, (547, 311, 650, 770))]),
    # 04 confirmed (sample 314.667 -> out 65.07)
    dict(start=65.0, end=68.0, src=314.6, speed=1.0,
         cam=[(0.0, 945, 565, 1400), (3.0, 945, 420, 1240)],
         marks=[(0.3, 3.0, (350, 176, 442, 456))]),
    # 05 export: freee select 332.633 -> 68.09, freee save evidence 336.133 -> 70.42
    dict(start=68.0, end=71.6, src=332.5, speed=1.5,
         cam=[(0.0, 955, 560, 1440), (2.35, 955, 560, 1440), (2.9, 955, 650, 1480), (3.6, 955, 650, 1480)],
         marks=[(0.15, 2.4, CSV_SELECT_FREEE), (1.0, 2.4, (1412, 924, 1571, 965)),
                (2.5, 3.6, (1413, 579, 1570, 620)), (2.5, 3.6, CSV_TOAST)]),
    # MFクラウド select 338.267 -> 71.67
    dict(start=71.6, end=74.6, src=338.0, speed=3.9,
         cam=[(0.0, 955, 650, 1480), (3.0, 955, 650, 1480)],
         marks=[(0.1, 3.0, CSV_SELECT)]),
    # 弥生 select 349.767 -> 74.66
    dict(start=74.6, end=77.6, src=349.7, speed=1.1667,
         cam=[(0.0, 955, 650, 1480), (3.0, 955, 650, 1480)],
         marks=[(0.1, 3.0, CSV_SELECT)]),
    # 汎用CSV select 353.267 -> 77.65, save evidence 355.667 -> 79.41
    dict(start=77.6, end=82.0, src=353.2, speed=1.3636,
         cam=[(0.0, 955, 650, 1480), (4.4, 955, 650, 1480)],
         marks=[(0.1, 1.8, CSV_SELECT), (0.9, 4.4, (1413, 565, 1570, 606)),
                (1.85, 4.4, CSV_LAST_MADE), (1.85, 4.4, CSV_TOAST)]),
]

CHAPTERS = [  # (start, end, number slot, label slot)
    (12.0, 16.0, "chapter.local.number", "chapter.local.label"),
    (20.0, 34.0, "chapter.01.number", "chapter.01.label"),
    (34.0, 48.0, "chapter.02.number", "chapter.02.label"),
    (48.0, 58.0, "chapter.03.number", "chapter.03.label"),
    (58.0, 68.0, "chapter.04.number", "chapter.04.label"),
    (68.0, 82.0, "chapter.05.number", "chapter.05.label"),
]
CAPTIONS = [
    (12.2, 16.0, "caption.local"),
    (20.2, 26.0, "caption.01.select"),
    (26.0, 34.0, "caption.01.process"),
    (34.2, 38.0, "caption.02.results"),
    (38.0, 48.0, "caption.02.zoom"),
    (48.2, 51.6, "caption.03.account"),
    (52.35, 54.8, "caption.03.star_add"),
    (54.9, 58.0, "caption.03.saved"),
    (58.2, 65.0, "caption.04.select"),
    (65.15, 68.0, "caption.04.confirmed"),
    (68.2, 82.0, "caption.04.formats"),
]
if SHOW_CAPTION_04_REVIEW:
    CAPTIONS[8] = (58.2, 61.0, "caption.04.select")
    CAPTIONS.insert(9, (61.2, 65.0, "caption.04.review"))
FAST_BADGE = (26.2, 34.0, "fast_badge.big", "fast_badge.small")
FOOTAGE = (12.0, 82.0)
HONESTY = (4.2, 82.0)  # overview thumbnails are genuine recording crops too

# --- sound design cues (output seconds) --------------------------------------
WHOOSH = [3.6, 11.6, 15.7, 19.6, 33.7, 47.7, 57.7, 67.7, 81.6, 87.7, 93.7]
IMPACT = [4.0, 12.0, 16.0, 20.0, 34.0, 48.0, 58.0, 68.0, 82.0, 94.0]
TYPE_TICKS = [0.4, 1.2, 2.0, 2.9, 4.2, 4.4, 5.6, 6.8, 8.0, 16.5, 16.8, 82.6, 83.4, 84.2, 85.0,
              88.4, 89.6, 90.8]
STAMPS = [16.0, 94.0]
# distinct sampled UI changes in the recording (source seconds, measured by frame diff)
SOURCE_EVENTS = [14.63, 16.90, 158.07, 169.27, 200.70, 222.10, 240.83, 243.23, 311.93, 314.67,
                 332.63, 336.13, 338.27, 349.77, 353.27, 355.67]


def src_to_out(e):
    for s in SHOTS:
        t = s["start"] + (e - s["src"]) / s["speed"]
        if s["start"] <= t < s["end"]:
            return t
    return None


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


def draw_honesty(base, t):
    a, b = HONESTY
    if a <= t < b:
        al = min(prog(t, a, 0.5), (b - t) / 0.3)
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
    """Unchanged from the 94 s promo."""
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


# --- process overview (graphic; thumbnails are genuine raw crops) -------------
OV_START, OV_END = 4.0, 12.0
NODE_W, NODE_H, NODE_GAP = 384, 216, 64
NODE_X0 = (W - (4 * NODE_W + 3 * NODE_GAP)) // 2
NODE_Y = 366
NODES = [  # (appear, raw sample second, raw rect, label slot, sub slot, role)
    (4.4, 18.0, (460, 360, 1420, 900), "overview.stage1.label", "overview.stage1.sub", "ai"),
    (5.6, 19.233, (460, 200, 1420, 740), "overview.stage2.label", "overview.stage2.sub", "ai"),
    (6.8, 311.933, (522, 170, 1382, 654), "overview.stage3.label", "overview.stage3.sub", "human"),
    (8.0, 355.667, (300, 240, 1600, 971), "overview.stage4.label", "overview.stage4.sub", "csv"),
]
_OV = {}


def _thumbs():
    if "t" not in _OV:
        _OV["t"] = [still(s + 0.02).crop(r).resize((NODE_W, NODE_H), Image.LANCZOS) for _, s, r, *_ in NODES]
    return _OV["t"]


def _person(d, cx, cy, s, col):
    """Simple person glyph drawn as shapes (marks the human step; no text)."""
    d.ellipse((cx - s * 0.32, cy - s * 0.95, cx + s * 0.32, cy - s * 0.31), fill=col)
    d.pieslice((cx - s * 0.62, cy - s * 0.2, cx + s * 0.62, cy + s * 1.0), 180, 360, fill=col)


def draw_overview(base, t):
    out = 1 - ease(prog(t, OV_END - 0.4, 0.4))
    push = 1 + 0.025 * ease(prog(t, 9.0, 2.6))
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    thumbs = _thumbs()
    xs = [NODE_X0 + i * (NODE_W + NODE_GAP) for i in range(4)]

    def sx(x):
        return W / 2 + (x - W / 2) * push

    def sy(y):
        return H / 2 + (y - H / 2) * push

    # all-local bracket spanning every stage: processing, human check and CSV all on the local PC
    pb = ease_out(prog(t, 4.15, 0.7)) * out
    if pb > 0:
        x0, x1 = sx(xs[0] - 22), sx(xs[3] + NODE_W + 22)
        xm = (x0 + x1) / 2
        half = (x1 - x0) / 2 * pb
        y = sy(NODE_Y - 54)
        col = PAPER + (int(150 * pb),)
        d.line((xm - half, y, xm + half, y), fill=col, width=3)
        if pb > 0.95:
            d.line((x0, y, x0, y + 22), fill=col, width=3)
            d.line((x1, y, x1, y + 22), fill=col, width=3)
        # outer rounded frame enclosing all four stages
        fy0, fy1 = sy(NODE_Y - 30), sy(NODE_Y + NODE_H + 196)
        d.rounded_rectangle((x0, fy0, x1, fy1), 26, outline=(255, 255, 255, int(46 * pb)), width=2,
                            fill=(255, 255, 255, int(8 * pb)))
    # AI stages 1-2: shared indigo rail under the two nodes
    pa = ease_out(prog(t, 6.0, 0.6)) * out
    if pa > 0:
        y = sy(NODE_Y + NODE_H + 150)
        xa0, xa1 = sx(xs[0]), sx(xs[1] + NODE_W)
        d.rounded_rectangle((xa0, y, xa0 + (xa1 - xa0) * pa, y + 6), 3, fill=INDIGO + (int(230 * pa),))
    # human stage 3: vermilion rail under node 3
    ph = ease_out(prog(t, 7.2, 0.6)) * out
    if ph > 0:
        y = sy(NODE_Y + NODE_H + 150)
        xh0, xh1 = sx(xs[2]), sx(xs[2] + NODE_W)
        d.rounded_rectangle((xh0, y, xh0 + (xh1 - xh0) * ph, y + 6), 3, fill=VERMILION + (int(240 * ph),))
    base.alpha_composite(layer)

    for i, (a, _, _, lab, sub, role) in enumerate(NODES):
        p = ease_out(prog(t, a, 0.5)) * out
        if p <= 0.02:
            continue
        x, y = xs[i], NODE_Y + (1 - p) * 26
        tw, th = int(NODE_W * push), int(NODE_H * push)
        accent = INDIGO if role == "ai" else (VERMILION if role == "human" else PAPER)
        cx, cy = sx(x + NODE_W / 2), sy(y + NODE_H / 2)
        ring = Image.new("RGBA", base.size, (0, 0, 0, 0))
        ImageDraw.Draw(ring).rounded_rectangle((cx - tw / 2 - 5, cy - th / 2 - 5, cx + tw / 2 + 5, cy + th / 2 + 5),
                                               16, outline=accent + (int(230 * p),), width=3)
        compose_window(base, thumbs[i], tw, th, cx, cy, 1.0, p, radius=12)
        base.alpha_composite(ring)
        if role == "human":
            gl = Image.new("RGBA", base.size, (0, 0, 0, 0))
            gd = ImageDraw.Draw(gl)
            bx, by = cx + tw / 2 - 26, cy - th / 2 - 4
            gd.ellipse((bx - 24, by - 24, bx + 24, by + 24), fill=VERMILION + (int(255 * p),))
            _person(gd, bx, by + 4, 17, PAPER + (int(255 * p),))
            base.alpha_composite(gl)
        ly = sy(NODE_Y + NODE_H + 30) + (1 - p) * 18
        paste_text(base, K[lab], ("jp", 34, 800), PAPER, (cx, ly), p, anchor="c")
        paste_text(base, K[sub], ("jp", 22, 500), MUTED, (cx, ly + 58), p, anchor="c")
        if i < 3:
            pc = ease_out(prog(t, NODES[i + 1][0] - 0.15, 0.35)) * out
            if pc > 0.02:
                chevron(base, sx(x + NODE_W + NODE_GAP / 2 - 6), cy, 22 * push, pc)
    # bracket label (prior deck slot, verbatim)
    pl = ease_out(prog(t, 4.3, 0.5)) * out
    lk = ("jp", 30, 700)
    lw = text_w(K["chapter.local.label"], lk)
    yl = sy(NODE_Y - 54) - text_h(lk) / 2
    bg = Image.new("RGBA", base.size, (0, 0, 0, 0))
    ImageDraw.Draw(bg).rectangle((W / 2 - lw / 2 - 18, yl, W / 2 + lw / 2 + 18, yl + text_h(lk)), fill=INK + (255,))
    if pl > 0.02:
        bg.putalpha(bg.getchannel("A").point(lambda v: int(v * pl)))
        base.alpha_composite(bg)
    paste_text(base, K["chapter.local.label"], lk, PAPER, (W / 2, yl), pl, anchor="c", dy=(1 - pl) * 10)


_TITLE = {}


def draw_title(base, t):
    """94 s title card shifted +8 s; the three-step row is retired (overview replaces it)."""
    if "still" not in _TITLE:
        _TITLE["still"] = still(3.0).transform((WIN_W, WIN_H), Image.EXTENT, (0, 0, 1920, 1080), Image.BICUBIC)
    pin = ease(prog(t, 16.0, 0.6))
    pout = ease(prog(t, 19.45, 0.55))
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
    p = ease_out(prog(t, 16.9, 0.5)) * (1 - pout)
    paste_block(base, K["title.tagline"], ("jp", 26, 700), VERMILION, (x, 690), 700, p)


def draw_formats(base, t):
    p_in = ease_out(prog(t, 82.0, 0.5))
    out = 1 - ease(prog(t, 87.6, 0.4))
    paste_text(base, K["formats.heading"], ("jp", 64, 800), PAPER, (960, 330), p_in * out,
               anchor="c", dy=(1 - p_in) * 20)
    names = ["formats.card.generic", "formats.card.freee", "formats.card.mf", "formats.card.yayoi"]
    w, gap = 300, 28
    x = 960 - (w * 4 + gap * 3) / 2
    for i, n in enumerate(names):
        p = ease_out(prog(t, 82.6 + i * 0.8, 0.45)) * out
        y = 480 + (1 - p) * 24
        layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
        ImageDraw.Draw(layer).rounded_rectangle((x, y, x + w, y + 110), 18, fill=(255, 255, 255, int(16 * p)),
                                                outline=(255, 255, 255, int(110 * p)), width=2)
        base.alpha_composite(layer)
        key = ("jp", 38, 800)
        paste_text(base, K[n], key, PAPER, (x + w / 2, y + 55 - text_h(key) / 2), p, anchor="c")
        x += w + gap
    p = ease_out(prog(t, 85.6, 0.5)) * out
    paste_text(base, K["formats.note"], ("jp", 26, 500), MUTED, (960, 660), p, anchor="c")


NOTES = [(88.4, "notes.01"), (89.6, "notes.02"), (90.8, "notes.03")]


def draw_notes(base, t):
    out = 1 - ease(prog(t, 93.55, 0.4))
    p0 = ease_out(prog(t, 88.0, 0.4))
    paste_text(base, K["notes.heading"], ("jp", 30, 700), MUTED, (300, 230), p0 * out)
    for i, (a, n) in enumerate(NOTES):
        p = ease_out(prog(t, a, 0.45)) * out
        y = 310 + i * 180
        paste_text(base, K[n + ".number"], ("lat", 52, "Bold"), VERMILION, (300, y - 4), p, dy=(1 - p) * 18)
        paste_text(base, K[n + ".heading"], ("jp", 46, 800), PAPER, (400, y), p, dy=(1 - p) * 18)
        paste_block(base, K[n + ".body"], ("jp", 26, 500), MUTED, (402, y + 72), 1260, p, dy=(1 - p) * 18)


def draw_end(base, t):
    p = ease_out(prog(t, 94.0, 0.7))
    fade = 1 - prog(t, 100.6, 1.2)
    paste_text(base, K["end.product"], ("lat", 190, "Bold"), PAPER, (960, 300), p * fade, anchor="c", dy=(1 - p) * 20)
    paste_text(base, K["end.tagline"], ("jp", 44, 800), PAPER, (960, 540),
               ease_out(prog(t, 94.4, 0.6)) * fade, anchor="c")
    pu = ease_out(prog(t, 95.2, 0.6)) * fade
    paste_text(base, K["end.url"], ("lat", 40, "SemiBold"), VERMILION, (960, 650), pu, anchor="c")
    if pu > 0:
        ImageDraw.Draw(base).rectangle((960 - 60, 630, 960 + 60, 633), fill=VERMILION + (int(255 * pu),))
    paste_text(base, K["end.note"], ("jp", 20, 500), MUTED, (960, 960),
               ease_out(prog(t, 95.8, 0.6)) * fade, anchor="c")


class Renderer:
    W, H, FPS = W, H, FPS
    DURATION = DURATION

    def __init__(self):
        self.footage = Footage(SHOTS)

    def frame(self, t):
        Clock.t = t
        base = background(W, H).copy()
        if t < OV_START:
            draw_intro(base, t)
        elif t < OV_END:
            draw_overview(base, t)
        elif 16.0 <= t < 20.0:
            draw_title(base, t)
        elif t < FOOTAGE[1]:
            i, shot = self.footage.shot_at(t)
            img = self.footage.content(i, t, (WIN_W, WIN_H))
            rel = t - shot["start"]
            scale, alpha = 1.0, 1.0
            if i == 0:
                p = ease_out(prog(rel, 0, 0.6))
                scale, alpha = 0.9 + 0.1 * p, p
            if any(abs(shot["start"] - c[0]) < 1e-6 for c in CHAPTERS) and i > 0 and rel < 0.45:
                scale = 1.025 - 0.025 * ease_out(rel / 0.45)
            if t >= FOOTAGE[1] - 0.4:
                alpha = 1 - ease(prog(t, FOOTAGE[1] - 0.4, 0.4))
                scale = 1 - 0.04 * ease(prog(t, FOOTAGE[1] - 0.4, 0.4))
            compose_window(base, img, WIN_W, WIN_H, WIN_CX, WIN_CY, scale, alpha)
            draw_fast_badge(base, t)
            draw_caption_strip(base, t)
        elif t < 88.0:
            draw_formats(base, t)
        elif t < 94.0:
            draw_notes(base, t)
        else:
            draw_end(base, t)
        draw_honesty(base, t)
        return base.convert("RGB")

    def close(self):
        self.footage.close()
