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
    immersive:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5"/><path d="M20 9V4h-5"/><path d="M4 15v5h5"/><path d="M20 15v5h-5"/></svg>'
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
      audio.src="audio/"+f; audio.volume=vol; audio.play().then(function(){ sBtn.classList.add("playing"); }).catch(function(){}); }
    audio.addEventListener("error",function(){ sBtn.classList.remove("playing"); hint.style.display="block";
      hint.innerHTML='找不到 <code>audio/'+esc((audio.currentSrc||audio.src).split("/").pop())+'</code> —— 把音频文件放进 <code>audio/</code> 即可。'; });
    function build(sounds){
      var html='<button data-f="" class="on">关</button>';
      sounds.forEach(function(s){ html+='<button data-f="'+esc(s.file)+'">'+esc(s.label||s.file)+'</button>'; });
      row.innerHTML=html;
      if(!sounds.length){ hint.style.display="block"; hint.innerHTML='还没有音频。把文件放进 <code>audio/</code> 文件夹,在 <code>audio/sounds.json</code> 里列出,这里就会出现。'; }
      [].forEach.call(row.querySelectorAll("button"),function(b){ b.addEventListener("click",function(){
        if(b.getAttribute("data-f")) hint.style.display="none";
        [].forEach.call(row.querySelectorAll("button"),function(x){ x.classList.toggle("on",x===b); });
        play(b.getAttribute("data-f")); }); });
    }
    fetch("audio/sounds.json").then(function(r){ return r.ok?r.json():null; }).then(function(d){ build((d&&d.sounds)||[]); }).catch(function(){ build([]); });
    $("rlVol").addEventListener("input",function(){ vol=(+this.value)/100; audio.volume=vol; });
  })();

  /* ===================== TIMER ===================== */
  var tBtn=mkBtn("timer","阅读计时");
  var tPanel=mkPanel('<h4>阅读计时 <button class="rl-x" title="收起">×</button></h4>'
    +'<div class="rl-bigtime" id="rlBig">0:00</div>'
    +'<div class="rl-sub" style="text-align:center" id="rlTot">这一程,已经读了。</div>'
    +'<div class="rl-row"><button id="rlTPause">暂停</button><button class="ghost" id="rlTReset">归零</button></div>');
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
  document.addEventListener("mouseup",function(){ setTimeout(function(){
    var sel=window.getSelection(); if(!sel||sel.isCollapsed||!sel.rangeCount){ hideTool(); return; }
    var r=sel.getRangeAt(0); var anc=r.commonAncestorContainer.nodeType===1?r.commonAncestorContainer:r.commonAncestorContainer.parentElement;
    var block=anc.closest("[data-rk]"); if(!block){ hideTool(); return; }
    var a=charOffset(block,r.startContainer,r.startOffset), b=charOffset(block,r.endContainer,r.endOffset); if(Math.abs(b-a)<1){ hideTool(); return; }
    pending={k:block.getAttribute("data-rk"),start:Math.min(a,b),end:Math.max(a,b),text:sel.toString(),sec:nearestSec(block)};
    var rect=r.getBoundingClientRect(); tool.style.display="flex";
    tool.style.left=Math.max(8,Math.min(rect.left+rect.width/2-80, window.innerWidth-180))+"px"; tool.style.top=Math.max(8,rect.top-46)+"px";
  },10); });
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

  /* ===================== init ===================== */
  collectBlocks(); applyAll(); updateCount();
  var prog=store.load(PK,null);
  if(prog&&prog.y>40){ setTimeout(function(){ window.scrollTo(0,prog.y); },60); }
  var saveT;
  window.addEventListener("scroll",function(){ clearTimeout(saveT); saveT=setTimeout(function(){ store.save(PK,{y:window.scrollY}); },300); },{passive:true});
})();
