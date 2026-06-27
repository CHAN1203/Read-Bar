import fitz

def figbox_for(page):
    pr = page.rect
    parea = pr.width * pr.height
    paths = []
    for d in page.get_drawings():
        b = d["rect"]
        # Skip degenerate rects only if both width AND height are < 2
        # Allow lines (width=0 or height=0) if the other dimension >= 2
        if (b.width < 2 and b.height < 2):
            continue
        # Skip if rect is entirely off-page or larger than 85% of page
        if b.width * b.height > 0.85 * parea:   # 整页边框/背景
            continue
        ib = b & pr
        # For degenerate rects, check if they're truly empty (both dimensions 0)
        if ib.is_empty and ib.width == 0 and ib.height == 0:
            continue
        # Skip if the result is very small in both dimensions
        if ib.width < 1 and ib.height < 1:
            continue
        paths.append(ib)
    if len(paths) < 25:
        return None
    r = None
    for b in paths:
        # Expand degenerate rects (lines) before union to capture stroke width
        if b.width == 0 or b.height == 0:
            b = b + fitz.Rect(-0.5, -0.5, 0.5, 0.5)
        r = b if r is None else (r | b)
    if r is None or r.height < 5 or r.width < 5:
        return None
    return r

def render_figure(page, box, scale: int = 3) -> bytes:
    pr = page.rect
    clip = fitz.Rect(box.x0 - 6, box.y0 - 16, box.x1 + 6, box.y1 + 6) & pr
    pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), clip=clip)
    return pix.tobytes("png")
