import fitz
import pytest


@pytest.fixture
def text_pdf(tmp_path):
    p = tmp_path / "text.pdf"
    doc = fitz.open()
    for i in range(2):
        pg = doc.new_page()
        pg.insert_textbox(pg.rect, ("Chapter %d\n" % (i + 1)) + ("word " * 80))
    doc.set_toc([[1, "Chapter 1", 1], [1, "Chapter 2", 2]])
    doc.save(str(p))
    doc.close()
    return str(p)


@pytest.fixture
def blank_pdf(tmp_path):
    p = tmp_path / "blank.pdf"
    doc = fitz.open()
    doc.new_page()
    doc.new_page()
    doc.save(str(p))
    doc.close()
    return str(p)
