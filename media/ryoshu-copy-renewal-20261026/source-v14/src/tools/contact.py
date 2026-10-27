"""Contact sheet of genuine raw frames (half size, 3 columns) for visual verification. argv: ui_dir out.png chunk:idx ..."""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ui, out, specs = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3:]
cols = 3
rows = (len(specs) + cols - 1) // cols
sheet = Image.new("RGB", (640 * cols, 380 * rows), (30, 30, 30))
d = ImageDraw.Draw(sheet)
for k, s in enumerate(specs):
    chunk, idx = s.rsplit(":", 1)
    im = Image.open(ui / chunk / f"frame-{int(idx):06d}.jpg").convert("RGB").resize((640, 360))
    x, y = (k % cols) * 640, (k // cols) * 380
    sheet.paste(im, (x, y + 20))
    d.text((x + 6, y + 4), s, fill=(255, 255, 0))
sheet.save(out)
