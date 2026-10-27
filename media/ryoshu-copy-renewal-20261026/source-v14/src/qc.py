"""Encoded-file QC: ffprobe streams, full decode, decoded-audio stats, and frames grabbed FROM THE ENCODED MP4 before /
at / after every detected event plus every benchmark card (review sheets for visual inspection).
  python qc.py <film.mp4> <edit-manifest.json> <out_dir>"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

mp4, manifest, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
out.mkdir(parents=True, exist_ok=True)
m = json.loads(manifest.read_text(encoding="utf-8"))
probe = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(mp4)],
                                  capture_output=True, text=True, check=True).stdout)
v = next(s for s in probe["streams"] if s["codec_type"] == "video")
a = next(s for s in probe["streams"] if s["codec_type"] == "audio")
dec = subprocess.run(["ffmpeg", "-v", "error", "-i", str(mp4), "-f", "null", "-"], capture_output=True, text=True)
pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", str(mp4), "-f", "f32le", "-ac", "2", "-ar", "48000", "-"], capture_output=True).stdout
x = np.frombuffer(pcm, "<f4").reshape(-1, 2)
peak = float(np.max(np.abs(x)))
audio = {"finite": bool(np.isfinite(x).all()), "peak": round(peak, 4), "peak_dbfs": round(20 * np.log10(peak + 1e-12), 2),
         "rms_dbfs": round(20 * np.log10(float(np.sqrt(np.mean(x ** 2))) + 1e-12), 2), "samples_at_or_over_0dBFS": int(np.sum(np.abs(x) >= 1.0)),
         "seconds": round(x.shape[0] / 48000, 3)}


def grab(t, name):
    p = out / name
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{max(t, 0):.3f}", "-i", str(mp4), "-frames:v", "1", str(p)], check=True)
    return p


rows = []
for e in m["events"]:
    trio = [grab(e["out_t"] + d, f"ev_{e['id']}_{tag}.png") for d, tag in ((-0.25, "before"), (0.05, "at"), (0.6, "after"))]
    rows.append((e["id"], trio))
cards = [grab(s["out"][0] + min(5.0, (s["out"][1] - s["out"][0]) - 0.6), f"card_{s['id']}.png") for s in m["scenes"]
         if s["id"].startswith("bench") or s["id"] in ("formats", "runtime")]


def sheet(name, groups):
    W = 640
    img = Image.new("RGB", (W * 3, len(groups) * 380), (30, 30, 30))
    d = ImageDraw.Draw(img)
    for r, (label, ps) in enumerate(groups):
        for c, p in enumerate(ps):
            img.paste(Image.open(p).convert("RGB").resize((W, 360)), (c * W, r * 380 + 20))
            d.text((c * W + 6, r * 380 + 4), f"{label} {p.stem}", fill=(255, 255, 0))
    img.save(out / name)


for k in range(0, len(rows), 4):
    sheet(f"events_{k // 4}.png", rows[k:k + 4])
sheet("cards.png", [("cards", cards[i:i + 3]) for i in range(0, len(cards), 3)])
rep = {"video": {k: v.get(k) for k in ("codec_name", "profile", "width", "height", "pix_fmt", "r_frame_rate", "nb_frames")},
       "audio_stream": {k: a.get(k) for k in ("codec_name", "sample_rate", "channels", "channel_layout", "bit_rate")},
       "duration_s": float(probe["format"]["duration"]), "full_decode_ok": dec.returncode == 0 and not dec.stderr.strip(),
       "decode_stderr": dec.stderr[-500:], "decoded_audio": audio,
       "expect": {"size": "1920x1080", "fps": "30/1", "pix_fmt": "yuv420p", "codec": "h264", "audio": "aac 48000 2ch"}}
rep["pass"] = (v["codec_name"] == "h264" and (v["width"], v["height"]) == (1920, 1080) and v["pix_fmt"] == "yuv420p" and v["r_frame_rate"] == "30/1"
               and a["codec_name"] == "aac" and a["sample_rate"] == "48000" and a["channels"] == 2 and rep["full_decode_ok"]
               and audio["finite"] and audio["samples_at_or_over_0dBFS"] == 0)
(out / "qc-report.json").write_text(json.dumps(rep, indent=1) + "\n", encoding="utf-8")
print(json.dumps({"pass": rep["pass"], "duration": rep["duration_s"], "audio": audio}))
