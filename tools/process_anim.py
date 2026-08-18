"""Chroma-key generated enemy animation frames into engine-ready sprites."""
from pathlib import Path
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from process_assets import HEIGHTS, chroma_key, crop_alpha, scale_h

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "assets" / "_anim"
SPR = ROOT / "assets" / "sprites"

TYPES = ("asura", "oni", "hoplite", "draugr", "mummy", "anubis")
POSES = tuple([f"walk{i}" for i in range(1, 13)] + ["atk1", "atk2"])


def foot_cx(im: Image.Image) -> float:
    arr = np.asarray(im)
    band = arr[int(arr.shape[0] * 0.72) :, :, 3] > 12
    xs = np.where(band)[1]
    if len(xs) == 0:
        return im.width * 0.5
    return float(xs.mean())


def plant(im: Image.Image, canvas_w: int, canvas_h: int) -> Image.Image:
    out = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    x = int(round(canvas_w * 0.5 - foot_cx(im)))
    y = canvas_h - im.height
    out.paste(im, (x, y), im)
    return out


def main() -> None:
    n = 0
    for typ in TYPES:
        h = HEIGHTS[typ]
        folder = RAW / f"{typ}_raw"
        if not folder.exists():
            continue
        frames = []
        for pose in POSES:
            src = folder / f"{pose}.jpg"
            if not src.exists():
                src = folder / f"{pose}.png"
            if not src.exists():
                continue
            frames.append((pose, scale_h(crop_alpha(chroma_key(Image.open(src))), h)))
        if not frames:
            continue
        idle = SPR / f"{typ}.png"
        idle_im = Image.open(idle).convert("RGBA") if idle.exists() else None
        max_w = max(im.width for _, im in frames)
        if idle_im:
            max_w = max(max_w, idle_im.width)
        max_w += 8
        for pose, im in frames:
            out = plant(im, max_w, h)
            dest = SPR / f"{typ}_{pose}.png"
            out.save(dest)
            print("spr", dest.name, out.size)
            n += 1
    print("done", n)


if __name__ == "__main__":
    main()
