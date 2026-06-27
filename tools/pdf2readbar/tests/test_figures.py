import fitz
from pdf2readbar.figures import figbox_for, render_figure

def _page_with_chart():
    doc = fitz.open(); pg = doc.new_page(width=400, height=600)
    # 40 small filled rects clustered in the upper region → mimic candle bodies
    for i in range(40):
        x = 50 + i * 6
        pg.draw_rect(fitz.Rect(x, 100, x + 4, 100 + (i % 20) + 8), fill=(0, 0, 0))
    return doc, pg

def test_figbox_detected_in_upper_region():
    doc, pg = _page_with_chart()
    box = figbox_for(pg)
    assert box is not None
    assert box.y0 < 300 and box.height >= 5  # 在上半页
    doc.close()

def test_figbox_none_on_textonly_page():
    doc = fitz.open(); pg = doc.new_page()
    pg.insert_text((72, 72), "just text " * 50)
    assert figbox_for(pg) is None
    doc.close()

def test_render_figure_returns_png_bytes():
    doc, pg = _page_with_chart()
    box = figbox_for(pg)
    data = render_figure(pg, box)
    assert data[:8] == b"\x89PNG\r\n\x1a\n"
    doc.close()
