/* ============================================================================
   读棒 Reader Layer — shared reading chrome (沉静阅读).
   Right-side tool dock + panels: background sound (your own audio files),
   reading timer, highlight/notes (persisted + searchable + exportable),
   reading light (dim), immersive mode, and an author edit mode (delete/edit
   blocks + export clean HTML). Content interactions (figures, socratic toggle,
   scroll-spy, progress bar) stay in each volume's own inline script.
   Persistence: localStorage per book (memory fallback in sandboxed previews).
   ========================================================================== */
(function(){
  "use strict";
  var file=(location.pathname.split("/").pop()||"index.html").replace(/\.html?$/,"")||"index";
  var bookTitle=document.title||file;
  var NK="readbar:notes:"+file, PK="readbar:prog:"+file, TK="readbar:time:"+file, EK="readbar:edits:"+file;
  var COLORS={amber:"#d4a657",sage:"#26a69a",rose:"#ef5350",slate:"#7fa8c9"};
  var esc=function(s){return (s||"").replace(/[&<>]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c];});};
  var bg=function(c){return (COLORS[c]||COLORS.amber)+"4d";};
  var mem={};
  var store={
    load:function(k,d){ try{var v=localStorage.getItem(k); return v?JSON.parse(v):(d==null?null:d);}catch(e){return (k in mem)?mem[k]:(d==null?null:d);} },
    save:function(k,v){ try{localStorage.setItem(k,JSON.stringify(v));}catch(e){mem[k]=v;} }
  };
  function $(id){return document.getElementById(id);}

  var ICON={
    sound:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17.5 8.5a5 5 0 0 1 0 7"/></svg>',
    timer:'<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 13V9"/><path d="M9.5 2.5h5"/></svg>',
    notes:'<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l4-1L19 8l-3-3L5 16l-1 4z"/><path d="M14 7l3 3"/></svg>',
    edit:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>',
    light:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 1 1 10.5 4a6.4 6.4 0 0 0 9.5 10.5z"/></svg>',
    immersive:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5"/><path d="M20 9V4h-5"/><path d="M4 15v5h5"/><path d="M20 15v5h-5"/></svg>',
    rain:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M16 13a4 4 0 0 0-1-7.87A5 5 0 0 0 6 8a3.5 3.5 0 0 0 .5 7"/><path d="M8 17l-1.2 3"/><path d="M12.5 17l-1.2 3"/><path d="M17 17l-1.2 3"/></svg>',
    menu:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></svg>',
    collapse:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 13l5 5 5-5"/><path d="M7 7l5 5 5-5"/></svg>',
    expand:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 11l5-5 5 5"/><path d="M7 17l5-5 5 5"/></svg>'
  };

  // ---- dock + veil ----
  var veil=document.createElement("div"); veil.className="rl-veil"; document.body.appendChild(veil);
  var dock=document.createElement("div"); dock.className="rl-dock"; document.body.appendChild(dock);
  function mkBtn(name,title,extra){ var b=document.createElement("button"); b.className="rl-db"+(extra?" "+extra:"");
    b.title=title; b.innerHTML=ICON[name]; dock.appendChild(b); return b; }
  function mkPanel(html){ var p=document.createElement("div"); p.className="rl-panel"; p.innerHTML=html; document.body.appendChild(p); return p; }
  var openPanel=null;
  function showPanel(p,btn){ if(openPanel&&openPanel.p!==p){ openPanel.p.classList.remove("open"); openPanel.btn.classList.remove("on"); }
    var on=p.classList.toggle("open"); btn.classList.toggle("on",on); openPanel=on?{p:p,btn:btn}:null; }

  /* ===================== NAV MENU (always-reachable navigation — esp. mobile, where the
     rail scrolls away; clones the page's own nav links + chapter list) ===================== */
  (function(){
    var rail=document.querySelector("nav.rail"); if(!rail) return;
    var mBtn=mkBtn("menu","目录 / 导航");
    var mPanel=mkPanel('<h4>目录 / 导航 <button class="rl-x" title="收起">×</button></h4><div class="rl-nav-body"></div>');
    var body=mPanel.querySelector(".rl-nav-body");
    body.innerHTML=rail.innerHTML;
    var brand=body.querySelector(".brand"); if(brand) brand.remove();
    function close(){ mPanel.classList.remove("open"); mBtn.classList.remove("on"); openPanel=null; }
    mBtn.addEventListener("click",function(){ showPanel(mPanel,mBtn); });
    mPanel.querySelector(".rl-x").addEventListener("click",close);
    [].forEach.call(body.querySelectorAll("a"),function(a){ a.addEventListener("click",close); });
  })();

  /* ===================== SOUND (your own audio files) ===================== */
  var sBtn=mkBtn("sound","背景音");
  var sPanel=mkPanel('<h4>背景音 <button class="rl-x" title="收起">×</button></h4>'
    +'<div class="rl-sub">放一段你自己的声音,替你挡住外面的世界。</div>'
    +'<div class="rl-noise-row" id="rlNoiseRow"></div>'
    +'<div class="rl-snd-hint" id="rlSndHint" style="display:none"></div>'
    +'<div class="rl-vol"><span>音量</span><input type="range" min="0" max="100" value="40" id="rlVol"></div>');
  sBtn.addEventListener("click",function(){ showPanel(sPanel,sBtn); });
  sPanel.querySelector(".rl-x").addEventListener("click",function(){ sPanel.classList.remove("open"); sBtn.classList.remove("on"); openPanel=null; });
  (function(){
    var vol=0.40, audio=new Audio(); audio.loop=true; audio.preload="none"; audio.volume=vol; audio.crossOrigin="anonymous";
    var row=$("rlNoiseRow"), hint=$("rlSndHint");
    function play(f){ if(!f){ audio.pause(); sBtn.classList.remove("playing"); return; }
      audio.src="../../audio/"+f; audio.volume=vol; audio.play().then(function(){ sBtn.classList.add("playing"); }).catch(function(){}); }
    audio.addEventListener("error",function(){ sBtn.classList.remove("playing"); hint.style.display="block";
      hint.innerHTML='找不到 <code>audio/'+esc((audio.currentSrc||audio.src).split("/").pop())+'</code> —— 把音频文件放进根目录的 <code>audio/</code> 即可。'; });
    function build(sounds){
      var html='<button data-f="" class="on">关</button>';
      sounds.forEach(function(s){ html+='<button data-f="'+esc(s.file)+'">'+esc(s.label||s.file)+'</button>'; });
      row.innerHTML=html;
      if(!sounds.length){ hint.style.display="block"; hint.innerHTML='还没有音频。把文件放进根目录的 <code>audio/</code> 文件夹,在 <code>audio/sounds.json</code> 里列出,这里就会出现。'; }
      [].forEach.call(row.querySelectorAll("button"),function(b){ b.addEventListener("click",function(){
        if(b.getAttribute("data-f")) hint.style.display="none";
        [].forEach.call(row.querySelectorAll("button"),function(x){ x.classList.toggle("on",x===b); });
        play(b.getAttribute("data-f")); }); });
    }
    fetch("../../audio/sounds.json").then(function(r){ return r.ok?r.json():null; }).then(function(d){ build((d&&d.sounds)||[]); }).catch(function(){ build([]); });
    $("rlVol").addEventListener("input",function(){ vol=(+this.value)/100; audio.volume=vol; });
  })();

  /* ===================== TIMER ===================== */
  var tBtn=mkBtn("timer","阅读计时");
  var tPanel=mkPanel('<h4>阅读计时 <button class="rl-x" title="收起">×</button></h4>'
    +'<div class="rl-bigtime" id="rlBig">0:00</div>'
    +'<div class="rl-sub" style="text-align:center" id="rlTot">这一程,已经读了。</div>'
    +'<div class="rl-row"><button id="rlTPause">暂停</button><button class="ghost" id="rlTReset">归零</button></div>'
    +'<div class="rl-pomo-div"></div>'
    +'<div class="rl-pomo-head"><span class="rl-pomo-phase focus" id="rlPomoPhase">专注</span><span class="rl-pomo-dots" id="rlPomoDots"></span></div>'
    +'<div class="rl-bigtime rl-pomo-time" id="rlPomo">25:00</div>'
    +'<div class="rl-row"><button id="rlPomoStart">开始</button><button class="ghost" id="rlPomoSkip">跳过</button><button class="ghost" id="rlPomoReset">重置</button></div>'
    +'<div class="rl-pomo-set"><label>专注<input type="number" id="rlPf" min="1" max="90"></label><label>短休<input type="number" id="rlPs" min="1" max="30"></label><label>长休<input type="number" id="rlPl" min="1" max="45"></label></div>');
  tBtn.addEventListener("click",function(){ showPanel(tPanel,tBtn); });
  tPanel.querySelector(".rl-x").addEventListener("click",function(){ tPanel.classList.remove("open"); tBtn.classList.remove("on"); openPanel=null; });
  (function(){
    var firstStart=Date.now(), segStart=Date.now(), accrued=0, running=true;
    var hist=store.load(TK,null); if(!hist||!hist.sessions) hist={total:0,sessions:[]};
    function fmt(s){ s=Math.floor(s); var h=Math.floor(s/3600), m=Math.floor(s%3600/60), x=s%60; return (h?h+":"+(m<10?"0":""):"")+m+":"+(x<10?"0":"")+x; }
    function elapsed(){ return accrued + (running?(Date.now()-segStart)/1000:0); }
    function tick(){ $("rlBig").textContent=fmt(elapsed()); $("rlTot").textContent="累计 "+fmt((hist.total||0)+elapsed()); }
    setInterval(tick,1000); tick();
    document.addEventListener("visibilitychange",function(){ if(document.hidden){ if(running){ accrued=elapsed(); running=false; } } else if(!running){ segStart=Date.now(); running=true; } });
    $("rlTPause").addEventListener("click",function(){ if(running){ accrued=elapsed(); running=false; this.textContent="继续"; } else { segStart=Date.now(); running=true; this.textContent="暂停"; } });
    $("rlTReset").addEventListener("click",function(){ accrued=0; segStart=Date.now(); firstStart=Date.now(); tick(); });
    function finalize(){ var s=elapsed(); if(s<3) return; hist.total=(hist.total||0)+s; hist.sessions.push({start:firstStart,end:Date.now(),seconds:Math.round(s)});
      if(hist.sessions.length>200) hist.sessions=hist.sessions.slice(-200); store.save(TK,hist); firstStart=Date.now(); segStart=Date.now(); accrued=0; }
    window.addEventListener("pagehide",finalize); window.addEventListener("beforeunload",finalize);
  })();

  /* ===================== NOTES / HIGHLIGHTS ===================== */
  var notes=store.load(NK,[])||[];
  var ORIG={}, blocks=[];
  function collectBlocks(){
    var root=document.querySelector("main")||document.body;
    blocks=[].slice.call(root.querySelectorAll(".col p, .col h2, .col .lead, .col h3"));
    var i=0;
    blocks.forEach(function(el){ if(el.closest("figure")) return; el.setAttribute("data-rk","k"+(i++)); ORIG[el.getAttribute("data-rk")]=el.innerHTML; });
    blocks=blocks.filter(function(el){return el.hasAttribute("data-rk");});
  }
  function nearestSec(el){ var n=el; while(n){ var pr=n.previousElementSibling; while(pr){ if(pr.matches&&pr.matches("h2,h3")) return (pr.textContent||"").trim().slice(0,40); pr=pr.previousElementSibling; } n=n.parentElement; } return ""; }
  function applyAll(){
    var byK={}; notes.forEach(function(n){(byK[n.k]=byK[n.k]||[]).push(n);});
    Object.keys(ORIG).forEach(function(k){ var el=document.querySelector('[data-rk="'+k+'"]'); if(el) el.innerHTML=ORIG[k]; });
    Object.keys(byK).forEach(function(k){ var el=document.querySelector('[data-rk="'+k+'"]'); if(!el)return;
      byK[k].sort(function(a,b){return a.start-b.start;}).forEach(function(n){ wrapRange(el,n); }); });
    wireMarks();
  }
  function wrapRange(block,n){
    var w=document.createTreeWalker(block,NodeFilter.SHOW_TEXT,null,false), tns=[],t; while(t=w.nextNode())tns.push(t);
    var count=0;
    tns.forEach(function(tn){ var len=tn.textContent.length, ns=count, ne=count+len; count+=len; if(ne<=n.start||ns>=n.end) return;
      var s=Math.max(0,n.start-ns), e=Math.min(len,n.end-ns);
      var a=tn.textContent.slice(0,s), m=tn.textContent.slice(s,e), z=tn.textContent.slice(e);
      var mk=document.createElement("mark"); mk.className="rl-hl"; mk.setAttribute("data-hid",n.id);
      mk.style.background=bg(n.color); mk.style.boxShadow=n.comment?("inset 0 -2px 0 0 "+(COLORS[n.color]||COLORS.amber)):"none"; mk.textContent=m;
      var f=document.createDocumentFragment(); if(a)f.appendChild(document.createTextNode(a)); f.appendChild(mk); if(z)f.appendChild(document.createTextNode(z)); tn.replaceWith(f);
    });
  }
  function wireMarks(){ [].forEach.call(document.querySelectorAll("mark.rl-hl"),function(m){ m.addEventListener("click",function(e){ e.stopPropagation(); openPop(m.getAttribute("data-hid"),m); }); }); }
  function charOffset(block,node,offset){ var w=document.createTreeWalker(block,NodeFilter.SHOW_TEXT,null,false), c=0, t; while(t=w.nextNode()){ if(t===node) return c+offset; c+=t.textContent.length; } return c; }

  var nBtn=mkBtn("notes","划线与批注");
  nBtn.innerHTML+='<span class="rl-cnt rl-zero" id="rlCnt">0</span>';
  var tool=document.createElement("div"); tool.className="rl-tool";
  tool.innerHTML='<div class="rl-sw" data-c="amber" style="background:#d4a65766"></div><div class="rl-sw" data-c="sage" style="background:#26a69a66"></div>'
    +'<div class="rl-sw" data-c="rose" style="background:#ef535066"></div><div class="rl-sw" data-c="slate" style="background:#7fa8c966"></div>'
    +'<button class="rl-cbtn" id="rlComment">✎ 批注</button>'; document.body.appendChild(tool);
  var pop=document.createElement("div"); pop.className="rl-pop";
  pop.innerHTML='<div class="rl-snip" id="rlSnip"></div><textarea id="rlText" placeholder="写下你的批注…"></textarea>'
    +'<div class="rl-row2"><button class="rl-save" id="rlSave">保存</button><button class="rl-del" id="rlDel">删除划线</button></div>'; document.body.appendChild(pop);
  var scrim=document.createElement("div"); scrim.className="rl-scrim"; document.body.appendChild(scrim);
  var drawer=document.createElement("aside"); drawer.className="rl-drawer";
  drawer.innerHTML='<div class="rl-dh"><span class="rl-t">我的批注</span><button class="rl-close" id="rlClose">×</button></div>'
    +'<div class="rl-tools"><input id="rlSearch" placeholder="搜索划线内容或批注…"><div class="rl-frow">'
    +'<span class="rl-fchip" data-c="amber" style="background:#d4a657"></span><span class="rl-fchip" data-c="sage" style="background:#26a69a"></span>'
    +'<span class="rl-fchip" data-c="rose" style="background:#ef5350"></span><span class="rl-fchip" data-c="slate" style="background:#7fa8c9"></span>'
    +'<div class="rl-exp"><button id="rlExpMd">导出 .md</button><button id="rlExpJson">导出 .json</button></div></div></div><div class="rl-list" id="rlList"></div>';
  document.body.appendChild(drawer);

  var pending=null;
  function hideTool(){ tool.style.display="none"; }
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
  [].forEach.call(tool.querySelectorAll(".rl-sw"),function(sw){ sw.addEventListener("click",function(){ create(sw.getAttribute("data-c"),false); }); });
  $("rlComment").addEventListener("click",function(){ create("amber",true); });
  function create(color,withComment){ if(!pending)return;
    var n={id:"h"+Date.now()+Math.floor(Math.random()*1e3),k:pending.k,start:pending.start,end:pending.end,text:pending.text,color:color,comment:"",ts:Date.now(),sec:pending.sec};
    notes.push(n); persist(); applyAll(); updateCount(); window.getSelection().removeAllRanges(); hideTool();
    if(withComment){ var mk=document.querySelector('mark[data-hid="'+n.id+'"]'); openPop(n.id,mk,true); } }
  var popId=null;
  function openPop(id,mk,focus){ var n=find(id); if(!n)return; popId=id;
    $("rlSnip").textContent="“"+n.text.slice(0,80)+(n.text.length>80?"…":"")+"”"; $("rlText").value=n.comment||"";
    var r=(mk||document.body).getBoundingClientRect(); pop.style.display="block";
    pop.style.left=Math.max(8,Math.min(r.left, window.innerWidth-320))+"px"; pop.style.top=Math.min(r.bottom+8, window.innerHeight-220)+"px";
    if(focus) setTimeout(function(){ $("rlText").focus(); },30); }
  $("rlSave").addEventListener("click",function(){ var n=find(popId); if(n){ n.comment=$("rlText").value.trim(); persist(); applyAll(); } pop.style.display="none"; renderNotes(); });
  $("rlDel").addEventListener("click",function(){ notes=notes.filter(function(x){return x.id!==popId;}); persist(); applyAll(); pop.style.display="none"; renderNotes(); updateCount(); });
  document.addEventListener("mousedown",function(e){ if(!pop.contains(e.target)&&!(e.target.closest&&e.target.closest("mark.rl-hl"))) pop.style.display="none"; });

  var colorFilter={amber:1,sage:1,rose:1,slate:1};
  function openDrawer(){ drawer.classList.add("open"); scrim.classList.add("on"); renderNotes(); }
  function closeDrawer(){ drawer.classList.remove("open"); scrim.classList.remove("on"); }
  nBtn.addEventListener("click",openDrawer); $("rlClose").addEventListener("click",closeDrawer); scrim.addEventListener("click",closeDrawer);
  $("rlSearch").addEventListener("input",renderNotes);
  [].forEach.call(drawer.querySelectorAll(".rl-fchip"),function(ch){ ch.addEventListener("click",function(){ var c=ch.getAttribute("data-c");
    if(colorFilter[c]){colorFilter[c]=0; ch.classList.add("off");} else {colorFilter[c]=1; ch.classList.remove("off");} renderNotes(); }); });
  function filtered(){ var q=($("rlSearch").value||"").trim().toLowerCase();
    return notes.slice().sort(function(a,b){return b.ts-a.ts;}).filter(function(n){return colorFilter[n.color];}).filter(function(n){return !q||(n.text+" "+(n.comment||"")).toLowerCase().indexOf(q)>=0;}); }
  function renderNotes(){ var list=$("rlList"), items=filtered();
    if(!items.length){ list.innerHTML='<div class="rl-empty">'+(notes.length?"没有匹配的批注。":"在正文里选中一句话 → 划线或写批注,会出现在这里,可搜索、筛选、导出。")+'</div>'; return; }
    list.innerHTML=items.map(function(n){ return '<div class="rl-note" data-go="'+n.id+'"><div class="rl-ntop"><span class="rl-chip" style="background:'+(COLORS[n.color]||COLORS.amber)+'"></span>'
      +'<span class="rl-where">'+esc(n.sec||"")+'</span><button class="rl-ndel" data-del="'+n.id+'">删除</button></div>'
      +'<div class="rl-nsnip">'+esc(n.text)+'</div>'+(n.comment?'<div class="rl-ncmt">✎ '+esc(n.comment)+'</div>':"")+'</div>'; }).join("");
    [].forEach.call(list.querySelectorAll(".rl-note"),function(el){ el.addEventListener("click",function(e){ if(e.target.closest("[data-del]"))return; jumpTo(el.getAttribute("data-go")); }); });
    [].forEach.call(list.querySelectorAll("[data-del]"),function(b){ b.addEventListener("click",function(e){ e.stopPropagation();
      var id=b.getAttribute("data-del"); notes=notes.filter(function(x){return x.id!==id;}); persist(); applyAll(); renderNotes(); updateCount(); }); }); }
  function jumpTo(id){ closeDrawer(); var mk=document.querySelector('mark[data-hid="'+id+'"]'); if(!mk)return;
    var top=mk.getBoundingClientRect().top+window.scrollY-110; window.scrollTo({top:top,behavior:"smooth"}); mk.classList.remove("rl-flash"); void mk.offsetWidth; mk.classList.add("rl-flash"); }
  function download(name,text,type){ var blob=new Blob([text],{type:type}); var a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name; a.click(); setTimeout(function(){URL.revokeObjectURL(a.href);},100); }
  $("rlExpJson").addEventListener("click",function(){ download(file+"-notes.json",JSON.stringify(notes,null,2),"application/json"); });
  $("rlExpMd").addEventListener("click",function(){ var md="# "+bookTitle+" — 我的批注\n\n"+filtered().map(function(n){ return "> "+n.text+"\n"+(n.comment?("\n**批注:** "+n.comment+"\n"):"")+"\n*("+(n.sec||"")+")*\n"; }).join("\n---\n\n"); download(file+"-notes.md",md,"text/markdown"); });
  function find(id){ for(var i=0;i<notes.length;i++) if(notes[i].id===id) return notes[i]; return null; }
  function persist(){ store.save(NK,notes); }
  function updateCount(){ var c=$("rlCnt"); c.textContent=notes.length; c.classList.toggle("rl-zero", notes.length===0); }

  /* ===================== READING LIGHT + IMMERSIVE ===================== */
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

  var DEF={fs:17,lh:1.85,measure:720,font:"serif",pf:25,ps:5,pl:15};
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

  // ---- rain backdrop (atmospheric reading background; <rain-glass> defined at file end) ----
  var rainOn = settings.rain !== false;   // default on
  var rainEl = null;
  function makeRain(){ var el=document.createElement("rain-glass"); el.className="rl-rainbg";
    el.setAttribute("density","0.6"); el.setAttribute("warm","#d4a657"); document.body.appendChild(el); return el; }
  // toggle by DESTROYING / RECREATING the element (not display:none) so every "on" is a fresh,
  // full-strength render identical to first page load — display:none corrupted the canvas to 1x1.
  function applyRain(){ document.body.classList.toggle("rl-rain-on", rainOn);
    if(rainOn){ if(!rainEl || !rainEl.isConnected) rainEl=makeRain(); }
    else if(rainEl){ rainEl.remove(); rainEl=null; } }
  var rainBtn = mkBtn("rain","雨夜背景 · 开/关");
  rainBtn.addEventListener("click", function(){ rainOn=!rainOn; settings.rain=rainOn; saveSettings(); rainBtn.classList.toggle("on",rainOn); applyRain(); });
  rainBtn.classList.toggle("on", rainOn);
  applyRain();

  // ---- pomodoro (focus/break countdown alongside the reading timer) ----
  (function(){
    var LABEL={focus:"专注",short:"短休",long:"长休"}, KEY={focus:"pf",short:"ps",long:"pl"};
    function mins(p){ return settings[KEY[p]]; }
    var phase="focus", remaining=mins("focus")*60, running=false, endAt=0, doneFocus=0, ac=null, origTitle=document.title, flashT=null;
    function pad(n){ return (n<10?"0":"")+n; }
    function fmtP(s){ s=Math.max(0,Math.round(s)); return Math.floor(s/60)+":"+pad(s%60); }
    function renderDots(){ var n=doneFocus%4, h=""; for(var i=0;i<4;i++) h+='<i class="'+(i<n?"on":"")+'"></i>'; $("rlPomoDots").innerHTML=h; }
    function paint(){ $("rlPomo").textContent=fmtP(remaining); var ph=$("rlPomoPhase"); ph.textContent=LABEL[phase]; ph.className="rl-pomo-phase "+phase; $("rlPomoStart").textContent=running?"暂停":"开始"; renderDots(); }
    function unlock(){ try{ ac=ac||new (window.AudioContext||window.webkitAudioContext)(); if(ac.state==="suspended") ac.resume(); }catch(e){} }
    function beep(){ unlock(); if(!ac) return; var t=ac.currentTime; [660,880,660].forEach(function(f,i){ var o=ac.createOscillator(),g=ac.createGain(); o.type="sine"; o.frequency.value=f; o.connect(g); g.connect(ac.destination); var s=t+i*0.2; g.gain.setValueAtTime(0,s); g.gain.linearRampToValueAtTime(0.2,s+0.02); g.gain.exponentialRampToValueAtTime(0.0001,s+0.26); o.start(s); o.stop(s+0.28); }); }
    function flashTitle(msg){ clearInterval(flashT); var on=false; flashT=setInterval(function(){ on=!on; document.title=on?("⏰ "+msg):origTitle; },900);
      function stop(){ clearInterval(flashT); document.title=origTitle; window.removeEventListener("focus",stop); document.removeEventListener("pointerdown",stop); }
      window.addEventListener("focus",stop); document.addEventListener("pointerdown",stop); setTimeout(stop,15000); }
    function setPhase(p,run){ phase=p; remaining=mins(p)*60; running=!!run; if(running) endAt=Date.now()+remaining*1000; paint(); }
    function advance(){ var next, msg; if(phase==="focus"){ doneFocus++; next=(doneFocus%4===0)?"long":"short"; msg=(next==="long")?"该长休了":"该休息了"; } else { next="focus"; msg="开始专注"; } beep(); setPhase(next,true); flashTitle(msg); }
    function tickP(){ if(running){ remaining=(endAt-Date.now())/1000; if(remaining<=0){ advance(); return; } } paint(); }
    setInterval(tickP,500);
    $("rlPomoStart").addEventListener("click",function(){ if(running){ remaining=(endAt-Date.now())/1000; running=false; } else { if(remaining<=0) remaining=mins(phase)*60; endAt=Date.now()+remaining*1000; running=true; unlock(); } paint(); });
    $("rlPomoSkip").addEventListener("click",advance);
    $("rlPomoReset").addEventListener("click",function(){ doneFocus=0; setPhase("focus",false); });
    function bindMin(id,key,max){ var el=$(id); el.value=settings[key]; el.addEventListener("change",function(){ var v=Math.max(1,Math.min(max,Math.round(+this.value)||settings[key])); settings[key]=v; el.value=v; saveSettings(); if(!running && KEY[phase]===key){ remaining=v*60; paint(); } }); }
    bindMin("rlPf","pf",90); bindMin("rlPs","ps",30); bindMin("rlPl","pl",45);
    paint();
  })();

  var iBtn=mkBtn("immersive","沉浸模式");
  var exit=document.createElement("button"); exit.className="rl-exit"; exit.textContent="退出沉浸 · Esc"; document.body.appendChild(exit);
  function setImmersive(on){ document.body.classList.toggle("rl-immersive",on);
    if(on&&openPanel){ openPanel.p.classList.remove("open"); openPanel.btn.classList.remove("on"); openPanel=null; } }
  iBtn.addEventListener("click",function(){ setImmersive(!document.body.classList.contains("rl-immersive")); });
  exit.addEventListener("click",function(){ setImmersive(false); });
  document.addEventListener("keydown",function(e){ if(e.key==="Escape"&&document.body.classList.contains("rl-immersive")) setImmersive(false); });

  /* ===================== EDIT MODE ===================== */
  (function(){
    var state=store.load(EK,null)||{}; if(!state.del) state.del=[]; if(!state.txt) state.txt={};
    var SEL="main section, main section > *, main figure, main p, main h2, main h3, main .lead, main .facet, main .socratic, main .connect, main .endcard";
    [].slice.call(document.querySelectorAll(SEL)).forEach(function(el,i){ el.setAttribute("data-rl-edit","e"+i); });
    state.del.forEach(function(k){ var el=document.querySelector('[data-rl-edit="'+k+'"]'); if(el) el.remove(); });
    Object.keys(state.txt).forEach(function(k){ var el=document.querySelector('[data-rl-edit="'+k+'"]'); if(el) el.innerHTML=state.txt[k]; });
    var editing=false, hot=null;
    var eBtn=mkBtn("edit","编辑这本书(删除/修改内容)","rl-edit");
    var bar=document.createElement("div"); bar.className="rl-edit-bar";
    bar.innerHTML='<span class="rl-ehint">悬停内容块 → ✕ 删除 · 点文字直接改</span><button class="rl-export">导出 HTML</button><button class="rl-reset">还原</button><button class="rl-done">完成</button>';
    document.body.appendChild(bar);
    var handle=document.createElement("button"); handle.className="rl-del-handle"; handle.innerHTML="✕"; handle.title="删除这一块"; document.body.appendChild(handle);
    function place(){ if(!hot){ handle.classList.remove("show"); return; } var r=hot.getBoundingClientRect();
      handle.style.top=(r.top+window.scrollY+2)+"px"; handle.style.left=(r.right+window.scrollX-26)+"px"; handle.classList.add("show"); }
    function over(e){ if(!editing) return; if(e.target.closest(".rl-del-handle, .rl-edit-bar, .rl-dock, .rl-panel")) return;
      var el=e.target.closest("[data-rl-edit]"); if(el!==hot){ if(hot) hot.classList.remove("rl-hot"); hot=el; if(hot) hot.classList.add("rl-hot"); place(); } }
    handle.addEventListener("click",function(){ if(!hot) return; var k=hot.getAttribute("data-rl-edit");
      if(state.del.indexOf(k)<0) state.del.push(k); delete state.txt[k]; hot.remove(); hot=null; store.save(EK,state); handle.classList.remove("show"); });
    function saveText(e){ var el=e.target.closest("[data-rl-edit]"); if(!el) return; state.txt[el.getAttribute("data-rl-edit")]=el.innerHTML; store.save(EK,state); }
    function setEditable(on){ [].forEach.call(document.querySelectorAll("main p, main h2, main h3, main .lead"),function(el){ if(!el.hasAttribute("data-rl-edit")) return;
      if(on){ el.setAttribute("contenteditable","true"); el.addEventListener("blur",saveText,true); } else el.removeAttribute("contenteditable"); }); }
    function enter(){ editing=true; document.body.classList.add("rl-editing"); eBtn.classList.add("on"); bar.classList.add("show"); setEditable(true);
      document.addEventListener("mouseover",over); window.addEventListener("scroll",place,{passive:true}); }
    function leave(){ editing=false; document.body.classList.remove("rl-editing"); eBtn.classList.remove("on"); bar.classList.remove("show"); setEditable(false);
      document.removeEventListener("mouseover",over); window.removeEventListener("scroll",place); if(hot){ hot.classList.remove("rl-hot"); hot=null; } handle.classList.remove("show"); }
    eBtn.addEventListener("click",function(){ editing?leave():enter(); });
    bar.querySelector(".rl-done").addEventListener("click",leave);
    bar.querySelector(".rl-reset").addEventListener("click",function(){ if(!window.confirm("还原全部删除和修改?(只清除本浏览器保存的编辑,源文件不动)")) return; store.save(EK,{del:[],txt:{}}); location.reload(); });
    bar.querySelector(".rl-export").addEventListener("click",function(){
      var doc=document.documentElement.cloneNode(true);
      [".rl-dock",".rl-panel",".rl-tool",".rl-pop",".rl-scrim",".rl-drawer",".rl-edit-bar",".rl-del-handle",".rl-veil",".rl-exit"].forEach(function(s){ [].forEach.call(doc.querySelectorAll(s),function(n){ n.remove(); }); });
      [].forEach.call(doc.querySelectorAll("[data-rl-edit]"),function(n){ n.removeAttribute("data-rl-edit"); n.removeAttribute("contenteditable"); n.classList.remove("rl-hot"); });
      [].forEach.call(doc.querySelectorAll("[data-rk]"),function(n){ n.removeAttribute("data-rk"); });
      [].forEach.call(doc.querySelectorAll("mark.rl-hl"),function(m){ var p=m.parentNode; while(m.firstChild) p.insertBefore(m.firstChild,m); p.removeChild(m); });
      var b=doc.querySelector("body"); if(b){ b.classList.remove("rl-editing","rl-immersive"); }
      var html="<!DOCTYPE html>\n<html"+(function(el){var s="";[].forEach.call(el.attributes,function(a){s+=" "+a.name+'="'+a.value+'"';});return s;})(doc)+">\n"+doc.innerHTML+"\n</html>";
      download(file+".html",html,"text/html");
    });
  })();

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

  /* ===================== KEYBOARD NAV ===================== */
  var help=document.createElement("div"); help.className="rl-help";
  help.innerHTML='<div class="rl-help-card"><div class="rl-help-h">键盘快捷键 <button class="rl-x" id="rlHelpX">×</button></div>'
    +'<div class="rl-help-row"><kbd>↑</kbd><kbd>↓</kbd><kbd>空格</kbd><span>滚动翻页</span></div>'
    +'<div class="rl-help-row"><kbd>[</kbd><kbd>]</kbd><span>上 / 下一章</span></div>'
    +'<div class="rl-help-row"><kbd>g</kbd><span>回到顶部</span></div>'
    +'<div class="rl-help-row"><kbd>b</kbd><span>加 / 取消书签</span></div>'
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
    var t=dir>0?Math.min(secs.length-1,cur+1):Math.max(0,cur-1);
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
      case "b": toggleMark(); e.preventDefault(); break;
      case "f": setImmersive(!document.body.classList.contains("rl-immersive")); e.preventDefault(); break;
      case "?": toggleHelp(true); e.preventDefault(); break;
    }
  });

  /* ===================== init ===================== */
  collectBlocks(); applyAll(); updateCount();
  var prog=store.load(PK,null);
  if(prog&&prog.y>40){ setTimeout(function(){ window.scrollTo(0,prog.y); },60); }
  var saveT;
  window.addEventListener("scroll",function(){ clearTimeout(saveT); saveT=setTimeout(function(){
    var denom=document.documentElement.scrollHeight-window.innerHeight, pct=denom>0?window.scrollY/denom:0;
    var old=store.load(PK,null)||{}; store.save(PK,{y:window.scrollY, max:Math.max(old.max||0, pct)});
    store.save("readbar:last",{file:file, ts:Date.now()});
  },300); },{passive:true});

  // ---- collapsible dock: a toggle at the bottom hides all the tool buttons, leaving just itself ----
  var dockOpen = settings.dock !== "collapsed";   // default: all shown (current behaviour)
  var cBtn = mkBtn("collapse","收起 / 展开工具","rl-dock-toggle");
  function applyDock(){ dock.classList.toggle("rl-collapsed", !dockOpen); cBtn.innerHTML = dockOpen ? ICON.collapse : ICON.expand; cBtn.title = dockOpen ? "收起工具" : "展开工具"; }
  cBtn.addEventListener("click", function(){ dockOpen=!dockOpen; settings.dock=dockOpen?"open":"collapsed"; saveSettings(); applyDock(); });
  applyDock();
})();

/* rain-glass.js — calm rain-on-a-windowpane canvas, built for a reading backdrop.
   <rain-glass> fills its positioned parent. Tunables via attributes:
     density="0.7"   relative bead count (0.3 quiet … 1.4 busy)
     warm="#d4a657"  candle bloom colour
   Respects prefers-reduced-motion (renders one still frame). */
(function () {
  if (customElements.get('rain-glass')) return;

  function rand(a, b) { return a + Math.random() * (b - a); }

  class RainGlass extends HTMLElement {
    connectedCallback() {
      if (this._init) return; this._init = true;
      this.style.cssText = 'position:absolute;inset:0;display:block;overflow:hidden';
      this.canvas = document.createElement('canvas');
      this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
      this.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d');
      this.trail = document.createElement('canvas');
      this.tctx = this.trail.getContext('2d');
      this.reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.density = parseFloat(this.getAttribute('density')) || 0.75;
      this.warm = this.getAttribute('warm') || '#e3a85c';
      this.statics = [];
      this.runners = [];
      this._spawn = 0;
      this._resizeNow();
      this._ro = new ResizeObserver(() => this.resize());
      this._ro.observe(this);
      this.last = performance.now();
      if (this.reduce) { this.drawFrame(0); }
      else { this._loop = this.loop.bind(this); this.raf = requestAnimationFrame(this._loop); }
    }
    disconnectedCallback() {
      if (this.raf) cancelAnimationFrame(this.raf);
      if (this._ro) this._ro.disconnect();
    }

    resize() {
      // debounce: on mobile the URL bar hiding/showing during scroll fires a stream of
      // resize events — coalesce them so we don't rebuild the scene every frame (= flicker)
      clearTimeout(this._rt);
      this._rt = setTimeout(() => this._resizeNow(), 150);
    }
    _resizeNow() {
      const r = this.getBoundingClientRect();
      const nw = Math.max(1, Math.round(r.width));
      const nh = Math.max(1, Math.round(r.height));
      if (nw === this.w && nh === this.h) return;
      // height-only change (mobile URL bar) → resize canvas to cover, but KEEP the existing
      // scene + beads (no re-randomize) so the pattern doesn't jump; real width changes rebuild.
      const keep = (this.scene && nw === this.w);
      this.w = nw; this.h = nh;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      [this.canvas, this.trail].forEach((c) => { c.width = this.w * this.dpr; c.height = this.h * this.dpr; });
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.tctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      if (!keep) { this.buildScene(); this.seedStatics(); }
      if (this.reduce) this.drawFrame(0);
    }

    buildScene() {
      // Offscreen "world behind the glass": cold rainy dark + a warm candle bloom.
      const s = document.createElement('canvas');
      s.width = this.w * this.dpr; s.height = this.h * this.dpr;
      const c = s.getContext('2d');
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const g = c.createLinearGradient(0, 0, 0, this.h);
      g.addColorStop(0, '#1b232c');   // rainy sky, cool slate
      g.addColorStop(0.45, '#161a21');
      g.addColorStop(1, '#101218');
      c.fillStyle = g; c.fillRect(0, 0, this.w, this.h);
      // warm bloom — lamp / candle, lower-left
      const bx = this.w * 0.14, by = this.h * 0.86;
      const b = c.createRadialGradient(bx, by, 8, bx, by, this.h * 0.85);
      b.addColorStop(0, this.hexA(this.warm, 0.34));
      b.addColorStop(0.4, this.hexA(this.warm, 0.10));
      b.addColorStop(1, this.hexA(this.warm, 0));
      c.fillStyle = b; c.fillRect(0, 0, this.w, this.h);
      // a low warm wash along the bottom — desk-lamp spill
      const lw = c.createLinearGradient(0, this.h, 0, this.h * 0.55);
      lw.addColorStop(0, this.hexA(this.warm, 0.12));
      lw.addColorStop(1, this.hexA(this.warm, 0));
      c.fillStyle = lw; c.fillRect(0, 0, this.w, this.h);
      // a cooler secondary glow upper-right (distant window light through rain)
      const b2 = c.createRadialGradient(this.w * 0.9, this.h * 0.2, 6, this.w * 0.9, this.h * 0.2, this.h * 0.6);
      b2.addColorStop(0, 'rgba(150,175,200,0.10)');
      b2.addColorStop(1, 'rgba(150,175,200,0)');
      c.fillStyle = b2; c.fillRect(0, 0, this.w, this.h);
      // distant blurred bokeh lights (city through the rain)
      const lights = 26;
      for (let i = 0; i < lights; i++) {
        const x = rand(0, this.w), y = this.h * 0.18 + Math.random() * this.h * 0.62;
        const rr = rand(1.4, 4.2), warm = Math.random() < 0.7;
        const col = warm ? '240,205,150' : '180,200,220';
        const lg = c.createRadialGradient(x, y, 0, x, y, rr * 5);
        lg.addColorStop(0, 'rgba(' + col + ',' + rand(0.18, 0.5).toFixed(2) + ')');
        lg.addColorStop(1, 'rgba(' + col + ',0)');
        c.fillStyle = lg; c.beginPath(); c.arc(x, y, rr * 5, 0, 7); c.fill();
      }
      this.scene = s;
      // sharper "through-a-drop" version = scene brightened a touch
      this.sceneLit = s;
    }

    hexA(hex, a) {
      const m = hex.replace('#', '');
      const n = parseInt(m.length === 3 ? m.split('').map((x) => x + x).join('') : m, 16);
      return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
    }

    seedStatics() {
      const target = Math.round((this.w * this.h) / 5200 * this.density);
      this.statics = [];
      for (let i = 0; i < target; i++) {
        this.statics.push({ x: rand(0, this.w), y: rand(0, this.h), r: Math.pow(Math.random(), 1.7) * 3.4 + 0.6 });
      }
    }

    // a glassy clinging bead
    bead(ctx, x, y, r) {
      const g = ctx.createRadialGradient(x - r * 0.32, y - r * 0.36, r * 0.08, x, y, r);
      g.addColorStop(0, 'rgba(214,224,234,0.42)');
      g.addColorStop(0.55, 'rgba(150,166,182,0.14)');
      g.addColorStop(1, 'rgba(18,22,28,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      // dark lower rim — wet curvature
      ctx.lineWidth = Math.max(0.5, r * 0.14);
      ctx.strokeStyle = 'rgba(6,8,12,0.28)';
      ctx.beginPath(); ctx.arc(x, y + r * 0.1, r * 0.9, 0.25, Math.PI - 0.25); ctx.stroke();
      // specular highlight
      if (r > 1.3) {
        ctx.fillStyle = 'rgba(255,251,242,0.85)';
        ctx.beginPath(); ctx.arc(x - r * 0.34, y - r * 0.36, Math.max(0.5, r * 0.2), 0, 7); ctx.fill();
      }
    }

    loop(t) {
      const dt = Math.min(50, t - this.last); this.last = t;
      this.update(dt, t);
      this.drawFrame(t);
      this.raf = requestAnimationFrame(this._loop);
    }

    update(dt, t) {
      // spawn runners occasionally
      this._spawn -= dt;
      if (this._spawn <= 0 && this.runners.length < 7 * this.density + 1) {
        this._spawn = rand(900, 2400) / Math.max(0.4, this.density);
        this.runners.push({
          x: rand(this.w * 0.04, this.w * 0.96),
          y: rand(-20, this.h * 0.3),
          r: rand(3.4, 6.8),
          v: 0,
          wob: rand(0, 6.28),
          drip: 0
        });
      }
      const g = 0.00016; // gravity-ish
      for (let i = this.runners.length - 1; i >= 0; i--) {
        const d = this.runners[i];
        d.v += g * dt * (d.r * 0.5);          // bigger = heavier = faster
        d.v = Math.min(d.v, 0.5);
        d.y += d.v * dt;
        d.wob += dt * 0.004;
        d.x += Math.sin(d.wob) * 0.12;        // gentle meander
        d.drip -= dt;
        if (d.drip <= 0) {                    // leave residual beads in the wake
          d.drip = rand(60, 150);
          if (d.r > 2.2) this.statics.push({ x: d.x + rand(-1.5, 1.5), y: d.y - d.r, r: rand(0.6, 1.8) });
          if (this.statics.length > 1400) this.statics.splice(0, 40);
        }
        if (d.y - d.r > this.h + 4) this.runners.splice(i, 1);
      }
    }

    drawFrame(t) {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.w, this.h);
      // base = fogged glass (scene, slightly desaturated by a condensation veil)
      ctx.drawImage(this.scene, 0, 0, this.w, this.h);
      ctx.fillStyle = 'rgba(176,186,198,0.05)';
      ctx.fillRect(0, 0, this.w, this.h);

      // --- trail layer: wet runs that slowly evaporate ---
      if (!this.reduce) {
        this.tctx.globalCompositeOperation = 'destination-out';
        this.tctx.fillStyle = 'rgba(0,0,0,0.022)';
        this.tctx.fillRect(0, 0, this.w, this.h);
        this.tctx.globalCompositeOperation = 'source-over';
        for (const d of this.runners) {
          const grd = this.tctx.createLinearGradient(d.x - d.r, 0, d.x + d.r, 0);
          grd.addColorStop(0, 'rgba(210,222,234,0)');
          grd.addColorStop(0.5, 'rgba(210,222,234,0.16)');
          grd.addColorStop(1, 'rgba(210,222,234,0)');
          this.tctx.fillStyle = grd;
          this.tctx.fillRect(d.x - d.r, d.y - d.r, d.r * 2, d.r * 1.6);
        }
        ctx.drawImage(this.trail, 0, 0, this.w, this.h);
      }

      // static clinging beads
      for (const s of this.statics) this.bead(ctx, s.x, s.y, s.r);
      // runner heads
      for (const d of this.runners) this.bead(ctx, d.x, d.y, d.r);

      // gentle vignette baked into the glass
      const v = ctx.createRadialGradient(this.w / 2, this.h * 0.42, this.h * 0.25, this.w / 2, this.h * 0.5, this.h * 0.92);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = v; ctx.fillRect(0, 0, this.w, this.h);
    }
  }
  customElements.define('rain-glass', RainGlass);
})();
