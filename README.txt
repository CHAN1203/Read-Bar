读棒 · 静态站点(可直接上传 GitHub Pages)
==========================================

文件:
  index.html                     ← 网站首页(书架),GitHub Pages 默认入口
  price_action_book_vol1..5.html ← 五卷正文
  knowledge-map.html             ← 知识导图
  reader.css / reader.js         ← 共享阅读层(主题滚动条 + 划线/批注/检索/进度)

上传 GitHub Pages(约 15 分钟):
  1. github.com 新建 Public 仓库,例如 readbar
  2. 把本文件夹里的【所有文件】上传到仓库根目录(Add file → Upload files)
     —— 注意要全部上传,包括 reader.css 和 reader.js,否则阅读功能不生效
  3. Settings → Pages → Source: Deploy from a branch,Branch: main / (root),Save
  4. 等 1–2 分钟,得到网址:https://<用户名>.github.io/readbar/
  5. 打开即用;手机也能访问,划线批注按书各自存在本机浏览器

注意:
  · 必须当作"网站"打开(GitHub Pages / 本地服务器);reader.js 是外部文件,
    某些浏览器直接双击 file:// 打开时可能不加载外部脚本。要本地测试,
    可在文件夹里运行:  python -m http.server  然后访问 http://localhost:8000
  · 划线/批注/进度存在浏览器本地(localStorage),不跨设备同步。
