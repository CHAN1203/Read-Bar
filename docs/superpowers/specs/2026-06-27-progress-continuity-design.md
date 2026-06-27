# 设计 · 子项目② 进度与续读（Progress & Continuity）

日期：2026-06-27
所属：「优质沉静阅读站」四子项目之二（① 阅读舒适与设置 ✅ → ② 进度与续读 → ③ 全文检索 → ④ 离线安装与打磨）。本 spec 只覆盖 ②。

## 目标

补上阅读类应用的核心回路：随时看到读到哪、一键继续上次、用书签标记关键位置、用一块温柔的统计感受积累。让人愿意回来。

## 约束

- 纯静态站，GitHub Pages，零后端，自包含；不引入外部库 / CDN / 网络字体。
- 沿用冷色暗调设计系统（`--bg #13161b`，accent `--amber #d4a657`，serif 正文）。
- 保留 `prefers-reduced-motion` 与可见 focus；不破坏现有 dock / 阅读设置 / 键盘导航 / 批注 / 音频 / 计时 / 编辑。
- 数据存 `localStorage`，带内存兜底；`file://` 下受限 → 用本地服务器或 GitHub Pages 打开。
- 全部进度/统计从现有数据 + 一个新增的进度字段计算，不引入后端或额外历史结构。

## 决策（已与用户确认）

- 进度 = **已读到的最远比例**（滚回去不倒退），非当前位置。
- 进度主场 = **读棒封面页（hub）**：继续阅读入口 + 每卷进度 + 统计块。书库首页卡片显示整本书 % 概览。
- 书签：键盘 `b` 加/取消，批注抽屉里加一个书签区查看/跳转（不加 dock 按钮）。
- 连续天数 = 按计时 session 的本地日历日期算连续；完成度 = 各卷 max% 平均。

## 数据模型（localStorage）

- 进度（扩展现有键）：`readbar:prog:<file>` = `{ y:Number, max:Number }`。`y` = 上次滚动位置（续读定位，沿用）；`max` = 已读最远比例 0–1（滚动时 `max = Math.max(prev, current)`）。
- 全站最后在读：`readbar:last` = `{ file:String, ts:Number }`，滚动时（节流）更新。
- 书签：`readbar:marks:<file>` = `[ { id, y:Number, label:String, ts:Number } ]`。label = 当前位置最近的 `h2/h3` 文本（截断）。
- 计时（已存在）：`readbar:time:<file>` = `{ total:Number, sessions:[{start,end,seconds}] }`。
- 整书汇总缓存（封面页写，书库读）：`readbar:book:<id>` = `{ pct:Number, ts:Number }`。

`<file>` = 卷文件名去扩展名（与现有键一致）。`<id>` = 书 id（如 `du-bang`）。

## A · 阅读页（reader.js / reader.css）

1. **进度 max 跟踪**：滚动节流里，算 `pct = scrollY / (scrollHeight - clientHeight)`，写 `readbar:prog:<file> = {y, max:Math.max(oldMax, pct)}`，并写 `readbar:last = {file, ts:Date.now()}`。（`Date.now` 在浏览器可用。）
2. **书签键 `b`**：守卫同其它键（输入/编辑/修饰键时不触发）。按下：若当前位置附近（±一屏内）已有书签则删之，否则加一条 `{id, y:scrollY, label:nearestHeading(), ts}`。轻提示（一闪的 toast 或角标）。
3. **帮助浮层**：加一行 `b 书签`。
4. **批注抽屉**：在划线列表上方加一个**书签区**（标题「书签」+ 本卷 `marks` 列表，点击 `scrollTo(y)` 跳转、各项可删、空态有提示）。划线区照旧。

## B · 读棒封面页（du-bang/index.html）

封面页是静态 HTML；加一段**内联脚本**（依赖 reader 写入的 localStorage，但本页不引 reader.js）渲染：

1. **继续阅读入口**（hero 下方）：读 `readbar:last`；若其 file 属于本书的 5 卷之一 → 「继续阅读 · 第X卷《标题》· Y%」按钮，链接到该卷（卷自身的续读脚本会滚到 `y`）。无记录 → 「从第一卷开始 →」。
2. **每卷进度**：5 张卷卡各读 `readbar:prog:<volfile>.max`，渲染一条细进度条（卡片底部）+ `Y%`。0% 不显条、显「未开始」。
3. **阅读统计块**（克制一行三项）：
   - 总时长 = Σ 各卷 `time.total`，格式化（如 `3h 12m`）。
   - 连续天数 = 汇集各卷 sessions 的本地日期（`new Date(start).toDateString()`）成集合，从今天/昨天往回数连续天数；显示「连续 N 天」或「今天读了」。
   - 完成度 = 各卷 `max` 平均 → `Y%`。
4. 渲染时写整书缓存 `readbar:book:du-bang = { pct: 完成度, ts: Date.now() }`。

本书的 5 卷文件名 + 标题在该脚本里以一个小数组列出（封面页本就硬编码这 5 卷卡）。

## C · 书库首页（readbar/index.html）

卡片渲染时，对每本书读 `readbar:book:<id>`：有则在卡片显示「已读 Y%」（细条或文字）；无则不显示。纯增量，不改现有清单驱动逻辑。

## 落点（文件）

- `books/du-bang/reader.js`：进度 max + `readbar:last` 写入；`b` 键书签 + toast；批注抽屉加书签区；帮助浮层加行。
- `books/du-bang/reader.css`：书签区、进度条、toast、封面/书库进度样式。
- `books/du-bang/index.html`：继续阅读 + 每卷进度 + 统计块 + 写整书缓存（内联脚本 + 样式）。
- `index.html`（仓库根，书库首页）：卡片读 `readbar:book:<id>` 显示整书 %。
- `CLAUDE.md` + teaching-ebook `SKILL.md`：记新键 `readbar:last`/`readbar:marks:<file>`/`readbar:book:<id>` 与 `prog.max` 字段；新书封面页带进度脚本的约定。

## 验收标准

- 读一卷、滚动后回封面页：该卷卡显示 % 与细条；「继续阅读」指向刚读的卷；再点回到原位置。
- `max` 单调：滚到 60% 再滚回顶，仍显 60%。
- `b` 加书签 → 批注抽屉书签区出现该条 → 点击跳回；再按 `b` 同位置取消。
- 统计块显示合理的总时长 / 连续天数 / 完成度（用计时数据）。
- 访问封面页后，书库首页该书卡显示整书 %。
- 输入/编辑时 `b` 不触发；reduced-motion 下无突兀动画；本地服务器实测无 JS 报错。

## 不在本子项目内

全文检索（③）；PWA / favicon / OG / 404 / 打印 / 导出导入 / 音效渐变 / 首次引导（④）。
