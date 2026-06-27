# Progress & Continuity — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Show furthest-read progress %, one-click continue, position bookmarks, and a gentle reading-stats block — all from localStorage, no backend.

**Architecture:** The shared `reader.js` records furthest-read progress + a global last-read pointer + bookmarks. The book hub (`books/du-bang/index.html`) renders continue / per-volume progress / stats via an inline script and caches a book-level % that the top library shelf (`index.html`) reads. All data in localStorage.

**Tech Stack:** Vanilla HTML/CSS/JS. No build, no framework, no external libs/CDN/web fonts. Verification: local Node static server (run from repo root) + Chrome DevTools.

## Global Constraints

- 纯静态站, GitHub Pages, zero backend, self-contained; NO external libs/CDN/web fonts.
- Cold dark palette unchanged: `--bg:#13161b`, accent `--amber:#d4a657`, serif body.
- Keep `prefers-reduced-motion` & visible focus; do not break existing dock / 阅读设置 / keyboard nav / 批注 / 音频 / 计时 / 编辑.
- localStorage with memory fallback. Keys: `readbar:prog:<file>`={y,max}, `readbar:last`={file,ts}, `readbar:marks:<file>`=[{id,y,label,ts}], `readbar:book:<id>`={pct,ts}, `readbar:time:<file>` (existing).
- Progress = furthest-read fraction (monotonic max), never current position.
- `<file>` = volume filename without extension (existing convention). Site lives at repo ROOT (no `readbar/` prefix).

### Verification harness (every task)

Node static server already at `%TEMP%\rb_srv2.js`. Start from **repo root**:
`Start-Process node -ArgumentList "$env:TEMP\rb_srv2.js" -WindowStyle Hidden -PassThru` (serves repo root on :8732). Probe `http://localhost:8732/books/du-bang/price_action_book_vol1.html` and `http://localhost:8732/index.html` and `http://localhost:8732/books/du-bang/index.html` with DevTools `evaluate_script`. Stop the process when done.

---

### Task 1: Reader — furthest-read progress + last-read pointer

**Files:**
- Modify: `books/du-bang/reader.js` (the scroll-save in the init section, currently the last `window.addEventListener("scroll",…)` before the closing `})();`)

**Interfaces:**
- Produces: `localStorage["readbar:prog:<file>"]` = `{y:Number, max:Number}` (max 0–1, monotonic); `localStorage["readbar:last"]` = `{file:String, ts:Number}`. (`file` is already defined at the top of the IIFE.)

- [ ] **Step 1: Replace the scroll-save handler**

Find this exact line in `reader.js`:

```js
  window.addEventListener("scroll",function(){ clearTimeout(saveT); saveT=setTimeout(function(){ store.save(PK,{y:window.scrollY}); },300); },{passive:true});
```

Replace with:

```js
  window.addEventListener("scroll",function(){ clearTimeout(saveT); saveT=setTimeout(function(){
    var denom=document.documentElement.scrollHeight-window.innerHeight, pct=denom>0?window.scrollY/denom:0;
    var old=store.load(PK,null)||{}; store.save(PK,{y:window.scrollY, max:Math.max(old.max||0, pct)});
    store.save("readbar:last",{file:file, ts:Date.now()});
  },300); },{passive:true});
```

- [ ] **Step 2: Verify max is monotonic + last written**

Start server (repo root), open vol1, run:

```js
async () => {
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  localStorage.removeItem('readbar:prog:price_action_book_vol1'); localStorage.removeItem('readbar:last');
  const denom=()=>document.documentElement.scrollHeight-window.innerHeight;
  window.scrollTo(0, denom()*0.6); window.dispatchEvent(new Event('scroll')); await sleep(450);
  const a=JSON.parse(localStorage.getItem('readbar:prog:price_action_book_vol1')||'{}');
  window.scrollTo(0,0); window.dispatchEvent(new Event('scroll')); await sleep(450);
  const b=JSON.parse(localStorage.getItem('readbar:prog:price_action_book_vol1')||'{}');
  const last=JSON.parse(localStorage.getItem('readbar:last')||'{}');
  localStorage.removeItem('readbar:prog:price_action_book_vol1'); localStorage.removeItem('readbar:last');
  return {maxAt60:Math.round(a.max*100), maxAfterScrollUp:Math.round(b.max*100), yAfterUp:b.y, lastFile:last.file};
}
```

Expected: `maxAt60` ≈ 60; `maxAfterScrollUp` still ≈ 60 (monotonic, did not drop); `yAfterUp` ≈ 0; `lastFile==="price_action_book_vol1"`.

- [ ] **Step 3: Commit**

```bash
git add books/du-bang/reader.js
git commit -m "feat(reader): furthest-read progress (max) + last-read pointer"
```

---

### Task 2: Reader — bookmarks (b key + toast + drawer section)

**Files:**
- Modify: `books/du-bang/reader.js` (insert a bookmark module just before the `/* ===================== KEYBOARD NAV ===================== */` comment; add a `case "b"` to the keydown switch; add a help row)
- Modify: `books/du-bang/reader.css` (append bookmark + toast styles)

**Interfaces:**
- Consumes (all already defined earlier in the IIFE): `$`, `store`, `esc`, `file`, `nBtn` (notes dock button), `drawer`, `scrim`, `$("rlList")` (notes list element).
- Produces: `localStorage["readbar:marks:<file>"]` = `[{id,y,label,ts}]`; hoisted function `toggleMark()`.

- [ ] **Step 1: Insert the bookmark module before the keyboard module**

In `reader.js`, find the line:

```js
  /* ===================== KEYBOARD NAV ===================== */
```

Insert this block IMMEDIATELY BEFORE it:

```js
  /* ===================== BOOKMARKS ===================== */
  var MK="readbar:marks:"+file;
  var marks=store.load(MK,[])||[];
  function saveMarks(){ store.save(MK,marks); }
  var bToast=document.createElement("div"); bToast.className="rl-toast"; document.body.appendChild(bToast);
  var bToastT;
  function bFlash(msg){ bToast.textContent=msg; bToast.classList.add("show"); clearTimeout(bToastT); bToastT=setTimeout(function(){ bToast.classList.remove("show"); },1400); }
  function curHeading(){ var hs=[].slice.call(document.querySelectorAll("main .col h2, main .col h3")); var y=window.scrollY+120, t="阅读位置";
    for(var i=0;i<hs.length;i++){ if(hs[i].offsetTop<=y) t=(hs[i].textContent||"").trim().slice(0,30); } return t; }
  function toggleMark(){ var y=window.scrollY, near=window.innerHeight*0.5, hit=-1;
    for(var i=0;i<marks.length;i++){ if(Math.abs(marks[i].y-y)<near){ hit=i; break; } }
    if(hit>=0){ marks.splice(hit,1); bFlash("已移除书签"); } else { marks.push({id:"m"+Date.now()+Math.floor(Math.random()*1e3),y:y,label:curHeading(),ts:Date.now()}); bFlash("已加书签 · b"); }
    saveMarks(); renderMarks(); }
  var marksWrap=document.createElement("div"); marksWrap.className="rl-marks"; marksWrap.id="rlMarks";
  var rlListEl=$("rlList"); rlListEl.parentNode.insertBefore(marksWrap, rlListEl);
  function renderMarks(){
    if(!marks.length){ marksWrap.innerHTML='<div class="rl-mh">书签</div><div class="rl-mempty">按 <kbd>b</kbd> 在当前位置加书签,回头点这里跳回。</div>'; return; }
    marksWrap.innerHTML='<div class="rl-mh">书签 · '+marks.length+'</div>'+marks.slice().sort(function(a,b){return a.y-b.y;}).map(function(m){
      return '<div class="rl-mk" data-go="'+m.id+'"><span class="rl-mkl">'+esc(m.label)+'</span><button class="rl-mkdel" data-del="'+m.id+'" title="删除">×</button></div>'; }).join("");
    [].forEach.call(marksWrap.querySelectorAll(".rl-mk"),function(el){ el.addEventListener("click",function(e){ if(e.target.closest("[data-del]"))return;
      var m=marks.filter(function(x){return x.id===el.getAttribute("data-go");})[0]; if(m){ drawer.classList.remove("open"); scrim.classList.remove("on"); window.scrollTo({top:m.y,behavior:"smooth"}); } }); });
    [].forEach.call(marksWrap.querySelectorAll("[data-del]"),function(b){ b.addEventListener("click",function(e){ e.stopPropagation();
      marks=marks.filter(function(x){return x.id!==b.getAttribute("data-del");}); saveMarks(); renderMarks(); }); });
  }
  nBtn.addEventListener("click",renderMarks);
  renderMarks();

```

- [ ] **Step 2: Add the `b` case to the keydown switch + a help row**

In the keydown `switch(e.key)` block, add after the `case "g": …` line:

```js
      case "b": toggleMark(); e.preventDefault(); break;
```

In the help overlay `help.innerHTML` string, add this row right after the `<kbd>g</kbd><span>回到顶部</span>` row:

```js
    +'<div class="rl-help-row"><kbd>b</kbd><span>加 / 取消书签</span></div>'
```

- [ ] **Step 3: Append bookmark + toast CSS**

Append to end of `books/du-bang/reader.css`:

```css
/* ---- bookmarks ---- */
.rl-toast{position:fixed; left:50%; bottom:90px; transform:translateX(-50%) translateY(8px); z-index:9700;
  font-family:var(--mono); font-size:12.5px; color:var(--ink); background:var(--raise); border:1px solid var(--line);
  border-radius:999px; padding:8px 16px; box-shadow:var(--shadow-soft); opacity:0; pointer-events:none; transition:opacity .3s var(--ease), transform .3s var(--ease);}
.rl-toast.show{opacity:1; transform:translateX(-50%) translateY(0);}
.rl-marks{padding:10px 14px 4px;}
.rl-marks .rl-mh{font-family:var(--mono); font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--faint); margin:2px 0 8px;}
.rl-marks .rl-mempty{font-size:13px; color:var(--faint); line-height:1.6; padding-bottom:8px;}
.rl-marks .rl-mempty kbd{font-family:var(--mono); font-size:11px; color:var(--ink); background:var(--surface); border:1px solid var(--line); border-radius:5px; padding:1px 6px;}
.rl-mk{display:flex; align-items:center; gap:8px; padding:8px 10px; border:1px solid var(--line); border-radius:8px; margin-bottom:7px; cursor:pointer; transition:.16s;}
.rl-mk:hover{border-color:var(--amber-deep); background:var(--surface);}
.rl-mk .rl-mkl{font-size:13.5px; color:var(--ink-soft); flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
.rl-mk .rl-mkdel{flex:none; background:none; border:none; color:var(--faint); font-size:15px; cursor:pointer; line-height:1;}
.rl-mk .rl-mkdel:hover{color:var(--bear);}
@media (prefers-reduced-motion: reduce){ .rl-toast{transition:none;} }
```

- [ ] **Step 4: Verify add / list / jump / toggle-off + input guard**

Start server, open vol1, run:

```js
async () => {
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const fire=k=>document.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true}));
  localStorage.removeItem('readbar:marks:price_action_book_vol1');
  window.scrollTo(0, 1200); await sleep(50);
  fire('b'); await sleep(50);
  const after1=JSON.parse(localStorage.getItem('readbar:marks:price_action_book_vol1')||'[]');
  const toastShown=document.querySelector('.rl-toast').classList.contains('show');
  // open drawer (notes button) -> bookmark section rendered
  [...document.querySelectorAll('.rl-dock .rl-db')].find(b=>b.title&&b.title.includes('划线')).click(); await sleep(80);
  const mkCount=document.querySelectorAll('#rlMarks .rl-mk').length;
  // jump from bookmark
  window.scrollTo(0,0); document.querySelector('#rlMarks .rl-mk').click(); await sleep(500);
  const jumpedY=window.scrollY;
  // toggle off at same spot
  fire('b'); await sleep(50);
  const after2=JSON.parse(localStorage.getItem('readbar:marks:price_action_book_vol1')||'[]');
  localStorage.removeItem('readbar:marks:price_action_book_vol1');
  return {added:after1.length, label:after1[0]&&after1[0].label, toastShown, mkCount, jumpedY, afterToggleOff:after2.length};
}
```

Expected: `added===1`; `label` is a non-empty heading string; `toastShown===true`; `mkCount===1`; `jumpedY` ≈ 1200 (jumped back near the mark); `afterToggleOff===0` (pressing `b` near the same spot removed it).

- [ ] **Step 5: Commit**

```bash
git add books/du-bang/reader.js books/du-bang/reader.css
git commit -m "feat(reader): position bookmarks (b key) + drawer list + toast"
```

---

### Task 3: Hub — continue / per-volume progress / stats + book cache

**Files:**
- Modify: `books/du-bang/index.html` (add two empty containers + an inline script before `</body>`, and progress/continue/stats CSS in the existing `<style>`)

**Interfaces:**
- Consumes: `readbar:prog:<volfile>`, `readbar:time:<volfile>`, `readbar:last` (written by Tasks 1–2 / existing timer).
- Produces: `localStorage["readbar:book:du-bang"]` = `{pct:Number, ts:Number}` (read by Task 4).

- [ ] **Step 1: Add the two containers**

In `books/du-bang/index.html`, immediately AFTER the hero `</header>` (the one that closes the `读棒` hero), insert:

```html
  <div id="rlContinue"></div>
  <div id="rlStats"></div>
```

- [ ] **Step 2: Add the inline script before `</body>`**

Immediately before `</body>` in `books/du-bang/index.html`, insert:

```html
<script>
(function(){
  var L=function(k,d){try{var v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch(e){return d;}};
  var VOLS=[
    {f:"price_action_book_vol1",t:"字母表",n:"第一卷"},
    {f:"price_action_book_vol2",t:"趋势",n:"第二卷"},
    {f:"price_action_book_vol3",t:"震荡区间",n:"第三卷"},
    {f:"price_action_book_vol4",t:"反转与楔形",n:"第四卷"},
    {f:"price_action_book_vol5",t:"实战手册",n:"第五卷"}
  ];
  function pct(f){ var p=L("readbar:prog:"+f,null); return p&&p.max?Math.round(p.max*100):0; }
  VOLS.forEach(function(v){ var card=document.querySelector('.vol[href="'+v.f+'.html"]'); if(!card) return;
    var P=pct(v.f); var d=document.createElement("div"); d.className="rl-vprog"+(P?"":" zero");
    d.innerHTML=P?('<i style="width:'+P+'%"></i><span>'+P+'%</span>'):'<span>未开始</span>'; card.appendChild(d); });
  var last=L("readbar:last",null);
  var lv=last&&VOLS.filter(function(v){return v.f===last.file;})[0];
  var cont=document.getElementById("rlContinue");
  if(lv){ cont.innerHTML='<a class="rl-cont" href="'+lv.f+'.html"><span class="rl-ck">继续阅读</span><span class="rl-ct">'+lv.n+' · 《'+lv.t+'》 · '+pct(lv.f)+'%</span><span class="rl-ca">→</span></a>'; }
  else { cont.innerHTML='<a class="rl-cont" href="price_action_book_vol1.html"><span class="rl-ck">开始阅读</span><span class="rl-ct">从第一卷 · 《字母表》开始</span><span class="rl-ca">→</span></a>'; }
  var totalSec=0, days={};
  VOLS.forEach(function(v){ var t=L("readbar:time:"+v.f,null); if(t){ totalSec+=t.total||0; (t.sessions||[]).forEach(function(s){ days[new Date(s.start).toDateString()]=1; }); } });
  function fmtH(s){ s=Math.floor(s); var h=Math.floor(s/3600), m=Math.floor(s%3600/60); return h?(h+"h "+m+"m"):(m+"m"); }
  function streak(){ var d=new Date(); function key(x){return x.toDateString();}
    if(!days[key(d)]){ d.setDate(d.getDate()-1); if(!days[key(d)]) return 0; }
    var n=0; while(days[key(d)]){ n++; d.setDate(d.getDate()-1); } return n; }
  var avg=Math.round(VOLS.reduce(function(a,v){return a+pct(v.f);},0)/VOLS.length);
  var st=streak();
  document.getElementById("rlStats").innerHTML=
    '<div class="rl-stat"><b>'+fmtH(totalSec)+'</b><span>累计阅读</span></div>'
   +'<div class="rl-stat"><b>'+(st?st:0)+'</b><span>连续天数</span></div>'
   +'<div class="rl-stat"><b>'+avg+'%</b><span>完成度</span></div>';
  try{ localStorage.setItem("readbar:book:du-bang", JSON.stringify({pct:avg, ts:Date.now()})); }catch(e){}
})();
</script>
```

- [ ] **Step 3: Add CSS to the hub `<style>`**

Append inside the existing `<style>…</style>` of `books/du-bang/index.html` (before `</style>`):

```css
  #rlContinue{margin:30px 0 0;}
  .rl-cont{display:flex; align-items:center; gap:14px; text-decoration:none; color:inherit; background:var(--surface);
    border:1px solid var(--line); border-left:3px solid var(--amber); border-radius:var(--r2); padding:18px 22px; box-shadow:var(--shadow-soft); transition:border-color .3s var(--ease), transform .3s var(--ease);}
  .rl-cont:hover{border-color:var(--amber-deep); transform:translateY(-2px);}
  .rl-cont .rl-ck{font-family:var(--mono); font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--amber);}
  .rl-cont .rl-ct{font-family:var(--serif); font-size:18px; color:var(--ink); flex:1;}
  .rl-cont .rl-ca{color:var(--amber); font-size:18px;}
  #rlStats{display:flex; gap:18px; margin:18px 0 0;}
  .rl-stat{flex:1; background:var(--surface); border:1px solid var(--line); border-radius:var(--r2); padding:16px 18px; text-align:center;}
  .rl-stat b{display:block; font-family:var(--mono); font-size:24px; color:var(--ink); letter-spacing:.02em; font-variant-numeric:tabular-nums;}
  .rl-stat span{font-family:var(--mono); font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--faint);}
  .rl-vprog{display:flex; align-items:center; gap:8px; margin-top:14px; border-top:1px solid var(--line); padding-top:12px;}
  .rl-vprog i{display:block; height:3px; background:var(--ac); border-radius:2px; box-shadow:0 0 10px var(--ac);}
  .rl-vprog span{font-family:var(--mono); font-size:11px; color:var(--muted); white-space:nowrap;}
  .rl-vprog.zero{color:var(--faint);}
  .rl-vprog.zero span{color:var(--faint);}
  @media (max-width:760px){ #rlStats{flex-wrap:wrap;} }
```

Note: `.rl-vprog i` has no width by default; the script sets `width:<P>%` inline. The progress bar fills the row via `i{flex:0 0 auto}` — to make the bar take available space, the inline `width:P%` is relative to the `.rl-vprog` flex row. Add `flex:1 1 auto; max-width:none;` is unnecessary; `i` width % is of the flex container's content box which is fine for a thin bar. The `span` sits after it.

- [ ] **Step 4: Verify continue / per-vol bar / stats / cache**

Start server, run (seed some data, then load the hub):

```js
async () => {
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  // seed: vol1 60% read + a session today; vol2 20%
  localStorage.setItem('readbar:prog:price_action_book_vol1', JSON.stringify({y:1500,max:0.6}));
  localStorage.setItem('readbar:prog:price_action_book_vol2', JSON.stringify({y:300,max:0.2}));
  localStorage.setItem('readbar:time:price_action_book_vol1', JSON.stringify({total:1320, sessions:[{start:Date.now(),end:Date.now(),seconds:1320}]}));
  localStorage.setItem('readbar:last', JSON.stringify({file:'price_action_book_vol2', ts:Date.now()}));
  // load hub fresh so its inline script runs with this data
  const r=await fetch('/books/du-bang/index.html'); // ensure served
  location.href='/books/du-bang/index.html';
}
```

Then, after it navigates to the hub, run:

```js
() => {
  const cont=document.querySelector('#rlContinue .rl-cont');
  const stats=[...document.querySelectorAll('#rlStats .rl-stat b')].map(b=>b.textContent);
  const v1bar=document.querySelector('.vol[href="price_action_book_vol1.html"] .rl-vprog span')?.textContent;
  const book=JSON.parse(localStorage.getItem('readbar:book:du-bang')||'{}');
  // cleanup
  ['price_action_book_vol1','price_action_book_vol2'].forEach(f=>{localStorage.removeItem('readbar:prog:'+f);localStorage.removeItem('readbar:time:'+f);});
  localStorage.removeItem('readbar:last');
  return { continueHref: cont?.getAttribute('href'), continueText: cont?.textContent, stats, v1bar, bookPct: book.pct };
}
```

Expected: `continueHref==="price_action_book_vol2.html"` (last-read vol); `continueText` contains `第二卷` and `20%`; `stats` ≈ `["22m","1","16%"]` (1320s≈22m; streak 1 day; avg of 60/20/0/0/0 = 16%); `v1bar==="60%"`; `bookPct===16`.

- [ ] **Step 5: Commit**

```bash
git add books/du-bang/index.html
git commit -m "feat(hub): continue reading + per-volume progress + stats + book cache"
```

---

### Task 4: Library shelf — per-book % from cache

**Files:**
- Modify: `index.html` (repo root — the `card(b)` function in the inline shelf script, and the `.book` CSS)

**Interfaces:**
- Consumes: `localStorage["readbar:book:<id>"]` = `{pct}` (written by Task 3).

- [ ] **Step 1: Add the progress read into `card(b)`**

In `index.html`, the `card` function currently ends with the `.cta` line then `</a>`. Find the `function card(b){ … }` body. Immediately before the `return tag+'>'` line, add:

```js
    var bp=null; try{ var bk=JSON.parse(localStorage.getItem("readbar:book:"+b.id)||"null"); if(bk&&bk.pct!=null) bp=bk.pct; }catch(e){}
```

Then, in the returned template string, insert the progress markup right BEFORE the `'<div class="cta">'…` part:

```js
      +(bp!=null?'<div class="book-prog"><i style="width:'+bp+'%"></i><span>已读 '+bp+'%</span></div>':'')
```

(Place that `+(...)` line between the `'<div class="sub">…</div>'` line and the `'<div class="cta">…'` line.)

- [ ] **Step 2: Add `.book-prog` CSS**

In `index.html`'s `<style>`, append before `</style>`:

```css
  .book-prog{display:flex; align-items:center; gap:8px; margin:14px 0 0;}
  .book-prog i{display:block; height:3px; background:var(--ac,var(--amber)); border-radius:2px; box-shadow:0 0 10px var(--ac,var(--amber)); min-width:2px;}
  .book-prog span{font-family:var(--mono); font-size:11px; color:var(--muted); white-space:nowrap;}
```

- [ ] **Step 3: Verify card shows % when cache present**

Start server, open root `index.html`, run:

```js
async () => {
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  localStorage.setItem('readbar:book:du-bang', JSON.stringify({pct:42, ts:Date.now()}));
  location.reload();
  await sleep(600);
  const span=document.querySelector('.book .book-prog span')?.textContent;
  const w=document.querySelector('.book .book-prog i')?.style.width;
  localStorage.removeItem('readbar:book:du-bang');
  return { span, w };
}
```

Expected: `span==="已读 42%"`; `w==="42%"`. (Without the cache key, no `.book-prog` renders — confirm by reloading after removal if desired.)

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(shelf): show per-book reading % from hub cache"
```

---

### Task 5: Docs — record new keys + progress model

**Files:**
- Modify: `CLAUDE.md` (data-storage section)
- Modify: `.claude/skills/teaching-ebook/SKILL.md` (readbar-project section)

**Interfaces:** none.

- [ ] **Step 1: Update CLAUDE.md storage keys**

In `CLAUDE.md`, the localStorage-keys list (currently ends with `readbar:settings`(…)). Append:
`、\`readbar:last\`(全站最后在读)、\`readbar:marks:<文件名>\`(书签)、\`readbar:book:<id>\`(整书进度缓存,封面页写/书库读)`. Also note `readbar:prog:<文件名>` 现为 `{y,max}`(max=已读最远比例,单调)。

- [ ] **Step 2: Update SKILL.md**

In the `readbar` project section of `.claude/skills/teaching-ebook/SKILL.md`, add a bullet: 新书若要进度/续读,封面页(hub)用内联脚本读各卷 `readbar:prog:<file>.max` + `readbar:time` + `readbar:last` 渲染"继续阅读/进度/统计",并写 `readbar:book:<id>` 供顶层书库卡片显示整书 %。

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md .claude/skills/teaching-ebook/SKILL.md
git commit -m "docs: record progress/continuity localStorage keys"
```

---

## Self-Review

**Spec coverage:**
- 数据模型 prog{y,max} + readbar:last → Task 1 ✓; marks → Task 2 ✓; book cache → Task 3 ✓.
- A 阅读页 (max 跟踪 / b 书签 / 帮助行 / 抽屉书签区) → Tasks 1–2 ✓.
- B 封面页 (继续 / 每卷进度 / 统计 / 写 book 缓存) → Task 3 ✓.
- C 书库首页 (读 book 缓存显示整书 %) → Task 4 ✓.
- 落点 docs → Task 5 ✓.
- 验收 (max 单调 / 书签加列跳删 / 统计 / 书库 % / 输入守卫) → covered by Task 1 Step 2, Task 2 Step 4, Task 3 Step 4, Task 4 Step 3 ✓.

**Placeholder scan:** none; all code shown.

**Type/name consistency:** keys `readbar:prog:<file>`={y,max}, `readbar:last`={file,ts}, `readbar:marks:<file>`=[{id,y,label,ts}], `readbar:book:<id>`={pct,ts} used identically across Tasks 1–4. `toggleMark`/`renderMarks`/`pct`/`streak` each defined once. `file` (reader.js) is the existing IIFE variable. Bookmark module placed before keyboard module so its `toggleMark` is in scope for the added `case "b"`.

## Notes / Risk

- `b` key reuses the existing keydown guard (input/textarea/contenteditable/modifiers) — the `case "b"` lives inside that guarded switch, so it inherits the guard. Verified by Task 2 (guard already covered for `[`/`]` in sub-project ①).
- Hub inline script depends on reader having written progress; with no data it shows 未开始 / 开始阅读 / 0 — handled.
- `readbar:last` is global; if the last-read file is not one of 读棒's 5 vols, the hub falls back to 开始阅读 (Task 3 `lv` filter).
