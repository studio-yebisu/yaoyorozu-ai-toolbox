"""Review sheet: images -> 2 columns at 960x540 with filename labels. argv: out.png img..."""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

out, imgs = Path(sys.argv[1]), [Path(p) for p in sys.argv[2:]]
rows = (len(imgs) + 1) // 2
sheet = Image.new("RGB", (1920, rows * 560), (40, 40, 40))
d = ImageDraw.Draw(sheet)
for k, p in enumerate(imgs):
    im = Image.open(p).convert("RGB").resize((960, 540))
    x, y = (k % 2) * 960, (k // 2) * 560
    sheet.paste(im, (x, y + 20))
    d.text((x + 6, y + 4), p.name, fill=(255, 255, 0))
sheet.save(out)
