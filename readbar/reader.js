/* ============================================================================
   读棒 Reader Layer — shared JS for all volumes.
   Adds: text highlighting, comments, searchable/filterable/exportable notes,
   and reading-progress resume — on top of the existing volume pages, without
   touching their content, figures, or animations.
   Persistence: localStorage per book (memory fallback in sandboxed previews).
   ========================================================================== */
(function(){
  "use strict";
  var COLORS={gold:"#d4a657",green:"#26a69a",steel:"#7fa8c9",violet:"#b58bd4"};
  var bg=function(c){return (COLORS[c]||COLORS.gold)+"40";};
  var esc=function(s){return (s||"").replace(/[&<>]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c];});};

  // book identity from filename + title
  var file=(location.pathname.split("/").pop()||"index.html").replace(/\.html?$/,"")||"index";
  var bookId="readbar:"+file;
  var bookTitle=document.title||file;
  var NK="readbar:notes:"+file, PK="readbar:prog:"+file;

  // storage with memory fallback
  var mem={};
  var store={
    load:function(k,d){ try{var v=localStorage.getItem(k); return v?JSON.parse(v):(d==null?null:d);}catch(e){return (k in mem)?mem[k]:(d==null?null:d);} },
    save:function(k,v){ try{localStorage.setItem(k,JSON.stringify(v));}catch(e){mem[k]=v;} }
  };

  var notes=store.load(NK,[])||[];
  var ORIG={};            // block key -> original innerHTML
  var blocks=[];          // highlightable elements

  // pick reading prose inside the main column (figures/animations untouched)
  function collectBlocks(){
    var root=document.querySelector("main")||document.body;
    blocks=[].slice.call(root.querySelectorAll(".col p, .col h2, .col .lead"));
    var i=0;
    blocks.forEach(function(el){
      if(el.closest("figure")) return;           // skip captions etc.
      el.setAttribute("data-rk","k"+(i++));
      ORIG[el.getAttribute("data-rk")]=el.innerHTML;
    });
    blocks=blocks.filter(function(el){return el.hasAttribute("data-rk");});
  }

  function nearestSec(el){
    var p=el;
    while(p){ if(p.matches&&p.matches("h2")) return (p.textContent||"").trim().slice(0,40);
      // walk to previous h2
      p=p.previousElementSibling; if(p&&p.matches&&p.matches("h2")) return (p.textContent||"").trim().slice(0,40); }
    // fallback: search backwards through siblings/ancestors
    var n=el;
    while(n){ var pr=n.previousElementSibling;
      while(pr){ if(pr.matches&&pr.matches("h2")) return (pr.textContent||"").trim().slice(0,40); pr=pr.previousElementSibling; }
      n=n.parentElement; }
    return "";
  }

  // ---- highlight rendering ----
  function applyAll(){
    var byK={}; notes.forEach(function(n){(byK[n.k]=byK[n.k]||[]).push(n);});
    Object.keys(ORIG).forEach(function(k){ var el=document.querySelector('[data-rk="'+k+'"]'); if(el) el.innerHTML=ORIG[k]; });
    Object.keys(byK).forEach(function(k){ var el=document.querySelector('[data-rk="'+k+'"]'); if(!el)return;
      byK[k].sort(function(a,b){return a.start-b.start;}).forEach(function(n){ wrapRange(el,n); }); });
    wireMarks();
  }
  function wrapRange(block,n){
    var w=document.createTreeWalker(block,NodeFilter.SHOW_TEXT,null,false), tns=[],t;
    while(t=w.nextNode())tns.push(t);
    var count=0;
    tns.forEach(function(tn){
      var len=tn.textContent.length, ns=count, ne=count+len; count+=len;
      if(ne<=n.start||ns>=n.end) return;
      var s=Math.max(0,n.start-ns), e=Math.min(len,n.end-ns);
      var a=tn.textContent.slice(0,s), m=tn.textContent.slice(s,e), z=tn.textContent.slice(e);
      var mk=document.createElement("mark"); mk.className="rl-hl"; mk.setAttribute("data-hid",n.id);
      mk.style.background=bg(n.color); mk.style.boxShadow=n.comment?("inset 0 -2px 0 0 "+(COLORS[n.color]||COLORS.gold)):"none";
      mk.textContent=m;
      var f=document.createDocumentFragment();
      if(a)f.appendChild(document.createTextNode(a)); f.appendChild(mk); if(z)f.appendChild(document.createTextNode(z));
      tn.replaceWith(f);
    });
  }
  function wireMarks(){
    [].forEach.call(document.querySelectorAll("mark.rl-hl"),function(m){
      m.addEventListener("click",function(e){ e.stopPropagation(); openPop(m.getAttribute("data-hid"),m); });
    });
  }
  function charOffset(block,node,offset){
    var w=document.createTreeWalker(block,NodeFilter.SHOW_TEXT,null,false), c=0, t;
    while(t=w.nextNode()){ if(t===node) return c+offset; c+=t.textContent.length; }
    return c;
  }

  // ---- UI injection ----
  function injectUI(){
    var fab=document.createElement("button"); fab.className="rl-fab";
    fab.innerHTML='🔖 批注 <span class="rl-cnt" id="rlCnt">0</span>';
    document.body.appendChild(fab);

    var tool=document.createElement("div"); tool.className="rl-tool";
    tool.innerHTML='<div class="rl-sw" data-c="gold" style="background:#d4a65766"></div>'
      +'<div class="rl-sw" data-c="green" style="background:#26a69a66"></div>'
      +'<div class="rl-sw" data-c="steel" style="background:#7fa8c966"></div>'
      +'<div class="rl-sw" data-c="violet" style="background:#b58bd466"></div>'
      +'<button class="rl-cbtn" id="rlComment">✎ 批注</button>';
    document.body.appendChild(tool);

    var pop=document.createElement("div"); pop.className="rl-pop";
    pop.innerHTML='<div class="rl-snip" id="rlSnip"></div><textarea id="rlText" placeholder="写下你的批注…"></textarea>'
      +'<div class="rl-row"><button class="rl-save" id="rlSave">保存</button><button class="rl-del" id="rlDel">删除划线</button></div>';
    document.body.appendChild(pop);

    var scrim=document.createElement("div"); scrim.className="rl-scrim"; document.body.appendChild(scrim);
    var drawer=document.createElement("aside"); drawer.className="rl-drawer";
    drawer.innerHTML=''
      +'<div class="rl-dh"><span class="rl-t">我的批注</span><button class="rl-x" id="rlClose">×</button></div>'
      +'<div class="rl-tools"><input id="rlSearch" placeholder="搜索划线内容或批注…">'
      +'<div class="rl-frow">'
      +'<span class="rl-fchip" data-c="gold" style="background:#d4a657"></span>'
      +'<span class="rl-fchip" data-c="green" style="background:#26a69a"></span>'
      +'<span class="rl-fchip" data-c="steel" style="background:#7fa8c9"></span>'
      +'<span class="rl-fchip" data-c="violet" style="background:#b58bd4"></span>'
      +'<div class="rl-exp"><button id="rlExpMd">导出 .md</button><button id="rlExpJson">导出 .json</button></div>'
      +'</div></div><div class="rl-list" id="rlList"></div>';
    document.body.appendChild(drawer);

    return {fab:fab,tool:tool,pop:pop,scrim:scrim,drawer:drawer};
  }

  var U=injectUI();
  function $(id){return document.getElementById(id);}

  // ---- selection ----
  var pending=null;
  function hideTool(){ U.tool.style.display="none"; }
  document.addEventListener("mouseup",function(){
    setTimeout(function(){
      var sel=window.getSelection();
      if(!sel||sel.isCollapsed||!sel.rangeCount){ hideTool(); return; }
      var r=sel.getRangeAt(0);
      var anc=r.commonAncestorContainer.nodeType===1?r.commonAncestorContainer:r.commonAncestorContainer.parentElement;
      var block=anc.closest("[data-rk]");
      if(!block){ hideTool(); return; }
      var a=charOffset(block,r.startContainer,r.startOffset), b=charOffset(block,r.endContainer,r.endOffset);
      if(Math.abs(b-a)<1){ hideTool(); return; }
      pending={k:block.getAttribute("data-rk"),start:Math.min(a,b),end:Math.max(a,b),text:sel.toString(),sec:nearestSec(block)};
      var rect=r.getBoundingClientRect();
      U.tool.style.display="flex";
      U.tool.style.left=Math.max(8,Math.min(rect.left+rect.width/2-80, window.innerWidth-180))+"px";
      U.tool.style.top=Math.max(8,rect.top-46)+"px";
    },10);
  });
  [].forEach.call(U.tool.querySelectorAll(".rl-sw"),function(sw){ sw.addEventListener("click",function(){ create(sw.getAttribute("data-c"),false); }); });
  $("rlComment").addEventListener("click",function(){ create("gold",true); });

  function create(color,withComment){
    if(!pending)return;
    var n={id:"h"+Date.now()+Math.floor(Math.random()*1e3),k:pending.k,start:pending.start,end:pending.end,
      text:pending.text,color:color,comment:"",ts:Date.now(),sec:pending.sec};
    notes.push(n); persist(); applyAll(); updateCount();
    window.getSelection().removeAllRanges(); hideTool();
    if(withComment){ var mk=document.querySelector('mark[data-hid="'+n.id+'"]'); openPop(n.id,mk,true); }
  }

  // ---- popover ----
  var popId=null;
  function openPop(id,mk,focus){
    var n=find(id); if(!n)return; popId=id;
    $("rlSnip").textContent="“"+n.text.slice(0,80)+(n.text.length>80?"…":"")+"”";
    $("rlText").value=n.comment||"";
    var r=(mk||document.body).getBoundingClientRect();
    U.pop.style.display="block";
    U.pop.style.left=Math.max(8,Math.min(r.left, window.innerWidth-320))+"px";
    U.pop.style.top=Math.min(r.bottom+8, window.innerHeight-220)+"px";
    if(focus) setTimeout(function(){ $("rlText").focus(); },30);
  }
  $("rlSave").addEventListener("click",function(){ var n=find(popId); if(n){ n.comment=$("rlText").value.trim(); persist(); applyAll(); } U.pop.style.display="none"; renderNotes(); });
  $("rlDel").addEventListener("click",function(){ notes=notes.filter(function(x){return x.id!==popId;}); persist(); applyAll(); U.pop.style.display="none"; renderNotes(); updateCount(); });
  document.addEventListener("mousedown",function(e){ if(!U.pop.contains(e.target)&&!(e.target.closest&&e.target.closest("mark.rl-hl"))) U.pop.style.display="none"; });

  // ---- drawer ----
  var colorFilter={gold:1,green:1,steel:1,violet:1};
  function openDrawer(){ U.drawer.classList.add("open"); U.scrim.classList.add("on"); renderNotes(); }
  function closeDrawer(){ U.drawer.classList.remove("open"); U.scrim.classList.remove("on"); }
  U.fab.addEventListener("click",openDrawer);
  $("rlClose").addEventListener("click",closeDrawer);
  U.scrim.addEventListener("click",closeDrawer);
  $("rlSearch").addEventListener("input",renderNotes);
  [].forEach.call(document.querySelectorAll(".rl-fchip"),function(ch){
    ch.addEventListener("click",function(){ var c=ch.getAttribute("data-c");
      if(colorFilter[c]){colorFilter[c]=0; ch.classList.add("off");} else {colorFilter[c]=1; ch.classList.remove("off");} renderNotes(); });
  });
  function filtered(){
    var q=($("rlSearch").value||"").trim().toLowerCase();
    return notes.slice().sort(function(a,b){return b.ts-a.ts;})
      .filter(function(n){return colorFilter[n.color];})
      .filter(function(n){return !q||(n.text+" "+(n.comment||"")).toLowerCase().indexOf(q)>=0;});
  }
  function renderNotes(){
    var list=$("rlList"), items=filtered();
    if(!items.length){ list.innerHTML='<div class="rl-empty">'+(notes.length?"没有匹配的批注。":"还没有批注。<br>在正文里选中文字 → 划线或写批注,会出现在这里,并可搜索、筛选、导出。")+'</div>'; return; }
    list.innerHTML=items.map(function(n){
      return '<div class="rl-note" data-go="'+n.id+'"><div class="rl-ntop"><span class="rl-chip" style="background:'+(COLORS[n.color]||COLORS.gold)+'"></span>'
        +'<span class="rl-where">'+esc(n.sec||"")+'</span><button class="rl-ndel" data-del="'+n.id+'">删除</button></div>'
        +'<div class="rl-nsnip">'+esc(n.text)+'</div>'+(n.comment?'<div class="rl-ncmt">✎ '+esc(n.comment)+'</div>':"")+'</div>';
    }).join("");
    [].forEach.call(list.querySelectorAll(".rl-note"),function(el){ el.addEventListener("click",function(e){ if(e.target.closest("[data-del]"))return; jumpTo(el.getAttribute("data-go")); }); });
    [].forEach.call(list.querySelectorAll("[data-del]"),function(b){ b.addEventListener("click",function(e){ e.stopPropagation();
      var id=b.getAttribute("data-del"); notes=notes.filter(function(x){return x.id!==id;}); persist(); applyAll(); renderNotes(); updateCount(); }); });
  }
  function jumpTo(id){ closeDrawer(); var mk=document.querySelector('mark[data-hid="'+id+'"]'); if(!mk)return;
    var top=mk.getBoundingClientRect().top+window.scrollY-110; window.scrollTo({top:top,behavior:"smooth"});
    mk.classList.remove("rl-flash"); void mk.offsetWidth; mk.classList.add("rl-flash"); }

  function download(name,text,type){ var blob=new Blob([text],{type:type}); var a=document.createElement("a");
    a.href=URL.createObjectURL(blob); a.download=name; a.click(); setTimeout(function(){URL.revokeObjectURL(a.href);},100); }
  $("rlExpJson").addEventListener("click",function(){ download(file+"-notes.json",JSON.stringify(notes,null,2),"application/json"); });
  $("rlExpMd").addEventListener("click",function(){
    var md="# "+bookTitle+" — 我的批注\n\n"+filtered().map(function(n){
      return "> "+n.text+"\n"+(n.comment?("\n**批注:** "+n.comment+"\n"):"")+"\n*("+(n.sec||"")+")*\n"; }).join("\n---\n\n");
    download(file+"-notes.md",md,"text/markdown");
  });

  function find(id){ for(var i=0;i<notes.length;i++) if(notes[i].id===id) return notes[i]; return null; }
  function persist(){ store.save(NK,notes); }
  function updateCount(){ $("rlCnt").textContent=notes.length; }

  // ---- progress resume ----
  var saveT;
  window.addEventListener("scroll",function(){
    clearTimeout(saveT); saveT=setTimeout(function(){
      var max=document.documentElement.scrollHeight-window.innerHeight, pct=max>0?window.scrollY/max:0;
      store.save(PK,{y:window.scrollY,pct:pct});
    },300);
  },{passive:true});

  // ---- init ----
  collectBlocks(); applyAll(); updateCount();
  var prog=store.load(PK,null);
  if(prog&&prog.y>40){ setTimeout(function(){ window.scrollTo(0,prog.y); },60); }
})();
