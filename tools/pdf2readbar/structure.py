from dataclasses import dataclass


@dataclass
class Unit:
    title: str
    start: int   # 0-based doc page, inclusive
    end: int     # 0-based doc page, exclusive
    level: int


def _units_from_marks(marks: list, page_count: int, level: int) -> list[Unit]:
    # marks: ordered list of (title, page) where page is 1-based.
    out = []
    for i, (title, page) in enumerate(marks):
        start = max(0, page - 1)
        end = (marks[i + 1][1] - 1) if i + 1 < len(marks) else page_count
        out.append(Unit(title.strip(), start, end, level))
    return out


def units_from_toc(toc: list, page_count: int) -> list[Unit]:
    if not toc:
        return units_fallback(page_count)
    levels = sorted(set(e[0] for e in toc))
    chosen = levels[0]
    for lv in levels:
        if sum(1 for e in toc if e[0] == lv) >= 2:
            chosen = lv
            break
    marks = [(e[1], e[2]) for e in toc if e[0] == chosen]
    return _units_from_marks(marks, page_count, chosen)


def units_from_headings(headings: list, page_count: int) -> list[Unit]:
    # headings: ordered list of (title, page) 1-based, detected by font size.
    # Needs >=2 to partition the book; otherwise fall back to one unit.
    if len(headings) < 2:
        return units_fallback(page_count)
    return _units_from_marks(headings, page_count, 1)


def units_fallback(page_count: int, per: int = 999999) -> list[Unit]:
    return [Unit("Full text", 0, page_count, 1)]
