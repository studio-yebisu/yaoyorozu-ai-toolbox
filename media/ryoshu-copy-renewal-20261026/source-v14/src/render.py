"""Ryoshu 1.4 film - render entry. Paths are relative to this file (portable).

  python render.py --stills T [T ...]       internal preview stills (scaffold deck: merged-v2), build/preview/
  python render.py --preview                internal full-length preview MP4 + stems (scaffold deck), build/preview/
  python render.py --final                  FINAL: refuses unless input/final-copy/root-adoption.json accepts final-deck.json
                                            (sha-bound) and the facts sha matches; writes deliver/ + build/ (never overwrites)
Every run records sha256 of source files, copy deck, facts and every raw frame used, at launch and at completion.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = Path(os.environ.get("RYOSHU_FILM_OUT") or HERE.parent)
sys.path.insert(0, str(HERE))

from film import audio, cards, deck, draw  # noqa: E402
from film import footage as F  # noqa: E402
from film.timeline import build  # noqa: E402

NAME = "ryoshu-1.4-film"
FPS = 30


def sha(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def timeline():
    tl = build()
    loc = next(s for s in tl["scenes"] if s["id"] == "local")
    loc["chapter"] = ["chapter.local.number", "chapter.local.label"]
    tl["captions"].append({"slot": "caption.local", "scene": "local", "start": round(loc["out"][0] + 0.2, 4), "end": loc["out"][1], "gate_event": None})
    tl["captions"].sort(key=lambda c: c["start"])
    return tl


def snapshot(dk, tl):
    src = {p.relative_to(HERE).as_posix(): sha(p) for p in sorted(HERE.rglob("*.py")) if "__pycache__" not in p.parts}
    used = sorted({(s["chunk"], i) for s in tl["shots"] for i in range(s["a"], s["b"] + 1)} |
                  {(n[1], n[2]) for n in cards.NODES} | {("02-results", 7)})
    raw = {F.pointer(c, i): sha(F.UI / c / F.frames(c)[i]["file"]) for c, i in used}
    return {"source": src, "deck": {"file": dk.path.name, "mode": dk.mode, "sha256": sha(dk.path)}, "facts_sha256": sha(deck.FACTS),
            "raw_frames_sha256": hashlib.sha256(json.dumps(raw, sort_keys=True).encode()).hexdigest(), "raw_frame_count": len(raw)}


class Renderer:
    def __init__(self, dk):
        draw.Ctx.deck = dk
        self.tl = timeline()
        cards.check_values()
        foot = [s for s in self.tl["scenes"] if s["kind"] == "footage"]
        ov = next(s for s in self.tl["scenes"] if s["id"] == "overview")
        self.honesty = (ov["out"][0] + 0.2, foot[-1]["out"][1])

    def frame(self, t):
        draw.Ctx.t = t
        base = draw.background().copy()
        sc = next((s for s in self.tl["scenes"] if s["out"][0] <= t < s["out"][1]), self.tl["scenes"][-1])
        rel = t - sc["out"][0]
        dur = sc["out"][1] - sc["out"][0]
        if sc["id"] == "opener":
            cards.opener(base, rel)
        elif sc["kind"] == "graphic":
            cards.CARDS[sc["id"]](base, rel, dur)
        else:
            draw.draw_footage(base, self.tl, t, sc)
            draw.draw_strip(base, self.tl, t, sc)
        if sc["id"] != "title":
            draw.draw_honesty(base, t, *self.honesty)
        return base.convert("RGB")


def encode(r, path, preset="slow", crf="16", scale=None):
    n = int(round(r.tl["duration"] * FPS))
    vf = ["-vf", f"scale={scale}"] if scale else []
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1920x1080", "-r", str(FPS), "-i", "-",
                            *vf, "-c:v", "libx264", "-preset", preset, "-crf", crf, "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(path)],
                           stdin=subprocess.PIPE)
    for f in range(n):
        enc.stdin.write(r.frame(f / FPS).tobytes())
        if f % 900 == 0:
            print(f"  frame {f}/{n}", flush=True)
    enc.stdin.close()
    assert enc.wait() == 0
    return n


def mux(video, mix, out):
    p = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(video), "-i", str(mix), "-map", "0:v", "-map", "1:a", "-c:v", "copy",
                        "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-ac", "2", "-shortest", "-movflags", "+faststart", str(out)],
                       capture_output=True, text=True)
    assert p.returncode == 0, p.stderr


def make_audio(tl, d):
    d.mkdir(parents=True, exist_ok=True)
    st = audio.make(tl)
    for k in ("music", "sfx", "mix"):
        audio.write_wav(d / f"{k}.wav", st[k])
    rep = {"stats": {k: audio.stats(st[k]) for k in ("music", "sfx", "mix")}, "cues": st["cues"],
           "wav_sha256": {k: sha(d / f"{k}.wav") for k in ("music", "sfx", "mix")}}
    (d / "audio-report.json").write_text(json.dumps(rep, indent=1) + "\n", encoding="utf-8")
    return rep


def grab(mp4, t, out):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.3f}", "-i", str(mp4), "-frames:v", "1", str(out)], check=True)
    return out


def edit_manifest(r):
    tl = r.tl
    shots = []
    for s in tl["shots"]:
        rec = {k: v for k, v in s.items() if k != "spec"}
        rec["cam"] = [list(k) for k in s["cam"]]
        shots.append(rec)
    marks = []
    for m in tl["marks"]:
        sh = tl["shots"][m["shot"]]
        cam = F.cam_at(sh["spec"]["cam"], m["out"][0] - sh["out"][0])
        x0, y0, x1, y1 = F.src_rect_to_win(m["rect"], cam, draw.WIN_W, draw.WIN_H)
        marks.append({**m, "out_rect_px": [round(draw.WIN_X + x0, 1), round(draw.WIN_Y + y0, 1), round(draw.WIN_X + x1, 1), round(draw.WIN_Y + y1, 1)],
                      "inside_crop": F.inside(m["rect"], cam), "cam_at_start": [round(v, 2) for v in cam]})
    return {"duration_s": tl["duration"], "fps": FPS, "size": [1920, 1080], "transform": "src px -> crop (cx,cy,w; h=w*9/16) -> window (160,44,1600,900); rings use the same mapping",
            "scenes": tl["scenes"], "shots": shots, "events": tl["events"], "captions": tl["captions"], "marks": marks,
            "capture_discontinuities": [{"before_shot_out_s": s["out"][0], "chunk": s["chunk"], "note": s["cut_before"]} for s in tl["shots"] if s["cut_before"]]}


def cmd_stills(times, mode):
    dk = deck.Deck(mode)
    r = Renderer(dk)
    d = ROOT / "build" / "preview" / ("stills" if mode == "scaffold" else "candidate-stills-PRIVATE")
    d.mkdir(parents=True, exist_ok=True)
    for t in times:
        r.frame(t).save(d / f"s_{t:07.3f}.png")
    print("duration", r.tl["duration"], "->", d)


def cmd_preview():
    dk = deck.Deck("scaffold")
    r = Renderer(dk)
    d = ROOT / "build" / "preview"
    d.mkdir(parents=True, exist_ok=True)
    launch = snapshot(dk, r.tl)
    rep = make_audio(r.tl, d / "audio")
    raw = d / "preview_noaudio.mp4"
    encode(r, raw, preset="veryfast", crf="20")
    mux(raw, d / "audio" / "mix.wav", d / "PREVIEW-scaffold.mp4")
    (d / "edit-manifest.json").write_text(json.dumps(edit_manifest(r), ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    (d / "rendered-copy.json").write_text(json.dumps(dk.rendered_copy(), ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    rec = {"PRIVATE_PREVIEW": "scaffold deck merged-v2; not a deliverable", "launch": launch, "completion": snapshot(dk, r.tl), "audio": rep["stats"]}
    (d / "preview-record.json").write_text(json.dumps(rec, indent=1) + "\n", encoding="utf-8")
    print("preview", d / "PREVIEW-scaffold.mp4", r.tl["duration"])


def cmd_final():
    st = deck.gate_status()
    if not st["open"]:
        raise SystemExit("FINAL COPY GATE CLOSED: " + "; ".join(st["errors"]))
    deliver, build_d = ROOT / "deliver", ROOT / "build" / "final"
    if deliver.exists() and any(deliver.iterdir()):
        raise SystemExit("deliver/ is not empty; drafts are never overwritten")
    deliver.mkdir(parents=True, exist_ok=True)
    build_d.mkdir(parents=True, exist_ok=True)
    dk = deck.Deck("final")
    r = Renderer(dk)
    launch = dict(snapshot(dk, r.tl), utc=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
    rep = make_audio(r.tl, build_d / "audio")
    raw = build_d / "video_noaudio.mp4"
    nframes = encode(r, raw)
    out = deliver / f"{NAME}.mp4"
    mux(raw, build_d / "audio" / "mix.wav", out)
    for k in ("music", "sfx", "mix"):
        shutil.copyfile(build_d / "audio" / f"{k}.wav", deliver / f"{NAME}.{k}.wav")
    (deliver / f"{NAME}.rendered-copy.json").write_text(json.dumps({"deck": dk.path.name, "deck_sha256": dk.sha, "facts_sha256": deck.FACTS_SHA,
                                                                   "items": dk.rendered_copy()}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    poster_t = next(s for s in r.tl["scenes"] if s["id"] == "overview")["out"][0] + 6.0
    dk.shown.clear()
    r.frame(poster_t).save(deliver / f"{NAME}.poster.png")
    (deliver / f"{NAME}.poster.rendered-copy.json").write_text(json.dumps({"frame_time_s": poster_t, "items": dk.rendered_copy()},
                                                                          ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    (deliver / f"{NAME}.edit-manifest.json").write_text(json.dumps(edit_manifest(r), ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    done = dict(snapshot(dk, r.tl), utc=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
    unchanged = {k: launch[k] == done[k] for k in ("source", "deck", "facts_sha256", "raw_frames_sha256")}
    run = {"video": out.name, "frames": nframes, "launch": launch, "completion": done, "unchanged_during_render": unchanged,
           "gate": {k: st[k] for k in ("open", "deck_sha256")}, "audio": rep}
    (build_d / "run-record.json").write_text(json.dumps(run, indent=1) + "\n", encoding="utf-8")
    files = [{"file": f.name, "sha256": sha(f), "bytes": f.stat().st_size} for f in sorted(deliver.iterdir())]
    (deliver / "delivery-map.json").write_text(json.dumps({"film": out.name, "files": files, "inputs": {"final_deck_sha256": dk.sha,
                                                          "facts_sha256": deck.FACTS_SHA, "raw_frames_sha256": done["raw_frames_sha256"]},
                                                          "source_sha256": done["source"], "unchanged_during_render": unchanged}, indent=1) + "\n", encoding="utf-8")
    print(json.dumps({"done": out.name, "unchanged": unchanged}))


def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--stills", nargs="+", type=float)
    g.add_argument("--preview", action="store_true")
    g.add_argument("--candidate-stills", nargs="+", type=float)
    g.add_argument("--final", action="store_true")
    a = ap.parse_args()
    if a.stills:
        cmd_stills(a.stills, "scaffold")
    elif a.candidate_stills:
        cmd_stills(a.candidate_stills, "candidate")
    elif a.preview:
        cmd_preview()
    else:
        cmd_final()


if __name__ == "__main__":
    main()
