PREPAINT = '<script>(function(){try{var s=JSON.parse(localStorage.getItem("readbar:settings")||"{}"),r=document.documentElement;if(s.fs)r.style.setProperty("--reader-fs",s.fs+"px");if(s.lh)r.style.setProperty("--reader-lh",s.lh);if(s.measure)r.style.setProperty("--reader-measure",s.measure+"px");if(s.font)r.setAttribute("data-font",s.font);}catch(e){}})();</script>'

EXTRA = '<style>figure img{width:100%;height:auto;display:block;border-radius:6px;}figure{padding:14px;}ul{margin:14px 0 14px 4px;padding-left:22px;color:#dcd8cc;}li{margin:6px 0;}h3{font-family:var(--serif);font-weight:600;font-size:21px;margin:30px 0 4px;color:var(--ink);}.col section{padding:40px 0 6px;}</style>'

SCRIPTS = '''<script>
const prog=document.getElementById("progress");
function up(){const h=document.documentElement,sc=h.scrollTop||document.body.scrollTop,m=h.scrollHeight-h.clientHeight;prog.style.width=(m>0?sc/m*100:0)+"%";}
addEventListener("scroll",up,{passive:true});up();
const rio=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");rio.unobserve(e.target);}}),{threshold:.08});
document.querySelectorAll("figure").forEach(f=>rio.observe(f));
const links=[...document.querySelectorAll(".rail a[href^='#']")],map={};links.forEach(a=>map[a.getAttribute("href").slice(1)]=a);
const nio=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){Object.values(map).forEach(l=>l.classList.remove("active"));const a=map[e.target.id];if(a)a.classList.add("active");}}),{rootMargin:"-8% 0px -80% 0px"});
document.querySelectorAll("section[id]").forEach(s=>nio.observe(s));
</script>
<script src="../reader.js"></script>'''

STYLE = """<style>
  :root{
    --bg:#13161b; --surface:#1b2027; --surface2:#232b35; --ink:#e9e5d8;
    --muted:#8b94a3; --faint:#5c6573; --line:#2c343f;
    --pos:#26a69a; --neg:#ef5350; --accent:#d4a657; --accent-soft:#33301f; --gold:#d4a657;
    --serif: Georgia, "Songti SC", "Noto Serif SC", "Times New Roman", serif;
    --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
    --mono: ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace;
  }
  *{box-sizing:border-box;}
  *{scrollbar-width:thin; scrollbar-color:var(--line) transparent;}
  ::-webkit-scrollbar{width:10px;height:10px;} ::-webkit-scrollbar-track{background:transparent;}
  ::-webkit-scrollbar-thumb{background:var(--line);border-radius:10px;border:2px solid var(--bg);background-clip:padding-box;}
  ::-webkit-scrollbar-thumb:hover{background:var(--faint);}
  html{scroll-behavior:smooth;}
  body{margin:0; background:var(--bg); color:var(--ink); font-family:var(--sans); font-size:17px; line-height:1.75; -webkit-font-smoothing:antialiased;}
  ::selection{background:var(--accent); color:#1a1408;}
  #progress{position:fixed; top:0; left:0; height:3px; width:0%; background:linear-gradient(90deg,var(--accent),var(--pos)); z-index:100; transition:width .1s;}
  .wrap{display:grid; grid-template-columns:248px 1fr; max-width:1180px; margin:0 auto;}
  nav.rail{position:sticky; top:0; align-self:start; height:100vh; overflow-y:auto; padding:34px 20px 40px; border-right:1px solid var(--line); font-size:13.5px;}
  .rail .brand{font-family:var(--mono); font-size:12px; letter-spacing:.18em; color:var(--accent); text-transform:uppercase;}
  .rail .brand b{color:var(--ink); display:block; font-size:18px; letter-spacing:.02em; margin-top:6px; font-family:var(--serif); line-height:1.3;}
  .shelf-nav{margin:12px 0 0; font-family:var(--mono); font-size:11px; display:flex; flex-wrap:wrap; gap:7px;}
  .shelf-nav a{color:var(--muted); text-decoration:none; border:1px solid var(--line); padding:3px 9px; border-radius:6px;}
  .shelf-nav a.home{color:var(--accent);}
  .rail ol{list-style:none; padding:0; margin:22px 0 0; counter-reset:c;}
  .rail a{display:block; color:var(--muted); text-decoration:none; padding:6px 11px 6px 12px; border-left:2px solid transparent; border-radius:0 5px 5px 0; transition:.16s;}
  .rail a:hover{color:var(--ink); background:var(--surface);}
  .rail a.active{color:var(--accent); border-left-color:var(--accent); background:var(--surface);}
  main{padding:0 0 120px; min-width:0;}
  .col{max-width:720px; margin:0 auto; padding:0 28px;}
  header.cover{padding:88px 0 60px; border-bottom:1px solid var(--line); margin-bottom:6px; background:radial-gradient(120% 90% at 80% -10%, rgba(212,166,87,.13), transparent 60%);}
  .cover .eyebrow{font-family:var(--mono); font-size:12px; letter-spacing:.22em; color:var(--accent); text-transform:uppercase;}
  .cover h1{font-family:var(--serif); font-weight:600; font-size:52px; line-height:1.04; margin:18px 0 6px; letter-spacing:-.01em;}
  .cover h1 .small{display:block; font-size:21px; color:var(--muted); font-weight:400; margin-top:16px; line-height:1.5;}
  .cover .vol{font-family:var(--mono); font-size:12.5px; color:var(--faint); margin-top:26px; letter-spacing:.08em;}
  section{padding:54px 0 6px; scroll-margin-top:8px;}
  .kicker{font-family:var(--mono); font-size:12px; letter-spacing:.16em; color:var(--accent); text-transform:uppercase; margin-bottom:10px;}
  h2{font-family:var(--serif); font-weight:600; font-size:32px; line-height:1.14; margin:6px 0 4px;}
  p{margin:16px 0; color:#dcd8cc;} p strong{color:var(--ink);} em{color:var(--accent); font-style:normal;}
  .lead{font-size:19px; color:var(--ink);}
  .facet{display:inline-block; font-family:var(--mono); font-size:11px; letter-spacing:.08em; padding:2px 9px; border-radius:20px; margin:28px 0 -6px; text-transform:uppercase;}
  .facet.what{background:#22303a; color:#7fd3e0;} .facet.why{background:var(--accent-soft); color:var(--accent);}
  .facet.gb{background:#33282a; color:#f0a0a0;} .facet.hp{background:#22332b; color:#7fd3a8;}
  figure{margin:28px 0; background:var(--surface); border:1px solid var(--line); border-radius:12px; padding:20px 20px 14px; opacity:0; transform:translateY(12px); transition:.6s;}
  figure.in{opacity:1; transform:none;} figure svg{width:100%; height:auto; display:block;}
  figcaption{font-family:var(--mono); font-size:12.5px; color:var(--muted); margin-top:12px; padding-top:11px; border-top:1px solid var(--line);}
  figcaption b{color:var(--accent);}
  .anim-cap{font-family:var(--mono); font-size:12.5px; color:var(--ink); min-height:1.3em; text-align:right; margin-top:8px;}
  .replay{font-family:var(--mono); font-size:12px; color:var(--accent); background:transparent; border:1px solid var(--accent); padding:6px 14px; border-radius:7px; cursor:pointer; margin-top:4px;}
  .socratic{margin:30px 0; border:1px solid var(--line); border-left:3px solid var(--accent); border-radius:10px; overflow:hidden;}
  .socratic .q{padding:18px 20px;} .socratic .tag{font-family:var(--mono); font-size:11px; letter-spacing:.16em; color:var(--accent); text-transform:uppercase;}
  .socratic .qt{font-family:var(--serif); font-style:italic; font-size:19px; margin:8px 0 14px; line-height:1.5;}
  .socratic button{font-family:var(--mono); font-size:12px; color:#1a1408; background:var(--accent); border:none; padding:8px 14px; border-radius:7px; cursor:pointer;}
  .socratic .a{max-height:0; opacity:0; overflow:hidden; transition:max-height .5s, opacity .4s;}
  .socratic.open .a{max-height:1400px; opacity:1; border-top:1px solid var(--line);}
  .socratic .a-inner{padding:16px 20px 20px;} .socratic .a-inner p:first-child{margin-top:0;} .socratic .a-inner p{font-size:15.5px; color:#cfcabd;}
  .connect{margin:28px 0; padding:16px 20px; border-radius:10px; background:var(--surface2); border:1px solid var(--line); font-size:15px;}
  .connect .h{font-family:var(--mono); font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:var(--pos); margin-bottom:6px;}
  .poem{margin:36px 0; padding:30px; border:1px solid var(--line); border-radius:14px; text-align:center; background:radial-gradient(130% 120% at 100% 0%, rgba(212,166,87,.10), transparent 60%);}
  .poem .pt{font-family:var(--mono); font-size:11px; letter-spacing:.2em; color:var(--accent); text-transform:uppercase; margin-bottom:16px;}
  .poem .verse{font-family:var(--serif); font-style:italic; font-size:20px; line-height:1.95;}
  .poem .by{font-family:var(--mono); font-size:11px; color:var(--faint); margin-top:16px;}
  .divider{height:1px; background:var(--line); margin:56px 0 0;}
  .endcard{margin:50px 0 0; padding:32px; border:1px solid var(--line); border-radius:14px; background:radial-gradient(120% 120% at 0% 0%, rgba(38,166,154,.10), transparent 55%);}
  .endcard h2{margin-top:0;}
  .src{font-family:var(--mono); font-size:11.5px; color:var(--faint); margin-top:14px;}
  @media (max-width:880px){
    .wrap{grid-template-columns:1fr;}
    nav.rail{position:static;height:auto;border-right:none;border-bottom:1px solid var(--line);display:flex;gap:14px;overflow-x:auto;white-space:nowrap;padding:16px 18px;}
    .rail ol{display:flex;gap:6px;margin:0;} .rail .brand{display:none;}
    .rail a{border-left:none;border-bottom:2px solid transparent;border-radius:4px;padding:6px 10px;} .rail a.active{border-left:none;border-bottom-color:var(--accent);}
    .cover h1{font-size:35px;} body{font-size:16px;}
  }
  @media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important;} figure{opacity:1;transform:none;}}
</style>"""

HUB_STYLE = ""


def hub_page(book_id: str, title: str, subtitle: str, accent: str, units: list) -> str:
    """Return a full self-contained hub HTML page for a book.

    `units` is a list of (slug, unit_title) pairs in order.
    Clones the structure of books/tpa-original/index.html: hero + continue/stats/notebook
    + vols grid + footer + two inline <script> blocks for progress/stats and notebook.
    Does NOT link reader.css/js (hubs never do).
    """
    import html as _html
    import json as _json

    def esc(s):
        return _html.escape(s or "", quote=False)

    # Build unit card HTML for .vols grid
    cards_html = ""
    for idx, (slug, unit_title) in enumerate(units):
        num_label = "Unit " + str(idx + 1)
        cards_html += (
            '\n      <a class="vol" style="--ac:' + esc(accent) + '" href="' + esc(slug) + '.html">'
            '\n        <span class="bar"></span>'
            '\n        <div class="num">' + esc(num_label) + '</div>'
            '\n        <div class="t">' + esc(unit_title) + '</div>'
            '\n      </a>'
        )

    # First unit href for "start reading" CTA
    first_slug = units[0][0] if units else ""

    # Build SPINE JS array (used by progress script)
    spine_items = [
        "    {f:" + _json.dumps(slug) + ",t:" + _json.dumps(unit_title) + ",n:" + _json.dumps(unit_title) + "}"
        for slug, unit_title in units
    ]
    spine_js = "[\n" + ",\n".join(spine_items) + "\n  ]"

    # Build VOLS JS array (used by notebook script)
    vols_items = [
        "    {f:" + _json.dumps(slug) + ",n:" + _json.dumps(unit_title) + "}"
        for slug, unit_title in units
    ]
    vols_js = "[\n" + ",\n".join(vols_items) + "\n  ]"

    # Static CSS block (no Python string formatting inside — avoids % escaping issues)
    _CSS = (
        "  :root{\n"
        "    --bg:#13161b; --bg-soft:#171b22; --surface:#1b2027; --raise:#222a34;\n"
        "    --ink:#e9e5d8; --ink-soft:#dcd8cc; --muted:#8b94a3; --faint:#5c6573; --line:#2c343f;\n"
        "    --amber:" + esc(accent) + "; --amber-deep:" + esc(accent) + ";\n"
        "    --serif:Georgia,\"Songti SC\",\"Noto Serif SC\",\"Times New Roman\",serif;\n"
        "    --sans:-apple-system,BlinkMacSystemFont,\"Segoe UI\",\"PingFang SC\",\"Hiragino Sans GB\",\"Microsoft YaHei\",sans-serif;\n"
        "    --mono:ui-monospace,\"SF Mono\",\"JetBrains Mono\",Menlo,Consolas,monospace;\n"
        "    --r1:10px; --r2:16px; --r3:22px;\n"
        "    --ease:cubic-bezier(.25,.1,.25,1);\n"
        "    --shadow-soft:0 20px 54px -28px rgba(0,0,0,.72), 0 2px 12px -5px rgba(0,0,0,.42);\n"
        "  }\n"
        "  *{box-sizing:border-box;}\n"
        "  html{scroll-behavior:smooth;}\n"
        "  body{margin:0; background:var(--bg); color:var(--ink); font-family:var(--serif);\n"
        "    font-size:17px; line-height:1.85; -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility; overflow-x:hidden;}\n"
        "  ::selection{background:rgba(212,166,87,.30); color:var(--ink);}\n"
        "  ::-webkit-scrollbar{width:11px; height:11px;}\n"
        "  ::-webkit-scrollbar-track{background:transparent;}\n"
        "  ::-webkit-scrollbar-thumb{background:var(--line); border-radius:8px; border:3px solid var(--bg);}\n"
        "  ::-webkit-scrollbar-thumb:hover{background:var(--faint);}\n"
        "  @keyframes rlFade{from{opacity:0; transform:translateY(14px);} to{opacity:1; transform:none;}}\n"
        "  @keyframes rlRain{0%{transform:translateY(-130%); opacity:0;} 12%{opacity:.45;} 100%{transform:translateY(900%); opacity:0;}}\n"
        "\n"
        "  .veil-vignette{position:fixed; inset:0; pointer-events:none; z-index:40;\n"
        "    background:radial-gradient(125% 95% at 50% 36%, transparent 38%, rgba(0,0,0,.5) 100%);}\n"
        "  .veil-noise{position:fixed; inset:0; pointer-events:none; z-index:41; opacity:.045; mix-blend-mode:overlay;\n"
        "    background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\"); background-size:160px;}\n"
        "\n"
        "  .wrap{position:relative; z-index:1; max-width:860px; margin:0 auto; padding:0 32px; animation:rlFade .9s var(--ease) both;}\n"
        "  .back{font-family:var(--mono); font-size:12px; letter-spacing:.06em; color:var(--muted); background:none; border:none;\n"
        "    cursor:pointer; padding:34px 0 0; display:inline-block; text-decoration:none; transition:color .3s var(--ease);}\n"
        "  .back:hover{color:var(--amber);}\n"
        "\n"
        "  header.hero{position:relative; padding:64px 0 56px; overflow:hidden;}\n"
        "  .hero .rain{position:absolute; inset:-10% 0; opacity:.5; pointer-events:none; z-index:0;}\n"
        "  .hero .rain span{position:absolute; top:0; width:1.5px; background:linear-gradient(to bottom, transparent, rgba(212,166,87,.45)); animation:rlRain linear infinite;}\n"
        "  .hero .amberglow{position:absolute; inset:0; pointer-events:none; z-index:0;\n"
        "    background:radial-gradient(80% 70% at 30% 0%, rgba(212,166,87,.12), transparent 60%);}\n"
        "  .hero .inner{position:relative; z-index:1;}\n"
        "  .eyebrow{font-family:var(--mono); font-size:12px; letter-spacing:.3em; text-transform:uppercase; color:var(--amber);}\n"
        "  h1.title{font-family:var(--serif); font-weight:600; font-size:58px; line-height:1.06; margin:24px 0 0; letter-spacing:.01em;}\n"
        "  h1.title .sub{display:block; font-size:24px; color:var(--muted); font-weight:400; margin-top:14px; letter-spacing:0;}\n"
        "  .lead{font-family:var(--serif); font-size:22px; color:var(--ink-soft); margin-top:26px; line-height:1.7; max-width:620px;}\n"
        "\n"
        "  .poem{margin:8px 0 12px; padding:40px 38px; border:1px solid var(--line); border-radius:var(--r3); text-align:center;\n"
        "    background:radial-gradient(130% 120% at 100% 0%, rgba(38,166,154,.08), transparent 62%); box-shadow:var(--shadow-soft);}\n"
        "  .poem .pt{font-family:var(--mono); font-size:11px; letter-spacing:.22em; text-transform:uppercase; color:var(--amber); margin-bottom:18px;}\n"
        "  .poem .verse{font-family:var(--serif); font-style:italic; font-size:20px; line-height:2.1; color:var(--ink);}\n"
        "\n"
        "  section.vols-sec{padding:64px 0 0;}\n"
        "  .kicker{font-family:var(--mono); font-size:12px; letter-spacing:.16em; text-transform:uppercase; color:var(--amber); margin-bottom:12px;}\n"
        "  h2{font-family:var(--serif); font-weight:600; font-size:36px; margin:0 0 6px;}\n"
        "  .vols{display:grid; grid-template-columns:1fr 1fr; gap:18px; margin-top:28px;}\n"
        "  .vol{position:relative; text-align:left; display:flex; flex-direction:column; text-decoration:none; color:inherit;\n"
        "    background:var(--surface); border:1px solid var(--line); border-radius:var(--r2); padding:24px 24px 22px 28px;\n"
        "    cursor:pointer; overflow:hidden; box-shadow:var(--shadow-soft); transition:transform .5s var(--ease), border-color .5s var(--ease);}\n"
        "  .vol .bar{position:absolute; left:0; top:0; bottom:0; width:3px; background:var(--ac); box-shadow:0 0 18px var(--ac);}\n"
        "  .vol:hover{transform:translateY(-4px); border-color:var(--ac);}\n"
        "  .vol:focus-visible{outline:2px solid var(--ac); outline-offset:3px;}\n"
        "  .vol .num{font-family:var(--mono); font-size:11.5px; letter-spacing:.12em; text-transform:uppercase; color:var(--ac);}\n"
        "  .vol .t{font-family:var(--serif); font-size:25px; font-weight:600; margin:8px 0 2px; color:var(--ink);}\n"
        "  .vol.wide{grid-column:1 / -1;}\n"
        "\n"
        "  .enter{margin:48px 0 0; display:flex; justify-content:center;}\n"
        "  .enter a{font-family:var(--sans); font-size:16px; letter-spacing:.04em; color:#241a12; background:var(--amber); border:none;\n"
        "    border-radius:999px; padding:16px 42px; cursor:pointer; text-decoration:none; box-shadow:0 0 40px -10px rgba(212,166,87,.5);\n"
        "    transition:all .4s var(--ease);}\n"
        "  .enter a:hover{background:var(--amber-deep); box-shadow:0 0 56px -8px rgba(212,166,87,.7);}\n"
        "\n"
        "  footer{margin:88px 0 0; padding:38px 0 90px; border-top:1px solid var(--line); text-align:center;}\n"
        "  footer .q{font-family:var(--serif); font-style:italic; font-size:19px; color:var(--muted); line-height:1.8;}\n"
        "  footer .src{font-family:var(--mono); font-size:11px; color:var(--faint); margin-top:18px; letter-spacing:.04em;}\n"
        "\n"
        "  @media (max-width:760px){\n"
        "    h1.title{font-size:40px;}\n"
        "    .vols{grid-template-columns:1fr;}\n"
        "    body{font-size:16px;}\n"
        "  }\n"
        "  @media (prefers-reduced-motion: reduce){\n"
        "    *{animation:none!important; transition:none!important; scroll-behavior:auto!important;}\n"
        "    .hero .rain{display:none;}\n"
        "  }\n"
        "  #rlContinue{margin:30px 0 0;}\n"
        "  .rl-cont{display:flex; align-items:center; gap:14px; text-decoration:none; color:inherit; background:var(--surface);\n"
        "    border:1px solid var(--line); border-left:3px solid var(--amber); border-radius:var(--r2); padding:18px 22px; box-shadow:var(--shadow-soft); transition:border-color .3s var(--ease), transform .3s var(--ease);}\n"
        "  .rl-cont:hover{border-color:var(--amber-deep); transform:translateY(-2px);}\n"
        "  .rl-cont .rl-ck{font-family:var(--mono); font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--amber);}\n"
        "  .rl-cont .rl-ct{font-family:var(--serif); font-size:18px; color:var(--ink); flex:1;}\n"
        "  .rl-cont .rl-ca{color:var(--amber); font-size:18px;}\n"
        "  #rlStats{display:flex; gap:18px; margin:18px 0 0;}\n"
        "  .rl-stat{flex:1; background:var(--surface); border:1px solid var(--line); border-radius:var(--r2); padding:16px 18px; text-align:center;}\n"
        "  .rl-stat b{display:block; font-family:var(--mono); font-size:24px; color:var(--ink); letter-spacing:.02em; font-variant-numeric:tabular-nums;}\n"
        "  .rl-stat span{font-family:var(--mono); font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--faint);}\n"
        "  .rl-vprog{display:flex; align-items:center; gap:8px; margin-top:14px; border-top:1px solid var(--line); padding-top:12px;}\n"
        "  .rl-vprog i{display:block; height:3px; background:var(--ac); border-radius:2px; box-shadow:0 0 10px var(--ac);}\n"
        "  .rl-vprog span{font-family:var(--mono); font-size:11px; color:var(--muted); white-space:nowrap;}\n"
        "  .rl-vprog.zero span{color:var(--faint);}\n"
        "  @media (max-width:760px){ #rlStats{flex-wrap:wrap;} }\n"
        "  #rlNotebookBtn{margin:18px 0 0;}\n"
        "  .rl-nbbtn{display:flex; align-items:center; gap:12px; width:100%; text-align:left; background:var(--surface); border:1px solid var(--line); border-radius:var(--r2); padding:16px 20px; cursor:pointer; color:inherit; transition:border-color .3s var(--ease);}\n"
        "  .rl-nbbtn:hover{border-color:var(--amber-deep);}\n"
        "  .rl-nbbtn .rl-nbk{font-family:var(--serif); font-size:17px; color:var(--ink);}\n"
        "  .rl-nbbtn .rl-nbc{font-family:var(--mono); font-size:12px; color:var(--muted); flex:1;}\n"
        "  .rl-nbbtn .rl-nba{color:var(--amber);}\n"
        "  .rl-nb{position:fixed; inset:0; z-index:9000; display:none; background:rgba(0,0,0,.55); padding:5vh 16px; overflow:auto;}\n"
        "  .rl-nb.open{display:block;}\n"
        "  .rl-nb-card{max-width:760px; margin:0 auto; background:var(--bg-soft); border:1px solid var(--line); border-radius:var(--r3); box-shadow:var(--shadow-soft);}\n"
        "  .rl-nb-h{display:flex; align-items:center; justify-content:space-between; padding:20px 24px; border-bottom:1px solid var(--line); font-family:var(--serif); font-size:22px; color:var(--ink); position:sticky; top:0; background:var(--bg-soft); border-radius:var(--r3) var(--r3) 0 0;}\n"
        "  .rl-nb-x{background:none; border:none; color:var(--muted); font-size:22px; cursor:pointer;}\n"
        "  .rl-nb-body{padding:14px 24px 30px;}\n"
        "  .rl-nb-empty{color:var(--faint); font-size:14px; line-height:1.8; padding:30px 4px;}\n"
        "  .rl-nb-grp{margin-top:22px;}\n"
        "  .rl-nb-gh{font-family:var(--mono); font-size:11.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--amber); margin-bottom:12px; display:flex; justify-content:space-between; align-items:baseline;}\n"
        "  .rl-nb-gh a{color:var(--muted); text-decoration:none; font-size:11px;}\n"
        "  .rl-nb-gh a:hover{color:var(--amber);}\n"
        "  .rl-nb-item{border:1px solid var(--line); border-radius:var(--r1); padding:12px 14px; margin-bottom:10px;}\n"
        "  .rl-nb-vn{font-size:14.5px; color:var(--ink-soft); line-height:1.8; white-space:pre-wrap;}\n"
        "  .rl-nb-hl .rl-nb-quote{font-size:13.5px; color:var(--muted); border-left:3px solid var(--amber); padding-left:10px;}\n"
        "  .rl-nb-hl .rl-nb-cmt{font-size:14px; color:var(--ink); margin-top:8px;}\n"
    )

    # Static JS blocks (no Python % formatting inside)
    _JS_PROGRESS = (
        "(function(){\n"
        "  var L=function(k,d){try{var v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch(e){return d;}};\n"
        "  var SPINE=" + spine_js + ";\n"
        "  function pct(f){ var p=L(\"readbar:prog:\"+f,null); return p&&p.max?Math.round(p.max*100):0; }\n"
        "  SPINE.forEach(function(v){ var card=document.querySelector('.vol[href=\"'+v.f+'.html\"]'); if(!card) return;\n"
        "    var P=pct(v.f); var d=document.createElement(\"div\"); d.className=\"rl-vprog\"+(P?\"\":\" zero\");\n"
        "    d.innerHTML=P?('<i style=\"width:'+P+'%\"></i><span>'+P+'%</span>'):'<span>未开始</span>'; card.appendChild(d); });\n"
        "  var last=L(\"readbar:last\",null);\n"
        "  var lv=last&&SPINE.filter(function(v){return v.f===last.file;})[0];\n"
        "  var cont=document.getElementById(\"rlContinue\");\n"
        "  if(lv){ cont.innerHTML='<a class=\"rl-cont\" href=\"'+lv.f+'.html\"><span class=\"rl-ck\">继续阅读</span><span class=\"rl-ct\">'+lv.t+' \xb7 '+pct(lv.f)+'%</span><span class=\"rl-ca\">→</span></a>'; }\n"
        "  else if(SPINE.length){ cont.innerHTML='<a class=\"rl-cont\" href=\"'+SPINE[0].f+'.html\"><span class=\"rl-ck\">开始阅读</span><span class=\"rl-ct\">'+SPINE[0].t+'</span><span class=\"rl-ca\">→</span></a>'; }\n"
        "  var totalSec=0, days={};\n"
        "  SPINE.forEach(function(v){ var t=L(\"readbar:time:\"+v.f,null); if(t){ totalSec+=t.total||0; (t.sessions||[]).forEach(function(s){ days[new Date(s.start).toDateString()]=1; }); } });\n"
        "  function fmtH(s){ s=Math.floor(s); var h=Math.floor(s/3600), m=Math.floor(s%3600/60); return h?(h+\"h \"+m+\"m\"):(m+\"m\"); }\n"
        "  function streak(){ var d=new Date(); function key(x){return x.toDateString();}\n"
        "    if(!days[key(d)]){ d.setDate(d.getDate()-1); if(!days[key(d)]) return 0; }\n"
        "    var n=0; while(days[key(d)]){ n++; d.setDate(d.getDate()-1); } return n; }\n"
        "  var avg=SPINE.length?Math.round(SPINE.reduce(function(a,v){return a+pct(v.f);},0)/SPINE.length):0;\n"
        "  var st=streak();\n"
        "  document.getElementById(\"rlStats\").innerHTML=\n"
        "    '<div class=\"rl-stat\"><b>'+fmtH(totalSec)+'</b><span>累计阅读</span></div>'\n"
        "   +'<div class=\"rl-stat\"><b>'+(st?st:0)+'</b><span>连续天数</span></div>'\n"
        "   +'<div class=\"rl-stat\"><b>'+avg+'%</b><span>完成度</span></div>';\n"
        "  try{ localStorage.setItem(\"readbar:book:" + book_id + "\", JSON.stringify({pct:avg, ts:Date.now()})); }catch(e){}\n"
        "})();\n"
    )

    _JS_NOTEBOOK = (
        "(function(){\n"
        "  var L=function(k,d){try{var v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch(e){return d;}};\n"
        "  var esc=function(s){return (s||\"\").replace(/[&<>]/g,function(c){return {\"&\":\"&amp;\",\"<\":\"&lt;\",\">\":\"&gt;\"}[c];});};\n"
        "  var VOLS=" + vols_js + ";\n"
        "  var groups=[], total=0;\n"
        "  VOLS.forEach(function(v){\n"
        "    var vn=L(\"readbar:vnotes:\"+v.f,[])||[];\n"
        "    var hl=(L(\"readbar:notes:\"+v.f,[])||[]).filter(function(x){return x.comment;});\n"
        "    if(!vn.length && !hl.length) return;\n"
        "    total += vn.length + hl.length;\n"
        "    groups.push({v:v, vn:vn.slice().sort(function(a,b){return b.ts-a.ts;}), hl:hl});\n"
        "  });\n"
        "  var btn=document.getElementById(\"rlNotebookBtn\");\n"
        "  btn.innerHTML='<button class=\"rl-nbbtn\" id=\"rlNbOpen\"><span class=\"rl-nbk\">笔记本</span><span class=\"rl-nbc\">'+(total?total+' 条':'还没有笔记')+'</span><span class=\"rl-nba\">→</span></button>';\n"
        "  var nb=document.getElementById(\"rlNotebook\"), body=document.getElementById(\"rlNbBody\");\n"
        "  function build(){\n"
        "    if(!groups.length){ body.innerHTML='<div class=\"rl-nb-empty\">还没有笔记。在阅读时划线写批注、或在批注抽屉里写「卷笔记」，都会按单元汇总到这里。</div>'; return; }\n"
        "    body.innerHTML=groups.map(function(g){\n"
        "      var items='';\n"
        "      g.vn.forEach(function(n){ items+='<div class=\"rl-nb-item rl-nb-vn\">'+esc(n.text)+'</div>'; });\n"
        "      g.hl.forEach(function(h){ items+='<div class=\"rl-nb-item rl-nb-hl\"><div class=\"rl-nb-quote\">'+esc(h.text)+'</div><div class=\"rl-nb-cmt\">✎ '+esc(h.comment)+'</div></div>'; });\n"
        "      return '<div class=\"rl-nb-grp\"><div class=\"rl-nb-gh\">'+esc(g.v.n)+' <a href=\"'+g.v.f+'.html\">去该单元 →</a></div>'+items+'</div>';\n"
        "    }).join(\"\");\n"
        "  }\n"
        "  function open(){ build(); nb.classList.add(\"open\"); }\n"
        "  function close(){ nb.classList.remove(\"open\"); }\n"
        "  document.getElementById(\"rlNbOpen\").addEventListener(\"click\",open);\n"
        "  document.getElementById(\"rlNbX\").addEventListener(\"click\",close);\n"
        "  nb.addEventListener(\"click\",function(e){ if(e.target===nb) close(); });\n"
        "  document.addEventListener(\"keydown\",function(e){ if(e.key===\"Escape\"&&nb.classList.contains(\"open\")) close(); });\n"
        "})();\n"
    )

    parts = [
        "<!DOCTYPE html>\n",
        "<html lang=\"zh-CN\">\n",
        "<head>\n",
        "<meta charset=\"UTF-8\">\n",
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n",
        "<title>" + esc(title) + "</title>\n",
        "<style>\n",
        _CSS,
        "</style>\n",
        "</head>\n",
        "<body>\n",
        "<div class=\"veil-vignette\"></div>\n",
        "<div class=\"veil-noise\"></div>\n",
        "\n",
        "<div class=\"wrap\">\n",
        "  <a class=\"back\" href=\"../../index.html\">← 回到书架</a>\n",
        "\n",
        "  <header class=\"hero\">\n",
        "    <div class=\"rain\">\n",
        "      <span style=\"left:12%; height:60px; animation-duration:7s;\"></span>\n",
        "      <span style=\"left:34%; height:48px; animation-duration:9s; animation-delay:.8s;\"></span>\n",
        "      <span style=\"left:58%; height:70px; animation-duration:8s; animation-delay:1.6s;\"></span>\n",
        "      <span style=\"left:78%; height:52px; animation-duration:10s; animation-delay:2.4s;\"></span>\n",
        "      <span style=\"left:90%; height:62px; animation-duration:8.5s; animation-delay:.4s;\"></span>\n",
        "    </div>\n",
        "    <div class=\"amberglow\"></div>\n",
        "    <div class=\"inner\">\n",
        "      <div class=\"eyebrow\">READBAR \xb7 PDF 导入</div>\n",
        "      <h1 class=\"title\">" + esc(title) + "<span class=\"sub\">" + esc(subtitle) + "</span></h1>\n",
        "      <div class=\"lead\">" + esc(subtitle) + "</div>\n",
        "    </div>\n",
        "  </header>\n",
        "  <div id=\"rlContinue\"></div>\n",
        "  <div id=\"rlStats\"></div>\n",
        "  <div id=\"rlNotebookBtn\"></div>\n",
        "  <div id=\"rlNotebook\" class=\"rl-nb\"><div class=\"rl-nb-card\"><div class=\"rl-nb-h\"><span>笔记本</span><button class=\"rl-nb-x\" id=\"rlNbX\">\xd7</button></div><div class=\"rl-nb-body\" id=\"rlNbBody\"></div></div></div>\n",
        "\n",
        "  <div class=\"poem\">\n",
        "    <div class=\"pt\">阅读 \xb7 导引</div>\n",
        "    <div class=\"verse\">一章，是一个思路；<br>一本书，是一段旅程。<br>慢慢来，一章一章地读。</div>\n",
        "  </div>\n",
        "\n",
        "  <section class=\"vols-sec\">\n",
        "    <div class=\"kicker\">" + str(len(units)) + " 个单元</div>\n",
        "    <h2>" + esc(title) + "</h2>\n",
        "    <div class=\"vols\">" + cards_html + "\n    </div>\n",
        "  </section>\n",
        "\n",
        "  <div class=\"enter\"><a href=\"" + esc(first_slug) + ".html\">开始阅读 →</a></div>\n",
        "\n",
        "  <footer>\n",
        "    <div class=\"q\">「每一页都是一步，每一步都算数。」</div>\n",
        "    <div class=\"src\">" + esc(title) + " \xb7 PDF 导入 \xb7 readbar</div>\n",
        "  </footer>\n",
        "</div>\n",
        "<script>\n",
        _JS_PROGRESS,
        "</script>\n",
        "<script>\n",
        _JS_NOTEBOOK,
        "</script>\n",
        "</body>\n",
        "</html>",
    ]
    return "".join(parts)


def unit_page(book_id, title, en, accent, railitems, sections, navhtml):
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="readbar:accent" content="{accent}">
<title>{title} · {en}</title>
<link rel="stylesheet" href="../reader.css">
{PREPAINT}
{STYLE}
{EXTRA}
</head>
<body>
<div id="progress"></div>
<div class="wrap">
  <nav class="rail">
    <div class="brand">{title}<b>{en}</b></div>
    <div class="shelf-nav">{navhtml}</div>
    <ol>{railitems}</ol>
  </nav>
  <main>
    <header class="cover"><div class="col">
      <div class="eyebrow">{title}</div>
      <h1>{en}</h1>
    </div></header>
    <div class="col">
      {sections}
    </div>
  </main>
</div>
{SCRIPTS}
</body>
</html>'''
