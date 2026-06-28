import re

_LIG = {"ﬁ": "fi", "ﬂ": "fl", "ﬀ": "ff", "ﬃ": "ffi", "ﬄ": "ffl"}

def fix_ligatures(s: str) -> str:
    for k, v in _LIG.items():
        s = s.replace(k, v)
    return s

def dehyphenate_join(lines: list[str]) -> str:
    s = ""
    for i, ln in enumerate(lines):
        s = ln if i == 0 else smart_join(s, ln)
    return s

def smart_join(a: str, b: str) -> str:
    # Join two wrapped text fragments: de-hyphenate English soft-wraps; insert NO
    # space between two CJK characters (Chinese/Japanese don't space-separate); add
    # a space otherwise. Latin-only text is unaffected (always spaced as before).
    if not a:
        return b
    if a.endswith("-"):
        return a[:-1] + b
    if ord(a[-1]) > 0x2E7F and b and ord(b[0]) > 0x2E7F:
        return a + b
    return a + " " + b

def dropcap_join(letter: str, text: str, words: set[str]) -> str:
    # 辅音下沉首字 = 词首字母,直接拼(T+here=There)
    if letter not in ("A", "I"):
        return letter + text
    # A / I:续接首词是真词 → 冠词/代词(空格);否则是词首(直接拼)
    m = re.match(r"[A-Za-z']+", text)
    if m and m.group(0).lower() in words:
        return letter + " " + text
    return letter + text
