from dataclasses import dataclass, field
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
