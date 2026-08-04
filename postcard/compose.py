from PIL import Image, ImageDraw, ImageFont
import numpy as np

W, H = 1819, 1311
GOLD = (197, 167, 117)
CREAM = (248, 239, 221)

src = Image.open('/home/user/gousto/postcard/assets/corner-v2.png').convert('RGB')
sw, sh = src.size
scale = H / sh
nw = round(sw * scale)
img = src.resize((nw, H), Image.LANCZOS)
# crop: keep lighthouse (left) and trim patio clutter (right)
left = 40
img = img.crop((left, 0, left + W, H))

# bottom gradient scrim, stronger toward the left where the text sits
col = np.zeros(H)
y0 = int(H * 0.46)
ys = np.arange(H)
t = np.clip((ys - y0) / (H - y0), 0, 1)
col = 0.88 * t ** 1.5
xw = 1.0 - 0.25 * np.clip((np.arange(W) - W * 0.45) / (W * 0.55), 0, 1)
ga = np.clip(np.outer(col, xw) * 255, 0, 255).astype(np.uint8)
grad = Image.fromarray(ga, 'L')
black = Image.new('RGB', (W, H), (8, 9, 12))
img = Image.composite(black, img, grad)

draw = ImageDraw.Draw(img)

def ink_offset(font, text):
    bbox = font.getbbox(text)
    return bbox[0], bbox[1]

def draw_tracked(draw, pos, text, font, fill, tracking):
    x, y = pos
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill)
        w = draw.textlength(ch, font=font)
        x += w + tracking
    return x - tracking

def tracked_width(draw, text, font, tracking):
    return sum(draw.textlength(c, font=font) for c in text) + tracking * (len(text) - 1)

# ---- eyebrow: fit width 673 at x=86, ink-top y=953
eyebrow = 'KARL GARDNER · PORTHCAWL'
target_w = 759 - 86
mfont = ImageFont.truetype('/usr/share/fonts/truetype/montserrat/Montserrat-SemiBold.ttf', 31)
tr = 1.0
lo, hi = 0.0, 20.0
for _ in range(40):
    tr = (lo + hi) / 2
    w = tracked_width(draw, eyebrow, mfont, tr)
    if w > target_w: hi = tr
    else: lo = tr
ox, oy = ink_offset(mfont, 'K')
draw_tracked(draw, (86 - ox, 953 - oy), eyebrow, mfont, GOLD, tr)

# ---- headline: Playfair, fit line2 width 924
l1, l2 = 'The best builder in', 'Porthcawl, many say.'
target2 = 1009 - 85
size = 60
lo, hi = 40, 200
for _ in range(40):
    size = (lo + hi) / 2
    f = ImageFont.truetype('playfair.ttf', round(size))
    w = draw.textlength(l2, font=f)
    if w > target2: hi = size
    else: lo = size
pfont = ImageFont.truetype('playfair.ttf', round(size))
print('playfair size', round(size), 'line1 w', draw.textlength(l1, font=pfont), 'target 849')

ox1, oy1 = ink_offset(pfont, l1)
draw.text((85 - ox1, 1023 - oy1), l1, font=pfont, fill=CREAM)
ox2, oy2 = ink_offset(pfont, l2)
draw.text((85 - ox2, 1133 - oy2), l2, font=pfont, fill=CREAM)

img.save('front-new.jpg', quality=94)
prev = img.copy(); prev.thumbnail((900, 900)); prev.save('front-new-prev.jpg', quality=88)
print('done')
