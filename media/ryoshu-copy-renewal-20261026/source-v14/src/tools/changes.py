"""Per-chunk frame-change analysis of the genuine captures (read-only). For every frame: mean abs diff vs previous frame
(grayscale) and the bounding box of changed pixels (threshold 24). Output JSON used to detect first-visible events."""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

UI = Path(sys.argv[1])
out = {}
for d in sorted(p for p in UI.iterdir() if p.is_dir()):
    rows = [json.loads(l) for l in (d / "frames.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()]
    prev, res = None, []
    for i, r in enumerate(rows):
        g = np.asarray(Image.open(d / r["file"]).convert("L"), dtype=np.int16)
        if prev is None:
            res.append({"i": i, "t": r["metadata"]["timestamp"], "diff": None})
        else:
            m = np.abs(g - prev) > 24
            if m.any():
                ys, xs = np.nonzero(m)
                box = [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]
            else:
                box = None
            res.append({"i": i, "t": r["metadata"]["timestamp"], "diff": round(float(m.mean()) * 100, 3), "box": box})
        prev = g
    out[d.name] = res
Path(sys.argv[2]).write_text(json.dumps(out), encoding="utf-8")
print("chunks", len(out))
