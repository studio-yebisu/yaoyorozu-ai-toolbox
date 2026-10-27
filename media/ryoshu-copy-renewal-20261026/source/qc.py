"""Technical checks on a finished MP4: probe, full decode, loudness, silence, black, stills."""
import json
import re
import subprocess
from pathlib import Path


def run(args):
    return subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace")


def check(mp4, qc_dir, still_times=None):
    qc_dir = Path(qc_dir)
    qc_dir.mkdir(parents=True, exist_ok=True)
    probe = json.loads(run(["ffprobe", "-v", "error", "-show_entries",
                            "format=duration,size:stream=codec_type,codec_name,profile,width,height,r_frame_rate,"
                            "nb_frames,duration,sample_rate,channels,pix_fmt", "-of", "json", str(mp4)]).stdout)
    dec = run(["ffmpeg", "-v", "error", "-i", str(mp4), "-f", "null", "-"])
    loud = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(mp4), "-af", "ebur128=peak=true", "-vn", "-f", "null", "-"])
    summ = loud.stderr[loud.stderr.rfind("Summary:"):]
    vol = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(mp4), "-af", "volumedetect", "-vn", "-f", "null", "-"])
    sil = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(mp4), "-af", "silencedetect=n=-50dB:d=1.0", "-vn",
               "-f", "null", "-"])
    blk = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(mp4), "-vf", "blackdetect=d=0.5:pix_th=0.05", "-an",
               "-f", "null", "-"])
    streams = probe["streams"]
    v = next(s for s in streams if s["codec_type"] == "video")
    a = [s for s in streams if s["codec_type"] == "audio"]
    m = re.search(r"max_volume: (-?[\d.]+) dB", vol.stderr)
    mean = re.search(r"mean_volume: (-?[\d.]+) dB", vol.stderr)
    rep = {
        "file": Path(mp4).name,
        "format_duration_s": float(probe["format"]["duration"]),
        "size_bytes": int(probe["format"]["size"]),
        "video": v,
        "audio": a,
        "full_decode_errors": dec.stderr.strip() or None,
        "full_decode_returncode": dec.returncode,
        "audio_max_volume_db": float(m.group(1)) if m else None,
        "audio_mean_volume_db": float(mean.group(1)) if mean else None,
        "ebur128_summary": [ln.strip() for ln in summ.splitlines() if ln.strip()],
        "silences_over_1s_below_-50dB": re.findall(r"silence_(?:start|end)[^\n]*", sil.stderr),
        "black_segments_over_0.5s": re.findall(r"black_start[^\n]*", blk.stderr),
    }
    rep["pass"] = bool(
        v["codec_name"] == "h264" and v["pix_fmt"] == "yuv420p" and a and a[0]["codec_name"] == "aac"
        and dec.returncode == 0 and not dec.stderr.strip() and rep["audio_max_volume_db"] is not None
        and rep["audio_max_volume_db"] > -20 and not rep["silences_over_1s_below_-50dB"])
    dur = rep["format_duration_s"]
    times = still_times or [round(dur * k / 12 + 0.5, 2) for k in range(12)]
    for t in times:
        run(["ffmpeg", "-v", "error", "-y", "-ss", str(t), "-i", str(mp4), "-frames:v", "1",
             str(qc_dir / f"qc_{t:05.2f}.png")])
    (qc_dir / "report.json").write_text(json.dumps(rep, ensure_ascii=False, indent=2), encoding="utf-8")
    print(Path(mp4).name, "pass" if rep["pass"] else "CHECK", rep["audio_max_volume_db"], "dB max")
    return rep
