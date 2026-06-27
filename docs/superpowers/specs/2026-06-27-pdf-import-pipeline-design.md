# PDF → readbar 导入流水线 · 设计 spec

> 日期:2026-06-27 · 状态:已通过设计评审,待写实现计划

## 目标(Goal)

让用户把一本**文字版 PDF** 拖进仓库的 `_inbox/`,由 GitHub Actions 自动转换成一本 readbar 书
(hub + 章节阅读页 + 图 + `library.json` 条目),并开一个 PR 供用户审阅;merge 后经
GitHub Pages 部署,书架上自动出现这本书——效果对标手工导入的 Al Brooks《Trading Price
Action: Trends》原版,但全程自动、零常驻后端。

## 背景与约束

- readbar 是**零后端纯静态站**,部署在 GitHub Pages:Pages 只发文件、不能跑 Python,
  也无法自写文件。因此「真正上线的新书」必须由**仓库侧的一道 CI** 生成并提交。
- 选定方案:**GitHub Actions**(免费额度,零常驻服务器)跑转换 + 开 PR。
- 现有手工导入脚本(临时区)是为 Al Brooks 那本书的版式调出来的;本项目将其**泛化**成
  可复用的 Python 包,但**质量是草稿级**,取决于 PDF 本身。

## 非目标(YAGNI / 范围外)

- **不做 OCR**:扫描版 PDF 检测到即报告「需 OCR,暂不支持」,不硬转。
- **不做网页内的文件选择框 + token 自动提交**:用 GitHub 自带的网页拖拽上传。
- **不追求复杂表格 / 数学公式的完美还原**:会简化或截图。
- **不做常驻后端服务器**。
- v1 只保证「**文字版 + 有内嵌目录(TOC)**」这一类 PDF 的良好结果。

## 架构与数据流

```
用户拖 PDF → _inbox/书.pdf  ──push──▶  GitHub Action(import-pdf.yml)
        │
        ▼  setup Python + pip install pymupdf english-words
   tools/pdf2readbar 转换器
   probe → extract → figures → build
        │
        ▼
   生成 books/<id>/(index.html hub + 各章/部 HTML + img/*.png) + 追加 library.json 一条
        │
        ▼  从 _inbox/ 移除该 PDF(不保留大文件 / 减少版权暴露)
   开 PR(分支 import/<id>,标题「Import: <书名>」,正文含 页数/章数/图数/警告)
        │
        ▼
   用户预览 → merge → Pages 重新部署 → 书架出现该书
```

## 组件设计

### 1. 转换器 `tools/pdf2readbar/`(核心工作量)

Python 包,模块化(每个模块单一职责、可独立测试):

- **`probe.py`** — `probe(pdf_path) -> ProbeReport`
  打开 PDF,读 `doc.get_toc()`,统计平均字符/页(判断文字版 vs 扫描版),数图。
  返回:页数、是否文字版、TOC 条目、figure 估计、元数据(title/author)。
- **`extract.py`** — `extract(doc, page_range, ctx) -> [Element]`
  逐页 `get_text("dict")`,产出有序元素流(para / bullets / subhead / figure / caption /
  chaptitle / dropcap)。清洗规则:
  - 连字 `ﬁ→fi` 等;去纯数字页码;去顶部 ALLCAPS 跑页眉 + 杂散 `Figure x.y`;
  - 断词接合(行尾连字符合并);**首字下沉消歧**(辅音首字直接拼;`A/I` 用英文词表判断
    冠词/代词还是词首:续接首词是真词→加空格「A reversal」,否则拼词「Although」);
  - 项目符号字形 `r ` → `<li>`,换行续行并回;
  - 标记识别:`CHAPTER N`(含两位数空格 `1 0`)、`PART [IVX]`、`FIGURE x.y` 图注;
    代表字号忽略行首下沉 span;弹出下沉首字后重算字号。
  - 跨页段落合并、跨页项目符号孤儿并回。
- **`figures.py`** — `figures(doc, page, fig_box) -> png_bytes`
  图区检测两手都做:**抽内嵌位图块**(`get_images`)+ **渲染矢量绘图密集区**
  (`get_drawings` 包围盒并集,排除接近整页的边框/背景、需 ≥25 条路径)→ 3x 渲染成 PNG。
  按图注就近内嵌(图注 `FIGURE x.y` 上方/下方的图)。
- **`build.py`** — `build(book, out_dir) -> manifest_entry`
  套 readbar 模板:生成 hub `index.html`(封面 + 单元卡 + 进度/统计/笔记本,写
  `readbar:book:<id>`)+ 每个 TOC 顶层单元一个阅读页(挂 `../reader.css`/`../reader.js`,
  含预上漆设置脚本 + 进度/淡入/导航锚点脚本 + prev/next 链)+ `library.json` 一条
  `{id,title,subtitle,category,accent,href}`。
- **`cli.py`** — `python -m pdf2readbar <pdf> [--id --title --accent --category --out]`
  串起 probe→extract→figures→build。id/title/accent/category **缺省从 PDF 元数据/TOC/
  文件名推断**;可被同名 sidecar `_inbox/<name>.yml` 覆盖。

**章节结构策略**:优先用**内嵌 TOC** 定义顶层单元(部/章)→ 每个顶层单元一个阅读页。
无 TOC → 退化:按标题字号聚类找章;再不行 → 整本一长页。无论走哪条,在 PR 正文写明。

### 2. `_inbox/` 投放区

- 放 `书.pdf`(GitHub 网页拖拽上传)。
- 可选 `书.yml`/`书.json` sidecar 覆盖 id/title/subtitle/accent/category。
- `_inbox/` 加 `.gitkeep` + 一份 `README.md` 说明用法。

### 3. GitHub Action `.github/workflows/import-pdf.yml`

- 触发:`push` 且 `paths: _inbox/**.pdf`。
- 权限:`contents: write`、`pull-requests: write`。
- 步骤:checkout → setup-python → `pip install pymupdf english-words` →
  对 `_inbox/` 中每个新 PDF 跑 `python -m pdf2readbar` → 生成 `books/<id>/` + 改
  `library.json` → `git rm` 该 PDF → 新建分支 `import/<id>` 提交 → 用 `gh`/peter-evans
  开 PR(标题「Import: <书名>」,正文嵌 probe 报告:页数、章数、图数、走了哪条结构策略、警告)。

### 4. 书架「+ 添加新书」入口

- 在根 `index.html` 加**一张固定卡**(不是 library.json 里的书),点开显示简短指引
  (拖 PDF 进 `_inbox/` → 等 PR),或直接跳到 GitHub `_inbox/` 上传 URL。
- 与「书架不硬编码书卡」不冲突:这是一个**功能入口**,非书卡;书卡仍由 library.json 渲染。

## 错误处理

- **扫描版/无文字层**:probe 检测平均字符/页过低 → 不转,PR 不开,Action 以清晰日志
  说明「疑似扫描版,需 OCR,暂不支持」(或在 issue/PR 注释)。
- **无 TOC**:退化策略 + 在 PR 正文 warning。
- **转换器抛异常**:Action 失败,日志清晰;不开半成品 PR。
- **id 冲突**(library.json 已有同 id):自动追加数字后缀(`mybook` → `mybook-2`),
  并在 PR 正文注明改了 id。

## 质量预期(明确写给用户)

产出是**草稿级**:文字版 + 有 TOC + 版式规整的最好;扫描版不支持;复杂表格/公式会简化。
PR 审阅这一关就是用来在上线前发现问题、必要时在 PR 分支手改或重跑。

## 测试

- **回归**:转换器在 Al Brooks 这本 PDF 上跑,应大致复现现有 `books/tpa-original/` 结构
  (单元数、图数量级一致,无 `__CAP__` 残留)。
- **泛化**:拿用户 `Documents/Books/` 里另一本文字版 PDF 跑,人工看产出是否合理。
- **冒烟**:断言生成了 hub、≥1 个章节页、library.json 多一条、HTML 无 `__CAP__` 占位符、
  图片引用都存在对应文件。
- **probe 单测**:文字版/扫描版判定、TOC 解析、首字下沉消歧若干用例。

## 已知权衡

- PDF 在 `_inbox/` 等 CI 跑的几分钟内,公开仓库下理论上可被下载。可接受;要完全避免需私有
  仓库或上传到非部署分支——v1 不做,记为已知项。
- 泛化转换器不会对每本 PDF 都达到 Al Brooks 那本的手工精度。

## 交付物清单

1. `tools/pdf2readbar/`(probe/extract/figures/build/cli + README + tests)
2. `_inbox/`(.gitkeep + README)
3. `.github/workflows/import-pdf.yml`
4. 根 `index.html` 的「+ 添加新书」入口
5. CLAUDE.md 更新(记录这条流水线 + tpa-original 这本书)
