# (2026-11-14) 안내자 초상 다듬기 — 운영자가 준 원본(세로 그림, 종이 테두리) → products/strange-oracle/img/guide/<방>.webp
#   종이 테두리 잘라내기 → 3:4 → 채도 낮춤·남색 톤·어둡게 → 이마~눈 높이 그림자(얼굴을 반쯤 가림) · 가장자리·아래 어둠
#   실행: python3 tools/strange-oracle/portraits.py <원본> <출력.webp> '<옵션 JSON>'  (방별 값은 design/strange-oracle-guide-portraits.md)
import sys, os, json
import numpy as np
from PIL import Image
src, out, opts = sys.argv[1], sys.argv[2], json.loads(sys.argv[3])
im = Image.open(src).convert("RGB")
a = np.asarray(im).astype(np.float32) / 255
# 종이(밝고 따뜻한 크림색): 바깥 가장자리에서 안으로, 대부분 종이인 줄을 걷어 낸다
mx, mn = a.max(2), a.min(2)
paper = (mx > 0.66) & ((mx - mn) < 0.3) & (a[..., 0] >= a[..., 2])
H, W = paper.shape
def edge(fr, rng):
    for i in rng:
        if fr[i] < 0.55: return i
    return rng[0]
cf, rf = paper.mean(0), paper.mean(1)
x0 = edge(cf, range(0, W // 3)); x1 = edge(cf, range(W - 1, 2 * W // 3, -1))
y0 = edge(rf, range(0, H // 3)); y1 = edge(rf, range(H - 1, 2 * H // 3, -1))
ins = opts.get("inset", 14)
x0, x1, y0, y1 = x0 + ins + opts.get("left", 0), x1 - ins, y0 + ins, y1 - ins
# 3:4로 (가로 기준, 위쪽 맞춤)
w = x1 - x0; h = y1 - y0
if h / w > 4 / 3: h2 = int(w * 4 / 3); y1 = y0 + h2
else: w2 = int(h * 3 / 4); cx = (x0 + x1) // 2; x0, x1 = cx - w2 // 2, cx - w2 // 2 + w2
im = im.crop((x0, y0, x1, y1)).resize((600, 800), Image.LANCZOS)
OUTW = opts.get("outW", 600)
a = np.asarray(im).astype(np.float32) / 255
# 채도 낮춤
g = (a * [0.299, 0.587, 0.114]).sum(2, keepdims=True)
a = g + (a - g) * opts.get("sat", 0.8)
# 남색으로 살짝 물들이기(곱하기) + 전체 밝기
tint = np.array([0.80, 0.80, 1.0]) * 0 + np.array(opts.get("tint", [0.86, 0.84, 1.0]))
a = a * tint * opts.get("bright", 0.72)
yy, xx = np.mgrid[0:800, 0:600].astype(np.float32); yy /= 800; xx /= 600
# 얼굴 그림자: 이마~눈 높이 띠(위가 더 어둡게)
fy, fw, fs = opts.get("faceY", 0.24), opts.get("faceW", 0.12), opts.get("faceShade", 0.55)
band = np.exp(-((yy - fy) / fw) ** 2)
top = np.clip((fy - yy) / fy, 0, 1)
shade = 1 - fs * np.maximum(band, top) * np.exp(-((xx - 0.5) / 0.45) ** 2 * 0.5)
# 가장자리 어둠
vig = 1 - opts.get("vig", 0.5) * np.clip(((xx - 0.5) / 0.55) ** 2 + ((yy - 0.45) / 0.75) ** 2, 0, 1)
# 아래쪽 어둠(화면 아래와 이어지게)
bot = 1 - opts.get("bottom", 0.45) * np.clip((yy - 0.7) / 0.3, 0, 1) ** 1.5
a = a * (shade * vig * bot)[..., None]
a = np.clip(a, 0, 1)
res = Image.fromarray((a * 255).astype(np.uint8))
if OUTW != 600: res = res.resize((OUTW, OUTW * 4 // 3), Image.LANCZOS)
res.save(out, quality=opts.get("q", 80), method=6) if out.endswith(".webp") else res.save(out)
print(out, (x0, y0, x1, y1), os.path.getsize(out) // 1024, "KB")
