#!/usr/bin/env python3
"""Gerador DETERMINISTICO das fixtures de CSV (T-311, test-strategy 3.2).

Uso:
  python3 -I gen_csv.py                 # fixtures pequenas, na pasta do script
  python3 -I gen_csv.py --large         # + limit-10mb.csv, over-limit.csv, big-50mb.csv
  python3 -I gen_csv.py --out DIR       # grava em DIR (usado no check de determinismo)

Sem timestamps, sem aleatoriedade (hash aritmetico por linha), so biblioteca padrao.
"""
import argparse
import base64
import csv
import datetime
import io
import os
import sys

LIMIT_BYTES = 10 * 1024 * 1024          # 10 MiB = 10.485.760
BIG_BYTES = 50 * 1024 * 1024            # 50 MiB = 52.428.800 (~50 MB, so registro)

CANARY_CONTENT = "CANARIO-9f3a7c"       # test-strategy 5.2 (conteudo)
CANARY_FILENAME = "CANARIO-NOME-4c8e1b"  # canario unico no NOME do arquivo
CANARY_FILE = "canary-%s.csv" % CANARY_FILENAME

SMALL_FILES = [
    "basic.csv", "semicolon.csv", "tab.tsv", "pipe.csv", "bom.csv", "latin1.csv",
    "empty.csv", "header-only.csv", "one-col.csv", "quoted.csv", "ragged.csv",
    "nulls.csv", "dup-headers.csv", "crlf.csv", "cr.csv", "lf.csv", "wide.csv",
    "fake.csv", "xss.csv", "types.csv", CANARY_FILE,
]
LARGE_FILES = ["limit-10mb.csv", "over-limit.csv", "big-50mb.csv"]


def mix(i, k):
    """Hash inteiro de 32 bits, puro e portavel (nao usa random)."""
    x = (i * 0x9E3779B1 + k * 0x85EBCA6B + 0x27D4EB2F) & 0xFFFFFFFF
    x ^= x >> 15
    x = (x * 0x2C1B3C6D) & 0xFFFFFFFF
    x ^= x >> 12
    x = (x * 0x297A2D39) & 0xFFFFFFFF
    x ^= x >> 15
    return x


def to_csv(rows, delimiter=",", lineterminator="\n"):
    buf = io.StringIO(newline="")
    w = csv.writer(buf, delimiter=delimiter, lineterminator=lineterminator)
    for r in rows:
        w.writerow(r)
    return buf.getvalue()


# ---------------------------------------------------------------- basic
FIRST = ["João", "Maria", "José", "Ana", "Antônio", "Conceição", "Luís", "Beatriz", "Ângela", "Nuno"]
LAST = ["Silva", "Souza", "Oliveira", "Gonçalves", "Pereira", "Muñoz", "Lima", "Araújo", "Côrtes", "Peña"]
CIDADES = [("São Paulo", "SP"), ("Brasília", "DF"), ("Curitiba", "PR"), ("Maceió", "AL"),
           ("Belém", "PA"), ("Florianópolis", "SC"), ("Goiânia", "GO"), ("Niterói", "RJ")]
CATS = ["A", "B", "C", "D", "E"]
OBS = ["ação concluída", "coração", "Niño", "ç", "", "senão", "pedido urgente", "revisão", ""]
BASIC_HEADER = ["id", "nome", "cidade", "estado", "idade", "salario", "ativo",
                "data_cadastro", "categoria", "observacao"]


def row_basic(i, br=False):
    if i == 1:  # linha 1 garante os quatro tokens de CSV-03
        nome, cidade, uf, obs = "João Conceição", "São Paulo", "SP", "ação ç ñ Niño"
    else:
        nome = "%s %s" % (FIRST[mix(i, 1) % len(FIRST)], LAST[mix(i, 2) % len(LAST)])
        cidade, uf = CIDADES[mix(i, 3) % len(CIDADES)]
        obs = OBS[mix(i, 9) % len(OBS)]
    cents = 150000 + mix(i, 5) % 900000
    sal = "%d.%02d" % (cents // 100, cents % 100)
    if br:
        sal = sal.replace(".", ",")
    data = datetime.date(2020, 1, 1) + datetime.timedelta(days=mix(i, 7) % 1500)
    return [str(i), nome, cidade, uf, str(18 + mix(i, 4) % 60), sal,
            "true" if mix(i, 6) % 2 else "false", data.isoformat(),
            CATS[mix(i, 8) % len(CATS)], obs]


def basic_rows(n, br=False):
    return [BASIC_HEADER] + [row_basic(i, br) for i in range(1, n + 1)]


# ---------------------------------------------------------------- pequenas
def f_basic():
    return to_csv(basic_rows(10000)).encode("utf-8")


def f_semicolon():
    return to_csv(basic_rows(200, br=True), delimiter=";").encode("utf-8")


def f_tab():
    return to_csv(basic_rows(200), delimiter="\t").encode("utf-8")


def f_pipe():
    return to_csv(basic_rows(200), delimiter="|").encode("utf-8")


def f_bom():
    rows = [["código", "nome", "valor"], ["1", "ação", "10.5"], ["2", "São Paulo", "20.25"], ["3", "ñandú", "30"]]
    return b"\xef\xbb\xbf" + to_csv(rows).encode("utf-8")


def f_latin1():
    rows = [["id", "nome", "cidade", "observacao"],
            ["1", "João", "São Paulo", "ação ç ñ"], ["2", "José", "Brasília", "coração"],
            ["3", "Conceição", "Maceió", "Niño"], ["4", "Ângela", "Belém", "açúcar"]]
    return to_csv(rows).encode("latin-1")


def f_empty():
    return b""


def f_header_only():
    return to_csv([["id", "nome", "cidade", "valor"]]).encode("utf-8")


def f_one_col():
    rows = [["nome"]] + [["%s %s" % (FIRST[mix(i, 1) % 10], LAST[mix(i, 2) % 10])] for i in range(1, 51)]
    return to_csv(rows).encode("utf-8")


def f_quoted():
    rows = [["id", "texto", "nota", "valor"],
            ["1", "Silva, João", "disse \"olá\"", "10.5"],
            ["2", "linha1\nlinha2", "campo com\nquebra e, vírgula", "20"],
            ["3", "aspas \"\"duplas\"\" ok", "", "30.75"],
            ["4", "\"inicio\" e fim", "a,b,c", "40"],
            ["5", "simples", "x\r\ny (CRLF dentro do campo)", "50"],
            ["6", ",", "\"", "60"],
            ["7", "ação, São Paulo", "ñ", "70"]]
    return to_csv(rows).encode("utf-8")


def f_ragged():
    lines = ["id,nome,cidade,valor", "1,Ana,Curitiba,10", "2,Bia,Belém", "3,Caio,Goiânia,30,EXTRA",
             "4,Duda", "5,Edu,Niterói,50", "6,Fabi,Maceió,60,X,Y", "7,Gui,Brasília,70"]
    return ("\n".join(lines) + "\n").encode("utf-8")


def f_nulls():
    hdr = ["id", "vazio", "texto_null", "texto_na", "so_espacos", "todo_nulo", "um_valor", "numero", "texto"]
    rows = [hdr]
    for i in range(1, 31):
        m = i % 6
        vazio = "" if m == 0 else str(i)
        tnull = "NULL" if m == 1 else "v%d" % i
        tna = "NA" if m == 2 else "w%d" % i
        esp = ("   " if m == 3 else ("\t" if i == 9 else "s%d" % i))
        num = ["", "NULL", "NA", "  ", "7.5", str(i)][m]
        txt = ["", "banana", "Abacaxi", "cereja", "ação", "zebra"][m]
        rows.append([str(i), vazio, tnull, tna, esp, "", "unico", num, txt])
    return to_csv(rows).encode("utf-8")


def f_dup_headers():
    rows = [["id", "nome", "nome", "", "valor", "Nome", ""], ["1", "a", "b", "c", "10", "d", "e"],
            ["2", "f", "g", "h", "20", "i", "j"], ["3", "k", "l", "m", "30", "n", "o"]]
    return to_csv(rows).encode("utf-8")


def _eol(term):
    return to_csv(basic_rows(20), lineterminator=term).encode("utf-8")


def f_wide():
    hdr = ["col_%03d" % c for c in range(1, 501)]
    rows = [hdr] + [[str(mix(r, c) % 1000) for c in range(1, 501)] for r in range(1, 101)]
    return to_csv(rows).encode("utf-8")


PNG_1X1 = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==")


def f_fake():
    return PNG_1X1  # PNG real de 1x1 renomeado para .csv


def f_xss():
    hdr = ["<img src=x onerror=alert(1)>", "<script>alert(1)</script>", "a\"b", "`tick`",
           "\"; DROP TABLE t; --", "=cmd|' /C calc'!A0"]
    rows = [hdr,
            ["<img src=x onerror=alert(1)>", "<script>alert(\"x\")</script>", "</script><script>alert(1)</script>", "`${alert(1)}`", "'; DROP TABLE t;--", "=cmd|' /C calc'!A0"],
            ["=cmd|' /C calc'!A0", "+SUM(1+1)", "-2+3", "@SUM(A1)", "=HYPERLINK(\"http://example.invalid\",\"x\")", "\t=1+1"],
            ["\"><svg/onload=alert(1)>", "javascript:alert(1)", "{{7*7}}", "${7*7}", "<iframe src=javascript:alert(1)>", "'\"`"],
            ["aspas \" e ' e ` juntas", "</script>", "<script>", "&lt;b&gt;&amp;", "<a href=\"javascript:alert(1)\">x</a>", "normal"],
            ["ação", "São Paulo", "ç", "ñ", "<b>negrito</b>", "fim"]]
    return to_csv(rows).encode("utf-8")


def f_types():
    hdr = ["inteiro", "decimal", "inteiro_ou_decimal", "data_iso", "data_br", "booleano",
           "texto_misto", "decimal_br", "codigo_zeros", "inteiro_negativo"]
    rows = [hdr,
            ["1", "1.5", "1", "2024-01-31", "31/01/2024", "true", "abc", "1234,56", "00123", "-1"],
            ["2", "2.25", "2.5", "2024-02-29", "29/02/2024", "false", "123", "0,5", "00456", "-20"],
            ["3", "-3.75", "3", "2023-12-01", "01/12/2023", "TRUE", "2024-01-01", "10", "00789", "0"],
            ["4", "0.0", "-4.25", "2020-02-29", "15/08/2022", "False", "true", "99,99", "01010", "+5"],
            ["5", "100.125", "5", "1999-12-31", "01/01/1999", "true", "ação", "1234,5", "00001", "-7"],
            ["6", "7.0", "6", "2024-06-15", "10/10/2010", "false", "", "3,14", "00002", "8"]]
    return to_csv(rows).encode("utf-8")


def f_canary():
    rows = [["id", "segredo", "texto"], ["1", CANARY_CONTENT, "linha com " + CANARY_CONTENT],
            ["2", "outro", "ação ç ñ"]]
    return to_csv(rows).encode("utf-8")


SMALL_BUILDERS = {
    "basic.csv": f_basic, "semicolon.csv": f_semicolon, "tab.tsv": f_tab, "pipe.csv": f_pipe,
    "bom.csv": f_bom, "latin1.csv": f_latin1, "empty.csv": f_empty, "header-only.csv": f_header_only,
    "one-col.csv": f_one_col, "quoted.csv": f_quoted, "ragged.csv": f_ragged, "nulls.csv": f_nulls,
    "dup-headers.csv": f_dup_headers, "crlf.csv": lambda: _eol("\r\n"), "cr.csv": lambda: _eol("\r"),
    "lf.csv": lambda: _eol("\n"), "wide.csv": f_wide, "fake.csv": f_fake, "xss.csv": f_xss,
    "types.csv": f_types, CANARY_FILE: f_canary,
}

# ---------------------------------------------------------------- grandes
LARGE_HEADER = "id,codigo,nome,cidade,idade,valor,ativo,data,categoria,observacao\n"
ASCII_NOMES = ["Joao Silva", "Maria Souza", "Jose Lima", "Ana Pereira", "Luis Costa", "Bia Rocha"]
ASCII_CID = ["Sao Paulo", "Brasilia", "Curitiba", "Maceio", "Belem", "Niteroi"]


def large_line(i, obs=None):
    cents = 150000 + mix(i, 5) % 900000
    data = datetime.date(2020, 1, 1) + datetime.timedelta(days=mix(i, 7) % 1500)
    if obs is None:
        obs = "texto-%06d-%08x" % (i, mix(i, 9))
    return "%d,%08x%08x,%s,%s,%d,%d.%02d,%s,%s,%s,%s\n" % (
        i, mix(i, 1), mix(i, 2), ASCII_NOMES[mix(i, 3) % 6], ASCII_CID[mix(i, 4) % 6],
        18 + mix(i, 6) % 60, cents // 100, cents % 100, "true" if mix(i, 8) % 2 else "false",
        data.isoformat(), "ABCDE"[mix(i, 10) % 5], obs)


def build_sized(target):
    """CSV ASCII valido (10 colunas) com EXATAMENTE `target` bytes."""
    total = len(LARGE_HEADER)
    parts = [LARGE_HEADER]
    i = 1
    while True:
        line = large_line(i)
        if target - total - len(line) < 300:
            break
        parts.append(line)
        total += len(line)
        i += 1
    base = large_line(i, obs="fim-")
    pad = target - total - len(base)
    assert pad >= 0, pad
    parts.append(large_line(i, obs="fim-" + "x" * pad))
    data = "".join(parts).encode("ascii")
    assert len(data) == target, (len(data), target)
    return data


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--large", action="store_true", help="gera tambem os arquivos grandes")
    ap.add_argument("--out", default=os.path.dirname(os.path.abspath(__file__)))
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    count = 0
    for name in SMALL_FILES:
        data = SMALL_BUILDERS[name]()
        with open(os.path.join(args.out, name), "wb") as f:
            f.write(data)
        count += 1
    if args.large:
        for name, target in (("limit-10mb.csv", LIMIT_BYTES), ("over-limit.csv", LIMIT_BYTES + 1),
                             ("big-50mb.csv", BIG_BYTES)):
            data = build_sized(target)
            with open(os.path.join(args.out, name), "wb") as f:
                f.write(data)
            count += 1
    print("gerados %d arquivos em %s" % (count, args.out))


if __name__ == "__main__":
    sys.exit(main())
