from pdf2readbar.elements import assemble

WORDS = {"reversal", "trader"}

def test_para_and_dropcap():
    els = [{"kind":"dropcap","t":"A"}, {"kind":"para","t":"reversal bar."}]
    assert assemble(els, WORDS) == "<p>A reversal bar.</p>"

def test_bullets_merge_consecutive():
    els = [{"kind":"bullets","items":["one"]}, {"kind":"bullets","items":["two"]}]
    assert assemble(els, WORDS) == "<ul><li>one</li><li>two</li></ul>"

def test_figure_caption_fill():
    els = [{"kind":"figure","img":"f1.png"}, {"kind":"caption","num":"5.1","title":"A Buy Bar"}]
    out = assemble(els, WORDS)
    assert '<img src="img/f1.png"' in out
    assert "<b>FIGURE 5.1</b>" in out and "A Buy Bar" in out
    assert "__CAP__" not in out

def test_pagebreak_paragraph_merge():
    # 前段不以句末标点结尾 + 后段小写开头 → 合并
    els = [{"kind":"para","t":"the trend continues"}, {"kind":"para","t":"into the close."}]
    assert assemble(els, WORDS) == "<p>the trend continues into the close.</p>"

def test_bullet_orphan_merge():
    els = [{"kind":"bullets","items":["a close below"]}, {"kind":"para","t":"its open."}]
    assert assemble(els, WORDS) == "<ul><li>a close below its open.</li></ul>"

def test_subhead():
    assert assemble([{"kind":"subhead","t":"Primary characteristics:"}], WORDS) == "<h3>Primary characteristics:</h3>"
