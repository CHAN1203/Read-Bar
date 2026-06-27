import os, json
from pdf2readbar.build import Book, BuiltUnit, build

def test_build_writes_pages_and_returns_entry(tmp_path):
    book = Book(id="demo", title="Demo Book", subtitle="a test", category="测试",
                accent="#d4a657",
                units=[BuiltUnit(slug="demo_part1", title="Part One", body="<p>Hello world.</p>")])
    books_dir = str(tmp_path / "books")
    os.makedirs(os.path.join(books_dir, "demo", "img"), exist_ok=True)
    entry = build(book, books_dir)
    # hub 存在 + 含各单元链接 + 含书架返回链接
    assert os.path.exists(os.path.join(books_dir, "demo", "index.html"))
    hub = open(os.path.join(books_dir, "demo", "index.html"), encoding="utf-8").read()
    assert "demo_part1.html" in hub
    assert "../../index.html" in hub
    page = open(os.path.join(books_dir, "demo", "demo_part1.html"), encoding="utf-8").read()
    assert "../reader.css" in page and "../reader.js" in page
    assert "<p>Hello world.</p>" in page
    assert "__CAP__" not in page
    # library 条目
    assert entry == {"id": "demo", "title": "Demo Book", "subtitle": "a test",
                     "category": "测试", "accent": "#d4a657", "href": "books/demo/index.html"}
