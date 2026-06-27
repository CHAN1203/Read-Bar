# Notes Enhancement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add per-volume freeform notes, an aggregated cross-volume notes browser on the hub (grouped by volume), and fix mobile (touch) highlight/comment.

**Architecture:** `reader.js`/`reader.css` gain a freeform "卷笔记" section in the notes drawer (new key `readbar:vnotes:<file>`) and a touch-aware selection toolbar (bottom-fixed on narrow screens). The hub (`books/du-bang/index.html`) gains a "笔记本" button + full-screen overlay that reads every volume's notes via an inline script. All data in localStorage.

**Tech Stack:** Vanilla HTML/CSS/JS. No build/framework/external libs. Verification: local Node static server (repo root) + Chrome DevTools.

## Global Constraints

- 纯静态站, GitHub Pages, zero backend, self-contained; NO external libs/CDN/web fonts.
- Cold dark palette unchanged: `--bg:#13161b`, accent `--amber:#d4a657`, serif body.
- Keep prefers-reduced-motion & focus; do not break existing dock / 阅读设置 / keyboard / 进度 / 书签 / 音频 / 计时 / 编辑 / existing highlight-comments.
- localStorage with memory fallback (via existing `store`). New key `readbar:vnotes:<file>`=[{id,text,ts}]. Existing `readbar:notes:<file>` (highlights) unchanged.
- `<file>` = volume filename without extension. Site at repo ROOT.

### Verification harness
Node server at `%TEMP%\rb_srv2.js`, started from **repo root** (serves :8732). Probe `http://localhost:8732/books/du-bang/price_action_book_vol1.html` and `…/books/du-bang/index.html` with DevTools `evaluate_script`. Stop when done.

---

### Task 1: Reader — 卷笔记 (freeform volume notes) in the drawer

**Files:**
- Modify: `books/du-bang/reader.js` (insert a vnotes module just before the `/* ===================== KEYBOARD NAV ===================== */` comment)
- Modify: `books/du-bang/reader.css` (append vnotes styles)

**Interfaces:**
- Consumes (already defined earlier in the IIFE): `$`, `store`, `esc`, `file`, `nBtn`, and the element `$("rlList")`.
- Produces: `localStorage["readbar:vnotes:<file>"]`=[{id,text,ts}].

- [ ] **Step 1: Insert the vnotes module**

In `reader.js`, find:
```js
  /* ===================== KEYBOARD NAV ===================== */
```
Insert IMMEDIATELY BEFORE it:
```js
  /* ===================== VOLUME NOTES ===================== */
  var VK="readbar:vnotes:"+file;
  var vnotes=store.load(VK,[])||[];
  function saveVnotes(){ store.save(VK,vnotes); }
  var vWrap=document.createElement("div"); vWrap.className="rl-vnotes";
  vWrap.innerHTML='<div class="rl-vh">卷笔记</div>'
    +'<div class="rl-vadd"><textarea id="rlVText" placeholder="记一条关于本卷的笔记…"></textarea><button id="rlVAdd">加笔记</button></div>'
    +'<div id="rlVList"></div>';
  var rlListForV=$("rlList"); rlListForV.parentNode.insertBefore(vWrap, rlListForV);
  function renderVnotes(){ var L=$("rlVList");
    if(!vnotes.length){ L.innerHTML='<div class="rl-vempty">还没有卷笔记。写一条关于这一卷的想法。</div>'; return; }
    L.innerHTML=vnotes.slice().sort(function(a,b){return b.ts-a.ts;}).map(function(n){
      return '<div class="rl-vn"><div class="rl-vnt">'+esc(n.text)+'</div><button class="rl-vndel" data-del="'+n.id+'">删除</button></div>'; }).join("");
    [].forEach.call(L.querySelectorAll("[data-del]"),function(b){ b.addEventListener("click",function(){
      vnotes=vnotes.filter(function(x){return x.id!==b.getAttribute("data-del");}); saveVnotes(); renderVnotes(); }); }); }
  $("rlVAdd").addEventListener("click",function(){ var t=$("rlVText").value.trim(); if(!t) return;
    vnotes.push({id:"v"+Date.now()+Math.floor(Math.random()*1e3),text:t,ts:Date.now()}); saveVnotes(); $("rlVText").value=""; renderVnotes(); });
  nBtn.addEventListener("click",renderVnotes);
  renderVnotes();

```

- [ ] **Step 2: Append vnotes CSS**

Append to end of `books/du-bang/reader.css`:
```css
/* ---- volume notes ---- */
.rl-vnotes{padding:10px 14px 4px; border-top:1px solid var(--line); margin-top:6px;}
.rl-vnotes .rl-vh{font-family:var(--mono); font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--faint); margin:2px 0 8px;}
.rl-vadd{display:flex; flex-direction:column; gap:8px; margin-bottom:10px;}
.rl-vadd textarea{width:100%; min-height:56px; resize:vertical; background:var(--bg); color:var(--ink); border:1px solid var(--line); border-radius:8px; padding:9px 11px; font-family:var(--serif); font-size:14px;}
.rl-vadd button{align-self:flex-end; font-family:var(--mono); font-size:12px; color:#241a12; background:var(--amber); border:none; border-radius:7px; padding:7px 14px; cursor:pointer;}
.rl-vadd button:hover{background:var(--amber-deep);}
.rl-vn{border:1px solid var(--line); border-radius:9px; padding:10px 12px; margin-bottom:8px;}
.rl-vn .rl-vnt{font-size:14px; color:var(--ink-soft); line-height:1.7; white-space:pre-wrap;}
.rl-vn .rl-vndel{margin-top:6px; font-family:var(--mono); font-size:11px; color:var(--faint); background:none; border:none; cursor:pointer;}
.rl-vn .rl-vndel:hover{color:var(--bear);}
.rl-vnotes .rl-vempty{font-size:13px; color:var(--faint); line-height:1.6; padding-bottom:8px;}
```

- [ ] **Step 3: Verify add / persist / delete**

Start server, open vol1, run:
```js
async () => {
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  localStorage.removeItem('readbar:vnotes:price_action_book_vol1');
  [...document.querySelectorAll('.rl-dock .rl-db')].find(b=>b.title&&b.title.includes('划线')).click(); await sleep(100);
  document.getElementById('rlVText').value='这一卷讲清楚了三推';
  document.getElementById('rlVAdd').click(); await sleep(50);
  const saved=JSON.parse(localStorage.getItem('readbar:vnotes:price_action_book_vol1')||'[]');
  const shown=document.querySelector('#rlVList .rl-vn .rl-vnt')?.textContent;
  const inputCleared=document.getElementById('rlVText').value==='';
  document.querySelector('#rlVList .rl-vndel').click(); await sleep(50);
  const afterDel=JSON.parse(localStorage.getItem('readbar:vnotes:price_action_book_vol1')||'[]');
  localStorage.removeItem('readbar:vnotes:price_action_book_vol1');
  return {savedLen:saved.length, savedText:saved[0]&&saved[0].text, shown, inputCleared, afterDelLen:afterDel.length};
}
```
Expected: `savedLen===1`; `savedText==='这一卷讲清楚了三推'`; `shown==='这一卷讲清楚了三推'`; `inputCleared===true`; `afterDelLen===0`.

- [ ] **Step 4: Commit**
```bash
git add books/du-bang/reader.js books/du-bang/reader.css
git commit -m "feat(reader): freeform per-volume notes (卷笔记) in the drawer"
```

---

### Task 2: Reader — mobile (touch) selection toolbar fix

**Files:**
- Modify: `books/du-bang/reader.js` (replace the `mouseup` selection handler)
- Modify: `books/du-bang/reader.css` (append narrow-screen bottom-toolbar styles)

**Interfaces:**
- Consumes (already defined): `tool`, `hideTool`, `charOffset`, `nearestSec`, `pending`, `window.getSelection`.
- Produces: function `showToolForSelection()`; toolbar gets class `rl-tool-bottom` on narrow screens.

- [ ] **Step 1: Replace the selection handler**

In `reader.js`, find this EXACT block:
```js
  document.addEventListener("mouseup",function(){ setTimeout(function(){
    var sel=window.getSelection(); if(!sel||sel.isCollapsed||!sel.rangeCount){ hideTool(); return; }
    var r=sel.getRangeAt(0); var anc=r.commonAncestorContainer.nodeType===1?r.commonAncestorContainer:r.commonAncestorContainer.parentElement;
    var block=anc.closest("[data-rk]"); if(!block){ hideTool(); return; }
    var a=charOffset(block,r.startContainer,r.startOffset), b=charOffset(block,r.endContainer,r.endOffset); if(Math.abs(b-a)<1){ hideTool(); return; }
    pending={k:block.getAttribute("data-rk"),start:Math.min(a,b),end:Math.max(a,b),text:sel.toString(),sec:nearestSec(block)};
    var rect=r.getBoundingClientRect(); tool.style.display="flex";
    tool.style.left=Math.max(8,Math.min(rect.left+rect.width/2-80, window.innerWidth-180))+"px"; tool.style.top=Math.max(8,rect.top-46)+"px";
  },10); });
```
Replace with:
```js
  function showToolForSelection(){
    var sel=window.getSelection(); if(!sel||sel.isCollapsed||!sel.rangeCount){ hideTool(); return; }
    var r=sel.getRangeAt(0); var anc=r.commonAncestorContainer.nodeType===1?r.commonAncestorContainer:r.commonAncestorContainer.parentElement;
    var block=anc.closest("[data-rk]"); if(!block){ hideTool(); return; }
    var a=charOffset(block,r.startContainer,r.startOffset), b=charOffset(block,r.endContainer,r.endOffset); if(Math.abs(b-a)<1){ hideTool(); return; }
    pending={k:block.getAttribute("data-rk"),start:Math.min(a,b),end:Math.max(a,b),text:sel.toString(),sec:nearestSec(block)};
    tool.style.display="flex";
    if(window.matchMedia("(max-width:820px)").matches){ tool.classList.add("rl-tool-bottom"); tool.style.left=""; tool.style.top=""; }
    else { tool.classList.remove("rl-tool-bottom"); var rect=r.getBoundingClientRect();
      tool.style.left=Math.max(8,Math.min(rect.left+rect.width/2-80, window.innerWidth-180))+"px"; tool.style.top=Math.max(8,rect.top-46)+"px"; }
  }
  var selChT;
  document.addEventListener("mouseup",function(){ setTimeout(showToolForSelection,10); });
  document.addEventListener("touchend",function(){ setTimeout(showToolForSelection,10); },{passive:true});
  document.addEventListener("selectionchange",function(){ clearTimeout(selChT); selChT=setTimeout(showToolForSelection,250); });
```

- [ ] **Step 2: Append narrow-screen bottom-toolbar CSS**

Append to end of `books/du-bang/reader.css`:
```css
/* ---- mobile: bottom-fixed selection toolbar ---- */
.rl-tool.rl-tool-bottom{position:fixed; left:0; right:0; top:auto; bottom:0; width:100%;
  justify-content:center; gap:12px; padding:14px 12px calc(14px + env(safe-area-inset-bottom,0px));
  border-radius:14px 14px 0 0; box-shadow:0 -10px 30px rgba(0,0,0,.55); z-index:9100;}
.rl-tool.rl-tool-bottom .rl-sw{width:30px; height:30px;}
.rl-tool.rl-tool-bottom .rl-cbtn{font-size:14px; padding:8px 16px;}
```

- [ ] **Step 3: Verify narrow-screen bottom toolbar + highlight works; desktop unaffected**

Start server, open vol1, run (emulate narrow viewport via window size is not available in evaluate; instead drive the matchMedia path by checking the class logic against a real selection):
```js
async () => {
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  localStorage.removeItem('readbar:notes:price_action_book_vol1');
  // select text inside the first highlightable block
  const block=document.querySelector('main .col p[data-rk]');
  const r=document.createRange(); const tn=block.firstChild;
  r.setStart(tn,0); r.setEnd(tn,Math.min(8,tn.textContent.length));
  const sel=window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
  document.dispatchEvent(new Event('selectionchange')); await sleep(350);
  const tool=document.querySelector('.rl-tool');
  const toolVisible=getComputedStyle(tool).display!=='none';
  const isBottom=tool.classList.contains('rl-tool-bottom'); // true only if viewport ≤820 (controller will also resize)
  // create a highlight via the toolbar (amber swatch)
  tool.querySelector('.rl-sw[data-c="amber"]').click(); await sleep(60);
  const made=JSON.parse(localStorage.getItem('readbar:notes:price_action_book_vol1')||'[]');
  localStorage.removeItem('readbar:notes:price_action_book_vol1');
  return { toolVisibleAfterSelectionchange:toolVisible, isBottom, viewportW:window.innerWidth, highlightMade:made.length };
}
```
Controller note: run once at the default (wide) viewport — expect `toolVisibleAfterSelectionchange===true`, `highlightMade===1`, `isBottom===false` (wide). Then resize the page to width 390 (DevTools `resize_page`/`emulate`), re-select, dispatch `selectionchange`, and confirm `isBottom===true` and the toolbar computed `bottom` is `0px`/position `fixed`.

- [ ] **Step 4: Commit**
```bash
git add books/du-bang/reader.js books/du-bang/reader.css
git commit -m "fix(reader): touch selection (selectionchange/touchend) + bottom toolbar on mobile"
```

---

### Task 3: Hub — 笔记本 button + aggregated overlay (grouped by volume)

**Files:**
- Modify: `books/du-bang/index.html` (add a button container in the progress zone, an overlay, an inline script, and CSS in the existing `<style>`)

**Interfaces:**
- Consumes: `readbar:vnotes:<volfile>`, `readbar:notes:<volfile>` (comment-bearing items).

- [ ] **Step 1: Add the button container + overlay root**

In `books/du-bang/index.html`, find the line `  <div id="rlStats"></div>` (added in sub-project ②). Insert IMMEDIATELY AFTER it:
```html
  <div id="rlNotebookBtn"></div>
  <div id="rlNotebook" class="rl-nb"><div class="rl-nb-card"><div class="rl-nb-h"><span>笔记本</span><button class="rl-nb-x" id="rlNbX">×</button></div><div class="rl-nb-body" id="rlNbBody"></div></div></div>
```

- [ ] **Step 2: Add the inline script before `</body>`**

Insert immediately before `</body>`:
```html
<script>
(function(){
  var L=function(k,d){try{var v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch(e){return d;}};
  var esc=function(s){return (s||"").replace(/[&<>]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c];});};
  var VOLS=[
    {f:"price_action_book_vol1",n:"第一卷 · 地基《字母表》"},
    {f:"price_action_book_vol2",n:"第二卷 · 趋势《趋势》"},
    {f:"price_action_book_vol3",n:"第三卷 · 震荡《震荡区间》"},
    {f:"price_action_book_vol4",n:"第四卷 · 反转《反转与楔形》"},
    {f:"price_action_book_vol5",n:"第五卷 · 实战《实战手册》"}
  ];
  var groups=[], total=0;
  VOLS.forEach(function(v){
    var vn=L("readbar:vnotes:"+v.f,[])||[];
    var hl=(L("readbar:notes:"+v.f,[])||[]).filter(function(x){return x.comment;});
    if(!vn.length && !hl.length) return;
    total += vn.length + hl.length;
    groups.push({v:v, vn:vn.slice().sort(function(a,b){return b.ts-a.ts;}), hl:hl});
  });
  var btn=document.getElementById("rlNotebookBtn");
  btn.innerHTML='<button class="rl-nbbtn" id="rlNbOpen"><span class="rl-nbk">笔记本</span><span class="rl-nbc">'+(total?total+' 条':'还没有笔记')+'</span><span class="rl-nba">→</span></button>';
  var nb=document.getElementById("rlNotebook"), body=document.getElementById("rlNbBody");
  function build(){
    if(!groups.length){ body.innerHTML='<div class="rl-nb-empty">还没有笔记。在阅读时划线写批注、或在批注抽屉里写「卷笔记」,都会按卷汇总到这里。</div>'; return; }
    body.innerHTML=groups.map(function(g){
      var items='';
      g.vn.forEach(function(n){ items+='<div class="rl-nb-item rl-nb-vn">'+esc(n.text)+'</div>'; });
      g.hl.forEach(function(h){ items+='<div class="rl-nb-item rl-nb-hl"><div class="rl-nb-quote">'+esc(h.text)+'</div><div class="rl-nb-cmt">✎ '+esc(h.comment)+'</div></div>'; });
      return '<div class="rl-nb-grp"><div class="rl-nb-gh">'+esc(g.v.n)+' <a href="'+g.v.f+'.html">去该卷 →</a></div>'+items+'</div>';
    }).join("");
  }
  function open(){ build(); nb.classList.add("open"); }
  function close(){ nb.classList.remove("open"); }
  document.getElementById("rlNbOpen").addEventListener("click",open);
  document.getElementById("rlNbX").addEventListener("click",close);
  nb.addEventListener("click",function(e){ if(e.target===nb) close(); });
  document.addEventListener("keydown",function(e){ if(e.key==="Escape"&&nb.classList.contains("open")) close(); });
})();
</script>
```

- [ ] **Step 3: Add CSS to the hub `<style>`**

Append inside the existing `<style>`, before `</style>`:
```css
  #rlNotebookBtn{margin:18px 0 0;}
  .rl-nbbtn{display:flex; align-items:center; gap:12px; width:100%; text-align:left; background:var(--surface); border:1px solid var(--line); border-radius:var(--r2); padding:16px 20px; cursor:pointer; color:inherit; transition:border-color .3s var(--ease);}
  .rl-nbbtn:hover{border-color:var(--amber-deep);}
  .rl-nbbtn .rl-nbk{font-family:var(--serif); font-size:17px; color:var(--ink);}
  .rl-nbbtn .rl-nbc{font-family:var(--mono); font-size:12px; color:var(--muted); flex:1;}
  .rl-nbbtn .rl-nba{color:var(--amber);}
  .rl-nb{position:fixed; inset:0; z-index:9000; display:none; background:rgba(0,0,0,.55); padding:5vh 16px; overflow:auto;}
  .rl-nb.open{display:block;}
  .rl-nb-card{max-width:760px; margin:0 auto; background:var(--bg-soft); border:1px solid var(--line); border-radius:var(--r3); box-shadow:var(--shadow-soft);}
  .rl-nb-h{display:flex; align-items:center; justify-content:space-between; padding:20px 24px; border-bottom:1px solid var(--line); font-family:var(--serif); font-size:22px; color:var(--ink); position:sticky; top:0; background:var(--bg-soft); border-radius:var(--r3) var(--r3) 0 0;}
  .rl-nb-x{background:none; border:none; color:var(--muted); font-size:22px; cursor:pointer;}
  .rl-nb-body{padding:14px 24px 30px;}
  .rl-nb-empty{color:var(--faint); font-size:14px; line-height:1.8; padding:30px 4px;}
  .rl-nb-grp{margin-top:22px;}
  .rl-nb-gh{font-family:var(--mono); font-size:11.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--amber); margin-bottom:12px; display:flex; justify-content:space-between; align-items:baseline;}
  .rl-nb-gh a{color:var(--muted); text-decoration:none; font-size:11px;}
  .rl-nb-gh a:hover{color:var(--amber);}
  .rl-nb-item{border:1px solid var(--line); border-radius:var(--r1); padding:12px 14px; margin-bottom:10px;}
  .rl-nb-vn{font-size:14.5px; color:var(--ink-soft); line-height:1.8; white-space:pre-wrap;}
  .rl-nb-hl .rl-nb-quote{font-size:13.5px; color:var(--muted); border-left:3px solid var(--amber); padding-left:10px;}
  .rl-nb-hl .rl-nb-cmt{font-size:14px; color:var(--ink); margin-top:8px;}
```

- [ ] **Step 4: Verify count / grouping / open / close**

Start server. Seed on any page, then load the hub:
```js
() => {
  Object.keys(localStorage).filter(k=>k.indexOf('readbar:')===0).forEach(k=>localStorage.removeItem(k));
  localStorage.setItem('readbar:vnotes:price_action_book_vol4', JSON.stringify([{id:'v1',text:'三推=衰竭三次',ts:Date.now()}]));
  localStorage.setItem('readbar:notes:price_action_book_vol2', JSON.stringify([{id:'h1',k:'k0',start:0,end:5,text:'尖峰与通道',color:'amber',comment:'记住这个',ts:Date.now()},{id:'h2',text:'无批注的',comment:''}]));
  return 'seeded';
}
```
Navigate to `http://localhost:8732/books/du-bang/index.html`, then:
```js
async () => {
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const btnText=document.getElementById('rlNbOpen').textContent;
  document.getElementById('rlNbOpen').click(); await sleep(80);
  const open=document.getElementById('rlNotebook').classList.contains('open');
  const groups=document.querySelectorAll('#rlNbBody .rl-nb-grp').length;
  const vn=document.querySelector('#rlNbBody .rl-nb-vn')?.textContent;
  const cmt=document.querySelector('#rlNbBody .rl-nb-cmt')?.textContent;
  const bareHidden=!document.body.innerHTML.includes('无批注的');
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); await sleep(50);
  const closed=!document.getElementById('rlNotebook').classList.contains('open');
  Object.keys(localStorage).filter(k=>k.indexOf('readbar:')===0).forEach(k=>localStorage.removeItem(k));
  return { btnText:btnText.replace(/\s+/g,' ').trim(), open, groups, vn, cmt, bareHidden, closed };
}
```
Expected: `btnText` contains `笔记本` and `2 条`; `open===true`; `groups===2` (vol4 + vol2); `vn==='三推=衰竭三次'`; `cmt` contains `记住这个`; `bareHidden===true` (un-commented highlight excluded); `closed===true` (Esc closed it).

- [ ] **Step 5: Commit**
```bash
git add books/du-bang/index.html
git commit -m "feat(hub): 笔记本 — aggregated cross-volume notes overlay grouped by volume"
```

---

### Task 4: Docs

**Files:**
- Modify: `CLAUDE.md` (storage keys)
- Modify: `.claude/skills/teaching-ebook/SKILL.md` (readbar section)

- [ ] **Step 1: CLAUDE.md** — append `、\`readbar:vnotes:<文件名>\`(卷级自由笔记 [{id,text,ts}])` to the localStorage-keys list. Add a clause in the reader-layer description: 批注抽屉含「卷笔记」区(自由笔记,非划线);封面页「笔记本」按卷汇总卷笔记 + 有批注的划线;选区工具条在窄屏改底部固定(触屏 selectionchange/touchend 触发)。

- [ ] **Step 2: SKILL.md** — in the readbar project section add a bullet: 笔记:划线批注存 `readbar:notes:<file>`,卷级自由笔记存 `readbar:vnotes:<file>`;封面页可用内联脚本按卷汇总两者做「笔记本」。

- [ ] **Step 3: Commit**
```bash
git add CLAUDE.md .claude/skills/teaching-ebook/SKILL.md
git commit -m "docs: record readbar:vnotes + 卷笔记/笔记本/mobile-toolbar"
```

---

## Self-Review

**Spec coverage:** A 卷笔记 → Task 1 ✓; B 手机划线修复 → Task 2 ✓; C 封面页总笔记浏览 → Task 3 ✓; 落点 docs → Task 4 ✓. 验收 (vnotes add/persist/delete; mobile bottom toolbar + highlight; notebook count/group/open/close) → Task 1 Step 3, Task 2 Step 3, Task 3 Step 4 ✓.

**Placeholder scan:** none; all code shown.

**Type/name consistency:** `readbar:vnotes:<file>`=[{id,text,ts}] written (Task 1) and read (Task 3) identically; aggregated overlay reads `readbar:notes:<file>` items' `.comment`/`.text` (existing highlight shape). `showToolForSelection` defined once (Task 2). Hub VOLS filenames match real hrefs. The vnotes module + bookmark module (②) both inserted before `/* KEYBOARD NAV */`; both `insertBefore(…, $("rlList"))`, giving DOM order marks → vnotes → highlight-list.

## Notes / Risk
- `selectionchange` fires often; the 250ms debounce settles it. On tap-to-collapse it hides the toolbar (sel collapsed → hideTool). Acceptable.
- Mobile bottom-toolbar uses `env(safe-area-inset-bottom)` for notch devices; degrades to 0 elsewhere.
- Notebook overlay is read-only (no edit/search/precise-jump) per spec (YAGNI).
