"""32-second Studio cut: wide (1920x1080) and portrait (720x1280), normal and credited.

Built from the new real UI recording and the 94-second edit's camera/caption
language. All displayed text comes from input/studio-copy-deck.json; the
credited variants additionally burn the preserved legal credit literal.
Times are output seconds at 120 BPM (one bar = 2.0 s).
"""
from PIL import Image, ImageDraw

import copydeck
from common import (FPS, INK, MUTED, PAPER, VERMILION, Clock, Footage, background, compose_window, ease,
                    ease_out, paste_block, paste_text, prog, text_h, text_w)

K = copydeck.STUDIO
LEGAL = copydeck.LEGAL
DURATION = 32.0
BPM = 120

SHOTS = [
    # local: choose files, start
    dict(start=4.0, end=6.5, src=13.0, speed=2.0,
         cam=[(0.0, 960, 420, 1400), (2.5, 1000, 470, 1160)],
         pcam=[(0.0, 1000, 450, 900), (2.5, 1150, 520, 640)],
         marks=[(1.0, 2.4, (1120, 560, 1330, 606))]),
    # local: genuine processing, fast-forwarded
    dict(start=6.5, end=10.0, src=18.0, speed=40.0, fast=True,
         cam=[(0.0, 952, 480, 1300), (3.5, 952, 470, 1120)],
         pcam=[(0.0, 955, 470, 1040), (3.5, 955, 450, 1000)],
         marks=[(0.6, 3.5, (1340, 206, 1416, 266))]),
    # review: three-column results
    dict(start=10.0, end=12.5, src=159.6, speed=2.0,
         cam=[(0.0, 952, 540, 1640), (2.5, 952, 480, 1440)],
         pcam=[(0.0, 950, 520, 1300), (2.5, 1150, 450, 900)],
         marks=[(0.5, 2.5, (322, 252, 444, 280)), (0.5, 2.5, (466, 252, 574, 280)),
                (0.5, 2.5, (1376, 252, 1452, 280))]),
    # review: zoom the original
    dict(start=12.5, end=15.5, src=168.8, speed=1.5,
         cam=[(0.0, 952, 540, 1500), (1.0, 952, 560, 1300), (3.0, 930, 620, 960)],
         pcam=[(0.0, 950, 560, 1100), (3.0, 900, 640, 760)],
         marks=[(1.0, 2.0, (642, 452, 1240, 522)), (2.0, 3.0, (490, 722, 975, 782))]),
    # review: change the account, star it
    dict(start=15.5, end=20.0, src=220.5, speed=5.0,
         cam=[(0.0, 952, 560, 1100), (4.5, 1000, 585, 860)],
         pcam=[(0.0, 950, 580, 700), (4.5, 1000, 590, 640)],
         marks=[(0.25, 2.2, (960, 551, 1157, 593)), (3.9, 4.5, (1161, 573, 1207, 619))]),
    # csv: confirm the five entries
    dict(start=20.0, end=23.0, src=309.5, speed=2.5,
         cam=[(0.0, 952, 400, 1500), (3.0, 952, 330, 1340)],
         pcam=[(0.0, 700, 330, 900), (3.0, 700, 330, 820)],
         marks=[(2.1, 3.0, (384, 180, 450, 472))]),
    # csv: the four formats in the real select
    dict(start=23.0, end=28.0, src=332.0, speed=5.2,
         cam=[(0.0, 952, 470, 1560), (5.0, 900, 420, 1400)],
         pcam=[(0.0, 700, 420, 1000), (5.0, 650, 380, 860)],
         marks=[(1.2, 5.0, (334, 272, 732, 314))]),
]

PHASES = [(4.0, 10.0, "title.phase.local"), (10.0, 20.0, "title.phase.review"), (20.0, 28.0, "title.phase.csv")]
# (start, end, title slot, detail slot)
CHIPS = [
    (6.8, 10.0, "station.ocr.title", "station.ocr.engine"),
    (7.6, 10.0, "station.ai.title", "station.ai.engine"),
    (10.4, 12.5, "r1.screenshot", None),
    (12.9, 15.5, "review.heading", None),
    (20.4, 23.0, "station.review.title", "station.review.actor"),
]
CAPTIONS = [(15.7, 20.0, "review.note"), (23.2, 28.0, "ledger.csv.plain")]
FOOTERS = [(4.0, 10.0, "footer.setup"), (10.0, 20.0, "footer.review")]
# format chips light up when the real select changes (source 332.63/338.27/349.77/353.27)
CSV_CHIPS = [("csv.freee", 23.12), ("csv.mf", 24.21), ("csv.yayoi", 26.42), ("csv.generic", 27.09)]
END_NOTES = ["footer.setup", "footer.review", "ledger.csv.plain"]

# --- sound cues ---------------------------------------------------------------
WHOOSH = [3.7, 9.7, 19.7, 27.7]
IMPACT = [4.0, 10.0, 20.0, 28.0]
TYPE_TICKS = [0.4, 1.2, 2.0, 6.8, 7.6, 10.4, 12.9, 20.4, 28.5, 29.2]
STAMPS = [28.0]
SOURCE_EVENTS = [14.63, 16.90, 158.07, 169.27, 222.10, 240.83, 311.93, 314.67, 332.63, 338.27, 349.77, 353.27]


def ui_clicks():
    out = []
    for s in SHOTS:
        if s.get("fast"):
            continue
        for e in SOURCE_EVENTS:
            t = s["start"] + (e - s["src"]) / s["speed"]
            if s["start"] + 0.05 <= t < s["end"] - 0.05:
                out.append(round(t, 3))
    return sorted(out)


# --- layouts -------------------------------------------------------------------
WIDE = dict(name="wide", W=1920, H=1080, win=(160, 44, 1600, 900), cam="cam")
PORTRAIT = dict(name="portrait", W=720, H=1280, win=(20, 250, 680, 680), cam="pcam")


def pill(base, x, y, w, h, alpha, fill=INK, outline=None):
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle((x, y, x + w, y + h), h // 2, fill=fill + (int(235 * alpha),),
                                            outline=(outline + (int(255 * alpha),)) if outline else None,
                                            width=3)
    base.alpha_composite(layer)


class Renderer:
    FPS = FPS
    DURATION = DURATION

    def __init__(self, layout, credited=False):
        self.L = layout
        self.W, self.H = layout["W"], layout["H"]
        self.credited = credited
        self.footage = Footage(SHOTS, layout["cam"])
        self.portrait = layout["name"] == "portrait"

    # title card -----------------------------------------------------------------
    def draw_title(self, base, t):
        out = 1 - ease(prog(t, 3.6, 0.4))
        W = self.W
        if self.portrait:
            p = ease_out(prog(t, 0.3, 0.6))
            paste_text(base, K["title.product"], ("lat", 150, "Bold"), PAPER, (W / 2, 330), p * out,
                       anchor="c", dy=(1 - p) * 24)
            p = ease_out(prog(t, 1.0, 0.5))
            paste_text(base, K["title.descriptor"], ("jp", 34, 600), MUTED, (W / 2, 540), p * out, anchor="c")
            p = ease_out(prog(t, 1.8, 0.5))
            if p > 0:
                ImageDraw.Draw(base).rectangle((W / 2 - 60, 640, W / 2 - 60 + int(120 * p), 646),
                                               fill=VERMILION + (int(255 * out),))
            self.block_c(base, K["title.main"], ("jp", 52, 800), PAPER, 690, 620, p * out, dy=(1 - p) * 20)
        else:
            x = 220
            p = ease_out(prog(t, 0.3, 0.6))
            paste_text(base, K["title.product"], ("lat", 190, "Bold"), PAPER, (x - 8, 250), p * out, dy=(1 - p) * 24)
            p = ease_out(prog(t, 1.0, 0.5))
            paste_text(base, K["title.descriptor"], ("jp", 40, 600), MUTED, (x, 500), p * out, dy=(1 - p) * 14)
            p = ease_out(prog(t, 1.8, 0.5))
            if p > 0:
                ImageDraw.Draw(base).rectangle((x + 4, 600, x + 4 + int(560 * p), 608),
                                               fill=VERMILION + (int(255 * out),))
            paste_text(base, K["title.main"], ("jp", 84, 800), PAPER, (x, 640), p * out, dy=(1 - p) * 24)

    def block_c(self, base, txt, key, fill, y, maxw, alpha, dy=0, min_size=None):
        from common import wrap
        if min_size:  # prefer one line when a slightly smaller size fits
            s = key[1]
            while s > min_size and text_w(txt, (key[0], s, key[2])) > maxw:
                s -= 1
            if text_w(txt, (key[0], s, key[2])) <= maxw:
                key = (key[0], s, key[2])
        lines = wrap(txt, key, maxw)
        lh = int(key[1] * 1.45)
        if alpha > 0.02:
            copydeck.mark_shown(txt, Clock.t)
            for k, ln in enumerate(lines):
                im_w = text_w(ln, key)
                from common import _paste
                _paste(base, ln, key, fill, (self.W / 2 - im_w / 2, y + k * lh), alpha, "l", dy)
        return lh * len(lines)

    # footage overlays -------------------------------------------------------------
    def draw_overlays(self, base, t):
        wx, wy, ww, wh = self.L["win"]
        P = self.portrait
        for a, b, slot in PHASES:
            if a <= t < b:
                p = ease_out(prog(t, a, 0.45))
                al = p * min(1, (b - t) / 0.25)
                if P:
                    self.block_c(base, K[slot], ("jp", 44, 800), PAPER, 110, 670, al, dy=(1 - p) * 14,
                                 min_size=34)
                else:
                    ImageDraw.Draw(base).rectangle((wx, wy + wh + 30, wx + 8, wy + wh + 82),
                                                   fill=VERMILION + (int(255 * al),))
                    paste_text(base, K[slot], ("jp", 40, 800), PAPER, (wx + 26, wy + wh + 28), al, dy=(1 - p) * 14)
        for a, b, slot in FOOTERS:
            if a <= t < b:
                al = min(prog(t, a, 0.4), (b - t) / 0.25)
                if P:
                    self.block_c(base, K[slot], ("jp", 22, 500), MUTED, 1190, 670, al * 0.95, min_size=18)
                else:
                    paste_text(base, K[slot], ("jp", 22, 500), MUTED, (wx + ww, wy + wh + 46), al * 0.95, anchor="r")
        # station chips: inside the window (wide) / below it (portrait)
        row = 0
        for a, b, ts, ds in CHIPS:
            if not (a <= t < b):
                continue
            p = ease_out(prog(t, a, 0.35)) * min(1, (b - t) / 0.25)
            kt = ("jp", 30 if not P else 28, 800)
            kd = ("jp", 22 if not P else 20, 600)
            w = 26 + text_w(K[ts], kt) + (16 + text_w(K[ds], kd) if ds else 0) + 26
            h = 58 if not P else 54
            if P:
                x, y = 360 - w / 2, wy + wh + 28 + row * (h + 12)
            else:
                x, y = wx + 28, wy + wh - 28 - h - row * (h + 12)
            pill(base, x, y + (1 - p) * 12, w, h, p)
            tw = paste_text(base, K[ts], kt, VERMILION, (x + 26, y + (h - text_h(kt)) / 2 + (1 - p) * 12), p)
            if ds:
                paste_text(base, K[ds], kd, PAPER, (x + 26 + tw + 16, y + (h - text_h(kd)) / 2 + (1 - p) * 12), p)
            row += 1
        for a, b, slot in CAPTIONS:
            if a <= t < b:
                p = ease_out(prog(t, a, 0.4)) * min(1, (b - t) / 0.25)
                if P:
                    self.block_c(base, K[slot], ("jp", 30, 700), PAPER, wy + wh + 120, 670, p, dy=(1 - p) * 12,
                                 min_size=26)
                else:
                    key = ("jp", 30, 700)
                    w = text_w(K[slot], key) + 52
                    x, y = wx + 28, wy + wh - 28 - 60
                    pill(base, x, y + (1 - p) * 12, w, 60, p)
                    paste_text(base, K[slot], key, PAPER, (x + 26, y + (60 - text_h(key)) / 2 + (1 - p) * 12), p)
        if 23.0 <= t < 28.0:
            self.draw_csv_chips(base, t)

    def draw_csv_chips(self, base, t):
        wx, wy, ww, wh = self.L["win"]
        P = self.portrait
        key = ("jp", 26 if not P else 22, 800)
        gap = 12
        widths = [text_w(K[s], key) + 44 for s, _ in CSV_CHIPS]
        h = 52 if not P else 46
        if P:
            total = sum(widths) + gap * 3
            x, y = 360 - total / 2, wy + wh + 30
        else:
            total = sum(widths) + gap * 3
            x, y = wx + ww - total, wy + wh + 30
        out = min(1, (28.0 - t) / 0.25)
        for (slot, at), w in zip(CSV_CHIPS, widths):
            p = ease_out(prog(t, 23.0, 0.4)) * out
            on = ease_out(prog(t, at, 0.25))
            nxt = [a for s, a in CSV_CHIPS if a > at]
            if nxt:
                on *= 1 - ease_out(prog(t, nxt[0], 0.25)) * 0.6
            pill(base, x, y, w, h, p, fill=INK, outline=VERMILION if on > 0.5 else (90, 94, 120))
            col = tuple(int(MUTED[i] + (PAPER[i] - MUTED[i]) * on) for i in range(3))
            paste_text(base, K[slot], key, col, (x + w / 2, y + (h - text_h(key)) / 2), p, anchor="c")
            x += w + gap

    # end card -------------------------------------------------------------------
    def draw_end(self, base, t):
        W, H = self.W, self.H
        P = self.portrait
        fade = 1 - prog(t, 31.3, 0.7)
        p = ease_out(prog(t, 28.0, 0.6))
        if P:
            paste_text(base, K["title.product"], ("lat", 140, "Bold"), PAPER, (W / 2, 250), p * fade, anchor="c",
                       dy=(1 - p) * 20)
            pm = ease_out(prog(t, 28.3, 0.5)) * fade
            y = 470 + self.block_c(base, K["title.main"], ("jp", 40, 800), PAPER, 470, 670, pm, min_size=32)
            y += 50
            for i, s in enumerate(END_NOTES):
                pi = ease_out(prog(t, 28.6 + i * 0.25, 0.45)) * fade
                y += self.block_c(base, K[s], ("jp", 24, 500), MUTED, y, 670, pi, min_size=20) + 14
            if self.credited:
                pc = ease_out(prog(t, 29.4, 0.5)) * fade
                paste_text(base, K["credit.brand"], ("lat", 40, "SemiBold"), VERMILION, (W / 2, 1060), pc, anchor="c")
                self.block_c(base, LEGAL, ("jp", 22, 500), PAPER, 1130, 640, pc)
        else:
            paste_text(base, K["title.product"], ("lat", 170, "Bold"), PAPER, (W / 2, 190), p * fade, anchor="c",
                       dy=(1 - p) * 20)
            pm = ease_out(prog(t, 28.3, 0.5)) * fade
            paste_text(base, K["title.main"], ("jp", 52, 800), PAPER, (W / 2, 420), pm, anchor="c")
            for i, s in enumerate(END_NOTES):
                pi = ease_out(prog(t, 28.6 + i * 0.25, 0.45)) * fade
                paste_text(base, K[s], ("jp", 28, 500), MUTED, (W / 2, 560 + i * 54), pi, anchor="c")
            if self.credited:
                pc = ease_out(prog(t, 29.4, 0.5)) * fade
                ImageDraw.Draw(base).rectangle((W / 2 - 60, 820, W / 2 + 60, 823), fill=VERMILION + (int(255 * pc),))
                paste_text(base, K["credit.brand"], ("lat", 44, "SemiBold"), VERMILION, (W / 2, 850), pc, anchor="c")
                paste_text(base, LEGAL, ("jp", 26, 500), PAPER, (W / 2, 930), pc, anchor="c")

    def frame(self, t):
        Clock.t = t
        base = background(self.W, self.H).copy()
        wx, wy, ww, wh = self.L["win"]
        if t < 4.0:
            self.draw_title(base, t)
        elif t < 28.0:
            i, shot = self.footage.shot_at(t)
            img = self.footage.content(i, t, (ww, wh))
            rel = t - shot["start"]
            scale, alpha = 1.0, 1.0
            if i == 0:
                p = ease_out(prog(rel, 0, 0.5))
                scale, alpha = 0.92 + 0.08 * p, p
            if any(abs(shot["start"] - a) < 1e-6 for a, _, _ in PHASES) and i > 0 and rel < 0.45:
                scale = 1.025 - 0.025 * ease_out(rel / 0.45)
            if t >= 27.6:
                alpha = 1 - ease(prog(t, 27.6, 0.4))
                scale = 1 - 0.04 * ease(prog(t, 27.6, 0.4))
            compose_window(base, img, ww, wh, wx + ww / 2, wy + wh / 2, scale, alpha)
            self.draw_overlays(base, t)
        else:
            self.draw_end(base, t)
        return base.convert("RGB")

    def close(self):
        self.footage.close()
