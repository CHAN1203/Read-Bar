from dataclasses import dataclass

@dataclass
class Unit:
    title: str
    start: int   # 0-based doc page, inclusive
    end: int     # 0-based doc page, exclusive
    level: int

def units_from_toc(toc: list, page_count: int) -> list[Unit]:
    if not toc:
        return units_fallback(page_count)
    levels = sorted(set(e[0] for e in toc))
    chosen = levels[0]
    for lv in levels:
        if sum(1 for e in toc if e[0] == lv) >= 2:
            chosen = lv
            break
    tops = [e for e in toc if e[0] == chosen]
    out = []
    for i, (lvl, title, page) in enumerate(tops):
        start = max(0, page - 1)
        end = (tops[i + 1][2] - 1) if i + 1 < len(tops) else page_count
        out.append(Unit(title.strip(), start, end, lvl))
    return out

def units_fallback(page_count: int, per: int = 999999) -> list[Unit]:
    return [Unit("Full text", 0, page_count, 1)]
