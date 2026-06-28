import argparse, json, os, re
import fitz
from .probe import probe, detect_headings
from .structure import units_from_toc, units_from_headings, units_fallback
from .extract import Extractor
from .elements import assemble
from .build import Book, BuiltUnit, build

try:
    from english_words import get_english_words_set
    WORDS = get_english_words_set(['web2'], lower=True)
except Exception:
    WORDS = {"a", "i", "the", "reversal", "trader", "have", "many"}

def slugify(title: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (title or "").lower()).strip("-")
    return re.sub(r"-+", "-", s) or "book"

def unique_id(base: str, library_path: str) -> str:
    ids = set()
    if os.path.exists(library_path):
        data = json.load(open(library_path, encoding="utf-8"))
        ids = {b.get("id") for b in data.get("books", [])}
    if base not in ids:
        return base
    n = 2
    while f"{base}-{n}" in ids:
        n += 1
    return f"{base}-{n}"

def derive_meta(report, pdf_path, overrides: dict) -> dict:
    title = overrides.get("title") or report.title or os.path.splitext(os.path.basename(pdf_path))[0]
    base_id = overrides.get("id") or slugify(title)
    return {
        "title": title,
        "id": base_id,
        "subtitle": overrides.get("subtitle") or ("原版导入 · %d 页" % report.page_count),
        "category": overrides.get("category") or "交易",
        "accent": overrides.get("accent") or "#d4a657",
    }

def convert(pdf_path, books_dir, library_path, overrides: dict) -> dict:
    report = probe(pdf_path)
    if not report.is_text:
        raise ValueError("scanned PDF: needs OCR (avg chars/page=%d)" % report.avg_chars)
    meta = derive_meta(report, pdf_path, overrides)
    meta["id"] = unique_id(meta["id"], library_path)
    doc = fitz.open(pdf_path)
    warnings = []
    hsize = overrides.get("heading_size")
    if hsize:
        # manual override: ignore the (often broken) TOC, split at this exact heading font size
        headings = detect_headings(doc, force_size=int(hsize))
        units_spec = units_from_headings(headings, report.page_count)
        warnings.append("forced heading split at size %s (%d sections)" % (hsize, len(headings)))
    elif report.toc:
        units_spec = units_from_toc(report.toc, report.page_count)
    else:
        headings = detect_headings(doc)
        if len(headings) >= 2:
            units_spec = units_from_headings(headings, report.page_count)
            warnings.append("no embedded TOC; split by heading font (%d sections)" % len(headings))
        else:
            units_spec = units_fallback(report.page_count)
            warnings.append("no embedded TOC and no detectable headings; whole book as one unit")
    img_dir = os.path.join(books_dir, meta["id"], "img")
    ex = Extractor(doc, img_dir)
    built = []
    for i, u in enumerate(units_spec):
        els = ex.extract_unit(i, u.start, u.end)
        body = assemble(els, WORDS)
        built.append(BuiltUnit(slug="%s_u%02d" % (meta["id"], i + 1), title=u.title, body=body))
    doc.close()
    book = Book(id=meta["id"], title=meta["title"], subtitle=meta["subtitle"],
                category=meta["category"], accent=meta["accent"], units=built)
    entry = build(book, books_dir)
    # 追加进 library.json
    data = {"books": []}
    if os.path.exists(library_path):
        data = json.load(open(library_path, encoding="utf-8"))
    data.setdefault("books", []).append(entry)
    with open(library_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return {"id": meta["id"], "units": [b.slug for b in built], "warnings": warnings,
            "page_count": report.page_count}

def main(argv=None):
    ap = argparse.ArgumentParser(prog="pdf2readbar")
    ap.add_argument("pdf")
    ap.add_argument("--id"); ap.add_argument("--title"); ap.add_argument("--subtitle")
    ap.add_argument("--accent"); ap.add_argument("--category")
    ap.add_argument("--books-dir", default="books")
    ap.add_argument("--library", default="books/library.json")
    ap.add_argument("--heading-size", type=int, help="force章节切分用的标题字号(round px),绕过坏目录/纠正误判")
    a = ap.parse_args(argv)
    overrides = {k: v for k, v in vars(a).items() if k in ("id", "title", "subtitle", "accent", "category") and v}
    if a.heading_size:
        overrides["heading_size"] = a.heading_size
    res = convert(a.pdf, a.books_dir, a.library, overrides)
    print(json.dumps(res, ensure_ascii=False))

if __name__ == "__main__":
    main()
