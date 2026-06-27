# PDF → readbar 导入流水线 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把文字版 PDF 自动转成一本 readbar 书(hub + 章节页 + 图 + library.json),由 GitHub Actions 触发、开 PR 供审阅后上线。

**Architecture:** 一个可复用 Python 包 `tools/pdf2readbar/`,用 pymupdf 抽文字+渲染图,套 readbar 模板生成书;`_inbox/` 投放 PDF,GitHub Action 跑转换并开 PR;根 `index.html` 加「添加新书」入口。核心逻辑从已验证的 Al Brooks 手工转换脚本移植而来,拆成可单测的纯函数 + 用 pymupdf 现造的合成 PDF 做集成测试。

**Tech Stack:** Python 3.11+,PyMuPDF(fitz),english-words,pytest;GitHub Actions;原生 HTML/CSS/JS(readbar 阅读层)。

## Global Constraints

- 产出书必须挂**共享阅读层**:章节页 `<head>` 内有 `<link rel="stylesheet" href="../reader.css">`、`</body>` 前有 `<script src="../reader.js"></script>`;`<head>` 内含预上漆设置脚本(下方 Task 7 给全文)。
- 书架是清单驱动:**不硬编码书卡**;新书 = `books/<id>/` + 往 `books/library.json` 的 `books[]` 追加 `{id,title,subtitle,category,accent,href}`。
- 阅读层只在 `.col` 里的 `p / h2 / .lead` 上划线;正文块用 `<p>`、章标题 `<h2>`、子标题 `<h3>`、图 `<figure><img><figcaption>`、要点 `<ul><li>`。
- 深色主题固定基色,每书一个 accent;**不引入外部库/CDN/网络字体/外链图片**(图一律本地 PNG)。
- 所有 Python 源码用 4 空格缩进;文件 UTF-8 无 BOM。
- 转换器**纯函数不碰 PDF**(clean/assemble/structure 可不依赖 fitz 单测);碰 PDF 的模块用合成 PDF 测。
- 字号阈值(从 Al Brooks 实测,作为默认):正文≈10、章标题≈25.9、下沉首字>30;`chaptitle 续接判定`用 `>=24`;`subhead/title` 判定用 `>=20`;图框需 `≥25` 条矢量路径且非整页(`<0.85` 页面积)、高 `≥60`、宽 `≥120`。

---

## File Structure

```
tools/pdf2readbar/
  __init__.py
  clean.py        # 纯文本清洗:连字/断词/下沉首字消歧
  elements.py     # 元素组装:element 列表 → HTML 正文(段/要点/子标题/图/图注 + 合并)
  structure.py    # TOC → 单元(部/章)切分 + 无 TOC 退化
  probe.py        # 打开 PDF:TOC、文字版判定、图计数、元数据
  figures.py      # 图框检测 + 渲染 PNG + 抽内嵌位图
  extract.py      # Extractor:逐页 → 有序 element(挂 clean + figures)
  templates.py    # readbar HTML 模板字符串(hub / 章节页 / 预上漆脚本 / 样式)
  build.py        # Book 模型 → 写 hub + 章节页 + img + 改 library.json
  cli.py          # python -m pdf2readbar <pdf> [--id ...] 编排
  README.md
  tests/
    __init__.py
    conftest.py   # 合成 PDF fixtures
    test_clean.py
    test_elements.py
    test_structure.py
    test_probe.py
    test_figures.py
    test_extract.py
    test_build.py
    test_cli.py
_inbox/
  .gitkeep
  README.md
.github/workflows/import-pdf.yml
docs/... (CLAUDE.md 更新)
index.html (根:加「添加新书」入口)
```

---

## Task 1: 包骨架 + 纯文本清洗 `clean.py`

**Files:**
- Create: `tools/pdf2readbar/__init__.py`(空)
- Create: `tools/pdf2readbar/clean.py`
- Create: `tools/pdf2readbar/tests/__init__.py`(空)
- Test: `tools/pdf2readbar/tests/test_clean.py`

**Interfaces:**
- Produces:
  - `fix_ligatures(s: str) -> str`
  - `dehyphenate_join(lines: list[str]) -> str`(行尾连字符则去字符直接拼,否则空格拼)
  - `dropcap_join(letter: str, text: str, words: set[str]) -> str`(辅音→直接拼;`A`/`I`→续接首词在 `words` 里则空格拼,否则直接拼)

- [ ] **Step 1: Write the failing test**

```python
# tools/pdf2readbar/tests/test_clean.py
from pdf2readbar.clean import fix_ligatures, dehyphenate_join, dropcap_join

WORDS = {"reversal", "trader", "have", "many"}

def test_fix_ligatures():
    assert fix_ligatures("diﬃcult ﬁnal") == "difficult final"

def test_dehyphenate_join_softwrap():
    assert dehyphenate_join(["Re-", "member this"]) == "Remember this"

def test_dehyphenate_join_space():
    assert dehyphenate_join(["the close", "of the bar"]) == "the close of the bar"

def test_dropcap_consonant_joins_no_space():
    assert dropcap_join("T", "here is a reason", WORDS) == "There is a reason"

def test_dropcap_A_article_gets_space():
    assert dropcap_join("A", "reversal bar is one", WORDS) == "A reversal bar is one"

def test_dropcap_A_wordstart_no_space():
    # "lthough" 不是真词 → 拼成 "Although"
    assert dropcap_join("A", "lthough many traders", WORDS) == "Although many traders"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd tools/pdf2readbar && python -m pytest tests/test_clean.py -v`
Expected: FAIL（ModuleNotFoundError / ImportError: cannot import name）

- [ ] **Step 3: Write minimal implementation**

```python
# tools/pdf2readbar/clean.py
import re

_LIG = {"ﬁ": "fi", "ﬂ": "fl", "ﬀ": "ff", "ﬃ": "ffi", "ﬄ": "ffl"}

def fix_ligatures(s: str) -> str:
    for k, v in _LIG.items():
        s = s.replace(k, v)
    return s

def dehyphenate_join(lines: list[str]) -> str:
    s = ""
    for i, ln in enumerate(lines):
        if i == 0:
            s = ln
        elif s.endswith("-"):
            s = s[:-1] + ln
        else:
            s = s + " " + ln
    return s

def dropcap_join(letter: str, text: str, words: set[str]) -> str:
    # 辅音下沉首字 = 词首字母,直接拼(T+here=There)
    if letter not in ("A", "I"):
        return letter + text
    # A / I:续接首词是真词 → 冠词/代词(空格);否则是词首(直接拼)
    m = re.match(r"[A-Za-z']+", text)
    if m and m.group(0).lower() in words:
        return letter + " " + text
    return letter + text
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd tools/pdf2readbar && python -m pytest tests/test_clean.py -v`
Expected: PASS（6 passed）

- [ ] **Step 5: Commit**

```bash
git add tools/pdf2readbar/__init__.py tools/pdf2readbar/clean.py tools/pdf2readbar/tests/__init__.py tools/pdf2readbar/tests/test_clean.py
git commit -m "feat(pdf2readbar): 纯文本清洗(连字/断词/下沉首字消歧)"
```

---

## Task 2: 元素组装 `elements.py`

**Files:**
- Create: `tools/pdf2readbar/elements.py`
- Test: `tools/pdf2readbar/tests/test_elements.py`

**Interfaces:**
- Consumes: `dropcap_join`, `dehyphenate_join`(来自 clean）
- Produces:
  - `assemble(elements: list[dict], words: set[str]) -> str`
  - element 是 dict,kind ∈ {`para`,`bullets`,`subhead`,`figure`,`caption`,`dropcap`}:
    - `{"kind":"para","t":str}` / `{"kind":"subhead","t":str}`
    - `{"kind":"bullets","items":[str,...]}`
    - `{"kind":"figure","img":str}`(img = 文件名)
    - `{"kind":"caption","num":str,"title":str}`
    - `{"kind":"dropcap","t":str}`(单个大写字母)
  - 输出:HTML 正文片段,块间用 `"\n        "` 连接;`<p>/<h3>/<ul>/<figure>` 标签;图注回填到最近一个 `<figure>`。

- [ ] **Step 1: Write the failing test**

```python
# tools/pdf2readbar/tests/test_elements.py
from pdf2readbar.elements import assemble

WORDS = {"reversal", "trader"}

def test_para_and_dropcap():
    els = [{"kind":"dropcap","t":"A"}, {"kind":"para","t":"reversal bar."}]
    assert assemble(els, WORDS) == "<p>A reversal bar.</p>"

def test_bullets_merge_consecutive():
    els = [{"kind":"bullets","items":["one"]}, {"kind":"bullets","items":["two"]}]
    assert assemble(els, WORDS) == "<ul><li>one</li><li>two</li></ul>"

def test_figure_caption_fill():
    els = [{"kind":"figure","img":"f1.png"}, {"kind":"caption","num":"5.1","title":"A Buy Bar"}]
    out = assemble(els, WORDS)
    assert '<img src="img/f1.png"' in out
    assert "<b>FIGURE 5.1</b>" in out and "A Buy Bar" in out
    assert "__CAP__" not in out

def test_pagebreak_paragraph_merge():
    # 前段不以句末标点结尾 + 后段小写开头 → 合并
    els = [{"kind":"para","t":"the trend continues"}, {"kind":"para","t":"into the close."}]
    assert assemble(els, WORDS) == "<p>the trend continues into the close.</p>"

def test_bullet_orphan_merge():
    els = [{"kind":"bullets","items":["a close below"]}, {"kind":"para","t":"its open."}]
    assert assemble(els, WORDS) == "<ul><li>a close below its open.</li></ul>"

def test_subhead():
    assert assemble([{"kind":"subhead","t":"Primary characteristics:"}], WORDS) == "<h3>Primary characteristics:</h3>"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd tools/pdf2readbar && python -m pytest tests/test_elements.py -v`
Expected: FAIL（ImportError）

- [ ] **Step 3: Write minimal implementation**

```python
# tools/pdf2readbar/elements.py
import html
from .clean import dropcap_join

_ENDP = tuple('.:?!”")')

def _esc(t: str) -> str:
    return html.escape(t, quote=False)

def assemble(elements: list[dict], words: set[str]) -> str:
    # pass 1: 收成 node,消化 dropcap(前缀到下一个文本 node)
    nodes = []
    pend = None
    for e in elements:
        k = e["kind"]
        if k == "dropcap":
            pend = e["t"]; continue
        if k == "para":
            t = e["t"]
            if pend: t = dropcap_join(pend, t, words); pend = None
            nodes.append(["para", t])
        elif k == "subhead":
            t = e["t"]
            if pend: t = dropcap_join(pend, t, words); pend = None
            nodes.append(["subhead", t])
        elif k == "bullets":
            items = list(e["items"])
            if pend and items:
                items[0] = dropcap_join(pend, items[0], words); pend = None
            if nodes and nodes[-1][0] == "bullets":
                nodes[-1][1] += items
            else:
                nodes.append(["bullets", items])
        elif k == "figure":
            nodes.append(["figure", e["img"]])
        elif k == "caption":
            nodes.append(["caption", e["num"], e["title"]])
    # pass 2: 合并(项目符号孤儿 + 跨页段落)
    merged = []
    for n in nodes:
        if n[0] == "para" and merged and merged[-1][0] == "bullets" and n[1][:1].islower():
            it = merged[-1][1]
            it[-1] = (it[-1][:-1] + n[1]) if it[-1].endswith("-") else (it[-1] + " " + n[1])
            continue
        if (n[0] == "para" and merged and merged[-1][0] == "para"
                and not merged[-1][1].rstrip().endswith(_ENDP) and n[1][:1].islower()):
            p = merged[-1][1]
            merged[-1][1] = (p[:-1] + n[1]) if p.endswith("-") else (p + " " + n[1])
        else:
            merged.append(n)
    # pass 3: 出 HTML
    out = []
    for n in merged:
        if n[0] == "para":
            out.append("<p>" + _esc(n[1]) + "</p>")
        elif n[0] == "subhead":
            out.append("<h3>" + _esc(n[1]) + "</h3>")
        elif n[0] == "bullets":
            out.append("<ul>" + "".join("<li>" + _esc(x) + "</li>" for x in n[1]) + "</ul>")
        elif n[0] == "figure":
            out.append('<figure><img src="img/%s" alt="Figure"><figcaption>__CAP__</figcaption></figure>' % n[1])
        elif n[0] == "caption":
            cap = "<b>FIGURE %s</b> &nbsp;%s" % (n[1], _esc(n[2]))
            for j in range(len(out) - 1, -1, -1):
                if "__CAP__" in out[j]:
                    out[j] = out[j].replace("__CAP__", cap); break
    return "\n        ".join(x.replace("__CAP__", "") for x in out)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd tools/pdf2readbar && python -m pytest tests/test_elements.py -v`
Expected: PASS（6 passed）

- [ ] **Step 5: Commit**

```bash
git add tools/pdf2readbar/elements.py tools/pdf2readbar/tests/test_elements.py
git commit -m "feat(pdf2readbar): element → HTML 正文组装(合并/图注回填)"
```

---

## Task 3: TOC 结构切分 `structure.py`

**Files:**
- Create: `tools/pdf2readbar/structure.py`
- Test: `tools/pdf2readbar/tests/test_structure.py`

**Interfaces:**
- Produces:
  - `Unit`(dataclass):`title:str`, `start:int`(0基doc页), `end:int`(不含), `level:int`
  - `units_from_toc(toc: list, page_count: int) -> list[Unit]`
    toc = pymupdf `get_toc()` 格式:`[level:int, title:str, page:int(1基)]`。
    取 **level==1 的顶层条目**为单元;每个单元 `start=page-1`,`end=下一个顶层条目的 start`(末个=page_count)。无 level1 时取最浅层级。
  - `units_fallback(page_count: int, per: int = 999999) -> list[Unit]`
    无 TOC 退化:整本一个单元 `Unit("Full text", 0, page_count, 1)`。

- [ ] **Step 1: Write the failing test**

```python
# tools/pdf2readbar/tests/test_structure.py
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd tools/pdf2readbar && python -m pytest tests/test_structure.py -v`
Expected: FAIL（ImportError）

- [ ] **Step 3: Write minimal implementation**

```python
# tools/pdf2readbar/structure.py
from dataclasses import dataclass

@dataclass
class Unit:
    title: str
    start: int   # 0-based doc page, inclusive
    end: int     # 0-based doc page, exclusive
    level: int

def units_from_toc(toc: list, page_count: int) -> list[Unit]:
    if not toc:
        return units_fallback(page_count)
    top = min(e[0] for e in toc)
    tops = [e for e in toc if e[0] == top]
    out = []
    for i, (lvl, title, page) in enumerate(tops):
        start = max(0, page - 1)
        end = (tops[i + 1][2] - 1) if i + 1 < len(tops) else page_count
        out.append(Unit(title.strip(), start, end, lvl))
    return out

def units_fallback(page_count: int, per: int = 999999) -> list[Unit]:
    return [Unit("Full text", 0, page_count, 1)]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd tools/pdf2readbar && python -m pytest tests/test_structure.py -v`
Expected: PASS（3 passed）

- [ ] **Step 5: Commit**

```bash
git add tools/pdf2readbar/structure.py tools/pdf2readbar/tests/test_structure.py
git commit -m "feat(pdf2readbar): TOC → 单元切分 + 无 TOC 退化"
```

---

## Task 4: 合成 PDF fixtures + 勘察 `probe.py`

**Files:**
- Create: `tools/pdf2readbar/probe.py`
- Create: `tools/pdf2readbar/tests/conftest.py`
- Test: `tools/pdf2readbar/tests/test_probe.py`

**Interfaces:**
- Produces:
  - `ProbeReport`(dataclass):`page_count:int`, `is_text:bool`, `avg_chars:int`, `toc:list`, `title:str|None`, `author:str|None`, `fig_pages:int`
  - `probe(pdf_path: str) -> ProbeReport`(`is_text` = `avg_chars >= 200`)
- conftest 提供 fixture `text_pdf`(临时路径,2 页有文字 + 设了 TOC)、`blank_pdf`(2 页空白,模拟扫描版)。

- [ ] **Step 1: Write the failing test**

```python
# tools/pdf2readbar/tests/conftest.py
import fitz, pytest

@pytest.fixture
def text_pdf(tmp_path):
    p = tmp_path / "text.pdf"
    doc = fitz.open()
    for i in range(2):
        pg = doc.new_page()
        pg.insert_text((72, 72), ("Chapter %d\n" % (i + 1)) + ("word " * 80))
    doc.set_toc([[1, "Chapter 1", 1], [1, "Chapter 2", 2]])
    doc.save(str(p)); doc.close()
    return str(p)

@pytest.fixture
def blank_pdf(tmp_path):
    p = tmp_path / "blank.pdf"
    doc = fitz.open()
    doc.new_page(); doc.new_page()
    doc.save(str(p)); doc.close()
    return str(p)
```

```python
# tools/pdf2readbar/tests/test_probe.py
from pdf2readbar.probe import probe

def test_probe_text_pdf(text_pdf):
    r = probe(text_pdf)
    assert r.page_count == 2
    assert r.is_text is True
    assert len(r.toc) == 2

def test_probe_blank_is_not_text(blank_pdf):
    r = probe(blank_pdf)
    assert r.is_text is False
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd tools/pdf2readbar && python -m pytest tests/test_probe.py -v`
Expected: FAIL（ImportError）

- [ ] **Step 3: Write minimal implementation**

```python
# tools/pdf2readbar/probe.py
from dataclasses import dataclass, field
import fitz

@dataclass
class ProbeReport:
    page_count: int
    is_text: bool
    avg_chars: int
    toc: list = field(default_factory=list)
    title: str | None = None
    author: str | None = None
    fig_pages: int = 0

def probe(pdf_path: str) -> ProbeReport:
    doc = fitz.open(pdf_path)
    total = 0
    fig_pages = 0
    for pg in doc:
        total += len(pg.get_text("text"))
        if len(pg.get_drawings()) >= 25:
            fig_pages += 1
    n = doc.page_count or 1
    avg = round(total / n)
    md = doc.metadata or {}
    rep = ProbeReport(
        page_count=doc.page_count,
        is_text=avg >= 200,
        avg_chars=avg,
        toc=doc.get_toc(),
        title=(md.get("title") or None),
        author=(md.get("author") or None),
        fig_pages=fig_pages,
    )
    doc.close()
    return rep
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd tools/pdf2readbar && python -m pytest tests/test_probe.py -v`
Expected: PASS（2 passed）

- [ ] **Step 5: Commit**

```bash
git add tools/pdf2readbar/probe.py tools/pdf2readbar/tests/conftest.py tools/pdf2readbar/tests/test_probe.py
git commit -m "feat(pdf2readbar): PDF 勘察(TOC/文字版判定/图计数)+ 合成 PDF fixtures"
```

---

## Task 5: 图检测与渲染 `figures.py`

**Files:**
- Create: `tools/pdf2readbar/figures.py`
- Test: `tools/pdf2readbar/tests/test_figures.py`

**Interfaces:**
- Produces:
  - `figbox_for(page) -> fitz.Rect | None`(矢量绘图密集区包围盒:排除 `<2px`、排除 `>0.85*页面积` 的边框,需 `≥25` 条路径,结果需高`≥60`宽`≥120`)
  - `render_figure(page, box, scale: int = 3) -> bytes`(裁剪渲染成 PNG bytes,box 上下各留白:`y0-16, y1+6, x0-6, x1+6`,夹在页内)

- [ ] **Step 1: Write the failing test**

```python
# tools/pdf2readbar/tests/test_figures.py
import fitz
from pdf2readbar.figures import figbox_for, render_figure

def _page_with_chart():
    doc = fitz.open(); pg = doc.new_page(width=400, height=600)
    # 画 40 条短线段,聚在上半页 → 模拟矢量图表
    for i in range(40):
        x = 50 + i * 6
        pg.draw_line((x, 100), (x, 100 + (i % 20) + 5))
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd tools/pdf2readbar && python -m pytest tests/test_figures.py -v`
Expected: FAIL（ImportError）

- [ ] **Step 3: Write minimal implementation**

```python
# tools/pdf2readbar/figures.py
import fitz

def figbox_for(page):
    pr = page.rect
    parea = pr.width * pr.height
    paths = []
    for d in page.get_drawings():
        b = d["rect"]
        if b.width < 2 or b.height < 2:
            continue
        if b.width * b.height > 0.85 * parea:   # 整页边框/背景
            continue
        ib = b & pr
        if ib.is_empty or ib.width < 2 or ib.height < 2:
            continue
        paths.append(ib)
    if len(paths) < 25:
        return None
    r = None
    for b in paths:
        r = b if r is None else (r | b)
    if r is None or r.height < 5 or r.width < 5:
        return None
    return r

def render_figure(page, box, scale: int = 3) -> bytes:
    pr = page.rect
    clip = fitz.Rect(box.x0 - 6, box.y0 - 16, box.x1 + 6, box.y1 + 6) & pr
    pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), clip=clip)
    return pix.tobytes("png")
```

> 注:测试里的图框较小(`height>=5`),故 `figbox_for` 的下限放宽到 `5`。真实书(Al Brooks)图高远大于 60,生产中由 Task 6 的 Extractor 再按 `height>=60/width>=120` 过滤(下方 Extractor 用 `_is_real_fig`)。**实现 `figbox_for` 时高/宽下限取 5**,真实过滤交给 Extractor。

- [ ] **Step 4: Run test to verify it passes**

Run: `cd tools/pdf2readbar && python -m pytest tests/test_figures.py -v`
Expected: PASS（3 passed）

- [ ] **Step 5: Commit**

```bash
git add tools/pdf2readbar/figures.py tools/pdf2readbar/tests/test_figures.py
git commit -m "feat(pdf2readbar): 图框检测 + 裁剪渲染 PNG"
```

---

## Task 6: 逐页抽取 `extract.py`

**Files:**
- Create: `tools/pdf2readbar/extract.py`
- Test: `tools/pdf2readbar/tests/test_extract.py`

**Interfaces:**
- Consumes: `fix_ligatures`(clean)、`figbox_for`/`render_figure`(figures)
- Produces:
  - `class Extractor`:
    - `__init__(self, doc, img_dir: str)`
    - `extract_unit(self, unit_index: int, start: int, end: int) -> list[dict]` — 处理 `doc[start:end]`,返回有序 element dict(kinds:`para`/`bullets`/`subhead`/`figure`/`caption`/`dropcap`;`chaptitle`/`chap`/`part` 标记不进正文流,标题在 build 阶段由 Unit 给)。渲染的图写到 `img_dir/fig_u{unit_index:02d}_{n:03d}.png`,figure 元素的 `img` = 该文件名。
  - 清洗规则(移植自验证过的脚本):去纯数字页码、去顶部(`y0<122`)ALLCAPS 跑页眉与杂散 `Figure x.y`;按 block 整体分类;`FIGURE x.y` 图注;下沉首字(行首单字符 `size>30`,弹出后重算 `maxsz`);代表字号忽略行首下沉 span;`maxsz>=20` 且各行短 → `subhead`;`r ` 项目符号块(换行续接并回);否则段落(`dehyphenate`)。图框需真实尺寸 `height>=60 and width>=120`(`_is_real_fig`)。

- [ ] **Step 1: Write the failing test**

```python
# tools/pdf2readbar/tests/test_extract.py
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd tools/pdf2readbar && python -m pytest tests/test_extract.py -v`
Expected: FAIL（ImportError）

- [ ] **Step 3: Write minimal implementation**

```python
# tools/pdf2readbar/extract.py
import os
import re
import fitz
from .clean import fix_ligatures
from .figures import figbox_for, render_figure

def _is_real_fig(box) -> bool:
    return box is not None and box.height >= 60 and box.width >= 120

class Extractor:
    def __init__(self, doc, img_dir: str):
        self.doc = doc
        self.img_dir = img_dir
        os.makedirs(img_dir, exist_ok=True)

    def extract_unit(self, unit_index: int, start: int, end: int) -> list[dict]:
        elements = []   # (orderkey, dict)
        fig_idx = 0
        for p in range(start, end):
            pg = self.doc[p]
            fb = figbox_for(pg)
            real = _is_real_fig(fb)
            if real:
                fig_idx += 1
                name = "fig_u%02d_%03d.png" % (unit_index, fig_idx)
                with open(os.path.join(self.img_dir, name), "wb") as f:
                    f.write(render_figure(pg, fb))
                elements.append((p * 10000 + fb.y0, {"kind": "figure", "img": name}))
            d = pg.get_text("dict")
            for blk in d["blocks"]:
                if blk.get("type", 0) != 0:
                    continue
                L = []
                for line in blk["lines"]:
                    lb = fitz.Rect(line["bbox"])
                    if real and fb.contains(lb.tl) and fb.contains(lb.br):
                        continue
                    txt = fix_ligatures("".join(s["text"] for s in line["spans"])).strip()
                    if not txt:
                        continue
                    if re.fullmatch(r"\d{1,3}", txt):
                        continue
                    if lb.y0 < 122 and re.fullmatch(r"[A-Z][A-Z0-9 :,'&.\-]+", txt):
                        continue
                    if lb.y0 < 122 and re.fullmatch(r"Figure\s+\d+\.\d+", txt):
                        continue
                    sp = line["spans"]
                    if len(sp) >= 2 and len(sp[0]["text"].strip()) == 1 and sp[0]["size"] > 30:
                        repsize = max(s["size"] for s in sp[1:])
                    else:
                        repsize = max(s["size"] for s in sp)
                    L.append((txt, lb.y0, round(lb.x0, 1), round(repsize, 1)))
                if not L:
                    continue
                key = p * 10000 + L[0][1]
                first = L[0][0]
                maxsz = max(s for *_, s in L)
                # 图注块
                m = re.match(r"FIGURE\s+(\d+\.\d+)\s*(.*)", first)
                if m:
                    title = (m.group(2) + " " + " ".join(t for t, *_ in L[1:])).strip()
                    elements.append((key, {"kind": "caption", "num": m.group(1), "title": title}))
                    continue
                # 下沉首字(行首单字符)
                if len(first) == 1 and L[0][3] > 30:
                    elements.append((key, {"kind": "dropcap", "t": first}))
                    L = L[1:]
                    if not L:
                        continue
                    maxsz = max(s for *_, s in L)
                # 子标题块
                if maxsz >= 20 and all(len(t) < 60 for t, *_ in L):
                    elements.append((key, {"kind": "subhead", "t": " ".join(t for t, *_ in L)}))
                    continue
                # 项目符号块
                if any(t.startswith("r ") for t, *_ in L):
                    items = []
                    cur = None
                    for t, *_ in L:
                        if t.startswith("r "):
                            if cur is not None:
                                items.append(cur)
                            cur = t[2:].strip()
                        elif cur is None:
                            cur = t
                        elif cur.endswith("-"):
                            cur = cur[:-1] + t
                        else:
                            cur = cur + " " + t
                    if cur is not None:
                        items.append(cur)
                    elements.append((key, {"kind": "bullets", "items": items}))
                    continue
                # 段落
                s = L[0][0]
                for t, *_ in L[1:]:
                    s = (s[:-1] + t) if s.endswith("-") else (s + " " + t)
                elements.append((key, {"kind": "para", "t": s}))
        elements.sort(key=lambda e: e[0])
        return [d for _, d in elements]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd tools/pdf2readbar && python -m pytest tests/test_extract.py -v`
Expected: PASS（2 passed）

- [ ] **Step 5: Commit**

```bash
git add tools/pdf2readbar/extract.py tools/pdf2readbar/tests/test_extract.py
git commit -m "feat(pdf2readbar): 逐页抽取 Extractor(清洗+分类+图)"
```

---

## Task 7: HTML 模板 + 构建 `templates.py` / `build.py`

**Files:**
- Create: `tools/pdf2readbar/templates.py`
- Create: `tools/pdf2readbar/build.py`
- Test: `tools/pdf2readbar/tests/test_build.py`

**Interfaces:**
- Consumes: `assemble`(elements)
- Produces(templates.py):
  - `PREPAINT: str`(预上漆设置脚本)、`STYLE: str`(阅读页 `<style>`,从 `books/trends/tpa-trends_vol1_price-action-basics.html` 的 `<style>` 原样取,见 Step 3)、`EXTRA: str`、`SCRIPTS: str`、`HUB_STYLE: str`(hub 自包含样式)。
  - `unit_page(book_id, title, en, accent, railitems, sections, navhtml) -> str`
  - `hub_page(book_id, title, subtitle, accent, cards, spine_js) -> str`
- Produces(build.py):
  - `@dataclass Book`:`id:str`, `title:str`, `subtitle:str`, `category:str`, `accent:str`, `units:list[BuiltUnit]`
  - `@dataclass BuiltUnit`:`slug:str`(文件名去 `.html`)、`title:str`、`body:str`(assemble 出的 HTML)
  - `build(book: Book, books_dir: str) -> dict` — 写 `books/<id>/<slug>.html` ×N + `index.html`(hub)+ 返回 library 条目 `{id,title,subtitle,category,accent,href}`;不直接改 library.json(Task 8 改)。图已由 Extractor 写到 `books/<id>/img/`。

- [ ] **Step 1: Write the failing test**

```python
# tools/pdf2readbar/tests/test_build.py
import os, json
from pdf2readbar.build import Book, BuiltUnit, build

def test_build_writes_pages_and_returns_entry(tmp_path):
    book = Book(id="demo", title="Demo Book", subtitle="a test", category="测试",
                accent="#d4a657",
                units=[BuiltUnit(slug="demo_part1", title="Part One", body="<p>Hello world.</p>")])
    books_dir = str(tmp_path / "books")
    os.makedirs(os.path.join(books_dir, "demo", "img"), exist_ok=True)
    entry = build(book, books_dir)
    # hub + 单元页存在
    assert os.path.exists(os.path.join(books_dir, "demo", "index.html"))
    page = open(os.path.join(books_dir, "demo", "demo_part1.html"), encoding="utf-8").read()
    assert "../reader.css" in page and "../reader.js" in page
    assert "<p>Hello world.</p>" in page
    assert "__CAP__" not in page
    # library 条目
    assert entry == {"id": "demo", "title": "Demo Book", "subtitle": "a test",
                     "category": "测试", "accent": "#d4a657", "href": "books/demo/index.html"}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd tools/pdf2readbar && python -m pytest tests/test_build.py -v`
Expected: FAIL（ImportError）

- [ ] **Step 3: Write minimal implementation**

先取共享样式(一次性,把现有阅读页 `<style>` 拷进 templates.py 的 `STYLE`):

```bash
# 人工:把 books/trends/tpa-trends_vol1_price-action-basics.html 中
# 从 "<style>" 到 "</style>"(含)整段,作为 templates.py 里 STYLE 三引号字符串的值。
```

```python
# tools/pdf2readbar/templates.py
PREPAINT = '<script>(function(){try{var s=JSON.parse(localStorage.getItem("readbar:settings")||"{}"),r=document.documentElement;if(s.fs)r.style.setProperty("--reader-fs",s.fs+"px");if(s.lh)r.style.setProperty("--reader-lh",s.lh);if(s.measure)r.style.setProperty("--reader-measure",s.measure+"px");if(s.font)r.setAttribute("data-font",s.font);}catch(e){}})();</script>'

EXTRA = '<style>figure img{width:100%;height:auto;display:block;border-radius:6px;}figure{padding:14px;}ul{margin:14px 0 14px 4px;padding-left:22px;color:#dcd8cc;}li{margin:6px 0;}h3{font-family:var(--serif);font-weight:600;font-size:21px;margin:30px 0 4px;color:var(--ink);}.col section{padding:40px 0 6px;}</style>'

SCRIPTS = '''<script>
const prog=document.getElementById("progress");
function up(){const h=document.documentElement,sc=h.scrollTop||document.body.scrollTop,m=h.scrollHeight-h.clientHeight;prog.style.width=(m>0?sc/m*100:0)+"%";}
addEventListener("scroll",up,{passive:true});up();
const rio=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");rio.unobserve(e.target);}}),{threshold:.08});
document.querySelectorAll("figure").forEach(f=>rio.observe(f));
const links=[...document.querySelectorAll(".rail a[href^='#']")],map={};links.forEach(a=>map[a.getAttribute("href").slice(1)]=a);
const nio=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){Object.values(map).forEach(l=>l.classList.remove("active"));const a=map[e.target.id];if(a)a.classList.add("active");}}),{rootMargin:"-8% 0px -80% 0px"});
document.querySelectorAll("section[id]").forEach(s=>nio.observe(s));
</script>
<script src="../reader.js"></script>'''

STYLE = """<style>
PASTE_THE_TRENDS_VOL1_STYLE_BLOCK_HERE
</style>"""   # 见上方 bash 步骤;实现时替换为真实 <style>…</style> 内容

def unit_page(book_id, title, en, accent, railitems, sections, navhtml):
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="readbar:accent" content="{accent}">
<title>{title} · {en}</title>
<link rel="stylesheet" href="../reader.css">
{PREPAINT}
{STYLE}
{EXTRA}
</head>
<body>
<div id="progress"></div>
<div class="wrap">
  <nav class="rail">
    <div class="brand">{title}<b>{en}</b></div>
    <div class="shelf-nav">{navhtml}</div>
    <ol>{railitems}</ol>
  </nav>
  <main>
    <header class="cover"><div class="col">
      <div class="eyebrow">{title}</div>
      <h1>{en}</h1>
    </div></header>
    <div class="col">
      {sections}
    </div>
  </main>
</div>
{SCRIPTS}
</body>
</html>'''
```

```python
# tools/pdf2readbar/build.py
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
    # 极简 hub(完整 hub 见 Task 8 增强;此处保证可点进各单元)
    cards = "".join('<a class="card" href="%s.html">%s</a>' % (u.slug, _esc(u.title)) for u in book.units)
    hub = ("<!DOCTYPE html><html lang='zh-CN'><head><meta charset='UTF-8'>"
           "<meta name='viewport' content='width=device-width, initial-scale=1.0'>"
           "<title>%s</title></head><body style='background:#13161b;color:#e9e5d8;font-family:Georgia,serif;max-width:800px;margin:0 auto;padding:40px'>"
           "<a href='../../index.html'>← 书架</a><h1>%s</h1><p>%s</p>%s</body></html>") % (
               _esc(book.title), _esc(book.title), _esc(book.subtitle),
               "".join('<p><a style="color:#d4a657" href="%s.html">%s →</a></p>' % (u.slug, _esc(u.title)) for u in book.units))
    with open(os.path.join(out_dir, "index.html"), "w", encoding="utf-8") as f:
        f.write(hub)
    return {"id": book.id, "title": book.title, "subtitle": book.subtitle,
            "category": book.category, "accent": book.accent, "href": "books/%s/index.html" % book.id}
```

> Hub 先用极简版(保证能进各单元、能回书架);**Task 8 步骤里**会把它替换成完整的封面 hub(进度/统计/笔记本,克隆 `books/tpa-original/index.html` 模板,SPINE/notebook 用单元 slug 列表填充)。这样 Task 7 的 build 可独立测试通过,Task 8 再增强 hub_page。

- [ ] **Step 4: Run test to verify it passes**

Run: `cd tools/pdf2readbar && python -m pytest tests/test_build.py -v`
Expected: PASS（1 passed）

- [ ] **Step 5: Commit**

```bash
git add tools/pdf2readbar/templates.py tools/pdf2readbar/build.py tools/pdf2readbar/tests/test_build.py
git commit -m "feat(pdf2readbar): readbar 模板 + 章节页/极简 hub 构建"
```

---

## Task 8: CLI 编排 + 完整 hub `cli.py`

**Files:**
- Create: `tools/pdf2readbar/cli.py`
- Create: `tools/pdf2readbar/__main__.py`(`from .cli import main; main()`)
- Modify: `tools/pdf2readbar/templates.py`(加完整 `hub_page(...)`,克隆 `books/tpa-original/index.html` 结构,SPINE/notebook 用单元 slug 填充)
- Modify: `tools/pdf2readbar/build.py`(`build` 改用 `T.hub_page` 出完整 hub)
- Test: `tools/pdf2readbar/tests/test_cli.py`

**Interfaces:**
- Consumes: `probe`、`units_from_toc`/`units_fallback`、`Extractor`、`assemble`、`Book`/`BuiltUnit`/`build`
- Produces:
  - `slugify(title: str) -> str`(小写、非字母数字→`-`、去重 `-`)
  - `derive_meta(report, pdf_path, overrides: dict) -> dict`(id/title/subtitle/category/accent;id 缺省 = slugify(title 或文件名);accent 缺省 `#d4a657`;category 缺省 `交易`)
  - `unique_id(base: str, library_path: str) -> str`(若 library.json 已有则加 `-2`/`-3`…)
  - `convert(pdf_path, books_dir, library_path, overrides: dict) -> dict`(全流程;`is_text` 为假则 `raise ValueError("scanned PDF: needs OCR")`;返回结果含 `id`、`warnings`)
  - `main(argv=None)`:argparse,写文件 + 把 entry 追加进 `library.json`

- [ ] **Step 1: Write the failing test**

```python
# tools/pdf2readbar/tests/test_cli.py
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
        pg.insert_text((72, 100), ("Chapter %d intro. " % (i+1)) + ("the market trends up and bulls win here. " * 12), fontsize=10)
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd tools/pdf2readbar && python -m pytest tests/test_cli.py -v`
Expected: FAIL（ImportError）

- [ ] **Step 3: Write minimal implementation**

```python
# tools/pdf2readbar/cli.py
import argparse, json, os, re
import fitz
from .probe import probe
from .structure import units_from_toc
from .extract import Extractor
from .elements import assemble
from .build import Book, BuiltUnit, build

try:
    from english_words import get_english_words_set
    WORDS = get_english_words_set(['web2'], lower=True)
except Exception:
    WORDS = {"a", "i", "the", "reversal", "trader", "have", "many"}

def slugify(title: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (title or "").lower()).strip("-")
    return re.sub(r"-+", "-", s) or "book"

def unique_id(base: str, library_path: str) -> str:
    ids = set()
    if os.path.exists(library_path):
        data = json.load(open(library_path, encoding="utf-8"))
        ids = {b.get("id") for b in data.get("books", [])}
    if base not in ids:
        return base
    n = 2
    while f"{base}-{n}" in ids:
        n += 1
    return f"{base}-{n}"

def derive_meta(report, pdf_path, overrides: dict) -> dict:
    title = overrides.get("title") or report.title or os.path.splitext(os.path.basename(pdf_path))[0]
    base_id = overrides.get("id") or slugify(title)
    return {
        "title": title,
        "id": base_id,
        "subtitle": overrides.get("subtitle") or ("原版导入 · %d 页" % report.page_count),
        "category": overrides.get("category") or "交易",
        "accent": overrides.get("accent") or "#d4a657",
    }

def convert(pdf_path, books_dir, library_path, overrides: dict) -> dict:
    report = probe(pdf_path)
    if not report.is_text:
        raise ValueError("scanned PDF: needs OCR (avg chars/page=%d)" % report.avg_chars)
    meta = derive_meta(report, pdf_path, overrides)
    meta["id"] = unique_id(meta["id"], library_path)
    units_spec = units_from_toc(report.toc, report.page_count)
    warnings = []
    if not report.toc:
        warnings.append("no embedded TOC; whole book as one unit")
    doc = fitz.open(pdf_path)
    img_dir = os.path.join(books_dir, meta["id"], "img")
    ex = Extractor(doc, img_dir)
    built = []
    for i, u in enumerate(units_spec):
        els = ex.extract_unit(i, u.start, u.end)
        body = assemble(els, WORDS)
        built.append(BuiltUnit(slug="%s_u%02d" % (meta["id"], i + 1), title=u.title, body=body))
    doc.close()
    book = Book(id=meta["id"], title=meta["title"], subtitle=meta["subtitle"],
                category=meta["category"], accent=meta["accent"], units=built)
    entry = build(book, books_dir)
    # 追加进 library.json
    data = {"books": []}
    if os.path.exists(library_path):
        data = json.load(open(library_path, encoding="utf-8"))
    data.setdefault("books", []).append(entry)
    with open(library_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return {"id": meta["id"], "units": [b.slug for b in built], "warnings": warnings,
            "page_count": report.page_count}

def main(argv=None):
    ap = argparse.ArgumentParser(prog="pdf2readbar")
    ap.add_argument("pdf")
    ap.add_argument("--id"); ap.add_argument("--title"); ap.add_argument("--subtitle")
    ap.add_argument("--accent"); ap.add_argument("--category")
    ap.add_argument("--books-dir", default="books")
    ap.add_argument("--library", default="books/library.json")
    a = ap.parse_args(argv)
    overrides = {k: v for k, v in vars(a).items() if k in ("id", "title", "subtitle", "accent", "category") and v}
    res = convert(a.pdf, a.books_dir, a.library, overrides)
    print(json.dumps(res, ensure_ascii=False))

if __name__ == "__main__":
    main()
```

```python
# tools/pdf2readbar/__main__.py
from .cli import main
main()
```

> **完整 hub**:`templates.py` 加 `hub_page(...)`,内容克隆 `books/tpa-original/index.html`(封面 + 单元卡 + 进度/统计/笔记本三段脚本),把其中 `SPINE`/`VOLS` 的 `{f,t,n}` 列表、卡片 HTML、`readbar:book:<id>` 改成由参数(单元 slug + 标题列表 + book.id + accent)生成。`build.build` 的 hub 段改为 `T.hub_page(book, ...)`。改完后 `test_build.py` 仍须通过(断言放宽为「hub 含各单元 slug 链接 + 含 `../../index.html`」)。

- [ ] **Step 4: Run test to verify it passes**

Run: `cd tools/pdf2readbar && python -m pytest tests/ -v`
Expected: PASS（全部,含 test_cli 4 项 + 之前各项）

- [ ] **Step 5: Commit**

```bash
git add tools/pdf2readbar/cli.py tools/pdf2readbar/__main__.py tools/pdf2readbar/templates.py tools/pdf2readbar/build.py tools/pdf2readbar/tests/test_build.py tools/pdf2readbar/tests/test_cli.py
git commit -m "feat(pdf2readbar): CLI 编排 + 完整 hub + library.json 追加"
```

---

## Task 9: 回归验证(Al Brooks PDF,手动)

**Files:**
- Create: `tools/pdf2readbar/README.md`

**说明:** 这是一次**人工回归验证**(Al Brooks 的 56MB PDF 不在仓库、不能进 CI),把它写进 README 作为「验收脚本」。

- [ ] **Step 1: 在本地对真实书跑一遍**

```bash
cd "<repo root>"
uv run --with pymupdf --with english-words python -m tools.pdf2readbar.cli \
  "C:/Users/CHAN KEE QING/OneDrive - Nanyang Technological University/Documents/Books/Al-Brooks-Trading-Price-Action-Trends-(KohanFx.com).pdf" \
  --id tpa-check --title "TPA Trends (check)" --books-dir /tmp/rbcheck/books --library /tmp/rbcheck/library.json
```

- [ ] **Step 2: 断言产出合理**

预期:`/tmp/rbcheck/books/tpa-check/` 下有 `index.html` + 多个 `*_u*.html` + `img/*.png`(图数量级 ~100+);grep 无 `__CAP__`;随手打开一个单元页,正文成段、图有图注。
若结构/图与手工版差距过大,记录差异到 README「已知差异」节(不阻塞:手工版是精修,自动版是草稿)。

- [ ] **Step 3: 写 README**

```markdown
# pdf2readbar

把文字版 PDF 转成 readbar 书。
用法:`python -m tools.pdf2readbar.cli <pdf> [--id --title --accent --category --books-dir --library]`
依赖:pymupdf、english-words。
范围:文字版 + 有内嵌目录最佳;扫描版会被拒(需 OCR);复杂表格/公式会简化。
回归:见上方 Al Brooks 验收命令。
```

- [ ] **Step 4: Commit**

```bash
git add tools/pdf2readbar/README.md
git commit -m "docs(pdf2readbar): README + Al Brooks 回归验收说明"
```

---

## Task 10: `_inbox/` + GitHub Action

**Files:**
- Create: `_inbox/.gitkeep`(空)
- Create: `_inbox/README.md`
- Create: `.github/workflows/import-pdf.yml`

- [ ] **Step 1: 投放区**

```markdown
<!-- _inbox/README.md -->
# 投放区
把一本**文字版 PDF** 拖进这个文件夹并提交,GitHub Action 会自动转成一本 readbar 书并开 PR。
可选:同名 `书.yml` 覆盖 id/title/subtitle/accent/category。转换后原 PDF 会被自动移除。
```

- [ ] **Step 2: Workflow**

```yaml
# .github/workflows/import-pdf.yml
name: Import PDF
on:
  push:
    paths: ["_inbox/**.pdf"]
permissions:
  contents: write
  pull-requests: write
jobs:
  import:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.11" }
      - run: pip install pymupdf english-words
      - name: Convert new PDFs
        id: conv
        run: |
          set -e
          shopt -s nullglob
          changed=0
          for pdf in _inbox/*.pdf; do
            echo "Converting $pdf"
            python -m tools.pdf2readbar.cli "$pdf" || { echo "convert failed"; exit 1; }
            git rm -f "$pdf"
            changed=1
          done
          echo "changed=$changed" >> "$GITHUB_OUTPUT"
      - name: Open PR
        if: steps.conv.outputs.changed == '1'
        uses: peter-evans/create-pull-request@v6
        with:
          branch: import/pdf-${{ github.run_id }}
          title: "Import: 新书(自动转换)"
          body: |
            自动从 `_inbox/` 转换的新书,请预览质量后合并。
            (草稿级:扫描版不支持、复杂表格/公式会简化)
          commit-message: "feat: import PDF book via pdf2readbar"
          add-paths: |
            books/**
```

- [ ] **Step 3: 校验 YAML 语法**

Run: `python -c "import yaml,sys; yaml.safe_load(open('.github/workflows/import-pdf.yml',encoding='utf-8')); print('yaml ok')"`
Expected: 打印 `yaml ok`

- [ ] **Step 4: Commit**

```bash
git add _inbox/.gitkeep _inbox/README.md .github/workflows/import-pdf.yml
git commit -m "feat(ci): _inbox 投放区 + Import PDF workflow(开 PR)"
```

---

## Task 11: 书架「+ 添加新书」入口 + 文档

**Files:**
- Modify: `index.html`(根:加固定「添加新书」入口卡;不进 library.json)
- Modify: `CLAUDE.md`(记录流水线 + tpa-original 这本书)

- [ ] **Step 1: 看现有书架渲染结构**

Run: `python -c "print(open('index.html',encoding='utf-8').read()[:0])"` 然后用编辑器查看 `index.html` 里渲染 `books[]` 的容器节点 id/class(记为 `<grid>`)与卡片样式类。

- [ ] **Step 2: 加「添加新书」入口**

在书架卡片容器后,插入一张**静态卡**(非 JS 渲染),指向仓库 `_inbox/` 上传页:

```html
<!-- index.html:紧跟书卡容器之后 -->
<a class="addbook" href="https://github.com/CHAN1203/Read-Bar/upload/main/_inbox"
   style="display:block;margin-top:18px;padding:22px 26px;border:1px dashed #2c343f;border-radius:16px;
          color:#8b94a3;text-decoration:none;font-family:Georgia,serif;">
  ＋ 添加新书 — 把文字版 PDF 拖进 <code>_inbox/</code>,几分钟后自动开 PR 导入
</a>
```

- [ ] **Step 3: 浏览器验证**

```bash
python -m http.server 8750 &
# 打开 http://localhost:8750/index.html,确认书卡照常 + 末尾出现「＋ 添加新书」卡,链接指向 GitHub upload 页
```
Expected: 书架原有书卡不受影响;末尾多一张虚线「添加新书」卡。

- [ ] **Step 4: 更新 CLAUDE.md**

在「常见任务」加一条「**用流水线导入 PDF 新书**:拖 PDF 进 `_inbox/` → Action 跑 `tools/pdf2readbar` → 开 PR → 合并上线」;在文件地图加 `tools/pdf2readbar/`、`_inbox/`、`.github/workflows/import-pdf.yml`、`books/tpa-original/`。

- [ ] **Step 5: Commit**

```bash
git add index.html CLAUDE.md
git commit -m "feat(shelf): 书架「添加新书」入口 + docs(CLAUDE.md): 导入流水线"
```

---

## Self-Review(对照 spec)

- **GitHub Actions + PR**:Task 10 ✓
- **转换器五模块**(probe/extract/figures/build/cli):Task 3–8 ✓(另拆出 clean/elements/structure/templates 作可测纯函数)
- **清洗规则**(连字/页眉/断词/下沉首字消歧/项目符号/标记):Task 1、6 ✓
- **图两手做**:Task 5 渲染矢量 ✓;**内嵌位图抽取**——v1 以矢量渲染为主(Al Brooks 即矢量);位图书走 `figbox_for`=None 时无图。**注:spec 提「抽内嵌位图」,本计划 v1 未实现位图分支,记为已知缩减**(多数交易书图为矢量截图;位图支持留后续)。← 实现时如需,可在 `figures.py` 加 `embedded_images(page)` 但不阻塞 v1。
- **结构 TOC + 退化**:Task 3 ✓
- **`_inbox/` + sidecar**:Task 10 投放区 ✓;**sidecar `.yml` 覆盖**——`convert` 已接受 `overrides`,但 workflow 未读取 sidecar 文件。**记为已知缩减**:v1 用 CLI 默认推断;sidecar 读取留后续(实现时可在 workflow 的转换循环里 `if [ -f "${pdf%.pdf}.yml" ]` 读取并传 `--id/--title`)。
- **书架入口**:Task 11 ✓
- **错误处理**:扫描版拒(Task 8 convert raise)、无 TOC 退化(Task 3 + warnings)、id 冲突加后缀(Task 8)✓
- **测试**:纯函数单测(1–5)+ 合成 PDF 集成(4、6、8)+ Al Brooks 回归(9)✓
- **类型一致**:`Unit`/`Book`/`BuiltUnit`/`ProbeReport` 字段在各 Task 间一致;`assemble(elements, words)`、`extract_unit(i,start,end)`、`build(book, books_dir)`、`convert(pdf, books_dir, library, overrides)` 签名贯穿一致 ✓

**两处对 spec 的已知缩减(v1 YAGNI)**:① 图只做矢量渲染、暂不抽内嵌位图;② sidecar `.yml` 覆盖暂由 CLI 参数代替、workflow 未自动读取。两者都不阻塞主流程,留作后续增量。实现时如认为必须,可在对应 Task 内补一个 step。
