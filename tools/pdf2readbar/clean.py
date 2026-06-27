import re

_LIG = {"ﬁ": "fi", "ﬂ": "fl", "ﬀ": "ff", "ﬃ": "ffi", "ﬄ": "ffl"}

def fix_ligatures(s: str) -> str:
    for k, v in _LIG.items():
        s = s.replace(k, v)
    return s

def dehyphenate_join(lines: list[str]) -> str:
    s = ""
    for i, ln in enumerate(lines):
        if i == 0:
            s = ln
        elif s.endswith("-"):
            s = s[:-1] + ln
        else:
            s = s + " " + ln
    return s

def dropcap_join(letter: str, text: str, words: set[str]) -> str:
    # 辅音下沉首字 = 词首字母,直接拼(T+here=There)
    if letter not in ("A", "I"):
        return letter + text
    # A / I:续接首词是真词 → 冠词/代词(空格);否则是词首(直接拼)
    m = re.match(r"[A-Za-z']+", text)
    if m and m.group(0).lower() in words:
        return letter + " " + text
    return letter + text
