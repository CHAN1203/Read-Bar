# Reading Comfort & Settings — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give readers an "阅读设置" panel (font size / line-height / measure / serif⇄sans) plus intuitive keyboard navigation, persisted globally and applied without flash.

**Architecture:** All reading pages share `reader.css` + `reader.js` (in `readbar/books/du-bang/`). Typography is driven by CSS variables on `<html>` (`--reader-fs/--reader-lh/--reader-measure`) and a `data-font` attribute; the existing reading-light dock button is upgraded into a combined "阅读设置" panel. Settings persist in `localStorage["readbar:settings"]` and are re-applied pre-paint by a tiny inline `<head>` script in each volume. Keyboard navigation is a guarded global `keydown` handler in `reader.js`.

**Tech Stack:** Vanilla HTML/CSS/JS. No build, no framework, no external libs/CDN/web fonts. Verification via a local Node static server + Chrome DevTools.

## Global Constraints

- 纯静态站，GitHub Pages，零后端，自包含；no external libraries / CDN / web fonts.
- 沿用冷色暗调设计系统：`--bg:#13161b`、accent `--amber:#d4a657`、serif body。
- 保留 `prefers-reduced-motion` 与可见 focus；不破坏现有 dock（声音/计时/批注/阅读光/沉浸/编辑）。
- 设置存 `localStorage`，带内存兜底；键名 `readbar:settings` = `{ fs, lh, measure, font }`.
- dock 保持 6 键（阅读光按钮升级为阅读设置，不新增按钮）。
- Keyboard handler MUST no-op when `document.activeElement` is input/textarea/`[contenteditable]` or when Ctrl/Meta/Alt is held.
- 默认值：fs 17(px), lh 1.85, measure 720(px), font `serif`。

### Verification harness (used by every task)

A Node static server script already exists at `%TEMP%\rb_srv2.js` from earlier sessions; if missing, create it:

```js
const http=require("http"),fs=require("fs"),path=require("path");
const root=process.cwd();
const types={".html":"text/html",".css":"text/css",".js":"text/javascript",".json":"application/json"};
http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split("?")[0]);if(p==="/")p="/index.html";const fp=path.join(root,p);
fs.readFile(fp,(e,d)=>{if(e){res.writeHead(404);res.end("404");return;}res.writeHead(200,{"Content-Type":(types[path.extname(fp)]||"application/octet-stream")+"; charset=utf-8"});res.end(d);});}).listen(8732,()=>console.log("up on 8732"));
```

Start (PowerShell, from `readbar/`): `Start-Process node -ArgumentList "$env:TEMP\rb_srv2.js" -WindowStyle Hidden -PassThru` then probe `http://localhost:8732/books/du-bang/price_action_book_vol1.html` with Chrome DevTools `evaluate_script`. Stop the process when done.

---

### Task 1: Typography CSS variables + binding + Chinese type niceties

**Files:**
- Modify: `readbar/books/du-bang/reader.css` (the `:root` block and `body`/`.col` rules near the top)

**Interfaces:**
- Produces: CSS custom properties `--reader-fs`, `--reader-lh`, `--reader-measure` (read by Tasks 2 & 3) and selector `html[data-font="sans"]`.

- [ ] **Step 1: Add variable defaults to `:root`**

In `reader.css`, inside the existing `:root{ ... }` block, add these three lines (alongside the other tokens):

```css
  --reader-fs:17px; --reader-lh:1.85; --reader-measure:720px;
```

- [ ] **Step 2: Bind `body` and `.col` to the variables + add sans-font switch + Chinese typography**

Change the existing `body{...}` rule so font-size/line-height read the vars, and the `.col{...}` rule so max-width reads the var. Current:

```css
body{margin:0; background:var(--bg); color:var(--ink); font-family:var(--serif);
  font-size:17px; line-height:1.85; -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility; overflow-x:hidden;}
```

Replace with:

```css
body{margin:0; background:var(--bg); color:var(--ink); font-family:var(--serif);
  font-size:var(--reader-fs,17px); line-height:var(--reader-lh,1.85); -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility; overflow-x:hidden;}
html[data-font="sans"] body{font-family:var(--sans);}
.col p, .col .lead, .col h2, .col h3, .col li{line-break:strict; hanging-punctuation:allow-end; text-wrap:pretty;}
```

Then change the existing `.col{max-width:720px; ...}` rule's `max-width` to `var(--reader-measure,720px)`:

```css
.col{max-width:var(--reader-measure,720px); margin:0 auto; padding:0 32px;}
```

- [ ] **Step 3: Verify defaults unchanged + variables live**

Start the server, open vol1 in DevTools, run:

```js
() => {
  const cs = getComputedStyle(document.body);
  const before = {fs: cs.fontSize, lh: cs.lineHeight};
  document.documentElement.style.setProperty('--reader-fs','21px');
  document.documentElement.style.setProperty('--reader-measure','640px');
  const col = getComputedStyle(document.querySelector('.col'));
  return {before, afterFs: getComputedStyle(document.body).fontSize, colMax: col.maxWidth};
}
```

Expected: `before.fs` ≈ `"17px"`; `afterFs` ≈ `"21px"`; `colMax` ≈ `"640px"`. Reset the page after.

- [ ] **Step 4: Commit**

```bash
git add readbar/books/du-bang/reader.css
git commit -m "feat(reader): typography CSS variables + Chinese type niceties"
```

---

### Task 2: "阅读设置" panel + persistence (upgrade reading-light module)

**Files:**
- Modify: `readbar/books/du-bang/reader.js` (the `/* READING LIGHT + IMMERSIVE */` section — the `lBtn`/`lPanel` block)
- Modify: `readbar/books/du-bang/reader.css` (append panel-control styles)

**Interfaces:**
- Consumes: `mkBtn`, `mkPanel`, `showPanel`, `store`, `veil` (all already defined in `reader.js`); CSS vars from Task 1.
- Produces: `localStorage["readbar:settings"] = {fs:Number, lh:Number, measure:Number, font:"serif"|"sans"}`; a global `applySettings(s)` behavior writing to `document.documentElement` (read conceptually by Task 3's head script, which is independent code).

- [ ] **Step 1: Replace the reading-light module with the settings module**

In `reader.js`, find the block that starts with the comment `/* ===================== READING LIGHT + IMMERSIVE ===================== */` and replace the `lBtn`/`lPanel` definition + the `$("rlDim")` listener (everything from `var lBtn=mkBtn("light",...)` through the `$("rlDim").addEventListener(...)` line — but NOT the immersive `iBtn` code that follows) with:

```js
  var lBtn=mkBtn("light","阅读设置"); lBtn.innerHTML='<span style="font-family:var(--serif);font-size:18px;font-weight:600;line-height:1;">Aa</span>';
  var lPanel=mkPanel('<h4>阅读设置 <button class="rl-x" title="收起">×</button></h4>'
    +'<div class="rl-set"><label>字号 <b id="rlFsV"></b></label><input type="range" id="rlFs" min="15" max="22" step="1"></div>'
    +'<div class="rl-set"><label>行距 <b id="rlLhV"></b></label><input type="range" id="rlLh" min="1.6" max="2.2" step="0.05"></div>'
    +'<div class="rl-set"><label>版心宽度 <b id="rlMwV"></b></label><input type="range" id="rlMw" min="600" max="820" step="10"></div>'
    +'<div class="rl-set rl-font"><label>字体</label><div class="rl-seg"><button data-font="serif">衬线</button><button data-font="sans">无衬线</button></div></div>'
    +'<div class="rl-set"><label>阅读光 · 调暗</label><input type="range" id="rlDim" min="0" max="100" step="1" value="0"></div>'
    +'<div class="rl-row"><button class="ghost" id="rlReset">恢复默认</button></div>');
  lBtn.addEventListener("click",function(){ showPanel(lPanel,lBtn); });
  lPanel.querySelector(".rl-x").addEventListener("click",function(){ lPanel.classList.remove("open"); lBtn.classList.remove("on"); openPanel=null; });

  var DEF={fs:17,lh:1.85,measure:720,font:"serif"};
  var settings=store.load("readbar:settings",null)||{}; for(var key in DEF){ if(settings[key]==null) settings[key]=DEF[key]; }
  function applySettings(){ var r=document.documentElement;
    r.style.setProperty("--reader-fs",settings.fs+"px"); r.style.setProperty("--reader-lh",settings.lh);
    r.style.setProperty("--reader-measure",settings.measure+"px"); r.setAttribute("data-font",settings.font);
    $("rlFs").value=settings.fs; $("rlLh").value=settings.lh; $("rlMw").value=settings.measure;
    $("rlFsV").textContent=settings.fs+"px"; $("rlLhV").textContent=settings.lh; $("rlMwV").textContent=settings.measure+"px";
    [].forEach.call(lPanel.querySelectorAll(".rl-seg button"),function(b){ b.classList.toggle("on",b.getAttribute("data-font")===settings.font); }); }
  function saveSettings(){ store.save("readbar:settings",settings); }
  $("rlFs").addEventListener("input",function(){ settings.fs=+this.value; applySettings(); saveSettings(); });
  $("rlLh").addEventListener("input",function(){ settings.lh=+this.value; applySettings(); saveSettings(); });
  $("rlMw").addEventListener("input",function(){ settings.measure=+this.value; applySettings(); saveSettings(); });
  [].forEach.call(lPanel.querySelectorAll(".rl-seg button"),function(b){ b.addEventListener("click",function(){ settings.font=b.getAttribute("data-font"); applySettings(); saveSettings(); }); });
  $("rlReset").addEventListener("click",function(){ for(var k in DEF) settings[k]=DEF[k]; applySettings(); saveSettings(); });
  $("rlDim").addEventListener("input",function(){ veil.style.opacity=Math.min(0.62,(+this.value/100)*0.55); });
  applySettings();
```

(Leave the immersive `iBtn`/`exit`/`setImmersive` code that follows this block untouched. The light panel's old "进入沉浸" button is dropped — immersive stays reachable via its own dock button and the `f` key from Task 4.)

- [ ] **Step 2: Append panel-control styles to `reader.css`**

At the end of `reader.css`, append:

```css
/* ---- reading-settings panel controls ---- */
.rl-set{margin-top:16px;}
.rl-set label{display:flex; justify-content:space-between; align-items:baseline; font-family:var(--mono); font-size:10.5px; letter-spacing:.06em; text-transform:uppercase; color:var(--faint); margin-bottom:7px;}
.rl-set label b{color:var(--amber); font-size:12px;}
.rl-set input[type=range]{width:100%; accent-color:var(--amber); cursor:pointer;}
.rl-seg{display:flex; gap:6px;}
.rl-seg button{flex:1; font-family:var(--sans); font-size:12.5px; color:var(--muted); background:var(--surface); border:1px solid var(--line); border-radius:8px; padding:7px 0; cursor:pointer; transition:.2s var(--ease);}
.rl-seg button:hover{color:var(--ink);}
.rl-seg button.on{color:#241a12; background:var(--amber); border-color:var(--amber);}
```

- [ ] **Step 3: Verify live changes + persistence + reset**

Start server, open vol1, run:

```js
async () => {
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  localStorage.removeItem("readbar:settings");
  document.querySelector('.rl-db.rl-edit')?.classList; // noop guard
  const aa=[...document.querySelectorAll('.rl-dock .rl-db')].find(b=>b.title==='阅读设置');
  aa.click(); await sleep(100);
  const fs=document.getElementById('rlFs'); fs.value=21; fs.dispatchEvent(new Event('input'));
  document.querySelector('.rl-seg button[data-font="sans"]').click();
  await sleep(50);
  const out={
    bodyFs:getComputedStyle(document.body).fontSize,
    bodyFont:getComputedStyle(document.body).fontFamily.slice(0,10),
    saved:JSON.parse(localStorage.getItem('readbar:settings')||'{}')
  };
  document.getElementById('rlReset').click(); await sleep(50);
  out.afterResetFs=getComputedStyle(document.body).fontSize;
  out.afterResetSaved=JSON.parse(localStorage.getItem('readbar:settings')||'{}');
  localStorage.removeItem("readbar:settings");
  return out;
}
```

Expected: `bodyFs` ≈ `"21px"`; `bodyFont` starts non-serif (system sans, not "Georgia"); `saved.fs===21 && saved.font==="sans"`; `afterResetFs` ≈ `"17px"`; `afterResetSaved.fs===17 && afterResetSaved.font==="serif"`.

- [ ] **Step 4: Commit**

```bash
git add readbar/books/du-bang/reader.js readbar/books/du-bang/reader.css
git commit -m "feat(reader): 阅读设置 panel — font size/line-height/measure/font + persistence"
```

---

### Task 3: No-flash head script in each volume

**Files:**
- Modify: `readbar/books/du-bang/price_action_book_vol1.html` … `vol5.html` (`<head>`, right after the `<link rel="stylesheet" href="reader.css">` line)

**Interfaces:**
- Consumes: `localStorage["readbar:settings"]` written by Task 2.

- [ ] **Step 1: Insert the pre-paint script in all 5 volumes**

The exact snippet to insert immediately after `  <link rel="stylesheet" href="reader.css">` in each vol `<head>`:

```html
  <script>(function(){try{var s=JSON.parse(localStorage.getItem("readbar:settings")||"{}"),r=document.documentElement;if(s.fs)r.style.setProperty("--reader-fs",s.fs+"px");if(s.lh)r.style.setProperty("--reader-lh",s.lh);if(s.measure)r.style.setProperty("--reader-measure",s.measure+"px");if(s.font)r.setAttribute("data-font",s.font);}catch(e){}})();</script>
```

Apply to vol1–vol5. (PowerShell, UTF-8 safe, from `readbar/books/du-bang`):

```powershell
$enc=New-Object System.Text.UTF8Encoding($false)
$snip='  <link rel="stylesheet" href="reader.css">'
$add=$snip+"`n"+'  <script>(function(){try{var s=JSON.parse(localStorage.getItem("readbar:settings")||"{}"),r=document.documentElement;if(s.fs)r.style.setProperty("--reader-fs",s.fs+"px");if(s.lh)r.style.setProperty("--reader-lh",s.lh);if(s.measure)r.style.setProperty("--reader-measure",s.measure+"px");if(s.font)r.setAttribute("data-font",s.font);}catch(e){}})();</script>'
foreach($n in 1..5){ $p="price_action_book_vol$n.html"; $c=[IO.File]::ReadAllText($p,[Text.Encoding]::UTF8); $c=$c.Replace($snip,$add); [IO.File]::WriteAllText($p,$c,$enc) }
```

- [ ] **Step 2: Verify no flash (settings applied pre-paint)**

Start server, open vol1, run `localStorage.setItem("readbar:settings", JSON.stringify({fs:22,lh:2.0,measure:640,font:"sans"}))`, then hard-reload (DevTools navigate reload, ignoreCache). Then run:

```js
() => ({ htmlFs: document.documentElement.style.getPropertyValue('--reader-fs'),
         dataFont: document.documentElement.getAttribute('data-font'),
         bodyFs: getComputedStyle(document.body).fontSize })
```

Expected: `htmlFs==="22px"`, `dataFont==="sans"`, `bodyFs` ≈ `"22px"` — present immediately on load (no reliance on reader.js). Clean up: `localStorage.removeItem("readbar:settings")`.

- [ ] **Step 3: Commit**

```bash
git add readbar/books/du-bang/price_action_book_vol1.html readbar/books/du-bang/price_action_book_vol2.html readbar/books/du-bang/price_action_book_vol3.html readbar/books/du-bang/price_action_book_vol4.html readbar/books/du-bang/price_action_book_vol5.html
git commit -m "feat(reader): pre-paint settings script in volumes (no flash)"
```

---

### Task 4: Keyboard navigation + help overlay

**Files:**
- Modify: `readbar/books/du-bang/reader.js` (append a keyboard module before the final `/* init */` section)
- Modify: `readbar/books/du-bang/reader.css` (append help-overlay styles)

**Interfaces:**
- Consumes: `setImmersive` (defined in reader.js immersive module). NOTE: `setImmersive` is a local `function` inside the main IIFE, so the keyboard module must live in the **same IIFE**, appended after the immersive module and before init.

- [ ] **Step 1: Append the keyboard module in reader.js**

Inside the main IIFE, immediately before the `/* ===================== init ===================== */` comment, insert:

```js
  /* ===================== KEYBOARD NAV ===================== */
  var help=document.createElement("div"); help.className="rl-help";
  help.innerHTML='<div class="rl-help-card"><div class="rl-help-h">键盘快捷键 <button class="rl-x" id="rlHelpX">×</button></div>'
    +'<div class="rl-help-row"><kbd>↑</kbd><kbd>↓</kbd><kbd>空格</kbd><span>滚动翻页</span></div>'
    +'<div class="rl-help-row"><kbd>[</kbd><kbd>]</kbd><span>上 / 下一章</span></div>'
    +'<div class="rl-help-row"><kbd>g</kbd><span>回到顶部</span></div>'
    +'<div class="rl-help-row"><kbd>f</kbd><span>沉浸模式</span></div>'
    +'<div class="rl-help-row"><kbd>Esc</kbd><span>退出沉浸 / 关闭</span></div>'
    +'<div class="rl-help-row"><kbd>?</kbd><span>这张帮助</span></div></div>';
  document.body.appendChild(help);
  function toggleHelp(on){ help.classList.toggle("open", on==null?!help.classList.contains("open"):on); }
  $("rlHelpX").addEventListener("click",function(){ toggleHelp(false); });
  help.addEventListener("click",function(e){ if(e.target===help) toggleHelp(false); });
  function chapTargets(){ return [].slice.call(document.querySelectorAll("[data-sec], main section[id]")); }
  function gotoChap(dir){ var secs=chapTargets(); if(!secs.length) return; var y=window.scrollY+90, cur=-1;
    for(var i=0;i<secs.length;i++){ if(secs[i].offsetTop<=y) cur=i; }
    var t=Math.max(0,Math.min(secs.length-1,cur+dir)); if(dir>0&&cur<secs.length-1&&secs[cur+1]) t=cur+1; if(dir<0) t=Math.max(0,cur-1>=0?cur-1:0);
    var el=secs[t]; if(el) window.scrollTo({top:el.offsetTop-20,behavior:"smooth"}); }
  document.addEventListener("keydown",function(e){
    var a=document.activeElement;
    if(e.ctrlKey||e.metaKey||e.altKey) return;
    if(a&&(a.tagName==="INPUT"||a.tagName==="TEXTAREA"||a.isContentEditable)) return;
    if(help.classList.contains("open")){ if(e.key==="Escape"||e.key==="?"){ toggleHelp(false); e.preventDefault(); } return; }
    switch(e.key){
      case "[": gotoChap(-1); e.preventDefault(); break;
      case "]": gotoChap(1); e.preventDefault(); break;
      case "g": window.scrollTo({top:0,behavior:"smooth"}); e.preventDefault(); break;
      case "f": setImmersive(!document.body.classList.contains("rl-immersive")); e.preventDefault(); break;
      case "?": toggleHelp(true); e.preventDefault(); break;
    }
  });
```

- [ ] **Step 2: Append help-overlay styles to reader.css**

```css
/* ---- keyboard help overlay ---- */
.rl-help{position:fixed; inset:0; z-index:9600; display:none; align-items:center; justify-content:center; background:rgba(0,0,0,.5);}
.rl-help.open{display:flex;}
.rl-help-card{width:340px; max-width:90vw; background:var(--raise); border:1px solid var(--line); border-radius:var(--r2); padding:20px 22px; box-shadow:var(--shadow-soft);}
.rl-help-h{display:flex; align-items:center; justify-content:space-between; font-family:var(--serif); font-size:18px; color:var(--ink); margin-bottom:14px;}
.rl-help-h .rl-x{background:none; border:none; color:var(--muted); font-size:18px; cursor:pointer;}
.rl-help-row{display:flex; align-items:center; gap:8px; padding:7px 0; font-family:var(--sans); font-size:14px; color:var(--ink-soft);}
.rl-help-row span{margin-left:auto; color:var(--muted); font-size:13px;}
.rl-help-row kbd{font-family:var(--mono); font-size:12px; color:var(--ink); background:var(--surface); border:1px solid var(--line); border-radius:6px; padding:3px 8px; min-width:24px; text-align:center;}
@media (prefers-reduced-motion: reduce){ .rl-help{transition:none;} }
```

- [ ] **Step 3: Verify keyboard nav + guard + help**

Start server, open vol1, run:

```js
async () => {
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const fire=k=>document.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true}));
  window.scrollTo(0,0); await sleep(30);
  fire(']'); await sleep(400); const afterNext=window.scrollY;
  fire('g'); await sleep(400); const afterTop=window.scrollY;
  fire('f'); const imm=document.body.classList.contains('rl-immersive'); fire('f');
  fire('?'); const helpOpen=document.querySelector('.rl-help').classList.contains('open');
  fire('Escape'); const helpClosed=!document.querySelector('.rl-help').classList.contains('open');
  // guard: typing in an input must NOT navigate
  const inp=document.getElementById('rlFs'); inp.focus(); window.scrollTo(0,0); fire(']'); await sleep(200);
  const guarded=window.scrollY===0; inp.blur();
  return {afterNext, afterTop, imm, helpOpen, helpClosed, guarded};
}
```

Expected: `afterNext>0` (scrolled to a later chapter); `afterTop===0`; `imm===true`; `helpOpen===true`; `helpClosed===true`; `guarded===true` (key ignored while input focused).

- [ ] **Step 4: Commit**

```bash
git add readbar/books/du-bang/reader.js readbar/books/du-bang/reader.css
git commit -m "feat(reader): keyboard navigation + shortcuts help overlay"
```

---

### Task 5: Docs — record settings/keyboard + no-flash convention

**Files:**
- Modify: `CLAUDE.md` (data-storage line + reader-layer description)
- Modify: `readbar/.claude/skills/teaching-ebook/SKILL.md` (note the pre-paint settings script for new books)

**Interfaces:** none (documentation only).

- [ ] **Step 1: Update CLAUDE.md storage keys + reader description**

In `CLAUDE.md`, the localStorage keys line currently lists `readbar:notes/prog/time/edits`. Append `readbar:settings`(阅读设置:字号/行距/版心/字体). In the reader-layer paragraph, add that the dock 阅读光 按钮已升级为「阅读设置」(Aa)，含字号/行距/版心/字体 + 调暗，并支持键盘导航(`[`/`]`章节·`g`回顶·`f`沉浸·`?`帮助)，设置全站通用、靠各卷 `<head>` 内联脚本 pre-paint 应用(无闪)。

- [ ] **Step 2: Update teaching-ebook SKILL.md**

In the "When working inside the `readbar` project" section, add a bullet: 新书的每个阅读页 `<head>`(在 `reader.css` link 之后) 应带 pre-paint 设置脚本（读取 `readbar:settings` 写 `--reader-fs/--reader-lh/--reader-measure` + `data-font`），以继承全站阅读设置且不闪烁。

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md readbar/.claude/skills/teaching-ebook/SKILL.md
git commit -m "docs: record 阅读设置/keyboard + pre-paint script convention"
```

---

## Self-Review

**Spec coverage:**
- A 「阅读设置」面板（字号/行距/版心/字体/调暗/重置）→ Task 2 ✓
- B 持久化 + 无闪烁 → Task 2 (persist/apply) + Task 3 (pre-paint head script) ✓
- C 中文排版 CSS → Task 1 ✓
- D 键盘导航 + 帮助浮层 → Task 4 ✓
- 落点 docs → Task 5 ✓
- 验收标准（live change / persist / cross-volume / no-flash / keyboard guard / no JS error）→ covered by Task 2 Step 3, Task 3 Step 2, Task 4 Step 3 ✓

**Placeholder scan:** No TBD/TODO; all code shown in full. ✓

**Type/name consistency:** `settings` keys `{fs,lh,measure,font}` consistent across Tasks 2 & 3; CSS vars `--reader-fs/--reader-lh/--reader-measure` + `data-font` consistent across Tasks 1, 2, 3; `setImmersive` reused in Task 4 from the existing immersive module (same IIFE). `applySettings`/`saveSettings`/`gotoChap`/`toggleHelp` each defined once. ✓

## Notes / Risk

- `text-wrap:pretty` / `hanging-punctuation` are progressive — unsupported browsers ignore them (no breakage). Acceptable per spec.
- The keyboard module relies on `setImmersive` and `$` being in scope → it MUST be inserted inside the main IIFE (before init), not as a new IIFE. Stated in Task 4 Interfaces.
- 知识导图页 (`knowledge-map.html`) intentionally NOT given the pre-paint script or chapter-nav (no `.col` prose / no chapters); its dock still works. Out of scope per spec.
