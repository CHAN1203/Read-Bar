# 设计 · 子项目① 阅读舒适与设置（Reading Comfort & Settings）

日期：2026-06-27
所属：「优质沉静阅读站」四个子项目之一（① 阅读舒适与设置 → ② 进度与续读 → ③ 全文检索 → ④ 离线安装与打磨）。本 spec 只覆盖 ①。

## 目标

让读者能按自己的舒适度调节阅读排版，并用键盘安静地翻读。补上阅读类应用最基本、当前完全缺失的"阅读设置"能力（现在只有阅读光调暗）。

## 约束

- 纯静态站，GitHub Pages，零后端，自包含；不引入外部库 / CDN / 网络字体。
- 沿用现有冷色暗调设计系统（深蓝灰底 + 柔金 accent #d4a657）。
- 保留 `prefers-reduced-motion` 与可见 focus；不破坏现有 dock（声音/计时/批注/阅读光/沉浸/编辑）与功能。
- 设置存 `localStorage`，带内存兜底；`file://` 下 fetch 受限但本特性不依赖 fetch。
- 真正完整的中文"避头尾"纯 CSS 做不到 → 只做力所能及的 CSS 版（见 C），不承诺逐行完美。

## 决策（已与用户确认）

- Aa 设置**并入**现有「阅读光」面板：该 dock 按钮升级为「阅读设置」，图标改 `Aa`，面板内含排版控制 + 原有调暗。dock 不加新按钮（仍 6 键）。
- 键盘导航用**直觉标准套**（非 vim）。
- 设置**全站通用**（一处设置，所有书生效），不做每书独立。
- 不做"预设档"，用独立滑块（YAGNI）。
- 无衬线用系统无衬线栈（守自包含）。

## A · 「阅读设置」面板

由现有 reading-light 按钮（moon 图标）升级为「阅读设置」（`Aa` 图标）。面板（沿用 `.rl-panel` 样式）含：

| 控制 | 形式 | 范围 / 选项 | 默认 | 作用 |
|------|------|------------|------|------|
| 字号 | 滑块 | 15–22px | 17px | `--reader-fs` |
| 行距 | 滑块 | 1.6–2.2 | 1.85 | `--reader-lh` |
| 版心宽度 | 滑块 | 600–820px | 720px | `--reader-measure`（作用于 `.col` 的 max-width）|
| 字体 | 切换 | 衬线 / 无衬线 | 衬线 | 切换 body 字体栈（serif ⇄ system sans）|
| 调暗（阅读光）| 滑块 | 0–100 | 0 | 沿用现有 `.rl-veil` opacity |
| 重置 | 按钮 | — | — | 恢复以上默认 |

实现：三个数值写成 `:root`/`html` 上的 CSS 变量；`body{font-size:var(--reader-fs,17px); line-height:var(--reader-lh,1.85);}`，`.col{max-width:var(--reader-measure,720px);}`。字体切换在 `html` 上加 `data-font="sans"`，CSS `html[data-font="sans"] body{font-family:var(--sans);}`。范围为合理默认，实现时可微调。

## B · 持久化 + 无闪烁

- 键名 `readbar:settings` = `{ fs, lh, measure, font }`（全站通用）。
- **无闪烁**：每个阅读页 `<head>` 内（在内容渲染前）加一段极小内联脚本，读取 `readbar:settings` 并把变量/属性写到 `document.documentElement`，避免"先显示默认再跳变"。
- 这段脚本约 3 行、所有阅读页相同；本次加到 du-bang 的 5 卷（知识导图按需）；记入 teaching-ebook 模板，新书自带。
- reader.js 的设置面板在交互时更新同一组变量并写回 `localStorage`。

## C · 中文排版（力所能及的 CSS）

对正文容器（`.col`、`p`、`.lead` 等）应用：
- `line-break: strict;`
- `hanging-punctuation: allow-end;`（Safari 支持；其它浏览器优雅降级）
- `text-wrap: pretty;`（支持的浏览器；降级为正常换行）
- 维持舒适版心（由 B 的版心宽度控制）+ `-webkit-font-smoothing:antialiased`（已有）。
不承诺逐行完美避头尾。

## D · 键盘导航

全局 `keydown` 监听（在 reader.js）。**守卫**：当 `document.activeElement` 是 input/textarea/`[contenteditable]`，或按下了 Ctrl/Cmd/Alt 修饰键时，一律不拦截（放行浏览器/输入默认行为）。

| 键 | 行为 |
|----|------|
| `↑` / `↓` / `空格` / `Shift+空格` | 滚动翻页（多数为浏览器原生；不覆盖，仅确保可用）|
| `[` | 上一章（跳到当前位置的前一个 section 锚点）|
| `]` | 下一章（跳到后一个 section 锚点）|
| `g` | 平滑回到顶部 |
| `f` | 切换沉浸模式 |
| `Esc` | 退出沉浸（已存在）|
| `?` | 弹出/关闭快捷键帮助浮层 |

- 上/下一章：依据现有 `[data-sec]`/TOC 锚点，按当前 `scrollY` 找相邻 section 平滑滚动。
- 帮助浮层：居中卡片，列出上表，点击/`Esc`/`?` 关闭；沿用设计系统样式，尊重 reduced-motion。

## 落点（文件）

- `readbar/books/du-bang/reader.css`：新增 reader 变量默认、`.col`/body 绑定变量、中文排版属性、`html[data-font="sans"]`、帮助浮层样式、面板内排版控件样式。
- `readbar/books/du-bang/reader.js`：把 reading-light 模块升级为「阅读设置」模块（图标 Aa、面板含排版控件 + 调暗、持久化、重置）；新增键盘导航模块 + 帮助浮层。
- `readbar/books/du-bang/price_action_book_vol{1..5}.html`：`<head>` 各加无闪烁脚本（知识导图按需）。
- `readbar/.claude/skills/teaching-ebook/`：记入无闪烁脚本约定，新书模板自带。
- `CLAUDE.md`：补记新的 localStorage 键 `readbar:settings` 与阅读设置/键盘导航能力。

## 验收标准

- 打开任一卷 → Aa 面板调字号/行距/版心/字体，正文即时变化；刷新后保持；换一卷设置依然生效（全站通用）。
- 首次带非默认设置打开页面**不闪**（不先显示默认再跳变）。
- 键盘：`[`/`]` 在章节间跳转、`g` 回顶、`f`/`Esc` 沉浸、`?` 出帮助；在批注输入框/编辑模式里打字时这些键**不触发**。
- 冷色暗调与现有 dock/功能不受影响；reduced-motion 下动画降级；本地服务器实测无 JS 报错。

## 不在本子项目内（后续子项目）

进度条/续读/书签/统计（②）、全文检索（③）、PWA/favicon/OG/404/打印/导出导入/音效渐变/首次引导（④）。
