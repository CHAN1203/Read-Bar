# 读棒 Reader · 上线指南(静态托管)

把阅读器和你的书做成一个真正的网站,**零后端、零费用**。下面三种方式任选,从最简单到最"正规"。

---

## 方式一:本地直接用(0 分钟)

你现在就能用——把 `readbar_reader.html` 下载到电脑,**双击用浏览器打开**即可。划线、批注、阅读进度都会存在这台电脑的这个浏览器里(localStorage)。

适合:只给自己看、不需要在手机/别的设备上同步。
局限:换设备或清浏览器数据会丢批注;别人打不开你的链接。

---

## 方式二:GitHub Pages(推荐,约 15 分钟,免费且有公开网址)

让任何人(包括你的手机)都能通过一个网址访问。

**准备文件结构**(建议这样组织):
```
readbar/
├── index.html          ← 就是 readbar_reader.html,改名为 index.html
└── books/              ← (进阶)如果改成 fetch 外部 JSON,书放这里
    ├── pa1.json
    └── ...
```
> 目前 `readbar_reader.html` 把书**内嵌**在代码里(`BOOKS` 对象),所以第一版你只需要 `index.html` 一个文件就能跑。等书多了,再按"方式三/进阶"拆成外部 JSON。

**步骤:**
1. 注册 / 登录 [github.com](https://github.com)。
2. 新建一个仓库(Repository),名字比如 `readbar`,勾选 **Public**。
3. 把 `readbar_reader.html` **改名为 `index.html`**,上传到仓库(网页上 "Add file → Upload files" 就行,不用命令行)。
4. 进仓库的 **Settings → Pages**。
5. "Build and deployment" 的 Source 选 **Deploy from a branch**;Branch 选 **main** / 根目录 **/ (root)**,Save。
6. 等 1–2 分钟,页面顶部会给你一个网址,形如
   `https://<你的用户名>.github.io/readbar/`
7. 打开它——这就是你的在线阅读器。手机也能访问,各设备各自保存批注。

**以后更新内容**:把新的 `index.html` 重新上传覆盖即可,几十秒后自动生效。

---

## 方式三:Netlify / Vercel(拖拽部署,更顺滑)

不想碰 GitHub 的话:
1. 注册 [netlify.com](https://netlify.com)(或 vercel.com)。
2. 找到 "Deploy / Add new site → Deploy manually(拖拽)"。
3. 把装着 `index.html` 的**文件夹**直接拖进去。
4. 立刻得到一个网址。要换成自己的域名也只需在面板里绑定。

---

## 进阶:把"内嵌的书"改成"外部 JSON"(书变多时再做)

当你用 skill 产出很多本书,不该再把它们全塞进一个 HTML。改造很小:

1. 每本书导出成 `books/<id>.json`(就是 skill 的 shape B 数据,见 `reader-format.md`)。
2. 再写一个 `books/index.json` 列出所有书:
   ```json
   [ {"id":"pa1","file":"books/pa1.json"},
     {"id":"sky","file":"books/sky.json"} ]
   ```
3. 在 `index.html` 里把内嵌的 `BOOKS` 改成开局 `fetch('books/index.json')`,再按需 `fetch` 每本书的 JSON。
   (阅读器代码里已为此留了位置——`BOOKS` 对象就是要替换的点。需要时我可以帮你把这段 fetch 加上。)

这样你每出一本新书,只要往 `books/` 丢一个 JSON、在 `index.json` 加一行,**网站自动多一本书**,阅读器、批注、检索、进度全部复用。

---

## 关于"跨设备同步"(可选,属于"重档")

上面所有方式,批注都存在**各自浏览器本地**(localStorage),不跨设备。如果哪天你想要"手机划的线,电脑也能看到",那就需要账号 + 云端数据库(如 Supabase / Firebase)。那是另一档投入,等你确实需要时我们再上。对个人学习,方式二已经足够好。

---

### 小抄

| 你想要 | 用哪个 |
|---|---|
| 现在马上、只给自己 | 方式一(本地双击打开) |
| 有网址、手机能看、免费 | **方式二(GitHub Pages)** |
| 拖拽部署、更省事 | 方式三(Netlify) |
| 书很多、自动进书架 | 进阶(外部 JSON) |
| 跨设备同步批注 | 重档(加后端,以后再说) |
