"""Chroma-key magenta sprites and export engine-ready PNGs."""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "assets" / "_raw"
SPR = ROOT / "assets" / "sprites"
BG = ROOT / "assets" / "bg"
UI = ROOT / "assets" / "ui"
SPR.mkdir(parents=True, exist_ok=True)
BG.mkdir(parents=True, exist_ok=True)
UI.mkdir(parents=True, exist_ok=True)

# Target draw heights in pixels (after crop).
HEIGHTS = {
    "hero_idle": 168,
    "hero_jump": 168,
    "hero_shoot": 168,
    "hero_hurt": 168,
    "hero_crouch": 118,
    "hero_run1": 168,
    "hero_run2": 168,
    "hero_run3": 168,
    "hero_run4": 168,
    "missile": 44,
    "dark_missile": 44,
    "lotus_hp": 40,
    "platform": 78,
    "asura": 156,
    "preta": 138,
    "oni": 168,
    "kitsune": 128,
    "hoplite": 150,
    "bird": 120,
    "draugr": 156,
    "wraith": 140,
    "mummy": 150,
    "anubis": 158,
    "mara": 280,
    "orochi": 250,
    "minotaur": 250,
    "fenrir": 210,
    "apep": 240,
}

BACKGROUNDS = {
    "bg_naraka.jpg": "naraka.jpg",
    "bg_japan.jpg": "japan.jpg",
    "bg_greece.jpg": "greece.jpg",
    "bg_norse.jpg": "norse.jpg",
    "bg_egypt.jpg": "egypt.jpg",
    "title.jpg": "title.jpg",
}


def chroma_key(im: Image.Image) -> Image.Image:
    rgba = im.convert("RGBA")
    arr = np.asarray(rgba).astype(np.float32)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    diff = np.maximum(mx - mn, 1e-5)
    # Hue in degrees, 0–360.
    hue = np.zeros_like(r)
    mask_r = (mx == r) & (mx != mn)
    mask_g = (mx == g) & (mx != mn)
    mask_b = (mx == b) & (mx != mn)
    hue[mask_r] = np.mod((g[mask_r] - b[mask_r]) / diff[mask_r], 6.0)
    hue[mask_g] = (b[mask_g] - r[mask_g]) / diff[mask_g] + 2.0
    hue[mask_b] = (r[mask_b] - g[mask_b]) / diff[mask_b] + 4.0
    hue = hue * 60.0
    sat = np.where(mx > 0, diff / np.maximum(mx, 1e-5), 0.0)
    # True backdrop magenta sits near hue 300 with high saturation.
    is_magenta = ((hue >= 278) & (hue <= 332)) & (sat > 0.28) & (mx > 140) & (g < 150)
    dist = np.sqrt((r - 255.0) ** 2 + (g - 0.0) ** 2 + (b - 255.0) ** 2)
    key = is_magenta | (dist < 48)
    alpha = arr[..., 3]
    alpha[key] = 0
    fringe = (~key) & ((hue >= 275) & (hue <= 335)) & (sat > 0.18) & (g < 170)
    t = np.clip((sat[fringe] - 0.18) / 0.45, 0, 1)
    alpha[fringe] *= 1.0 - t * 0.85
    # Light despill only on remaining magenta-ish edge pixels, not gold.
    spill = (~key) & ((hue >= 280) & (hue <= 330)) & (sat > 0.15) & (alpha > 0)
    reduce = np.clip((b[spill] - g[spill]) * 0.35, 0, 50)
    arr[spill, 2] = np.clip(arr[spill, 2] - reduce, 0, 255)
    arr[..., 3] = alpha
    return Image.fromarray(arr.astype(np.uint8), "RGBA")


def crop_alpha(im: Image.Image, pad: int = 8) -> Image.Image:
    arr = np.asarray(im)
    ys, xs = np.where(arr[..., 3] > 12)
    if len(xs) == 0:
        return im
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(im.width, x1 + pad)
    y1 = min(im.height, y1 + pad)
    return im.crop((x0, y0, x1, y1))


def scale_h(im: Image.Image, height: int) -> Image.Image:
    if im.height == height:
        return im
    w = max(1, round(im.width * (height / im.height)))
    return im.resize((w, height), Image.Resampling.LANCZOS)


def main():
    for src_name, dst_name in BACKGROUNDS.items():
        src = RAW / src_name
        if src.exists():
            im = Image.open(src).convert("RGB")
            im.save(BG / dst_name, quality=90)
            print("bg", dst_name, im.size)

    for name, h in HEIGHTS.items():
        src = RAW / f"{name}.jpg"
        if not src.exists():
            print("MISSING", src.name)
            continue
        keyed = chroma_key(Image.open(src))
        cropped = crop_alpha(keyed)
        out = scale_h(cropped, h)
        dest = UI / f"{name}.png" if name in ("lotus_hp",) else SPR / f"{name}.png"
        dest.parent.mkdir(parents=True, exist_ok=True)
        out.save(dest)
        print("spr", dest.name, out.size)


if __name__ == "__main__":
    main()
