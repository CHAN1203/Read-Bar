# pdf2readbar

把**文字版 PDF** 转成一本 readbar 书:hub(封面)+ 各单元阅读页 + 原书图 + 往 `books/library.json` 追加一条。核心逻辑从手工导入 Al Brooks《Trading Price Action: Trends》的转换器泛化而来。

## 用法

从**仓库根**运行,需要 `PYTHONPATH=tools`,依赖 `pymupdf` + `english-words`:

```bash
PYTHONPATH=tools uv run --with pymupdf --with english-words \
  python -m pdf2readbar <pdf> \
  [--id ID] [--title 书名] [--subtitle 副标题] [--accent "#d4a657"] [--category 分类] \
  [--books-dir books] [--library books/library.json]
```

id / 书名 / 配色 / 分类缺省会从 PDF 元数据、内嵌目录、文件名推断;id 冲突自动加 `-2` 后缀。

## 模块

| 文件 | 职责 |
|---|---|
| `clean.py` | 纯文本清洗(连字、断词接合、首字下沉消歧) |
| `elements.py` | element 列表 → HTML 正文(段/要点/子标题/图/图注 + 合并) |
| `structure.py` | TOC → 单元切分(取最浅且 ≥2 条的层)+ 无 TOC 退化 |
| `probe.py` | 勘察:TOC、文字版判定、图计数、元数据 |
| `figures.py` | 图框检测(矢量密集区,排除整页边框/细线)+ 裁剪渲染 PNG |
| `extract.py` | `Extractor`:逐页 → 有序 element(挂 clean + figures) |
| `templates.py` / `build.py` | readbar 模板 → 写 hub + 单元页 + 返回 library 条目 |
| `cli.py` | 编排 probe→structure→extract→assemble→build→追加 library.json |

## 范围

- **最佳**:文字版 + 有内嵌目录(TOC)+ 版式规整。
- **扫描版**(无文字层,平均字符/页 < 200)会被拒:`convert` 抛 `ValueError`,需先 OCR。
- 复杂表格/公式会简化;图为**矢量渲染**(内嵌位图暂不抽取,见「已知差异」)。

## 测试

```bash
PYTHONPATH=tools uv run --with pytest --with pymupdf --with english-words \
  python -m pytest tools/pdf2readbar/tests -v
```

## Al Brooks 回归验收

对真实原版 PDF 跑(56MB,不在仓库;~1 分钟):

```bash
PYTHONPATH=tools uv run --with pymupdf --with english-words python -m pdf2readbar \
  ".../Books/Al-Brooks-Trading-Price-Action-Trends-(KohanFx.com).pdf" \
  --id tpa-check --title "TPA Trends (check)" \
  --books-dir /tmp/rbcheck/books --library /tmp/rbcheck/library.json
```

**预期**(2026-06-28 实测):11 个单元(level-2 TOC)、**120 张图**、**0 个 `__CAP__` 残留**、library.json 多一条;正文成段、连字已修、图带 `FIGURE x.y` 图注。

## 已知差异(自动版 vs 手工精修的 `books/tpa-original`)

自动产出是**草稿级**;与手工版相比有这些差异(都不阻塞,PR 审阅时可看到,必要时在 PR 分支手改):

1. **单元粒度** = TOC 中最浅且 ≥2 条的层。Al Brooks 该层(level 2)含前后页(Contents / Acknowledgments / About / Index)→ 会多出这几个**较薄的单元**。手工版只保留前言 + 4 部。
2. **部内章节不再细分**:一个 PART 是**一长页**(各章作为正文连续出现),而非手工版「每章一 `<section>` + 左侧章节锚点导航」。
3. **图只渲染矢量**;内嵌位图不抽(矢量截图类交易书够用;纯位图书会少图)。
4. **hub 用通用模板**(无手工小诗/文案);单元页之间带「上一篇 / 下一篇」导航。
