from pdf2readbar.structure import units_from_toc, units_fallback, Unit

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
