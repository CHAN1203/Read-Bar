from pdf2readbar.clean import fix_ligatures, dehyphenate_join, dropcap_join

WORDS = {"reversal", "trader", "have", "many"}

def test_fix_ligatures():
    assert fix_ligatures("diﬃcult ﬁnal") == "difficult final"

def test_dehyphenate_join_softwrap():
    assert dehyphenate_join(["Re-", "member this"]) == "Remember this"

def test_dehyphenate_join_space():
    assert dehyphenate_join(["the close", "of the bar"]) == "the close of the bar"

def test_dropcap_consonant_joins_no_space():
    assert dropcap_join("T", "here is a reason", WORDS) == "There is a reason"

def test_dropcap_A_article_gets_space():
    assert dropcap_join("A", "reversal bar is one", WORDS) == "A reversal bar is one"

def test_dropcap_A_wordstart_no_space():
    # "lthough" 不是真词 → 拼成 "Although"
    assert dropcap_join("A", "lthough many traders", WORDS) == "Although many traders"
