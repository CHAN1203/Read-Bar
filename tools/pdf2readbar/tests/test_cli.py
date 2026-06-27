import os, json, fitz, pytest
from pdf2readbar.cli import slugify, unique_id, convert

def test_slugify():
    assert slugify("Trading Price Action: Trends!") == "trading-price-action-trends"

def test_unique_id_suffixes_on_conflict(tmp_path):
    lib = tmp_path / "library.json"
    lib.write_text(json.dumps({"books": [{"id": "demo"}]}), encoding="utf-8")
    assert unique_id("demo", str(lib)) == "demo-2"
    assert unique_id("fresh", str(lib)) == "fresh"

def test_convert_endtoend(tmp_path):
    pdf = tmp_path / "b.pdf"
    doc = fitz.open()
    for i in range(2):
        pg = doc.new_page()
        pg.insert_textbox(pg.rect, ("Chapter %d intro. " % (i+1)) + ("the market trends up and bulls win here. " * 12), fontsize=10)
    doc.set_toc([[1, "Chapter 1", 1], [1, "Chapter 2", 2]])
    doc.save(str(pdf)); doc.close()
    books_dir = str(tmp_path / "books")
    lib = tmp_path / "library.json"; lib.write_text(json.dumps({"books": []}), encoding="utf-8")
    res = convert(str(pdf), books_dir, str(lib), {"title": "Demo", "id": "demo"})
    assert os.path.exists(os.path.join(books_dir, "demo", "index.html"))
    assert os.path.exists(os.path.join(books_dir, "demo", res["units"][0] + ".html"))
    libdata = json.loads(lib.read_text(encoding="utf-8"))
    assert any(b["id"] == "demo" for b in libdata["books"])

def test_convert_rejects_scanned(tmp_path):
    pdf = tmp_path / "s.pdf"; doc = fitz.open(); doc.new_page(); doc.save(str(pdf)); doc.close()
    with pytest.raises(ValueError):
        convert(str(pdf), str(tmp_path / "books"), str(tmp_path / "library.json"), {})
