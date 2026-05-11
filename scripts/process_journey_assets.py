import os
import cv2
import numpy as np
from PIL import Image

SRC_DIR = r"C:\Users\Ozgur72\Downloads"
DST_DIR = r"C:\Users\Ozgur72\Desktop\Yeni klasör\neon-grid-puzzle-lab\assets\ui\journey"
os.makedirs(DST_DIR, exist_ok=True)

JOBS = [
    ("altın kasa.png", "chest-gold.png", (1024, 1024), "grabcut"),
    ("golden glow.png", "chest-glow-rays.png", (1024, 512), "synth_glow_rays"),
    ("kupa.png", "trophy-silhouette-bg.png", (1200, 900), "synth_trophy"),
    ("koyu mor block.png", "level-tile-locked.png", (72, 72), "grabcut"),
    ("pembe glossy blok.png", "level-tile-completed.png", (72, 72), "grabcut"),
    ("rich altın blok.png", "level-tile-current.png", (72, 72), "grabcut"),
    ("altın gloww.png", "level-tile-current-glow.png", (128, 128), "synth_square_glow"),
    ("cta button base.png", "btn-level-normal.png", (900, 180), "grabcut"),
    ("darker same button.png", "btn-level-pressed.png", (900, 180), "grabcut"),
    ("purple gray same button.png", "btn-level-disabled.png", (900, 180), "grabcut"),
    ("back arrow icon.png", "icon-back.png", (96, 96), "arrow"),
    ("four-point sparkle accent icon.png", "sparkle-star.png", (96, 96), "synth_sparkle"),
]

def imread_unicode(path):
    data = np.fromfile(path, dtype=np.uint8)
    if data.size == 0:
        return None
    return cv2.imdecode(data, cv2.IMREAD_COLOR)

def remove_small_components(alpha, min_area=8, keep_largest=False):
    mask = (alpha > 2).astype(np.uint8)
    num, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    if num <= 1:
        return alpha
    if keep_largest:
        idx = int(np.argmax(stats[1:, cv2.CC_STAT_AREA]) + 1)
        keep = (labels == idx).astype(np.uint8) * 255
        return cv2.bitwise_and(alpha, keep)
    keep = np.zeros_like(alpha)
    for i in range(1, num):
        area = int(stats[i, cv2.CC_STAT_AREA])
        if area >= min_area:
            keep[labels == i] = 255
    return cv2.bitwise_and(alpha, keep)


def keep_main_component(alpha, min_ratio=0.0004):
    h, w = alpha.shape
    num, labels, stats, _ = cv2.connectedComponentsWithStats((alpha > 8).astype(np.uint8), connectivity=8)
    if num <= 1:
        return alpha
    areas = stats[:, cv2.CC_STAT_AREA]
    mask = np.zeros_like(alpha)
    min_area = max(10, int(h * w * min_ratio))
    for i in range(1, num):
        area = areas[i]
        if area >= min_area:
            mask[labels == i] = 255
    if mask.max() == 0:
        idx = int(np.argmax(areas[1:]) + 1)
        mask[labels == idx] = 255
    return cv2.bitwise_and(alpha, mask)


def grabcut_rgba(bgr, soft=False):
    h, w = bgr.shape[:2]
    mask = np.zeros((h, w), np.uint8)
    bgd = np.zeros((1, 65), np.float64)
    fgd = np.zeros((1, 65), np.float64)

    rect = (int(w * 0.06), int(h * 0.06), int(w * 0.88), int(h * 0.88))
    cv2.grabCut(bgr, mask, rect, bgd, fgd, 5, cv2.GC_INIT_WITH_RECT)
    alpha = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)

    alpha = cv2.medianBlur(alpha, 5)
    alpha = keep_main_component(alpha, min_ratio=0.0006 if soft else 0.0004)

    k = 3 if soft else 2
    kernel = np.ones((k, k), np.uint8)
    alpha = cv2.morphologyEx(alpha, cv2.MORPH_CLOSE, kernel, iterations=1)
    alpha = cv2.GaussianBlur(alpha, (0, 0), 1.2 if soft else 0.9)

    rgba = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGBA)
    rgba[:, :, 3] = alpha
    return rgba


def glow_rgba(bgr, square=False):
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    lum = np.max(rgb, axis=2)
    sat = np.max(rgb, axis=2) - np.min(rgb, axis=2)

    base = 0.36 if square else 0.33
    alpha = np.clip((lum - base) / (1.0 - base), 0.0, 1.0)
    alpha = np.maximum(alpha, np.clip((sat - 0.08) / 0.55, 0.0, 1.0) * 0.5)
    alpha = np.power(alpha, 1.25 if square else 1.2)

    # Remove checker residue at edges.
    alpha = cv2.GaussianBlur((alpha * 255).astype(np.uint8), (0, 0), 2.2 if square else 2.8)

    rgba = np.dstack([rgb, alpha.astype(np.float32) / 255.0])
    rgba = (np.clip(rgba, 0, 1) * 255).astype(np.uint8)
    return rgba

def synth_glow_rays(size):
    w, h = size
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    x = (xx - (w * 0.5)) / (w * 0.5)
    y = (yy - (h * 0.5)) / (h * 0.5)
    r = np.sqrt((x * 1.08) ** 2 + (y * 1.35) ** 2)
    th = np.arctan2(y, x)

    core = np.exp(-((r / 0.22) ** 2))
    bloom = np.exp(-((r / 0.52) ** 2))
    rays = (np.cos(th * 8.0) ** 2) * np.exp(-((r / 0.62) ** 2))
    rays += 0.55 * (np.cos((th + 0.22) * 5.0) ** 2) * np.exp(-((r / 0.78) ** 2))

    alpha = np.clip((core * 0.94) + (rays * 0.55) + (bloom * 0.32), 0, 1)
    alpha = np.clip(alpha * np.exp(-(r * 0.72)), 0, 1)
    alpha = cv2.GaussianBlur((alpha * 255).astype(np.uint8), (0, 0), 2.2)

    base = np.array([255, 206, 98], dtype=np.float32) / 255.0
    hot = np.array([255, 242, 176], dtype=np.float32) / 255.0
    mix = np.clip(core[..., None] * 0.82 + bloom[..., None] * 0.46, 0, 1)
    rgb = (base * (1 - mix)) + (hot * mix)
    rgb = np.clip(rgb, 0, 1)
    rgba = np.dstack([rgb, alpha.astype(np.float32) / 255.0])
    return (rgba * 255).astype(np.uint8)

def synth_square_glow(size):
    w, h = size
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    x = (xx - (w * 0.5)) / (w * 0.5)
    y = (yy - (h * 0.5)) / (h * 0.5)
    sq = np.maximum(np.abs(x), np.abs(y))
    soft_square = np.exp(-((sq / 0.54) ** 4))
    core = np.exp(-((x ** 2 + y ** 2) / 0.065))
    alpha = np.clip((soft_square * 0.86) + (core * 0.38), 0, 1)
    alpha = cv2.GaussianBlur((alpha * 255).astype(np.uint8), (0, 0), 1.6)

    base = np.array([255, 196, 86], dtype=np.float32) / 255.0
    hot = np.array([255, 237, 168], dtype=np.float32) / 255.0
    mix = np.clip(core[..., None] * 1.25 + soft_square[..., None] * 0.25, 0, 1)
    rgb = np.clip((base * (1 - mix)) + (hot * mix), 0, 1)
    rgba = np.dstack([rgb, alpha.astype(np.float32) / 255.0])
    return (rgba * 255).astype(np.uint8)

def synth_sparkle(size):
    w, h = size
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    x = (xx - (w * 0.5)) / (w * 0.5)
    y = (yy - (h * 0.5)) / (h * 0.5)
    d = np.sqrt(x ** 2 + y ** 2)
    cross = np.exp(-((np.abs(x) / 0.11) ** 1.2)) + np.exp(-((np.abs(y) / 0.11) ** 1.2))
    core = np.exp(-((d / 0.14) ** 2))
    alpha = np.clip((cross * 0.56) + (core * 0.9), 0, 1)
    alpha *= np.exp(-((d / 0.88) ** 2))
    alpha = cv2.GaussianBlur((alpha * 255).astype(np.uint8), (0, 0), 1.2)

    base = np.array([255, 222, 148], dtype=np.float32) / 255.0
    hot = np.array([255, 255, 242], dtype=np.float32) / 255.0
    mix = np.clip(core[..., None] * 1.2, 0, 1)
    rgb = np.clip((base * (1 - mix)) + (hot * mix), 0, 1)
    rgba = np.dstack([rgb, alpha.astype(np.float32) / 255.0])
    return (rgba * 255).astype(np.uint8)

def synth_trophy(size):
    w, h = size
    rgba = np.zeros((h, w, 4), dtype=np.uint8)

    # Base silhouette mask.
    mask = np.zeros((h, w), dtype=np.uint8)

    # Cup bowl.
    cv2.ellipse(mask, (w // 2, int(h * 0.35)), (int(w * 0.19), int(h * 0.14)), 0, 0, 360, 255, -1)
    bowl_poly = np.array(
        [
            [int(w * 0.33), int(h * 0.35)],
            [int(w * 0.67), int(h * 0.35)],
            [int(w * 0.59), int(h * 0.60)],
            [int(w * 0.41), int(h * 0.60)],
        ],
        dtype=np.int32,
    )
    cv2.fillConvexPoly(mask, bowl_poly, 255)

    # Stem + base.
    cv2.rectangle(mask, (int(w * 0.46), int(h * 0.60)), (int(w * 0.54), int(h * 0.71)), 255, -1)
    cv2.ellipse(mask, (w // 2, int(h * 0.74)), (int(w * 0.12), int(h * 0.045)), 0, 0, 360, 255, -1)

    # Handles.
    cv2.ellipse(mask, (int(w * 0.31), int(h * 0.40)), (int(w * 0.09), int(h * 0.12)), 0, 40, 320, 255, int(h * 0.032))
    cv2.ellipse(mask, (int(w * 0.69), int(h * 0.40)), (int(w * 0.09), int(h * 0.12)), 0, -140, 140, 255, int(h * 0.032))

    # Keep smooth silhouette with subtle outer bloom.
    alpha_soft = cv2.GaussianBlur(mask, (0, 0), 2.1)
    glow = cv2.GaussianBlur(mask, (0, 0), 11.5)
    alpha = np.clip((alpha_soft.astype(np.float32) * 0.92) + (glow.astype(np.float32) * 0.26), 0, 255).astype(np.uint8)

    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    x = (xx - (w * 0.5)) / (w * 0.5)
    y = (yy - (h * 0.52)) / (h * 0.52)
    grad = np.clip(0.5 + (-y * 0.34) + (x * 0.05), 0, 1)
    color_a = np.array([62, 67, 124], dtype=np.float32)
    color_b = np.array([34, 38, 84], dtype=np.float32)
    rgb = (color_a[None, None, :] * grad[..., None]) + (color_b[None, None, :] * (1 - grad[..., None]))

    # Inner highlight.
    hl = np.exp(-(((x / 0.34) ** 2) + (((y + 0.16) / 0.24) ** 2)))
    rgb += np.array([34, 34, 58], dtype=np.float32)[None, None, :] * hl[..., None] * 0.52
    rgb = np.clip(rgb, 0, 255).astype(np.uint8)

    rgba[:, :, :3] = rgb
    rgba[:, :, 3] = alpha
    return rgba


def arrow_rgba(bgr):
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    lum = np.mean(rgb, axis=2)
    alpha = np.clip((lum - 0.58) / 0.42, 0.0, 1.0)
    alpha = np.power(alpha, 1.15)
    alpha = cv2.GaussianBlur((alpha * 255).astype(np.uint8), (0, 0), 1.2)
    alpha = keep_main_component(alpha, min_ratio=0.0002)
    rgba = np.dstack([rgb, alpha.astype(np.float32) / 255.0])
    return (np.clip(rgba, 0, 1) * 255).astype(np.uint8)


def sparkle_rgba(bgr):
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    lum = np.max(rgb, axis=2)
    alpha = np.clip((lum - 0.44) / 0.56, 0.0, 1.0)
    alpha = np.power(alpha, 1.05)
    alpha = cv2.GaussianBlur((alpha * 255).astype(np.uint8), (0, 0), 1.8)
    rgba = np.dstack([rgb, alpha.astype(np.float32) / 255.0])
    return (np.clip(rgba, 0, 1) * 255).astype(np.uint8)


def trim_rgba(arr, pad=4):
    alpha = arr[:, :, 3]
    ys, xs = np.where(alpha > 4)
    if len(xs) == 0 or len(ys) == 0:
        return arr
    x0, x1 = xs.min(), xs.max()
    y0, y1 = ys.min(), ys.max()
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(arr.shape[1] - 1, x1 + pad)
    y1 = min(arr.shape[0] - 1, y1 + pad)
    return arr[y0:y1 + 1, x0:x1 + 1]


def fit_canvas(arr, target_w, target_h):
    img = Image.fromarray(arr, mode="RGBA")
    w, h = img.size
    scale = min(target_w / w, target_h / h)
    nw, nh = max(1, int(round(w * scale))), max(1, int(round(h * scale)))
    img = img.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    ox = (target_w - nw) // 2
    oy = (target_h - nh) // 2
    canvas.paste(img, (ox, oy), img)
    return canvas


for src_name, dst_name, size, method in JOBS:
    src_path = os.path.join(SRC_DIR, src_name)
    dst_path = os.path.join(DST_DIR, dst_name)
    if method.startswith("synth_"):
        if method == "synth_glow_rays":
            rgba = synth_glow_rays(size)
        elif method == "synth_square_glow":
            rgba = synth_square_glow(size)
        elif method == "synth_sparkle":
            rgba = synth_sparkle(size)
        elif method == "synth_trophy":
            rgba = synth_trophy(size)
        else:
            raise ValueError(f"Unsupported synth method: {method}")
        out = Image.fromarray(rgba, mode="RGBA")
    else:
        bgr = imread_unicode(src_path)
        if bgr is None:
            print(f"MISSING: {src_path}")
            continue

        if method == "grabcut":
            rgba = grabcut_rgba(bgr, soft=False)
        elif method == "grabcut_soft":
            rgba = grabcut_rgba(bgr, soft=True)
        elif method == "grabcut_hard":
            rgba = grabcut_rgba(bgr, soft=False)
            alpha_hard = np.where(rgba[:, :, 3] > 112, 255, 0).astype(np.uint8)
            alpha_hard = remove_small_components(alpha_hard, min_area=max(12, int(alpha_hard.size * 0.00035)))
            rgba[:, :, 3] = cv2.GaussianBlur(alpha_hard, (0, 0), 0.8)
        elif method == "glow":
            rgba = glow_rgba(bgr, square=False)
        elif method == "glow_square":
            rgba = glow_rgba(bgr, square=True)
        elif method == "arrow":
            rgba = arrow_rgba(bgr)
        elif method == "sparkle":
            rgba = sparkle_rgba(bgr)
        else:
            rgba = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGBA)

        rgba = trim_rgba(rgba, pad=6 if "btn" in dst_name else 4)
        out = fit_canvas(rgba, size[0], size[1])

    out_rgba = np.array(out.convert("RGBA"))
    alpha = out_rgba[:, :, 3]
    keep_largest = dst_name in {"icon-back.png", "sparkle-star.png"}
    cleaned_alpha = remove_small_components(
        alpha,
        min_area=max(3, int(alpha.size * 0.00008)),
        keep_largest=keep_largest,
    )
    out_rgba[:, :, 3] = cleaned_alpha
    out = Image.fromarray(out_rgba, mode="RGBA")

    out.save(dst_path, "PNG", optimize=True)
    print(f"WROTE: {dst_path} ({size[0]}x{size[1]})")

print("DONE")
