"""Render entry for the Ryoshu 102 s main promo (16:9).

Usage (run with the Python from requirements.json):
    python render.py                 # 102 s film + poster + audio stems + QC + run record
    python render.py --stills 5 9.5  # preview stills only -> build/stills/
Input lookup: $RYOSHU_INPUT, else ./input, ../input, ../../input (see copydeck.py).
Outputs go to <source>/../deliver and <source>/../build ($RYOSHU_OUT overrides the root).
"""
import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import audio  # noqa: E402
import copydeck  # noqa: E402
import qc  # noqa: E402
from common import BUILD, DELIVER, encoder  # noqa: E402

NAME = "ryoshu-promo-102s"
POSTER_T = 9.6  # process overview fully built


def sha(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def snapshot():
    files = sorted(p for p in HERE.rglob("*") if p.is_file() and "__pycache__" not in p.parts)
    src = {p.relative_to(HERE).as_posix(): sha(p) for p in files}
    inp = {f"input/{n}": sha(copydeck.INPUT / n) for n in ("new-real-ui.mp4",)}
    return {"source": src, "input": inp}


def make_renderer():
    import promo102
    return promo102.Renderer()


def render_video(out_noaudio):
    copydeck.reset()
    r = make_renderer()
    n = int(round(r.DURATION * r.FPS))
    enc = encoder(out_noaudio, r.W, r.H)
    for f in range(n):
        enc.stdin.write(r.frame(f / r.FPS).tobytes())
        if f % 300 == 0:
            print(f"  frame {f}/{n}", flush=True)
    r.close()
    enc.stdin.close()
    enc.wait()
    assert enc.returncode == 0


def mux(video, mix, out):
    p = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(video), "-i", str(mix), "-map", "0:v", "-map", "1:a",
                        "-c:v", "copy", "-af", "volume=2.2dB,alimiter=limit=0.85:level=false",
                        "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-ac", "2", "-shortest",
                        "-movflags", "+faststart", str(out)], capture_output=True, text=True)
    assert p.returncode == 0, p.stderr


def poster(t, out):
    copydeck.reset()
    r = make_renderer()
    img = r.frame(t)
    r.close()
    img.save(out)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stills", nargs="+", type=float)
    a = ap.parse_args()
    if a.stills:
        d = BUILD / "stills"
        d.mkdir(parents=True, exist_ok=True)
        r = make_renderer()
        for t in sorted(a.stills):
            copydeck.reset()
            r.frame(t).save(d / f"f_{t:06.2f}.png")
        r.close()
        return
    DELIVER.mkdir(parents=True, exist_ok=True)
    launch = dict(snapshot(), utc=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
    adir = BUILD / "audio"
    audio.make("promo102", adir)
    raw = BUILD / f"{NAME}_noaudio.mp4"
    print("render", NAME, flush=True)
    render_video(raw)
    out = DELIVER / f"{NAME}.mp4"
    mux(raw, adir / "mix.wav", out)
    copydeck.verify_and_dump(DELIVER / f"{NAME}.rendered-copy.json", NAME, {"media": out.name})
    p = poster(POSTER_T, DELIVER / f"{NAME}.poster.png")
    copydeck.verify_and_dump(DELIVER / f"{NAME}.poster.rendered-copy.json", NAME + " poster",
                             {"media": p.name, "frame_time_s": POSTER_T})
    for w in ("music.wav", "sfx.wav", "mix.wav"):
        shutil.copyfile(adir / w, DELIVER / f"{NAME}.{w}")
    rep = qc.check(out, BUILD / "qc")
    done = dict(snapshot(), utc=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
    rec = {"video": out.name, "launch": launch, "completion": done,
           "source_unchanged_during_render": launch["source"] == done["source"],
           "input_unchanged_during_render": launch["input"] == done["input"],
           "outputs": {f.name: sha(f) for f in sorted(DELIVER.iterdir()) if f.is_file()},
           "qc_pass": rep["pass"]}
    (BUILD / "run-record.json").write_text(json.dumps(rec, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"done": out.name, "unchanged": rec["source_unchanged_during_render"], "qc": rep["pass"]}))


if __name__ == "__main__":
    main()
