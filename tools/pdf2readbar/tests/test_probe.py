import fitz
from pdf2readbar.probe import probe, detect_headings


def test_probe_text_pdf(text_pdf):
    r = probe(text_pdf)
    assert r.page_count == 2
    assert r.is_text is True
    assert len(r.toc) == 2


def test_probe_blank_is_not_text(blank_pdf):
    r = probe(blank_pdf)
    assert r.is_text is False


def test_detect_headings_by_font_size():
    doc = fitz.open()
    for i in range(6):
        pg = doc.new_page()
        if i in (0, 2, 4):
            pg.insert_text((72, 72), "Chapter %d" % (i // 2 + 1), fontsize=22)
        pg.insert_textbox(fitz.Rect(72, 100, 500, 700), "body text here " * 30, fontsize=10)
    heads = detect_headings(doc)
    assert [t for t, p in heads] == ["Chapter 1", "Chapter 2", "Chapter 3"]
    assert [p for t, p in heads] == [1, 3, 5]
    doc.close()


def test_detect_headings_force_size_override():
    doc = fitz.open()
    for i in range(6):
        pg = doc.new_page()
        if i in (0, 2, 4):
            pg.insert_text((72, 60), "Chapter %d" % (i // 2 + 1), fontsize=22)
        pg.insert_text((72, 90), "a small repeated note", fontsize=14)
        pg.insert_textbox(fitz.Rect(72, 120, 500, 700), "body text " * 40, fontsize=10)
    forced = detect_headings(doc, force_size=22)
    assert [t for t, p in forced] == ["Chapter 1", "Chapter 2", "Chapter 3"]
    doc.close()


def test_detect_headings_none_when_uniform_font():
    doc = fitz.open()
    for _ in range(3):
        pg = doc.new_page()
        pg.insert_textbox(fitz.Rect(72, 100, 500, 700), "all the same size " * 20, fontsize=10)
    assert detect_headings(doc) == []
    doc.close()
