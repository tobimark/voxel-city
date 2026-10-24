"""Offline preview of the tilt-shift / miniature effect on a city screenshot.

This is the still-image proof for the look the browser post-process should aim
at: screen-space focus band -> variable defocus -> photographic grade.
The HUD is masked back on so the result matches a browser: post-processing only
touches the WebGL canvas while the DOM UI stays crisp.

Usage:
  python docs/miniature-study/make-preview.py
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
SRC = ROOT / "harbor-study" / "preview.jpg"

# HUD rectangles that must stay sharp (x0, y0, x1, y1, radius).
HUD_RECTS = [
    (14, 22, 294, 148, 16),     # logo panel + city/filters tabs
    (1028, 6, 1272, 124, 16),   # simulation status + weather panel
    (16, 556, 292, 708, 16),    # time / day panel
    (336, 644, 1272, 712, 10),  # bottom toolbar + hints
]

VARIANTS = {
    "LIGHT": dict(band=0.11, feather=0.45, max_blur=0.009, saturation=1.10,
                  contrast=1.04, warmth=0.006,
                  bloom=0.20, aberration=0.0008, grain=0.004, vignette=0.10),
    "MEDIUM": dict(band=0.09, feather=0.38, max_blur=0.013, saturation=1.15,
                   contrast=1.05, warmth=0.008,
                   bloom=0.25, aberration=0.0010, grain=0.005, vignette=0.15),
    "HEAVY": dict(band=0.07, feather=0.30, max_blur=0.018, saturation=1.18,
                  contrast=1.06, warmth=0.010,
                  bloom=0.28, aberration=0.0012, grain=0.006, vignette=0.20),
}

RADII = np.arange(0, 26, 2, dtype=np.float32)


def smoothstep(edge0, edge1, x):
    t = np.clip((x - edge0) / (edge1 - edge0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def build_hud_mask(size):
    w, h = size
    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)
    for x0, y0, x1, y1, radius in HUD_RECTS:
        draw.rounded_rectangle((x0, y0, x1, y1), radius=radius, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(1.4))
    return np.asarray(mask, dtype=np.float32)[..., None] / 255.0


def bilinear(channel, sx, sy, w, h):
    x0 = np.floor(sx).astype(np.int32)
    y0 = np.floor(sy).astype(np.int32)
    dx, dy = sx - x0, sy - y0
    x1, y1 = np.clip(x0 + 1, 0, w - 1), np.clip(y0 + 1, 0, h - 1)
    x0, y0 = np.clip(x0, 0, w - 1), np.clip(y0, 0, h - 1)
    return (channel[y0, x0] * (1 - dx) * (1 - dy) + channel[y0, x1] * dx * (1 - dy)
            + channel[y1, x0] * (1 - dx) * dy + channel[y1, x1] * dx * dy)


def tilt_shift(arr, stack, variant, w, h, hud_mask, focus=0.5):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    px = (xx + 0.5) / w - 0.5
    py = (yy + 0.5) / h - 0.5

    # 1. screen-space focus band -> circle of confusion
    coc = smoothstep(variant["band"], variant["band"] + variant["feather"],
                     np.abs(py - (focus - 0.5)))
    sigma = coc * variant["max_blur"] * w

    # 2. variable-radius defocus: mix pre-blurred copies per pixel
    weights = np.clip(1.0 - np.abs(RADII - sigma[..., None]) / 2.0, 0.0, None)
    weights /= np.maximum(weights.sum(-1, keepdims=True), 1e-6)
    out = np.zeros_like(arr)
    for i in range(len(RADII)):
        out += weights[..., i, None] * stack[i]

    # 3. photographic grade: toy colour, gentle contrast, warm, vignette
    luma = out @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    out = luma[..., None] + (out - luma[..., None]) * variant["saturation"]
    out = (out - 0.5) * variant["contrast"] + 0.5
    out *= np.array([1.0 + variant["warmth"], 1.0, 1.0 - variant["warmth"] * 0.7],
                    dtype=np.float32)
    out *= (1.0 - variant["vignette"]
            * smoothstep(0.05, 0.5, px * px + py * py))[..., None]
    out = np.clip(out, 0.0, 1.0)

    # 4. small lens cues: glow, chromatic aberration, grain
    if variant["bloom"] > 0.0:
        bright = np.clip(out - 0.74, 0.0, None)
        bright_img = Image.fromarray((np.clip(bright, 0, 1) * 255).astype(np.uint8))
        glow = np.asarray(bright_img.filter(ImageFilter.GaussianBlur(20)),
                          dtype=np.float32) / 255.0
        out = 1.0 - (1.0 - out) * (1.0 - glow * variant["bloom"])

    ca = variant["aberration"]
    if ca > 0.0:
        for channel, factor in ((0, 1.0 + ca), (2, 1.0 - ca)):
            sx = w * (0.5 + px * factor) - 0.5
            sy = h * (0.5 + py * factor) - 0.5
            out[..., channel] = bilinear(out[..., channel], sx, sy, w, h)

    if variant["grain"] > 0.0:
        rng = np.random.default_rng(7)
        out += rng.normal(0.0, variant["grain"], out.shape[:2])[..., None]

    # 5. put the crisp DOM HUD back on top
    out = np.clip(out, 0.0, 1.0)
    return out * (1.0 - hud_mask) + arr * hud_mask


def save_sheet(images, labels, path):
    tile_w, tile_h, gap, header = 960, 540, 10, 52
    sheet = Image.new("RGB", (tile_w * 2 + gap, (tile_h + header) * 2 + gap), "#0d1218")
    font = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 24)
    draw = ImageDraw.Draw(sheet)
    for index, (image, label) in enumerate(zip(images, labels)):
        x = (index % 2) * (tile_w + gap)
        y = (index // 2) * (tile_h + header + gap)
        sheet.paste(image.resize((tile_w, tile_h), Image.Resampling.LANCZOS),
                    (x, y + header))
        draw.text((x + 20, y + 12), label, fill="#e6eef6", font=font)
    sheet.save(path, quality=94)


def main():
    img = Image.open(SRC).convert("RGB")
    w, h = img.size
    arr = np.asarray(img, dtype=np.float32) / 255.0
    hud_mask = build_hud_mask((w, h))
    stack = np.stack(
        [arr if r == 0 else np.asarray(img.filter(ImageFilter.GaussianBlur(float(r))),
                                      dtype=np.float32) / 255.0
         for r in RADII]
    )

    tiles, labels = [img], ["原图 / ORIGINAL"]
    for name, variant in VARIANTS.items():
        print("render", name)
        graded = tilt_shift(arr, stack, variant, w, h, hud_mask)
        tile = Image.fromarray((graded * 255.0 + 0.5).astype(np.uint8))
        tiles.append(tile)
        labels.append(f"{name}  最大模糊 {variant['max_blur'] * 100:.1f}%")
        tile.save(HERE / f"preview-{name.lower()}.jpg", quality=94)

    save_sheet(tiles, labels, HERE / "preview-before-after.jpg")
    print("wrote preview-before-after.jpg")


if __name__ == "__main__":
    main()
