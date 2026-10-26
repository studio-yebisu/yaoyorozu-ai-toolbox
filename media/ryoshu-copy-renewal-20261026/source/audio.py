"""Original score and sound effects (NumPy synthesis, no samples, no downloads).

Instruments and the 94-second arrangement come from the previous promo's
make_audio.py; the 32-second arrangement reuses the same instruments and
chord loop. Writes 48 kHz 16-bit stereo music/sfx/mix WAVs.
"""
import wave

import numpy as np

SR = 48000
rng = np.random.default_rng(20261026)


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env_adsr(n, a, r):
    t = np.arange(n) / SR
    e = np.minimum(1.0, t / max(a, 1e-4))
    if (n / SR) - r > 0:
        e *= np.clip((n / SR - t) / max(r, 1e-4), 0, 1)
    return e


def lowpass(x, cutoff):
    f = np.fft.rfftfreq(x.shape[0], 1 / SR)
    g = 1 / np.sqrt(1 + (f / cutoff) ** 4)
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
    j0 = max(0, -i)
    j1 = min(len(s), buf.shape[0] - i)
    buf[i + j0:i + j1] += s[j0:j1] * gain


# --- instruments -------------------------------------------------------------
def pad_voice(notes, dur, bright=1800.0):
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
    out = lowpass(out, bright)
    out *= env_adsr(n, 0.9, 1.4)[:, None]
    return out / (len(notes) * 3.0)


def pluck(m, dur=0.5, bright=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = mtof(m)
    e = np.exp(-t * 9) * np.minimum(1, t / 0.003)
    v = np.sin(2 * np.pi * f * t) + 0.35 * bright * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 18)
    v += 0.12 * bright * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t * 30)
    return v * e * 0.5


def kick():
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    f = 46 + 90 * np.exp(-t * 28)
    v = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7.5)
    v += 0.25 * bandpass(rng.standard_normal(n), 1500, 6000) * np.exp(-t * 300)
    return v * 0.9


def hat(open_=False):
    n = int((0.18 if open_ else 0.05) * SR)
    t = np.arange(n) / SR
    return bandpass(rng.standard_normal(n), 7000, 16000) * np.exp(-t * (22 if open_ else 80)) * 0.22


def clap():
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    noise = bandpass(rng.standard_normal(n), 900, 5200)
    e = np.zeros(n)
    for k, d in enumerate((0.0, 0.011, 0.022)):
        e += (t >= d) * np.exp(-np.maximum(t - d, 0) * (120 if k < 2 else 16))
    return noise * e * 0.28


def sub(m, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    v = np.sin(2 * np.pi * mtof(m) * t) + 0.15 * np.sin(2 * np.pi * 2 * mtof(m) * t)
    return v * env_adsr(n, 0.01, 0.08) * 0.32


CHORDS = [
    (38, [62, 66, 69, 73, 76], [74, 78, 81, 85]),   # Dmaj9
    (35, [59, 62, 66, 69, 76], [71, 74, 78, 81]),   # Bm11
    (31, [59, 62, 66, 67, 74], [71, 74, 79, 83]),   # Gmaj9
    (33, [61, 64, 66, 69, 71], [73, 76, 81, 83]),   # A6/9
]


def arrange(duration, bpm, groove, fast, clap_from, breakdown, final_at, heartbeat):
    """One chord per bar. groove/fast/breakdown/heartbeat: (start, end) in seconds."""
    N = int(duration * SR)
    beat = 60.0 / bpm
    bar_len = 4 * beat
    mus = np.zeros((N, 2))
    duck = np.ones(N)
    for bar in range(int(duration / bar_len)):
        t0 = bar * bar_len
        root, voicing, arp = CHORDS[bar % 4]
        final = t0 >= final_at
        if final and t0 > final_at:
            continue
        brk = breakdown[0] <= t0 < breakdown[1]
        pv = pad_voice(CHORDS[0][1] + [81] if final else voicing, min(8.0, duration - t0) if final else bar_len + 0.6,
                       bright=900 if t0 < heartbeat[0] else (1400 if brk else 2200))
        add(mus, pv, t0, gain=0.55 if t0 >= heartbeat[0] else 0.4)
        in_groove = groove[0] <= t0 < groove[1]
        if t0 >= heartbeat[0] and not final:
            step = beat / 4 if in_groove else beat / 2
            pattern = [0, 2, 1, 3, 2, 0, 3, 1]
            for k in range(int(bar_len / step)):
                note = arp[pattern[k % 8]] + (12 if (in_groove and k % 8 == 7) else 0)
                g = (0.28 if in_groove else 0.22) * (1.0 if k % 4 == 0 else 0.65)
                add(mus, pluck(note, 0.45, 1.0 if in_groove else 0.6), t0 + k * step,
                    pan=0.35 * np.sin(k * 0.9), gain=g)
        if in_groove:
            add(mus, sub(root, bar_len), t0, gain=1.0)
            for b in range(4):
                tb = t0 + b * beat
                add(mus, kick(), tb, gain=0.85)
                i = int(tb * SR)
                L = int(0.28 * SR)
                seg = duck[i:i + L]
                duck[i:i + L] = np.minimum(seg, 0.45 + 0.55 * np.linspace(0, 1, len(seg)) ** 0.6)
                add(mus, hat(), tb + beat / 2, pan=0.25, gain=1.0)
                if fast[0] <= t0 < fast[1]:
                    add(mus, hat(), tb + beat / 4, pan=-0.3, gain=0.6)
                    add(mus, hat(), tb + 3 * beat / 4, pan=-0.3, gain=0.6)
                if t0 >= clap_from and b in (1, 3):
                    add(mus, clap(), tb, pan=-0.05, gain=0.9)
            if bar % 4 == 3:
                add(mus, hat(True), t0 + 1.75, pan=0.2, gain=0.8)
        if heartbeat[0] <= t0 < heartbeat[1] and bar % 2 == 0:
            add(mus, kick(), t0, gain=0.5)
    for k, m in enumerate([74, 78, 81, 86, 88]):  # final motif
        add(mus, pluck(m, 1.6, 0.7), final_at + k * beat / 2, pan=-0.3 + 0.15 * k, gain=0.3)
    mus *= duck[:, None] ** 0.8
    tail = np.clip((duration - 0.3 - np.arange(N) / SR) / min(4.0, duration - final_at), 0, 1)
    return mus * tail[:, None]


# --- sound effects -----------------------------------------------------------
def whoosh(length=0.55):
    n = int(length * SR)
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    hop = 512
    win = np.hanning(hop * 2)
    for i in range(0, n - hop * 2, hop):
        centre = 400 + 5200 * np.sin(np.pi * i / n) ** 2
        out[i:i + hop * 2] += bandpass(noise[i:i + hop * 2] * win, centre * 0.6, centre * 1.6)
    return out * np.sin(np.pi * np.linspace(0, 1, n)) ** 2 * 0.35


def impact():
    n = int(0.9 * SR)
    t = np.arange(n) / SR
    f = 38 + 60 * np.exp(-t * 18)
    v = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 4.5)
    v += 0.18 * lowpass(rng.standard_normal(n), 2500) * np.exp(-t * 25)
    return v * 0.55


def tick():
    n = int(0.03 * SR)
    t = np.arange(n) / SR
    v = np.sin(2 * np.pi * 2600 * t) * np.exp(-t * 260) + 0.4 * bandpass(rng.standard_normal(n), 3000, 9000) * np.exp(-t * 400)
    return v * 0.22


def click():
    n = int(0.05 * SR)
    t = np.arange(n) / SR
    a = np.sin(2 * np.pi * 1700 * t) * np.exp(-t * 350)
    b = np.sin(2 * np.pi * 1200 * t) * np.exp(-np.maximum(t - 0.018, 0) * 420) * (t > 0.018)
    return (a + 0.6 * b) * 0.3


def stamp():
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    v = np.sin(2 * np.pi * (90 + 70 * np.exp(-t * 40)) * t) * np.exp(-t * 14)
    v += 0.3 * bandpass(rng.standard_normal(n), 200, 1800) * np.exp(-t * 60)
    return v * 0.5


def build_sfx(duration, mod):
    sfx = np.zeros((int(duration * SR), 2))
    for k, t in enumerate(mod.WHOOSH):
        add(sfx, whoosh(), t - 0.15, pan=(-0.4 if k % 2 else 0.4), gain=0.9)
    for t in mod.IMPACT:
        add(sfx, impact(), t, gain=0.8)
    for k, t in enumerate(mod.TYPE_TICKS):
        add(sfx, tick(), t, pan=-0.2 + 0.1 * (k % 5), gain=1.0)
    for t in mod.ui_clicks():
        add(sfx, click(), t, pan=0.1, gain=0.9)
    for t in mod.STAMPS:
        add(sfx, stamp(), t, gain=0.9)
    return sfx


def write_wav(path, x):
    data = (np.clip(x, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


def soft_limit(x, ceiling=0.89):
    return ceiling * np.tanh(x / ceiling)


def make(kind, out_dir):
    """kind: 'promo94' or 'studio32'. Returns path of mix.wav."""
    global rng
    rng = np.random.default_rng(20261026)
    if kind == "promo94":
        import promo94 as mod
        music = arrange(94.0, 120, groove=(12, 74), fast=(18, 26), clap_from=26, breakdown=(74, 86),
                        final_at=86, heartbeat=(4, 12))
    else:
        import studio32 as mod
        music = arrange(32.0, 120, groove=(4, 28), fast=(6, 10), clap_from=10, breakdown=(28, 28),
                        final_at=28, heartbeat=(0.0001, 4))
    sfx = build_sfx(mod.DURATION, mod)
    music *= 0.6 / (np.max(np.abs(music)) + 1e-9)
    sfx *= 0.7 / (np.max(np.abs(sfx)) + 1e-9)
    mix = soft_limit(music * 0.85 + sfx * 0.8)
    out_dir.mkdir(parents=True, exist_ok=True)
    write_wav(out_dir / "music.wav", soft_limit(music))
    write_wav(out_dir / "sfx.wav", soft_limit(sfx))
    write_wav(out_dir / "mix.wav", mix)
    return out_dir / "mix.wav"
