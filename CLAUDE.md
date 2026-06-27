# CLAUDE.md — readbar 项目说明

> 这是给 Claude Code 读的项目说明。**请始终用中文回复我。**

## 这是什么

`readbar` 是一个**静态阅读网站**,托管在 GitHub Pages,用来读一套我自己做的交互式电子书。
第一套书是《读棒》——讲 Al Brooks 价格行为(price action)的 5 卷交互教材,外加一张知识导图。
网站零后端、零构建步骤:纯 HTML/CSS/JS,所有文件自包含,直接当静态文件托管即可。

我本人是一个学价格行为的散户,在 TradingView 上写一套趋势跟随的 Pine 策略(标的 Micro Gold
Futures / MGC,5 分钟执行、15 分钟做高周期背景)。这些书就是把这套知识系统化。

## 文件地图

```
仓库根/                                  # GitHub Pages 源 = 仓库根目录(index.html 必须在这)
├── index.html                          # 【顶层书库书架】GitHub Pages 入口;fetch books/library.json,一书一卡渲染
├── books/
│   ├── library.json                    # 【清单】书架的唯一事实来源;每本书一条 {id,title,subtitle,category,accent,href}
│   └── du-bang/                        # 《读棒》= 一个自包含书文件夹(folder per book)
│       ├── index.html                  # 读棒封面/枢纽页,底部有知识导图入口
│       ├── price_action_book_vol1.html # 第一卷 · 地基(accent 金 #d4a657)
│       ├── price_action_book_vol2.html # 第二卷 · 趋势(accent 绿 #26a69a)
│       ├── price_action_book_vol3.html # 第三卷 · 震荡(accent 钢蓝 #7fa8c9)
│       ├── price_action_book_vol4.html # 第四卷 · 反转(accent 紫 #b58bd4,含自绘三推动画)
│       ├── price_action_book_vol5.html # 第五卷 · 实战(accent 铜 #d98a4f,含交易生命周期动画)
│       ├── knowledge-map.html          # 知识导图:折叠大纲 / 放射导图 / 知识图谱 三模式
│       ├── reader.css                  # 【共享阅读层 · 样式】主题滚动条 + 划线/批注/抽屉
│       ├── reader.js                   # 【共享阅读层 · 逻辑】高亮/批注/检索/进度 + 背景音 + 阅读计时 + 编辑模式
│       └── audio/                      # 背景音:sounds.json 登记清单 + 用户自备的音频文件(mp3 等)
└── .claude/skills/teaching-ebook/      # (可选)项目级 skill:产出新书用,见下
```

> **书架是动态的,别再硬编码卡片。** 顶层 `index.html` 不含任何写死的书卡——它读
> `books/library.json` 渲染。加书 = 在 `books/<id>/` 放好该书自包含的文件,再往
> `library.json` 的 `books[]` 追加一条。`reader.css`/`reader.js` **各书自带一份**,放在该书
> 文件夹里(读棒的 5 卷靠同级裸链接 `reader.css` 引用,所以必须和卷同目录)。

## 架构要点(改之前必读)

### 两层结构
1. **内容层** = 每个 `*.html` 卷本身。它们是**手工精修**的独立页面,内含用 JS(`drawCandles`
   等)生成的 K 线插图和自绘 SVG 动画。**不要**把它们硬转成纯数据/JSON——那会丢掉这些图。
2. **阅读层** = `reader.css` + `reader.js`,通过在每个 HTML 里注入
   `<link rel="stylesheet" href="reader.css">` 和 `<script src="reader.js"></script>` 挂上去。
   它提供:主题滚动条、选中划线(4 色)、批注、可搜索/筛选/导出的批注抽屉、阅读进度记忆,
   外加**右下角 dock 三件套**——🎧 背景音(播放 `audio/` 里用户自备的音频,循环;按钮由
   `audio/sounds.json` 清单动态生成;**不是合成噪音**)+ 阅读计时器(开页自动计、切走暂停、记起止)、
   ✏️ 编辑模式(删/改正文块,存 localStorage,可「导出 HTML」写回源文件)、🔖 批注。
   阅读光按钮已升级为「**阅读设置**」(Aa):含字号/行距/版心宽度/衬线⇄无衬线切换 + 调暗,设置存
   `readbar:settings`,全站通用,各阅读页 `<head>` 内联脚本在开页前应用(无闪烁)。另新增
   **键盘导航**:`[`/`]` 上/下一章 · `g` 回顶 · `f` 沉浸 · `?` 帮助;输入/编辑时自动禁用。
   批注抽屉除"划线批注"外含**「卷笔记」区**(自由笔记,不必先选中文字,存 `readbar:vnotes`);封面页有**「笔记本」**按钮,按卷汇总卷笔记 + 有批注的划线;选区工具条在**窄屏改底部固定**(触屏靠 `selectionchange`/`touchend` 触发)。
   划线只在 `.col` 里的 `p / h2 / .lead` 上做;编辑模式按 `data-rl-edit` 顺序键定位块。
   阅读层**不碰**插图和动画。dock 在**右下角**(别放右上角,会挡知识导图的模式按钮)。

### 数据存储
- 用 `localStorage`,带内存兜底。键名:`readbar:notes:<文件名>`、`readbar:prog:<文件名>`(续读定位 `{y,max}`,其中 `max` = 已读最远比例 0–1,单调递增,滚回不倒退;`y` = 续读定位滚动量)、
  `readbar:time:<文件名>`(阅读时长 + 起止记录)、`readbar:edits:<文件名>`(编辑模式的删除/改写)、
  `readbar:settings`(阅读设置:字号/行距/版心/字体,全站通用)、`readbar:last`(全站最后在读 {file,ts})、`readbar:marks:<文件名>`(书签 [{id,y,label,ts}])、`readbar:book:<id>`(整书进度缓存 {pct,ts},封面页写 / 书库读)、`readbar:vnotes:<文件名>`(卷级自由笔记 [{id,text,ts}])。
- **按卷各自存**,不跨设备。
- ⚠️ 在 `file://`(直接双击打开)或沙箱预览里 localStorage 可能不可用 / 外部 JS 不加载。
  **必须用本地服务器或 GitHub Pages 打开**才完整(`python -m http.server` 或 VS Code Live Server)。

## 设计系统(保持一致,别引入新风格)

- **深色主题**,固定基色;每卷只换一个 **accent** 强调色(见上方文件地图)。
- **配色变量**:`--bg #13161b · --surface #1b2027 · --ink #e9e5d8 · --muted #8b94a3 ·
  --faint #5c6573 · --line #2c343f`;语义色 `--pos #26a69a / --neg #ef5350`。
- **字体三角色**:衬线(Georgia/Songti)= 标题 + 苏格拉底提问的"老师声音";无衬线 = 正文;
  等宽(mono)= 标签/数据/eyebrow。
- **不要**引入外部库、CDN、网络字体或外链图片;插图一律内联 SVG,保持自包含。
- **不要**用大量加粗和一堆 bullet;用 facet 标签和卡片组织,正文用完整句子。
- **无障碍**必须保留:`@media (prefers-reduced-motion: reduce)` 把动画降级为最终态;交互用真
  `<button>`;保留可见 focus 样式。每章最多**一个**自绘动画,别撒一堆小动效。

## 教学法(改/加内容时遵循)

每个概念按四步讲:**是什么 → 它的逻辑(为什么有效)→ 好的样子和坏的样子 → 什么时候是高概率**。
配至少一个**苏格拉底问答卡**(先问、点开再揭晓)和一张手绘图。合适处放**原创**小诗(绝不照搬版权诗)。
跨卷概念要互相点名连接(例:"这和第二卷的 H2 是同一时刻")。

## 常见任务

- **改阅读功能**(划线/批注/进度/滚动条)→ 只动 `reader.css` / `reader.js`,改一处全卷生效。
- **给读棒新增一卷手工书**→ 在 `books/du-bang/` 里复制一个现有 `vol*.html` 当骨架,换 accent、填内容;
  确认 `</head>` 前有 `reader.css`、`</body>` 前有 `reader.js`(同级裸链接);在**读棒枢纽页**
  `books/du-bang/index.html` 加一张卡片;更新各卷的上一卷/下一卷链接。**注意:这只是给读棒加卷,不动顶层书架。**
- **新增一本书(顶层书架)**→ 在 `books/<id>/` 放好该书自包含的全部文件(含自带的 `reader.css`/`reader.js`),
  再往 `books/library.json` 的 `books[]` 追加一条 `{id,title,subtitle,category,accent,href}`。**别去手改顶层
  `index.html`**——它读清单渲染,下次打开自动出现新卡。`category` 决定顶部筛选条:书架从现有书的
  `category` 自动生成筛选 chip(只有一个分类时不显示),用**已有的分类名**就能归到同一类,换个新名就多一类。
- **本地预览**→ 用 Live Server 或 `python -m http.server`,**不要**双击 `file://` 打开。
- **部署**→ push 到 GitHub,Settings → Pages → Deploy from branch → main / root。
  `index.html` 必须在仓库**根目录**。

## 未来:数据驱动的新书(可选路线)

我有一个 `teaching-ebook` 的 Claude 技能,可产出**内容数据 `book.json`**,由数据驱动阅读器
`reader.html`(在 `.claude/skills/teaching-ebook/assets/` 里)渲染。**新做的书**走这条:
在 `books/<id>/` 里放 `book.json` + `reader.html`,再往 `books/library.json` 追加一条
(`href` 指向那本书的 `reader.html`),顶层书架即自动出现该书;天生带划线/批注/检索/进度。规范见
`.claude/skills/teaching-ebook/references/reader-format.md`。
**现有读棒 5 卷不走这条**(保留 JS 插图),继续用"注入阅读层"方式,住在 `books/du-bang/`。

## 别做的事

- 别把现有 5 卷转成纯数据(会丢插图/动画)。
- 别在卷里重复注入 `reader.css` / `reader.js`(每个文件各一次即可)。
- 别加外部依赖、网络字体、localStorage 之外的存储。
- 别改读棒卷与卷之间的相对链接文件名(`books/du-bang/` 内的 `price_action_book_vol*.html`、
  `index.html`),否则站内跳转会断;读棒的全部文件必须留在同一文件夹(裸链接靠同级解析)。
- 别在顶层 `index.html` 里硬编码书卡——它是清单驱动的,加书改 `books/library.json`。
- 别移除 reduced-motion 兜底或 focus 样式。
