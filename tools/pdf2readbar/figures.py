import fitz

def figbox_for(page):
    pr = page.rect
    parea = pr.width * pr.height
    paths = []
    for d in page.get_drawings():
        b = d["rect"]
        if b.width < 2 or b.height < 2:
            continue
        if b.width * b.height > 0.85 * parea:   # 整页边框/背景
            continue
        ib = b & pr
        if ib.is_empty or ib.width < 2 or ib.height < 2:
            continue
        paths.append(ib)
    if len(paths) < 25:
        return None
    r = None
    for b in paths:
        r = b if r is None else (r | b)
    if r is None or r.height < 5 or r.width < 5:
        return None
    return r

def render_figure(page, box, scale: int = 3) -> bytes:
    pr = page.rect
    clip = fitz.Rect(box.x0 - 6, box.y0 - 16, box.x1 + 6, box.y1 + 6) & pr
    pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), clip=clip)
    return pix.tobytes("png")
