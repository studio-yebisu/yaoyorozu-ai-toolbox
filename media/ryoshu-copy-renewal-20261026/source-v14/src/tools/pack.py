"""Build the small portable source/provenance pack (machine JSON only; no prose, fonts, raw JPEGs, models or private logs).
  python tools/pack.py <deliver_dir>"""
import hashlib
import json
import platform
import re
import shutil
import subprocess
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parents[1]
deliver = Path(sys.argv[1])
pack = deliver / (sys.argv[2] if len(sys.argv) > 2 else "source-pack-final")
NAME = "ryoshu-1.4-film"
MANIFESTS = [f"{NAME}.edit-manifest.json", f"{NAME}.rendered-copy.json", f"{NAME}.poster.rendered-copy.json"]  # exact names
if pack.exists():
    raise SystemExit("source-pack exists; never overwritten")
(pack / "src").mkdir(parents=True)
for p in sorted(SRC.rglob("*.py")):
    if "__pycache__" in p.parts:
        continue
    dst = pack / "src" / p.relative_to(SRC)
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(p, dst)
for name in MANIFESTS:
    src = deliver / name
    if not src.is_file():
        raise SystemExit(f"missing exact manifest: {name}")
    shutil.copyfile(src, pack / name)
    if (pack / name).read_bytes() != src.read_bytes():
        raise SystemExit(f"copy mismatch: {name}")
sys.path.insert(0, str(SRC))
from film import deck  # noqa: E402

import PIL  # noqa: E402
import numpy  # noqa: E402

ff = subprocess.run(["ffmpeg", "-version"], capture_output=True, text=True).stdout.splitlines()[0]
req = {"schema": "ryoshu.film14.requirements/1",
       "python": platform.python_version(), "pillow": PIL.__version__, "numpy": numpy.__version__, "ffmpeg": ff.split(" Copyright")[0],
       "fonts_not_bundled": ["NotoSansJP-VF.ttf (SIL OFL 1.1)", "bahnschrift.ttf (bundled with Windows; not redistributed)"],
       "font_dir_env": "RYOSHU_FONTS (default C:/Windows/Fonts/)",
       "inputs_relative_to_input_dir": {
           "fresh100/fresh100-approved-facts.json": deck.FACTS_SHA,
           "final-copy/final-deck.json": deck.gate_status().get("deck_sha256"),
           "final-copy/root-adoption.json": hashlib.sha256((deck.FINAL_DIR / "root-adoption.json").read_bytes()).hexdigest() if (deck.FINAL_DIR / "root-adoption.json").exists() else None,
           "new-ui/<chunk>/frames.jsonl + frame-*.jpg": "genuine IAB captures (not bundled); per-frame sha256 set hash in run-record raw_frames_sha256"},
       "reproduce": {"cwd": "source-pack", "env": {"RYOSHU_FILM_INPUT": "<path to input dir>", "RYOSHU_FILM_OUT": "<new empty output dir>"},
                     "argv": ["python", "-I", "-B", "src/render.py", "--final"]},
       "qc_argv": ["python", "-I", "-B", "src/qc.py", "<out>/deliver/ryoshu-1.4-film.mp4", "<out>/deliver/ryoshu-1.4-film.edit-manifest.json", "<out>/build/qc"],
       "licenses": {"source": "authored for Studio Yebisu's Ryoshu film; license per the Ryoshu repository (root decides)",
                    "music_sfx": "original NumPy synthesis in src/film/audio.py (no samples)", "copy": "Kimi-authored deck, used verbatim"}}
(pack / "requirements.json").write_text(json.dumps(req, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
files = {p.relative_to(pack).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(pack.rglob("*")) if p.is_file()}
(pack / "pack-manifest.json").write_text(json.dumps(files, indent=1) + "\n", encoding="utf-8")
sep = r"[/\\]"
leak = re.compile("(" + "|".join(["M:" + sep, "Co" + "dex" + sep + "Projects", "Us" + "ers" + sep + "owner", "llamacpp" + "-migration"]) + ")", re.I)
bad = [f for f in pack.rglob("*") if f.is_file() and leak.search(f.read_text(encoding="utf-8", errors="ignore"))]
if bad:
    raise SystemExit(f"private path leaked into pack: {[b.name for b in bad]}")
print(json.dumps({"files": len(files)}))
