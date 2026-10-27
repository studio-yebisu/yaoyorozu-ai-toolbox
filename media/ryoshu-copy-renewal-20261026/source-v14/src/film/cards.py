"""Graphic scenes. Japanese = Kimi deck slots verbatim; numbers/technical values = approved facts (checked against
the deck's own value strings, so a drawn ratio can never disagree with the facts)."""
from __future__ import annotations

from functools import lru_cache

from PIL import Image, ImageDraw

from . import footage as F
from .draw import (GREEN, H, INDIGO, INK, MUTED, PAPER, VERMILION, W, WIN_CX, WIN_CY, WIN_H, WIN_W, Ctx, clamp, ease, ease_out,
                   fit, prog, put, th, tw, window)


def facts():
    return Ctx.deck.facts


def ratio(c, e):
    return f"{c}/{e}"


def check_values():
    """Every deck value string must equal the facts value."""
    f = facts()
    s, dn, tx = f["summary"], f["denominators"], f["tax_summary"]
    want = {"bench.acc.amount.value": ratio(dn["numeric_yen"]["correct"], dn["numeric_yen"]["evaluated"]),
            "bench.acc.fx.value": ratio(dn["foreign_currency_unresolved"]["correct"], dn["foreign_currency_unresolved"]["evaluated"]),
            "bench.acc.date.value": ratio(s["date_exact"]["correct"], s["date_exact"]["evaluated"]),
            "bench.acc.account.value": ratio(s["account_exact"]["correct"], s["account_exact"]["evaluated"]),
            "bench.more.merchant.value": ratio(s["merchant_exact"]["correct"], s["merchant_exact"]["evaluated"]),
            "bench.more.handling.value": ratio(s["account_or_decision_exact"]["correct"], s["account_or_decision_exact"]["evaluated"]),
            "bench.more.tax.value": ratio(tx["numeric"]["correct"], tx["numeric"]["evaluated"]),
            "bench.more.tax.blank.value": ratio(tx["blank"]["correct"], tx["blank"]["evaluated"])}
    bad = {k: (Ctx.deck[k], v) for k, v in want.items() if Ctx.deck[k] != v}
    if bad:
        raise SystemExit(f"deck values disagree with facts: {bad}")
    return want


def time_fmt():
    tm = facts()["timing"]
    return {"m": str(tm["rounded_minutes"]), "s": f"{tm['rounded_seconds_1dp']:.1f}"}


# ------------------------------------------------------------------------------------------------ opener
def opener(base, t):
    out = 1 - ease(prog(t, 3.65, 0.35))
    x = 300
    for a, slot, size, w, y in [(0.4, "intro.line1", 72, 500, 290), (1.2, "intro.line2", 72, 500, 390), (2.0, "intro.line3", 150, 900, 500)]:
        p = ease_out(prog(t, a, 0.45))
        if p > 0:
            put(base, slot, ("jp", size, w), PAPER, (x, y), p * out, dy=(1 - p) * 30)
    p = ease_out(prog(t, 2.25, 0.5))
    if p > 0:
        ImageDraw.Draw(base).rectangle((x + 4, 712, x + 4 + int(720 * p), 722), fill=VERMILION + (int(255 * out),))
    p = ease_out(prog(t, 2.9, 0.4))
    put(base, "intro.tagline", ("jp", 40, 700), VERMILION, (x, 760), p * out, dy=(1 - p) * 14)


# ------------------------------------------------------------------------------------------------ overview
NODE_W, NODE_H, GAP = 384, 216, 64
NODE_X0 = (W - (4 * NODE_W + 3 * GAP)) // 2
NODE_Y = 366
NODES = [  # (appear rel s, chunk, frame, crop x,y,w (16:9), label, sub, role)
    (0.4, "A2-start-and-process", 66, (172, 300, 560), "overview.stage1.label", "overview.stage1.sub", "ai"),
    (1.6, "A2-start-and-process", 200, (172, 300, 560), "overview.stage2.label", "overview.stage2.sub", "ai"),
    (2.8, "16-review-check", 3, (200, 120, 860), "overview.stage3.label", "overview.stage3.sub", "human"),
    (4.0, "20-csv-preview", 1, (24, 300, 740), "overview.stage4.label", "overview.stage4.sub", "csv"),
]


@lru_cache(None)
def _thumb(chunk, i, x, y, w):
    h = w * 9 / 16
    return F.image(chunk, i).crop((x, y, x + w, y + h)).resize((NODE_W, NODE_H), Image.LANCZOS)


def _person(d, cx, cy, s, col):
    d.ellipse((cx - s * 0.32, cy - s * 0.95, cx + s * 0.32, cy - s * 0.31), fill=col)
    d.pieslice((cx - s * 0.62, cy - s * 0.2, cx + s * 0.62, cy + s * 1.0), 180, 360, fill=col)


def overview(base, t, dur):
    out = 1 - ease(prog(t, dur - 0.4, 0.4))
    push = 1 + 0.025 * ease(prog(t, 5.0, 2.6))
    sx = lambda x: W / 2 + (x - W / 2) * push
    sy = lambda y: H / 2 + (y - H / 2) * push
    xs = [NODE_X0 + i * (NODE_W + GAP) for i in range(4)]
    lay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    pb = ease_out(prog(t, 0.15, 0.7)) * out
    if pb > 0:
        x0, x1 = sx(xs[0] - 22), sx(xs[3] + NODE_W + 22)
        xm, half, y = (x0 + x1) / 2, (x1 - x0) / 2 * pb, sy(NODE_Y - 54)
        col = PAPER + (int(150 * pb),)
        d.line((xm - half, y, xm + half, y), fill=col, width=3)
        if pb > 0.95:
            d.line((x0, y, x0, y + 22), fill=col, width=3)
            d.line((x1, y, x1, y + 22), fill=col, width=3)
        d.rounded_rectangle((x0, sy(NODE_Y - 30), x1, sy(NODE_Y + NODE_H + 196)), 26, outline=(255, 255, 255, int(46 * pb)), width=2,
                            fill=(255, 255, 255, int(8 * pb)))
    pa = ease_out(prog(t, 2.0, 0.6)) * out
    y = sy(NODE_Y + NODE_H + 150)
    if pa > 0:   # OCR and account candidate: two separate local AI stages
        for i in (0, 1):
            xa0, xa1 = sx(xs[i]), sx(xs[i] + NODE_W)
            d.rounded_rectangle((xa0, y, xa0 + (xa1 - xa0) * pa, y + 6), 3, fill=INDIGO + (int(230 * pa),))
    ph = ease_out(prog(t, 3.2, 0.6)) * out
    if ph > 0:
        xh0, xh1 = sx(xs[2]), sx(xs[2] + NODE_W)
        d.rounded_rectangle((xh0, y, xh0 + (xh1 - xh0) * ph, y + 6), 3, fill=VERMILION + (int(240 * ph),))
    base.alpha_composite(lay)
    for i, (a, chunk, fi, (cx0, cy0, cw), lab, sub, role) in enumerate(NODES):
        p = ease_out(prog(t, a, 0.5)) * out
        if p <= 0.02:
            continue
        x, yy = xs[i], NODE_Y + (1 - p) * 26
        tw_, th_ = int(NODE_W * push), int(NODE_H * push)
        acc = INDIGO if role == "ai" else (VERMILION if role == "human" else PAPER)
        cx, cy = sx(x + NODE_W / 2), sy(yy + NODE_H / 2)
        ring = Image.new("RGBA", base.size, (0, 0, 0, 0))
        ImageDraw.Draw(ring).rounded_rectangle((cx - tw_ / 2 - 5, cy - th_ / 2 - 5, cx + tw_ / 2 + 5, cy + th_ / 2 + 5), 16,
                                               outline=acc + (int(230 * p),), width=3)
        window(base, _thumb(chunk, fi, cx0, cy0, cw), tw_, th_, cx, cy, 1.0, p, r=12)
        base.alpha_composite(ring)
        if role == "human":
            gl = Image.new("RGBA", base.size, (0, 0, 0, 0))
            gd = ImageDraw.Draw(gl)
            bx, by = cx + tw_ / 2 - 26, cy - th_ / 2 - 4
            gd.ellipse((bx - 24, by - 24, bx + 24, by + 24), fill=VERMILION + (int(255 * p),))
            _person(gd, bx, by + 4, 17, PAPER + (int(255 * p),))
            base.alpha_composite(gl)
        ly = sy(NODE_Y + NODE_H + 30) + (1 - p) * 18
        put(base, lab, ("jp", 34, 800), PAPER, (cx, ly), p, anchor="c")
        put(base, sub, ("jp", 22, 500), MUTED, (cx, ly + 58), p, anchor="c")
        if i < 3:
            pc = ease_out(prog(t, NODES[i + 1][0] - 0.15, 0.35)) * out
            if pc > 0.02:
                xx, s = sx(x + NODE_W + GAP / 2 - 6), 22 * push
                ImageDraw.Draw(base).line((xx, cy - s / 2, xx + s / 2, cy, xx, cy + s / 2), fill=VERMILION + (int(255 * pc),), width=4)
    pl = ease_out(prog(t, 0.3, 0.5)) * out
    lk = ("jp", 30, 700)
    lw = tw(Ctx.deck["chapter.local.label"], lk)
    yl = sy(NODE_Y - 54) - th(lk) / 2
    if pl > 0.02:
        bg = Image.new("RGBA", base.size, (0, 0, 0, 0))
        ImageDraw.Draw(bg).rectangle((W / 2 - lw / 2 - 18, yl, W / 2 + lw / 2 + 18, yl + th(lk)), fill=INK + (int(255 * pl),))
        base.alpha_composite(bg)
    put(base, "chapter.local.label", lk, PAPER, (W / 2, yl), pl, anchor="c", dy=(1 - pl) * 10)


# ------------------------------------------------------------------------------------------------ title
def title(base, t, dur):
    pin, pout = ease(prog(t, 0.0, 0.6)), ease(prog(t, dur - 0.55, 0.55))
    k = pin * (1 - pout)
    still = F.window_pixels("02-results", 7, (640, 360, 1280), WIN_W, WIN_H)
    window(base, still, WIN_W, WIN_H, WIN_CX + (1330 - WIN_CX) * k, WIN_CY + (540 - WIN_CY) * k, 1 - 0.46 * k)
    x = 130
    put(base, "title.product", ("lat", 168, "Bold"), PAPER, (x - 6, 270), k, dy=(1 - pin) * 20)
    put(base, "title.line1", ("jp", 52, 800), PAPER, (x, 490), k, dy=(1 - pin) * 26)
    put(base, "title.line2", ("jp", 52, 800), PAPER, (x, 562), k, dy=(1 - pin) * 32)
    p = ease_out(prog(t, 0.9, 0.5)) * (1 - pout)
    put(base, "title.tagline", fit("title.tagline", "jp", 700, 26, 20, 760), VERMILION, (x, 690), p)


# ------------------------------------------------------------------------------------------------ helpers
def _fade(t, dur):
    return 1 - ease(prog(t, dur - 0.4, 0.4))


def _card_bg(base, x0, y0, x1, y1, p):
    lay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    ImageDraw.Draw(lay).rounded_rectangle((x0, y0, x1, y1), 22, fill=(255, 255, 255, int(12 * p)), outline=(255, 255, 255, int(60 * p)), width=2)
    base.alpha_composite(lay)


def _bar(base, x, y, w, frac, p, col):
    lay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    d.rounded_rectangle((x, y, x + w, y + 10), 5, fill=(255, 255, 255, int(30 * p)))
    if frac > 0:
        d.rounded_rectangle((x, y, x + max(10, w * frac * ease_out(p)), y + 10), 5, fill=col + (int(240 * p),))
    base.alpha_composite(lay)


def _heading(base, t, slot, y=150, size=56):
    p = ease_out(prog(t, 0.0, 0.45))
    put(base, slot, ("jp", size, 800), PAPER, (180, y), p, dy=(1 - p) * 18)
    return p


# ------------------------------------------------------------------------------------------------ formats / runtime
def formats(base, t, dur):
    out = _fade(t, dur)
    p_in = ease_out(prog(t, 0.0, 0.5))
    put(base, "formats.heading", ("jp", 64, 800), PAPER, (960, 330), p_in * out, anchor="c", dy=(1 - p_in) * 20)
    names = ["formats.card.generic", "formats.card.freee", "formats.card.mf", "formats.card.yayoi"]
    w, gap = 300, 28
    x = 960 - (w * 4 + gap * 3) / 2
    for i, n in enumerate(names):
        p = ease_out(prog(t, 0.6 + i * 0.5, 0.45)) * out
        y = 480 + (1 - p) * 24
        _card_bg(base, x, y, x + w, y + 110, p)
        key = ("jp", 38, 800)
        put(base, n, key, PAPER, (x + w / 2, y + 55 - th(key) / 2), p, anchor="c")
        x += w + gap
    p = ease_out(prog(t, 2.9, 0.5)) * out
    put(base, "formats.note", ("jp", 28, 600), MUTED, (960, 664), p, anchor="c")


def runtime(base, t, dur):
    out = _fade(t, dur)
    p = ease_out(prog(t, 0.0, 0.5))
    put(base, "runtime.heading", ("jp", 64, 800), PAPER, (300, 300), p * out, dy=(1 - p) * 20)
    for i, s in enumerate(["runtime.line1", "runtime.line2", "runtime.line3"]):
        q = ease_out(prog(t, 0.8 + i * 0.6, 0.45)) * out
        y = 450 + i * 92
        ImageDraw.Draw(base).rectangle((300, y + 8, 306, y + 46), fill=(INDIGO if i < 2 else MUTED) + (int(255 * q),))
        put(base, s, ("jp", 40, 700), PAPER, (330, y), q, dy=(1 - q) * 14)


# ------------------------------------------------------------------------------------------------ benchmark
def bench_time(base, t, dur):
    out = _fade(t, dur)
    p = _heading(base, t, "bench.heading") * out
    put(base, "bench.scope", ("jp", 26, 500), MUTED, (182, 236), p)
    q = ease_out(prog(t, 0.5, 0.6)) * out
    put(base, "bench.time.value", ("jp", 120, 900), VERMILION, (176, 300), q, dy=(1 - q) * 20, fmt=time_fmt())
    rows = [(1.2, "bench.time.start", PAPER), (1.5, "bench.time.end", PAPER), (2.2, "bench.time.included", PAPER),
            (2.5, "bench.time.included_policies", PAPER), (3.2, "bench.time.outside", MUTED), (3.9, "bench.time.cache", MUTED),
            (4.1, "bench.time.cache_prior", MUTED), (4.3, "bench.time.cache_note", MUTED)]
    rows = [r for r in rows if r[1] in Ctx.deck.by]
    y = 490
    for k, (a, slot, col) in enumerate(rows):
        r = ease_out(prog(t, a, 0.4)) * out
        if k in (2, 4, 5):
            y += 18
        put(base, slot, ("jp", 32, 600), col, (184, y), r, dy=(1 - r) * 10)
        y += 58


def _metric(base, t, a, x, y, w, label, value, frac, note, col, out, note_slot2=None):
    r = ease_out(prog(t, a, 0.5)) * out
    put(base, label, ("jp", 34, 700), PAPER, (x, y), r)
    put(base, value, ("lat", 64, "Bold"), col, (x + w, y - 18), r, anchor="r")
    _bar(base, x, y + 62, w, frac, r, col)
    if note:
        n = ease_out(prog(t, a + 0.5, 0.5)) * out
        put(base, note, fit(note, "jp", 500, 26, 20, w), MUTED, (x, y + 86), n)
    if note_slot2:
        n = ease_out(prog(t, a + 0.8, 0.5)) * out
        put(base, note_slot2, fit(note_slot2, "jp", 500, 26, 20, w), MUTED, (x, y + 124), n)


def bench_core(base, t, dur):
    out = _fade(t, dur)
    v = check_values()
    p = _heading(base, t, "bench.acc.subject", size=50) * out
    put(base, "bench.acc.subject_scope", ("jp", 28, 600), MUTED, (182, 222), p)
    frac = lambda s: int(v[s].split("/")[0]) / int(v[s].split("/")[1])
    x1, x2, w = 180, 1010, 730
    _metric(base, t, 0.6, x1, 330, w, "bench.acc.amount.label", "bench.acc.amount.value", frac("bench.acc.amount.value"), "bench.acc.amount.excl", GREEN, out)
    _metric(base, t, 1.4, x2, 330, w, "bench.acc.fx.label", "bench.acc.fx.value", frac("bench.acc.fx.value"), None, GREEN, out)
    _metric(base, t, 2.4, x1, 620, w, "bench.acc.date.label", "bench.acc.date.value", frac("bench.acc.date.value"), "bench.acc.date.excl", GREEN, out)
    _metric(base, t, 3.2, x2, 620, w, "bench.acc.account.label", "bench.acc.account.value", frac("bench.acc.account.value"), "bench.acc.account.excl", INDIGO, out,
            note_slot2="bench.acc.account.population" if "bench.acc.account.population" in Ctx.deck.by else None)


def bench_more(base, t, dur):
    out = _fade(t, dur)
    v = check_values()
    _heading(base, t, "bench.more.heading", size=50)
    frac = lambda s: int(v[s].split("/")[0]) / int(v[s].split("/")[1])
    x1, x2, w = 180, 1010, 730
    _metric(base, t, 0.5, x1, 270, w, "bench.more.merchant.label", "bench.more.merchant.value", frac("bench.more.merchant.value"), "bench.more.merchant.note", VERMILION, out)
    _metric(base, t, 1.3, x2, 270, w, "bench.more.handling.label", "bench.more.handling.value", frac("bench.more.handling.value"), "bench.more.handling.note", INDIGO, out)
    _metric(base, t, 2.3, x1, 540, w, "bench.more.tax.label", "bench.more.tax.value", frac("bench.more.tax.value"), "bench.more.tax.note", GREEN, out,
            note_slot2="bench.more.tax.population" if "bench.more.tax.population" in Ctx.deck.by else None)
    _metric(base, t, 3.1, x2, 540, w, "bench.more.tax.blank.label", "bench.more.tax.blank.value", frac("bench.more.tax.blank.value"), None, GREEN, out)
    r = ease_out(prog(t, 4.2, 0.5)) * out
    lay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    ImageDraw.Draw(lay).rounded_rectangle((180, 820, 1740, 900), 18, fill=VERMILION + (int(40 * r),), outline=VERMILION + (int(200 * r),), width=2)
    base.alpha_composite(lay)
    put(base, "bench.acc.held", ("jp", 34, 800), PAPER, (960, 860 - th(("jp", 34, 800)) / 2), r, anchor="c")


def bench_conditions(base, t, dur):
    out = _fade(t, dur)
    f = facts()
    env, m = f["environment"], f["model"]
    o = env["qwen_request_options"]
    _heading(base, t, "bench.cond.heading", size=50)
    rows = [("bench.cond.keys.model", f"{m['repo'].split('/')[-1].replace('-GGUF', '')} {m['file'].split('-')[-1].replace('.gguf', '')} (enable_thinking={str(env['enable_thinking']).lower()})"),
            ("bench.cond.keys.runtime", f"llama.cpp {f['runtime_tag']} · CPU threads {o['threads']} · gpu_layers {o['gpu_layers']}"),
            ("bench.cond.keys.ocr", f"Indra OCR {env['indra_ocr']}"),
            ("bench.cond.keys.pc", f"{env['cpu'].replace(' 16-Core Processor', '')} · RAM {env['ram_marketing_gb']} GB · Windows 11"),
            ("bench.cond.keys.date", f["timing"]["first_post_utc"][:10])]
    for i, (slot, val) in enumerate(rows):
        r = ease_out(prog(t, 0.5 + i * 0.35, 0.4)) * out
        y = 270 + i * 92
        put(base, slot, ("jp", 32, 700), MUTED, (180, y), r)
        put(base, slot + ".value", ("lat", 38, "SemiBold"), PAPER, (560, y - 2), r, text=val)
    r = ease_out(prog(t, 2.6, 0.5)) * out
    put(base, "bench.cond.note", fit("bench.cond.note", "jp", 600, 32, 24, 1560), VERMILION, (180, 752), r)
    if "bench.cond.time_note" in Ctx.deck.by:
        r2 = ease_out(prog(t, 2.9, 0.5)) * out
        put(base, "bench.cond.time_note", fit("bench.cond.time_note", "jp", 600, 30, 22, 1560), VERMILION, (180, 808), r2)
    r = ease_out(prog(t, 3.2, 0.5)) * out
    put(base, "bench.report.ref", ("jp", 28, 600), MUTED, (180, 880), r)
    url = f["public_targets_pending_publication"]["evidence"].replace("https://", "")
    put(base, "bench.report.ref.url", ("lat", 30, "SemiBold"), PAPER, (180 + tw(Ctx.deck["bench.report.ref"], ("jp", 28, 600)) + 20, 882), r, text=url)


# ------------------------------------------------------------------------------------------------ notes / end
def notes(base, t, dur):
    out = _fade(t, dur)
    p0 = ease_out(prog(t, 0.0, 0.4))
    put(base, "notes.heading", ("jp", 30, 700), MUTED, (300, 230), p0 * out)
    for i, n in enumerate(["notes.01", "notes.02", "notes.03"]):
        p = ease_out(prog(t, 0.4 + i * 1.2, 0.45)) * out
        y = 310 + i * 180
        put(base, n + ".number", ("lat", 52, "Bold"), VERMILION, (300, y - 4), p, dy=(1 - p) * 18)
        put(base, n + ".heading", ("jp", 46, 800), PAPER, (400, y), p, dy=(1 - p) * 18)
        put(base, n + ".body", fit(n + ".body", "jp", 500, 30, 22, 1320), MUTED, (402, y + 74), p, dy=(1 - p) * 18)


def end(base, t, dur):
    p = ease_out(prog(t, 0.0, 0.7))
    fade = 1 - prog(t, dur - 1.4, 1.2)
    put(base, "end.product", ("lat", 190, "Bold"), PAPER, (960, 300), p * fade, anchor="c", dy=(1 - p) * 20)
    put(base, "end.tagline", ("jp", 44, 800), PAPER, (960, 540), ease_out(prog(t, 0.4, 0.6)) * fade, anchor="c")
    pu = ease_out(prog(t, 1.2, 0.6)) * fade
    put(base, "end.url", ("lat", 40, "SemiBold"), VERMILION, (960, 650), pu, anchor="c")
    if pu > 0:
        ImageDraw.Draw(base).rectangle((900, 630, 1020, 633), fill=VERMILION + (int(255 * pu),))
    put(base, "end.note", ("jp", 20, 500), MUTED, (960, 960), ease_out(prog(t, 1.8, 0.6)) * fade, anchor="c")


CARDS = {"overview": overview, "title": title, "formats": formats, "runtime": runtime, "bench-time": bench_time,
         "bench-core": bench_core, "bench-more": bench_more, "bench-conditions": bench_conditions, "notes": notes, "end": end}
