"""Compose labelled contact sheets from the offline skyscraper renders.

Run with the bundled Python:
  <python> docs/skyscrapers/compose.py
"""
import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
FONT_CANDIDATES = [
    r"C:\Windows\Fonts\msyh.ttc",
    r"C:\Windows\Fonts\msyhbd.ttc",
    r"C:\Windows\Fonts\simhei.ttf",
]

LANDMARKS = [
    ("s-trade", "世贸双塔", "WORLD TRADE TWINS", "417 m · 零退台方棱柱"),
    ("s-empire", "帝国大厦", "EMPIRE STATE", "443 m · 5 层基座 + 直筒塔身 + 系泊桅杆"),
    ("s-chrysler", "克莱斯勒大厦", "CHRYSLER", "319 m · 31F 以上直筒 + 七重不锈钢拱冠"),
    ("s-onewtc", "世贸中心一号楼", "ONE WORLD TRADE CENTER", "541 m · 切角扭转 + 无窗基座 + 124 m 桅杆"),
    ("s-burj", "哈利法塔", "BURJ KHALIFA", "828 m · Y 形三翼 + 14 级退台 + 243 m 尖顶"),
    ("s-taipei", "台北 101", "TAIPEI 101", "508 m · 8 段竹节 + 双层切角 + 60 m 尖塔"),
    ("s-petronas", "国油双塔", "PETRONAS TWINS", "452 m · 八角星平面 + 170 m 双層天桥"),
]

PORTFOLIO = [
    ("s-twincrest", "云桥双塔", "TWIN CREST", "320 m · 一高一低 + 空中连廊"),
    ("s-cloudspire", "云端尖塔", "CLOUDSPIRE", "366 m · 两级收分 + 灯亭尖顶"),
    ("s-obsidian", "黑曜石大厦", "OBSIDIAN", "310 m · 深色玻璃 + 白色巨型斜撑"),
    ("s-terrace", "空中梯田", "SKY TERRACE", "285 m · 错层种植露台 + 屋顶花园"),
    ("s-helix", "螺旋塔", "HELIX", "318 m · 78° 连续扭转 + 玻璃冠"),
    ("s-apex", "像素之巅", "PIXEL APEX", "468 m · 八边形退台 + 观景环廊 + 灯亭"),
]


def font(size, bold=False):
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size, index=0 if not bold else 0)
            except OSError:
                continue
    return ImageFont.load_default()


def load(card_dir, asset_id):
    return Image.open(os.path.join(ROOT, card_dir, f"{asset_id}.png")).convert("RGBA")


def compose(entries, card_dir, columns, cell_w, cell_h, out_name, title, subtitle):
    label_h = 74
    margin = 28
    header = 96
    rows = (len(entries) + columns - 1) // columns
    width = margin * 2 + columns * cell_w + (columns - 1) * 18
    height = header + rows * (cell_h + label_h) + margin
    canvas = Image.new("RGB", (width, height), "#0a1120")
    draw = ImageDraw.Draw(canvas)
    # subtle top glow
    for y in range(header + 40):
        blend = int(14 * (1 - y / (header + 40)))
        draw.line([(0, y), (width, y)], fill=(10 + blend, 17 + blend, 32 + blend))
    draw.text((margin, 26), title, font=font(34), fill="#f2e9d8")
    draw.text((margin, 68), subtitle, font=font(18), fill="#8fa3b5")

    for index, (asset_id, name, en, meta) in enumerate(entries):
        row = index // columns
        col = index % columns
        x = margin + col * (cell_w + 18)
        y = header + row * (cell_h + label_h)
        tile = Image.new("RGB", (cell_w, cell_h + label_h), "#121c2c")
        tdraw = ImageDraw.Draw(tile)
        try:
            image = load(card_dir, asset_id)
        except OSError:
            tdraw.text((12, 12), f"missing {asset_id}", font=font(16), fill="#e05555")
            canvas.paste(tile, (x, y))
            continue
        scale = min(cell_w / image.width, cell_h / image.height)
        resized = image.resize((round(image.width * scale), round(image.height * scale)), Image.LANCZOS)
        tile.paste(resized, ((cell_w - resized.width) // 2, (cell_h - resized.height) // 2), resized)
        tdraw.text((14, cell_h + 8), name, font=font(20), fill="#f2e9d8")
        tdraw.text((14, cell_h + 34), en, font=font(12), fill="#79d6c8")
        tdraw.text((14, cell_h + 50), meta, font=font(12), fill="#93a7b8")
        canvas.paste(tile, (x, y))
        draw.rectangle([x, y, x + cell_w - 1, y + cell_h + label_h - 1], outline="#26374c")

    canvas.save(os.path.join(ROOT, out_name))
    return out_name


landmarks = compose(
    LANDMARKS,
    "after-card",
    7,
    250,
    250,
    "sheet-landmarks.png",
    "真实地标：按真实米制比例重新建模",
    "REAL LANDMARKS · vertical scale = 0.0247 u/m, plan girth 1.65x · offline render",
)
portfolio = compose(
    PORTFOLIO,
    "after-card",
    3,
    330,
    330,
    "sheet-portfolio.png",
    "原创塔楼：统一的构造语法重做",
    "ORIGINAL PORTFOLIO TOWERS · same grammar as the landmarks · offline render",
)

# Side-by-side before/after (old builds are 420x760 portrait renders)
before_canvas = Image.new("RGB", (7 * 210 + 56, 640), "#0a1120")
bdraw = ImageDraw.Draw(before_canvas)
bdraw.text((28, 18), "BEFORE 旧模型（同尺寸重渲染，离线渲染色彩为近似值）", font=font(22), fill="#f2e9d8")
for index, (asset_id, name, en, meta) in enumerate(LANDMARKS):
    x = 28 + index * 210
    try:
        old = Image.open(os.path.join(ROOT, "before", f"{asset_id}.png")).convert("RGB")
    except OSError:
        continue
    scale = min(190 / old.width, 470 / old.height)
    old = old.resize((round(old.width * scale), round(old.height * scale)), Image.LANCZOS)
    before_canvas.paste(old, (x + (190 - old.width) // 2, 60))
    bdraw.text((x + 4, 548), name, font=font(16), fill="#f2e9d8")
    bdraw.text((x + 4, 570), "旧 · 统一 9–13 格高", font=font(12), fill="#93a7b8")
bdraw.text((28, 600), "以上为改造前（旧货架式塔身 + 单一高度档位）；改造后见 sheet-landmarks.png", font=font(13), fill="#93a7b8")
before_canvas.save(os.path.join(ROOT, "sheet-before.png"))

print("wrote", landmarks, portfolio, "sheet-before.png")
