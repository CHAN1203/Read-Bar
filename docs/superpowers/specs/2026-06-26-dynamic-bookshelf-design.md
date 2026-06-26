# 设计：清单驱动的动态书库（readbar）

日期：2026-06-26

## 问题

`readbar/index.html` 的书架卡片是硬编码的。每加一本/一卷书，都要手改 HTML。
用户已把 5 卷移进 `books/`，导致 index → 卷、卷 → `reader.css/js` 的裸链接全断。
用户希望：用 `teaching-ebook` skill 创作新书时，书自动出现在书架上，不再硬编码。

## 约束

- 纯静态站，托管 GitHub Pages，**零后端、零构建步骤**。
- 浏览器无法列目录 → "丢个文件自动出现" 需要一份**清单**作为事实来源。
- 不引入外部库 / CDN / 网络字体；保留 `prefers-reduced-motion` 与 focus 样式。
- 现有 5 卷是手工精修 HTML（含 JS K 线图），**不转数据**。
- 在 `file://` 下 `fetch()` 会被 CORS 拦截 → 必须用本地服务器或 GitHub Pages 打开（与现状一致）。

## 决策

- **自动化程度**：清单由 skill 维护，不由用户手改。创作新书 = 建文件夹 + 往清单追加一条。
- **书架粒度**：一书一卡。《读棒》= 1 张卡，点进去是它自己的 5 卷枢纽页。

## 目标结构

```
readbar/                          ← 仓库根 = GitHub Pages 根
├── index.html                    ← 新：顶层「书库」书架，fetch library.json，一书一卡
├── books/
│   ├── library.json              ← 新：清单 = 书架的唯一事实来源
│   └── du-bang/                  ← 《读棒》= 一个书文件夹（自包含）
│       ├── index.html            ← 读棒封面/枢纽页（= 原 readbar/index.html，整体搬入）
│       ├── price_action_book_vol1.html … vol5.html
│       ├── knowledge-map.html
│       ├── reader.css
│       └── reader.js
└── …（READER_部署指南.md、files.zip 留在根）
```

## 边界设计

顶层 `index.html` 只认 `library.json` 的卡片字段，**不关心**每本书背后是手工 HTML 还是数据驱动 reader。
卡片契约最小化：`{ id, title, subtitle, accent, href, tags? }`。

`library.json`：

```json
{
  "books": [
    { "id": "du-bang", "title": "读棒",
      "subtitle": "Al Brooks 价格行为 · 五卷 · 苏格拉底式",
      "accent": "#d4a657", "href": "books/du-bang/index.html",
      "tags": ["价格行为", "5 卷 + 知识导图"] }
  ]
}
```

## 为什么读棒几乎不改内部链接

读棒所有文件原本用**裸文件名**互相引用（`reader.css`、`vol2.html`、书架按钮 `index.html`）。
把它们全部放进同一个 `books/du-bang/` 文件夹后，又都成了同级，裸链接自动复活：
- 卷 → `reader.css` / `reader.js`：同级 ✓
- 卷 ↔ 卷：同级 ✓
- 卷 "📚 书架" → `index.html`：现在指向读棒枢纽页（书内导航），合理 ✓
- 枢纽页 → `price_action_book_vol*.html` / `knowledge-map.html`：同级 ✓

## 新书如何自动上架

更新 `teaching-ebook` skill 的产出流程，新增收尾步骤：
1. 在 `books/<id>/` 建文件夹并放入该书全部文件（自包含）。
2. 往 `books/library.json` 的 `books[]` **追加一条** `{ id, title, subtitle, accent, href }`。

顶层书架下次打开即渲染出新卡片。同步在 `readbar/CLAUDE.md` 文件地图与 SKILL.md 记录此约定。

## 顶层书架页设计

沿用现有深色设计系统与配色变量；做精简版（不搬读棒的 hero 大动画 / 诗 / 铁律——那些属于读棒自己的封面页）。
`fetch("books/library.json")` → 渲染卡片网格，每卡按 `accent` 着色，链接到 `href`。
保留 `@media (prefers-reduced-motion: reduce)` 与可见 focus 样式；fetch 失败时显示友好提示（提醒用本地服务器/Pages 打开）。

## 验收

- `books/du-bang/index.html` 及 5 卷在本地服务器下全部互相跳转正常，reader.css/js 生效。
- 顶层 `index.html` 在本地服务器下渲染出「读棒」一张卡，点击进入读棒枢纽页。
- 清单加第二条（mock）后，书架出现第二张卡，无需改 index.html。
