from pdf2readbar.probe import probe


def test_probe_text_pdf(text_pdf):
    r = probe(text_pdf)
    assert r.page_count == 2
    assert r.is_text is True
    assert len(r.toc) == 2


def test_probe_blank_is_not_text(blank_pdf):
    r = probe(blank_pdf)
    assert r.is_text is False
