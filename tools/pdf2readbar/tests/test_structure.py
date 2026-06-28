from pdf2readbar.structure import units_from_toc, units_from_headings, units_fallback, Unit

def test_units_from_toc_top_level():
    toc = [[1, "Part I", 5], [2, "Chapter 1", 7], [1, "Part II", 20], [2, "Chapter 9", 22]]
    us = units_from_toc(toc, page_count=40)
    assert us == [Unit("Part I", 4, 19, 1), Unit("Part II", 19, 40, 1)]

def test_units_from_toc_uses_shallowest_when_no_level1():
    toc = [[2, "A", 3], [2, "B", 10]]
    us = units_from_toc(toc, page_count=15)
    assert us == [Unit("A", 2, 9, 2), Unit("B", 9, 15, 2)]

def test_units_fallback_single():
    assert units_fallback(12) == [Unit("Full text", 0, 12, 1)]

def test_units_from_toc_skips_single_entry_top_level():
    toc = [[1, "Book Title", 1], [2, "Part I", 5], [2, "Part II", 20]]
    us = units_from_toc(toc, page_count=40)
    assert us == [Unit("Part I", 4, 19, 2), Unit("Part II", 19, 40, 2)]

def test_units_from_headings():
    heads = [("Chapter One", 3), ("Chapter Two", 10), ("Chapter Three", 18)]
    us = units_from_headings(heads, page_count=25)
    assert us == [Unit("Chapter One", 2, 9, 1), Unit("Chapter Two", 9, 17, 1), Unit("Chapter Three", 17, 25, 1)]

def test_units_from_headings_too_few_falls_back():
    assert units_from_headings([("Only", 1)], 10) == [Unit("Full text", 0, 10, 1)]
