"""Original music + SFX for the 1.4 film (NumPy synthesis; no samples, no downloads).
Instruments and chord loop are my own from the adopted 102/126 films (input/prior-opus-source/audio.py); the arrangement
is new and follows this film's scenes on a 120 bpm grid. SFX are cued to scene cuts, caption reveals and the DETECTED
first-visible UI event frames. 48 kHz stereo; music/sfx/mix stems."""
from __future__ import annotations

import wave

import numpy as np

SR = 48000
BPM = 120
BEAT = 60 / BPM
BAR = 4 * BEAT
rng = np.random.default_rng(20261027)

CHORDS = [(38, [62, 66, 69, 73, 76], [74, 78, 81, 85]), (35, [59, 62, 66, 69, 76], [71, 74, 78, 81]),
          (31, [59, 62, 66, 67, 74], [71, 74, 79, 83]), (33, [61, 64, 66, 69, 71], [73, 76, 81, 83])]


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env(n, a, r):
    t = np.arange(n) / SR
    e = np.minimum(1.0, t / max(a, 1e-4))
    if n / SR - r > 0:
        e *= np.clip((n / SR - t) / max(r, 1e-4), 0, 1)
    return e


def lowpass(x, fc):
    f = np.fft.rfftfreq(x.shape[0], 1 / SR)
    g = 1 / np.sqrt(1 + (f / fc) ** 4)
    X = np.fft.rfft(x, axis=0)
    X *= g[:, None] if x.ndim == 2 else g
    return np.fft.irfft(X, n=x.shape[0], axis=0)


def bandpass(x, lo, hi):
    f = np.fft.rfftfreq(x.shape[0], 1 / SR)
    g = (1 / np.sqrt(1 + (lo / np.maximum(f, 1)) ** 4)) * (1 / np.sqrt(1 + (f / hi) ** 4))
    return np.fft.irfft(np.fft.rfft(x) * g, n=x.shape[0])


def add(buf, sig, t0, pan=0.0, gain=1.0):
    i = int(round(t0 * SR))
    if i >= buf.shape[0] or i + len(sig) <= 0:
        return
    s = sig if sig.ndim == 2 else np.stack([sig * np.sqrt(0.5 * (1 - pan)), sig * np.sqrt(0.5 * (1 + pan))], 1)
    j0, j1 = max(0, -i), min(len(s), buf.shape[0] - i)
    buf[i + j0:i + j1] += s[j0:j1] * gain


def pad(notes, dur, bright):
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros((n, 2))
    for m in notes:
        for ch, det in ((0, -5), (1, 5)):
            f0 = mtof(m) * 2 ** (det / 1200)
            ph = rng.uniform(0, 2 * np.pi)
            v = np.zeros(n)
            for h in range(1, 9):
                if f0 * h > 9000:
                    break
                v += np.sin(2 * np.pi * f0 * h * t + ph * h) / h
            out[:, ch] += v
    return lowpass(out, bright) * env(n, 0.9, 1.4)[:, None] / (len(notes) * 3.0)


def pluck(m, dur=0.45, bright=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = mtof(m)
    v = np.sin(2 * np.pi * f * t) + 0.35 * bright * np.sin(4 * np.pi * f * t) * np.exp(-t * 18) + 0.12 * bright * np.sin(6 * np.pi * f * t) * np.exp(-t * 30)
    return v * np.exp(-t * 9) * np.minimum(1, t / 0.003) * 0.5


def kick():
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    v = np.sin(2 * np.pi * np.cumsum(46 + 90 * np.exp(-t * 28)) / SR) * np.exp(-t * 7.5)
    return (v + 0.25 * bandpass(rng.standard_normal(n), 1500, 6000) * np.exp(-t * 300)) * 0.9


def hat(open_=False):
    n = int((0.18 if open_ else 0.05) * SR)
    t = np.arange(n) / SR
    return bandpass(rng.standard_normal(n), 7000, 16000) * np.exp(-t * (22 if open_ else 80)) * 0.22


def clap():
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    e = sum((t >= d) * np.exp(-np.maximum(t - d, 0) * (120 if k < 2 else 16)) for k, d in enumerate((0.0, 0.011, 0.022)))
    return bandpass(rng.standard_normal(n), 900, 5200) * e * 0.28


def sub(m, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * mtof(m) * t) + 0.15 * np.sin(4 * np.pi * mtof(m) * t)) * env(n, 0.01, 0.08) * 0.32


def whoosh(length=0.55):
    n = int(length * SR)
    noise, out, hop = rng.standard_normal(n), np.zeros(n), 512
    win = np.hanning(hop * 2)
    for i in range(0, n - hop * 2, hop):
        c = 400 + 5200 * np.sin(np.pi * i / n) ** 2
        out[i:i + hop * 2] += bandpass(noise[i:i + hop * 2] * win, c * 0.6, c * 1.6)
    return out * np.sin(np.pi * np.linspace(0, 1, n)) ** 2 * 0.35


def impact():
    n = int(0.9 * SR)
    t = np.arange(n) / SR
    v = np.sin(2 * np.pi * np.cumsum(38 + 60 * np.exp(-t * 18)) / SR) * np.exp(-t * 4.5)
    return (v + 0.18 * lowpass(rng.standard_normal(n), 2500) * np.exp(-t * 25)) * 0.55


def tick():
    n = int(0.03 * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 2600 * t) * np.exp(-t * 260) + 0.4 * bandpass(rng.standard_normal(n), 3000, 9000) * np.exp(-t * 400)) * 0.22


def click():
    n = int(0.05 * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1700 * t) * np.exp(-t * 350) + 0.6 * np.sin(2 * np.pi * 1200 * t) * np.exp(-np.maximum(t - 0.018, 0) * 420) * (t > 0.018)) * 0.3


def confirm():
    """Two-note rising chime for the genuine confirmation event."""
    out = np.zeros(int(0.7 * SR))
    for k, m in enumerate((86, 93)):
        s = pluck(m, 0.6, 0.5)
        i = int(k * 0.09 * SR)
        out[i:i + len(s)] += s[: len(out) - i]
    return out * 0.6


def stamp():
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * (90 + 70 * np.exp(-t * 40)) * t) * np.exp(-t * 14) + 0.3 * bandpass(rng.standard_normal(n), 200, 1800) * np.exp(-t * 60)) * 0.5


ROLE = {"opener": "intro", "overview": "heartbeat", "local": "heartbeat", "title": "heartbeat", "ch01": "groove", "ch02": "groove",
        "ch03": "groove", "ch04": "groove", "ch05": "groove", "formats": "lift", "runtime": "calm", "bench-time": "data",
        "bench-core": "data", "bench-more": "data", "bench-conditions": "data", "notes": "calm", "end": "final"}


def music(tl):
    global rng
    rng = np.random.default_rng(20261027)
    dur = tl["duration"]
    N = int(dur * SR) + SR
    mus, duck = np.zeros((N, 2)), np.ones(N)
    fast = [(s["out"][0], s["out"][1]) for s in tl["shots"] if s["badge_speed"]]
    role_at = lambda t: next((ROLE.get(s["id"], "calm") for s in tl["scenes"] if s["out"][0] <= t < s["out"][1]), "final")
    end_t = next(s["out"][0] for s in tl["scenes"] if s["id"] == "end")
    bar = 0
    t0 = 0.0
    while t0 < end_t - 1e-6:
        role = role_at(t0 + 0.01)
        root, voicing, arp = CHORDS[bar % 4]
        bright = {"intro": 900, "heartbeat": 1400, "groove": 2200, "lift": 2600, "calm": 1400, "data": 1500}.get(role, 1400)
        add(mus, pad(voicing, BAR + 0.6, bright), t0, gain=0.4 if role == "intro" else 0.55)
        if role != "intro":
            groove = role in ("groove", "lift")
            step = BEAT / 4 if groove else BEAT / 2
            pat = [0, 2, 1, 3, 2, 0, 3, 1]
            for k in range(int(BAR / step)):
                note = arp[pat[k % 8]] + (12 if (groove and k % 8 == 7) else 0)
                g = (0.26 if groove else 0.2) * (1.0 if k % 4 == 0 else 0.62)
                add(mus, pluck(note, 0.45, 1.0 if groove else 0.6), t0 + k * step, pan=0.35 * np.sin(k * 0.9), gain=g)
        if role in ("groove", "lift"):
            add(mus, sub(root, BAR), t0, gain=1.0)
            infast = any(a <= t0 < b for a, b in fast)
            for b in range(4):
                tb = t0 + b * BEAT
                add(mus, kick(), tb, gain=0.82)
                i, L = int(tb * SR), int(0.28 * SR)
                seg = duck[i:i + L]
                duck[i:i + L] = np.minimum(seg, 0.45 + 0.55 * np.linspace(0, 1, len(seg)) ** 0.6)
                add(mus, hat(), tb + BEAT / 2, pan=0.25)
                if infast:
                    add(mus, hat(), tb + BEAT / 4, pan=-0.3, gain=0.6)
                    add(mus, hat(), tb + 3 * BEAT / 4, pan=-0.3, gain=0.6)
                if b in (1, 3) and role == "groove":
                    add(mus, clap(), tb, pan=-0.05, gain=0.75)
            if bar % 4 == 3:
                add(mus, hat(True), t0 + 1.75, pan=0.2, gain=0.8)
        elif role in ("heartbeat", "data") and bar % 2 == 0:
            add(mus, kick(), t0, gain=0.45)
        bar += 1
        t0 += BAR
    add(mus, pad(CHORDS[0][1] + [81], dur - end_t + 0.5, 1800), end_t, gain=0.55)
    for k, m in enumerate([74, 78, 81, 86, 88]):
        add(mus, pluck(m, 1.6, 0.7), end_t + k * BEAT / 2, pan=-0.3 + 0.15 * k, gain=0.3)
    mus = mus[: int(dur * SR)] * duck[: int(dur * SR), None] ** 0.8
    n = mus.shape[0]
    tail = np.clip((dur - 0.3 - np.arange(n) / SR) / 4.0, 0, 1)
    return mus * tail[:, None]


def cues(tl):
    c = {"whoosh": [], "impact": [], "tick": [], "click": [], "confirm": [], "stamp": [], "speed_tick": []}
    for s in tl["scenes"]:
        if s["out"][0] > 0:
            c["whoosh"].append(round(s["out"][0] - 0.4, 3))
            c["impact"].append(s["out"][0])
    for sh in tl["shots"]:
        if sh["cut_before"] and sh["out"][0] not in c["impact"]:
            c["tick"].append(sh["out"][0])          # hard cut at a capture gap: light tick, no dissolve
        if sh["badge_speed"]:
            k = sh["out"][0]
            while k < sh["out"][1]:
                c["speed_tick"].append(round(k, 3))
                k += BEAT / 2
    for e in tl["events"]:
        c[e["sfx"]].append(e["out_t"])
    for cap in tl["captions"]:
        c["tick"].append(cap["start"])
    for s in tl["scenes"]:
        if s["id"] in ("title", "end"):
            c["stamp"].append(s["out"][0])
    return {k: sorted(v) for k, v in c.items()}


def sfx(tl, cue):
    global rng
    rng = np.random.default_rng(20261028)
    out = np.zeros((int(tl["duration"] * SR), 2))
    for k, t in enumerate(cue["whoosh"]):
        add(out, whoosh(), t, pan=(-0.4 if k % 2 else 0.4), gain=0.85)
    for t in cue["impact"]:
        add(out, impact(), t, gain=0.75)
    for k, t in enumerate(cue["tick"]):
        add(out, tick(), t, pan=-0.2 + 0.1 * (k % 5))
    for t in cue["click"]:
        add(out, click(), t - 1 / 30, pan=0.1, gain=1.0)     # lead by 1 frame: the press precedes the visible change
    for t in cue["confirm"]:
        add(out, confirm(), t, pan=0.05, gain=1.0)
    for t in cue["speed_tick"]:
        add(out, tick(), t, pan=0.3, gain=0.35)
    for t in cue["stamp"]:
        add(out, stamp(), t, gain=0.85)
    return out


def soft_limit(x, ceiling=0.89):
    return ceiling * np.tanh(x / ceiling)


def make(tl):
    m = music(tl)
    cue = cues(tl)
    s = sfx(tl, cue)
    m *= 0.6 / (np.max(np.abs(m)) + 1e-9)
    s *= 0.7 / (np.max(np.abs(s)) + 1e-9)
    return {"music": soft_limit(m), "sfx": soft_limit(s), "mix": soft_limit(m * 0.85 + s * 0.8), "cues": cue}


def write_wav(path, x):
    data = (np.clip(x, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


def stats(x):
    peak = float(np.max(np.abs(x)))
    rms = float(np.sqrt(np.mean(x ** 2)))
    return {"finite": bool(np.isfinite(x).all()), "peak": round(peak, 4), "peak_dbfs": round(20 * np.log10(peak + 1e-12), 2),
            "rms_dbfs": round(20 * np.log10(rms + 1e-12), 2), "clipped_samples": int(np.sum(np.abs(x) >= 0.9999)),
            "samples": int(x.shape[0]), "seconds": round(x.shape[0] / SR, 3)}
