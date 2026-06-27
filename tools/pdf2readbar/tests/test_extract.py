import fitz
from pdf2readbar.extract import Extractor

def _doc_one_para(tmp_path):
    doc = fitz.open(); pg = doc.new_page()
    pg.insert_text((72, 100), "The market is trending up today and bulls are in control here.", fontsize=10)
    return doc

def test_extract_unit_yields_paragraph(tmp_path):
    doc = _doc_one_para(tmp_path)
    ex = Extractor(doc, str(tmp_path))
    els = ex.extract_unit(0, 0, 1)
    paras = [e for e in els if e["kind"] == "para"]
    assert len(paras) == 1
    assert "market is trending up" in paras[0]["t"]
    doc.close()

def test_extract_drops_pure_page_number(tmp_path):
    doc = fitz.open(); pg = doc.new_page()
    pg.insert_text((72, 60), "42", fontsize=10)             # 页码
    pg.insert_text((72, 120), "Real body sentence here that is long enough.", fontsize=10)
    ex = Extractor(doc, str(tmp_path))
    els = ex.extract_unit(0, 0, 1)
    texts = " ".join(e.get("t", "") for e in els)
    assert "42" not in texts
    assert "Real body sentence" in texts
    doc.close()
