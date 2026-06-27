import os, html
from dataclasses import dataclass, field
from . import templates as T

@dataclass
class BuiltUnit:
    slug: str
    title: str
    body: str

@dataclass
class Book:
    id: str
    title: str
    subtitle: str
    category: str
    accent: str
    units: list = field(default_factory=list)

def _esc(t): return html.escape(t, quote=False)

def build(book: Book, books_dir: str) -> dict:
    out_dir = os.path.join(books_dir, book.id)
    os.makedirs(os.path.join(out_dir, "img"), exist_ok=True)
    slugs = [u.slug for u in book.units]
    for i, u in enumerate(book.units):
        prevf = slugs[i - 1] + ".html" if i > 0 else None
        nextf = slugs[i + 1] + ".html" if i + 1 < len(slugs) else None
        nav = '<a class="home" href="../../index.html">📚 书架</a> <a class="home" href="index.html">📖 本书</a>'
        if prevf: nav += ' <a href="%s">← 上一篇</a>' % prevf
        if nextf: nav += ' <a href="%s">下一篇 →</a>' % nextf
        railitems = '<a href="#u" class="active">%s</a>' % _esc(u.title)
        sections = ('<section id="u"><div class="kicker">%s</div><h2>%s</h2>\n        %s\n        '
                    '<div class="divider"></div></section>') % (_esc(u.title), _esc(u.title), u.body)
        page = T.unit_page(book.id, book.title, _esc(u.title), book.accent, railitems, sections, nav)
        with open(os.path.join(out_dir, u.slug + ".html"), "w", encoding="utf-8") as f:
            f.write(page)
    hub = T.hub_page(
        book_id=book.id,
        title=book.title,
        subtitle=book.subtitle,
        accent=book.accent,
        units=[(u.slug, u.title) for u in book.units],
    )
    with open(os.path.join(out_dir, "index.html"), "w", encoding="utf-8") as f:
        f.write(hub)
    return {"id": book.id, "title": book.title, "subtitle": book.subtitle,
            "category": book.category, "accent": book.accent, "href": "books/%s/index.html" % book.id}
