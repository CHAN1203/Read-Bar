import os
import re
import fitz
from .clean import fix_ligatures
from .figures import figbox_for, render_figure

def _is_real_fig(box) -> bool:
    return box is not None and box.height >= 60 and box.width >= 120

class Extractor:
    def __init__(self, doc, img_dir: str):
        self.doc = doc
        self.img_dir = img_dir
        os.makedirs(img_dir, exist_ok=True)

    def extract_unit(self, unit_index: int, start: int, end: int) -> list[dict]:
        elements = []   # (orderkey, dict)
        fig_idx = 0
        for p in range(start, end):
            pg = self.doc[p]
            fb = figbox_for(pg)
            real = _is_real_fig(fb)
            if real:
                fig_idx += 1
                name = "fig_u%02d_%03d.png" % (unit_index, fig_idx)
                with open(os.path.join(self.img_dir, name), "wb") as f:
                    f.write(render_figure(pg, fb))
                elements.append((p * 10000 + fb.y0, {"kind": "figure", "img": name}))
            d = pg.get_text("dict")
            for blk in d["blocks"]:
                if blk.get("type", 0) != 0:
                    continue
                L = []
                for line in blk["lines"]:
                    lb = fitz.Rect(line["bbox"])
                    if real and fb.contains(lb.tl) and fb.contains(lb.br):
                        continue
                    txt = fix_ligatures("".join(s["text"] for s in line["spans"])).strip()
                    if not txt:
                        continue
                    if re.fullmatch(r"\d{1,3}", txt):
                        continue
                    if lb.y0 < 122 and re.fullmatch(r"[A-Z][A-Z0-9 :,'&.\-]+", txt):
                        continue
                    if lb.y0 < 122 and re.fullmatch(r"Figure\s+\d+\.\d+", txt):
                        continue
                    sp = line["spans"]
                    if len(sp) >= 2 and len(sp[0]["text"].strip()) == 1 and sp[0]["size"] > 30:
                        repsize = max(s["size"] for s in sp[1:])
                    else:
                        repsize = max(s["size"] for s in sp)
                    L.append((txt, lb.y0, round(lb.x0, 1), round(repsize, 1)))
                if not L:
                    continue
                key = p * 10000 + L[0][1]
                first = L[0][0]
                maxsz = max(s for *_, s in L)
                # 图注块
                m = re.match(r"FIGURE\s+(\d+\.\d+)\s*(.*)", first)
                if m:
                    title = (m.group(2) + " " + " ".join(t for t, *_ in L[1:])).strip()
                    elements.append((key, {"kind": "caption", "num": m.group(1), "title": title}))
                    continue
                # 下沉首字(行首单字符)
                if len(first) == 1 and L[0][3] > 30:
                    elements.append((key, {"kind": "dropcap", "t": first}))
                    L = L[1:]
                    if not L:
                        continue
                    maxsz = max(s for *_, s in L)
                # 子标题块
                if maxsz >= 20 and all(len(t) < 60 for t, *_ in L):
                    elements.append((key, {"kind": "subhead", "t": " ".join(t for t, *_ in L)}))
                    continue
                # 项目符号块
                if any(t.startswith("r ") for t, *_ in L):
                    items = []
                    cur = None
                    for t, *_ in L:
                        if t.startswith("r "):
                            if cur is not None:
                                items.append(cur)
                            cur = t[2:].strip()
                        elif cur is None:
                            cur = t
                        elif cur.endswith("-"):
                            cur = cur[:-1] + t
                        else:
                            cur = cur + " " + t
                    if cur is not None:
                        items.append(cur)
                    elements.append((key, {"kind": "bullets", "items": items}))
                    continue
                # 段落
                s = L[0][0]
                for t, *_ in L[1:]:
                    s = (s[:-1] + t) if s.endswith("-") else (s + " " + t)
                elements.append((key, {"kind": "para", "t": s}))
        elements.sort(key=lambda e: e[0])
        return [d for _, d in elements]
