import html
from .clean import dropcap_join

_ENDP = tuple('.:?!"")')

def _esc(t: str) -> str:
    return html.escape(t, quote=False)

def assemble(elements: list[dict], words: set[str]) -> str:
    # pass 1: 收成 node,消化 dropcap(前缀到下一个文本 node)
    nodes = []
    pend = None
    for e in elements:
        k = e["kind"]
        if k == "dropcap":
            pend = e["t"]; continue
        if k == "para":
            t = e["t"]
            if pend: t = dropcap_join(pend, t, words); pend = None
            nodes.append(["para", t])
        elif k == "subhead":
            t = e["t"]
            if pend: t = dropcap_join(pend, t, words); pend = None
            nodes.append(["subhead", t])
        elif k == "bullets":
            items = list(e["items"])
            if pend and items:
                items[0] = dropcap_join(pend, items[0], words); pend = None
            if nodes and nodes[-1][0] == "bullets":
                nodes[-1][1] += items
            else:
                nodes.append(["bullets", items])
        elif k == "figure":
            nodes.append(["figure", e["img"]])
        elif k == "caption":
            nodes.append(["caption", e["num"], e["title"]])
    # pass 2: 合并(项目符号孤儿 + 跨页段落)
    merged = []
    for n in nodes:
        if n[0] == "para" and merged and merged[-1][0] == "bullets" and n[1][:1].islower():
            it = merged[-1][1]
            it[-1] = (it[-1][:-1] + n[1]) if it[-1].endswith("-") else (it[-1] + " " + n[1])
            continue
        if (n[0] == "para" and merged and merged[-1][0] == "para"
                and not merged[-1][1].rstrip().endswith(_ENDP) and n[1][:1].islower()):
            p = merged[-1][1]
            merged[-1][1] = (p[:-1] + n[1]) if p.endswith("-") else (p + " " + n[1])
        else:
            merged.append(n)
    # pass 3: 出 HTML
    out = []
    for n in merged:
        if n[0] == "para":
            out.append("<p>" + _esc(n[1]) + "</p>")
        elif n[0] == "subhead":
            out.append("<h3>" + _esc(n[1]) + "</h3>")
        elif n[0] == "bullets":
            out.append("<ul>" + "".join("<li>" + _esc(x) + "</li>" for x in n[1]) + "</ul>")
        elif n[0] == "figure":
            out.append('<figure><img src="img/%s" alt="Figure"><figcaption>__CAP__</figcaption></figure>' % n[1])
        elif n[0] == "caption":
            cap = "<b>FIGURE %s</b> &nbsp;%s" % (n[1], _esc(n[2]))
            for j in range(len(out) - 1, -1, -1):
                if "__CAP__" in out[j]:
                    out[j] = out[j].replace("__CAP__", cap); break
    return "\n        ".join(x.replace("__CAP__", "") for x in out)
