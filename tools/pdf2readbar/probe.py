from dataclasses import dataclass, field
from collections import Counter
import fitz


@dataclass
class ProbeReport:
    page_count: int
    is_text: bool
    avg_chars: int
    toc: list = field(default_factory=list)
    title: str | None = None
    author: str | None = None
    fig_pages: int = 0


def probe(pdf_path: str) -> ProbeReport:
    doc = fitz.open(pdf_path)
    total = 0
    fig_pages = 0
    for pg in doc:
        total += len(pg.get_text("text"))
        if len(pg.get_drawings()) >= 25:
            fig_pages += 1
    n = doc.page_count or 1
    avg = round(total / n)
    md = doc.metadata or {}
    rep = ProbeReport(
        page_count=doc.page_count,
        is_text=avg >= 200,
        avg_chars=avg,
        toc=doc.get_toc(),
        title=(md.get("title") or None),
        author=(md.get("author") or None),
        fig_pages=fig_pages,
    )
    doc.close()
    return rep


def detect_headings(doc) -> list:
    """No-embedded-TOC fallback: find chapter headings by font size.

    Returns [(title, page_1based), ...] for lines set in the chapter-heading
    font tier — a size larger than the body text that recurs as short
    standalone lines on >=3 pages. Wrapped multi-line titles on the same page
    are merged. Returns [] if no such heading tier is found.
    """
    all_sizes = Counter()   # char-weighted over all lines → body text dominates
    short_chars = Counter()  # char total of SHORT lines per size
    short = []              # (page0, size, text) for short standalone lines
    for p in range(doc.page_count):
        for blk in doc[p].get_text("dict")["blocks"]:
            if blk.get("type", 0) != 0:
                continue
            for line in blk["lines"]:
                t = "".join(s["text"] for s in line["spans"]).strip()
                if not t:
                    continue
                mx = round(max(s["size"] for s in line["spans"]))
                all_sizes[mx] += len(t)
                if len(t) <= 40:
                    short.append((p, mx, t))
                    short_chars[mx] += len(t)
    if not all_sizes:
        return []
    body = all_sizes.most_common(1)[0][0]
    # heading tier = the above-body size carrying the MOST title text. This beats
    # "smallest above body" (which catches short running headers / page numbers) and
    # "most frequent" (which catches per-page running headers): real chapter titles
    # carry substantial text, page furniture carries little.
    above = {sz: c for sz, c in short_chars.items() if sz > body}
    if not above:
        return []
    hs = max(above, key=above.get)
    raw = [(t, p + 1) for p, sz, t in short if sz == hs]
    if len(raw) < 2:
        return []
    merged = []
    for t, pg in raw:
        if merged and merged[-1][1] == pg:   # wrapped multi-line title on same page
            prev = merged[-1][0]
            cjk = prev and ord(prev[-1]) > 0x2E7F and ord(t[0]) > 0x2E7F
            merged[-1] = (prev + ("" if cjk else " ") + t, pg)
        else:
            merged.append((t, pg))
    return merged
