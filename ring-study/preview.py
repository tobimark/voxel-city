"""Draw a stylised top-down plan of the Ring Waterways map.

Run with the bundled Python:
  <python> ring-study/preview.py
Inputs: preview-plan.json (written by `node ring-study/preview.mjs`).
"""
import json
import math
import os

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = json.load(open(os.path.join(HERE, "preview-plan.json"), encoding="utf-8"))

SCALE = 26.0
MARGIN = 70
WORLD = 27.5
LEGEND_W = 300
W = int(WORLD * 2 * SCALE + MARGIN * 2 + LEGEND_W)
H = int(WORLD * 2 * SCALE + MARGIN * 2 + 60)
CX, CY = MARGIN + WORLD * SCALE, MARGIN + WORLD * SCALE
MAP_RIGHT = MARGIN + WORLD * 2 * SCALE


def font(size, bold=False):
    for path in [
        r"C:\Windows\Fonts\msyhbd.ttc" if bold else r"C:\Windows\Fonts\msyh.ttc",
        r"C:\Windows\Fonts\simhei.ttf",
    ]:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
    return ImageFont.load_default()


def p(x, z):
    return (CX + x * SCALE, CY + z * SCALE)


def poly(draw, points, fill=None, outline=None, width=1):
    pts = [p(*v) for v in points]
    draw.polygon(pts, fill=fill)
    if outline:
        draw.line(pts + [pts[0]], fill=outline, width=width)


image = Image.new("RGB", (W, H), "#12303a")
draw = ImageDraw.Draw(image, "RGBA")

# Water: a soft radial gradient plus a faint grid of currents.
for radius in range(int(WORLD * SCALE) + 60, 0, -18):
    t = radius / (WORLD * SCALE + 60)
    colour = (int(18 + 26 * (1 - t)), int(48 + 42 * (1 - t)), int(58 + 46 * (1 - t)))
    draw.ellipse([CX - radius, CY - radius, CX + radius, CY + radius], fill=colour)
for ring in range(1, 6):
    draw.ellipse(
        [CX - ring * 4.4 * SCALE, CY - ring * 4.4 * SCALE, CX + ring * 4.4 * SCALE, CY + ring * 4.4 * SCALE],
        outline=(255, 255, 255, 12),
        width=1,
    )

# Land: island gear + mainland bridgehead, with a foam line just offshore.
for land in DATA["land"]:
    poly(draw, land, fill="#6f6a58", outline="#a49a80", width=3)
    for i in range(len(land)):
        ax, az = land[i]
        bx, bz = land[(i + 1) % len(land)]
        dx, dz = bx - ax, bz - az
        length = math.hypot(dx, dz) or 1
        nx, nz = dz / length, -dx / length
        draw.line(
            [p(ax + nx * 0.55, az + nz * 0.55), p(bx + nx * 0.55, bz + nz * 0.55)],
            fill=(214, 236, 230, 120),
            width=4,
        )

# Causeway: a real bridge deck with edge beams, piers and railings.
map_cfg = DATA["map"]
bridge_from, bridge_to = map_cfg["tip"] + 0.15, map_cfg["causewayZ"]
deck_half = 0.9
draw.line([p(0, DATA["map"]["ringC"]), p(0, bridge_from)], fill="#3b424c", width=int(1.6 * SCALE))
poly(
    draw,
    [(-deck_half, bridge_from), (deck_half, bridge_from), (deck_half, bridge_to), (-deck_half, bridge_to)],
    fill="#4a505a",
    outline="#d8cdb0",
    width=2,
)
for z in range(int(bridge_from * 2) + 1, int(bridge_to * 2)):
    if z % 2:
        draw.line([p(-deck_half, z / 2), p(deck_half, z / 2)], fill=(210, 200, 176, 90), width=2)
for side in (-1, 1):
    draw.line([p(side * (deck_half + 0.12), bridge_from), p(side * (deck_half + 0.12), bridge_to)], fill="#b3a68a", width=3)
    for z in range(int(bridge_from) + 1, int(bridge_to)):
        draw.line(
            [p(side * (deck_half + 0.12), z), p(side * (deck_half + 0.12), z + 0.55)],
            fill=(230, 222, 198, 190),
            width=2,
        )
for z in range(int(bridge_from) + 2, int(bridge_to) - 1, 4):
    draw.line([p(-0.5, z), p(0.5, z)], fill=(120, 112, 96, 160), width=3)

# Blocks coloured per district, then their houses.
for block in DATA["blocks"]:
    colour = DATA["districts"][block["district"]]["color"]
    if block["kind"] == "plaza":
        colour = "#cfc6ad"
    poly(draw, block["polygon"], fill=colour, outline="#5d5a4d", width=2)
    for lot in block["lots"]:
        c, s = math.cos(lot["angle"]), math.sin(lot["angle"])
        w, d = lot["w"] / 2, lot["d"] / 2
        corners = [
            (lot["x"] + x * c + z * s, lot["z"] - x * s + z * c)
            for x, z in [(-w, -d), (w, -d), (w, d), (-w, d)]
        ]
        poly(draw, corners, fill="#e6dcc4", outline="#8b8064", width=1)
        # A tiny roof ridge so houses read at a glance.
        ridge = [
            (lot["x"] + x * c + z * s, lot["z"] - x * s + z * c)
            for x, z in [(-w * 0.8, 0), (w * 0.8, 0)]
        ]
        draw.line(ridge, fill="#b0a184", width=2)

# Roads: draw as ribbons from the plan.
for road in DATA["roads"]:
    if road["id"] == "causeway":
        continue  # drawn as a proper bridge above
    ax, az = road["a"]
    bx, bz = road["b"]
    length = math.hypot(bx - ax, bz - az)
    if length < 1e-6:
        continue
    ang = math.atan2(bz - az, bx - ax)
    nx, nz = -math.sin(ang) * road["width"] / 2, math.cos(ang) * road["width"] / 2
    quad = [(ax + nx, az + nz), (bx + nx, bz + nz), (bx - nx, bz - nz), (ax - nx, az - nz)]
    poly(draw, quad, fill="#3b424c")
    if road["kind"] in ("boulevard", "avenue"):
        draw.line([p(ax, az), p(bx, bz)], fill=(226, 214, 178, 120), width=2)

# Docks, slips and quays.
for pier in DATA["piers"]:
    ang = pier["angle"]
    c, s = math.cos(ang), math.sin(ang)
    half_l, half_w = pier["length"] / 2, pier["width"] / 2
    quad = [
        (pier["x"] - c * half_l - s * half_w, pier["z"] - s * half_l + c * half_w),
        (pier["x"] + c * half_l - s * half_w, pier["z"] + s * half_l + c * half_w),
        (pier["x"] + c * half_l + s * half_w, pier["z"] + s * half_l - c * half_w),
        (pier["x"] - c * half_l + s * half_w, pier["z"] - s * half_l - c * half_w),
    ]
    poly(draw, quad, fill="#c9b48c" if pier["kind"] == "slip" else "#b69b70", outline="#7d7154", width=1)

# Boats as little hulls.
for boat in DATA["boats"]:
    ang = boat["angle"] + math.pi / 2
    c, s = math.cos(ang), math.sin(ang)
    size = 0.34
    hull = [
        (boat["x"] - c * size * 1.4, boat["z"] - s * size * 1.4),
        (boat["x"] - s * size * 0.7, boat["z"] + c * size * 0.7),
        (boat["x"] + c * size * 1.4, boat["z"] + s * size * 1.4),
        (boat["x"] + s * size * 0.7, boat["z"] - c * size * 0.7),
    ]
    poly(draw, hull, fill="#f2ede0", outline="#5d6b6b", width=1)

# The garden at the centre: paths, a ring walk, a fountain and trees, so the
# hub reads as a public space instead of a lawn.
park_r = DATA["map"]["parkRadius"]
for angle in (30, 90, 150, 210, 270, 330):
    a = math.radians(angle)
    draw.line([p(0, 0), p(math.cos(a) * park_r, math.sin(a) * park_r)], fill=(206, 196, 168, 210), width=5)
draw.ellipse(
    [CX - park_r * 0.62 * SCALE, CY - park_r * 0.62 * SCALE, CX + park_r * 0.62 * SCALE, CY + park_r * 0.62 * SCALE],
    outline=(206, 196, 168, 210),
    width=4,
)
draw.ellipse(
    [CX - 0.62 * SCALE, CY - 0.62 * SCALE, CX + 0.62 * SCALE, CY + 0.62 * SCALE],
    fill="#d5d1b7",
    outline="#8f9a86",
    width=2,
)
draw.ellipse(
    [CX - 0.34 * SCALE, CY - 0.34 * SCALE, CX + 0.34 * SCALE, CY + 0.34 * SCALE],
    fill="#8bc5b8",
)
for i in range(12):
    a = (i / 12) * math.pi * 2 + math.pi / 12
    tx, ty = p(math.cos(a) * (park_r - 0.45), math.sin(a) * (park_r - 0.45))
    draw.ellipse([tx - 7, ty - 7, tx + 7, ty + 7], fill="#5f8c4b", outline="#43652f", width=1)

# Civic square and landmark deck get paving so they do not read as vacant lots.
for block in DATA["blocks"]:
    if block["kind"] not in ("civic", "landmark"):
        continue
    cx, cz = block["center"]
    if block["kind"] == "civic":
        draw.ellipse(
            [p(cx, cz)[0] - 1.65 * SCALE, p(cx, cz)[1] - 1.65 * SCALE, p(cx, cz)[0] + 1.65 * SCALE, p(cx, cz)[1] + 1.65 * SCALE],
            fill=(214, 205, 182, 170),
            outline="#a99c7d",
            width=2,
        )
        fx, fy = p(cx, cz)
        draw.ellipse([fx - 9, fy - 9, fx + 9, fy + 9], fill="#8bc5b8", outline="#6d9c92", width=2)
        for angle in (0, 60, 120, 180, 240, 300):
            a = math.radians(angle)
            draw.line(
                [p(cx + math.cos(a) * 0.7, cz + math.sin(a) * 0.7), p(cx + math.cos(a) * 1.5, cz + math.sin(a) * 1.5)],
                fill=(206, 196, 168, 200),
                width=3,
            )
    else:
        lx = [v[0] for v in block["polygon"]]
        lz = [v[1] for v in block["polygon"]]
        half = min(max(lx) - min(lx), max(lz) - min(lz)) * 0.33
        draw.rectangle(
            [p(cx - half, cz - half), p(cx + half, cz + half)],
            fill=(222, 214, 194, 230),
            outline="#a99c7d",
            width=2,
        )
        for i in range(4):
            ex = cx - 2.2 + i * 1.45
            draw.ellipse([p(ex, cz - 2.05)[0] - 5, p(ex, cz - 2.05)[1] - 5, p(ex, cz - 2.05)[0] + 5, p(ex, cz - 2.05)[1] + 5], fill="#5f8c4b")
# Parks get planted: tree dots over the green, and a pond in the round garden.
for block in DATA["blocks"]:
    if block["kind"] == "park" and block["id"] != "G0":
        xs = [v[0] for v in block["polygon"]]
        zs = [v[1] for v in block["polygon"]]
        bcx, bcz = block["center"]
        for i in range(9):
            tx = bcx + ((min(xs) + (0.2 + 0.6 * ((i * 0.37) % 1)) * (max(xs) - min(xs))) - bcx) * 0.62
            tz = bcz + ((min(zs) + (0.2 + 0.6 * ((i * 0.61) % 1)) * (max(zs) - min(zs))) - bcz) * 0.62
            px, py = p(tx, tz)
            draw.ellipse([px - 6, py - 6, px + 6, py + 6], fill="#5f8c4b", outline="#43652f", width=1)

small = font(15)

# Title, legend and footer.
title = font(40, True)
draw.text((MARGIN, 14), "环形水城 · RING WATERWAYS", font=title, fill="#f6eedb")
draw.text((MARGIN + 2, 62), "圆形运河社区 · 同心环路 + 放射街道 + 十二条指状水岸", font=font(19), fill="#9fb3bf")
legend_left = MAP_RIGHT + 46
draw.text((legend_left, MARGIN + 4), "片区 / DISTRICTS", font=font(21, True), fill="#f2e9d8")
legend_y = MARGIN + 44
for key, district in DATA["districts"].items():
    if not any(b["district"] == key for b in DATA["blocks"]):
        continue
    draw.rounded_rectangle([legend_left, legend_y, legend_left + 20, legend_y + 20], radius=5, fill=district["color"])
    draw.text((legend_left + 30, legend_y - 3), district["name"], font=font(18, True), fill="#eee6d2")
    draw.text((legend_left + 30, legend_y + 19), district["en"], font=small, fill="#8fa3b5")
    legend_y += 52
legend_y += 6
draw.text((legend_left, legend_y), "图例 / LEGEND", font=font(21, True), fill="#f2e9d8")
legend_y += 40
for label, colour, note in [
    ("道路", "#3b424c", "环路 + 放射街"),
    ("住宅", "#e6dcc4", "地块内建筑"),
    ("码头 / 浮桥", "#b69b70", f"{DATA["diagnostics"]["piers"]} 处"),
    ("船只", "#f2ede0", f"{DATA["diagnostics"]["boats"]} 艘"),
    ("桥梁", "#4a505a", "南岸堤道"),
]:
    draw.rounded_rectangle([legend_left, legend_y, legend_left + 20, legend_y + 14], radius=3, fill=colour, outline="#5d6b6b")
    draw.text((legend_left + 30, legend_y - 4), label, font=font(16), fill="#eee6d2")
    draw.text((legend_left + 150, legend_y - 4), note, font=small, fill="#8fa3b5")
    legend_y += 30

stats = DATA["diagnostics"]
draw.text(
    (MARGIN, H - 34),
    f"{stats['blocks']} 个街坊 · {stats['buildings']} 栋建筑 · {stats['roads']} 段道路 · "
    f"{stats['piers']} 处码头 · {stats['boats']} 艘船 · {stats['openSpaces']} 处公园 / 广场",
    font=font(17),
    fill="#9fb3bf",
)

out = os.path.join(HERE, "preview-plan.png")
image.save(out)
print("wrote", out, image.size)
