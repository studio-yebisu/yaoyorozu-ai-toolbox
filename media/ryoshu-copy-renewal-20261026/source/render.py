"""Render entry for the Ryoshu copy-renewal videos.

Usage (run with the Python from requirements.json):
    python render.py                      # all four 32 s variants + posters + QC
    python render.py --variants wide portrait-credited
    python render.py --promo94            # the 94 s promo
    python render.py --stills wide 1.5 12 # QC stills only -> build/stills/
Input lookup: $RYOSHU_INPUT, else ./input, ../input, ../../input (see copydeck.py).
Outputs go to <source>/../deliver and <source>/../build ($RYOSHU_OUT overrides the root).
"""
import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import audio  # noqa: E402
import copydeck  # noqa: E402
import qc  # noqa: E402
from common import BUILD, DELIVER, encoder  # noqa: E402

VARIANTS = {
    "wide": ("wide", False, "ryoshu-32s-wide"),
    "wide-credited": ("wide", True, "ryoshu-32s-wide-credited-ja"),
    "portrait": ("portrait", False, "ryoshu-32s-portrait"),
    "portrait-credited": ("portrait", True, "ryoshu-32s-portrait-credited-ja"),
}
POSTER_T = 11.6  # three-column results with the review phase line


def make_renderer(variant):
    if variant == "promo94":
        import promo94
        return promo94.Renderer()
    import studio32
    layout, credited, _ = VARIANTS[variant]
    return studio32.Renderer(studio32.WIDE if layout == "wide" else studio32.PORTRAIT, credited)


def render_video(variant, out_noaudio):
    copydeck.reset()
    r = make_renderer(variant)
    n = int(round(r.DURATION * r.FPS))
    enc = encoder(out_noaudio, r.W, r.H)
    for f in range(n):
        enc.stdin.write(r.frame(f / r.FPS).tobytes())
        if f % 150 == 0:
            print(f"  {variant}: frame {f}/{n}", flush=True)
    r.close()
    enc.stdin.close()
    enc.wait()
    assert enc.returncode == 0


def mux(video, mix, out):
    p = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(video), "-i", str(mix), "-map", "0:v", "-map", "1:a",
                        "-c:v", "copy", "-af", "volume=2.2dB,alimiter=limit=0.85:level=false",
                        "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-shortest", "-movflags", "+faststart",
                        str(out)], capture_output=True, text=True)
    assert p.returncode == 0, p.stderr


def poster(variant, t, out):
    copydeck.reset()
    r = make_renderer(variant)
    img = r.frame(t)
    r.close()
    if out.suffix == ".webp":
        img.save(out, "WEBP", quality=92, method=6)
    else:
        img.save(out)
    return out


def run(variant, video_name, deck_file, poster_ext=None):
    DELIVER.mkdir(parents=True, exist_ok=True)
    kind = "promo94" if variant == "promo94" else "studio32"
    mix = BUILD / "audio" / kind / "mix.wav"
    if not mix.exists():
        audio.make(kind, mix.parent)
    raw = BUILD / f"{video_name}_noaudio.mp4"
    print("render", variant, flush=True)
    render_video(variant, raw)
    out = DELIVER / f"{video_name}.mp4"
    mux(raw, mix, out)
    copydeck.verify_and_dump(DELIVER / f"{video_name}.rendered-copy.json", video_name,
                             {"deck": f"input/{deck_file}", "media": out.name})
    if poster_ext:
        pt = POSTER_T if variant != "promo94" else 10.0
        p = poster(variant, pt, DELIVER / f"{video_name}.{poster_ext}")
        copydeck.verify_and_dump(DELIVER / f"{video_name}.poster.rendered-copy.json", video_name + " poster",
                                 {"deck": f"input/{deck_file}", "media": p.name, "frame_time_s": pt})
    adir = DELIVER / "audio" / kind
    adir.mkdir(parents=True, exist_ok=True)
    for w in ("music.wav", "sfx.wav", "mix.wav"):
        shutil.copyfile(mix.parent / w, adir / w)
    qc.check(out, BUILD / "qc" / video_name)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--variants", nargs="*", default=list(VARIANTS))
    ap.add_argument("--promo94", action="store_true")
    ap.add_argument("--stills", nargs="+")
    a = ap.parse_args()
    if a.stills:
        v, times = a.stills[0], [float(x) for x in a.stills[1:]]
        d = BUILD / "stills" / v
        d.mkdir(parents=True, exist_ok=True)
        for t in times:
            copydeck.reset()
            r = make_renderer(v)
            r.frame(t).save(d / f"f_{t:05.2f}.png")
            r.close()
        return
    if a.promo94:
        run("promo94", "ryoshu-promo-94s", "promo-copy-deck.json", "png")
        return
    for v in a.variants:
        layout, credited, name = VARIANTS[v]
        run(v, name, "studio-copy-deck.json", None if credited else "webp")
    print(json.dumps({"done": a.variants}))


if __name__ == "__main__":
    main()
