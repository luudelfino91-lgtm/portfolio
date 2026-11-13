#!/usr/bin/env python3
"""Oraculo INDEPENDENTE (T-311): calcula expected.json e SHA256SUMS das fixtures.

Nao importa gen_csv.py nem nenhum codigo do Hub; le os bytes dos arquivos e usa so a
biblioteca padrao (csv, io, hashlib, decimal, datetime, re, json).

Uso: python3 -I compute_expected.py [--dir DIR]
Arquivos grandes ausentes sao registrados como "not_generated" (gere com gen_csv.py --large).
Saida: DIR/expected.json e DIR/SHA256SUMS (deterministicos, sem data/hora).
"""
import argparse
import csv
import datetime
import hashlib
import io
import json
import os
import re
import sys
from decimal import Decimal

csv.field_size_limit(1 << 30)

# Declarado por quem projetou a fixture: o oraculo DETECTA e confere contra isto.
DECLARED = {
    "basic.csv": ",", "semicolon.csv": ";", "tab.tsv": "\t", "pipe.csv": "|", "bom.csv": ",",
    "latin1.csv": ",", "empty.csv": None, "header-only.csv": ",", "one-col.csv": None,
    "quoted.csv": ",", "ragged.csv": ",", "nulls.csv": ",", "dup-headers.csv": ",",
    "crlf.csv": ",", "cr.csv": ",", "lf.csv": ",", "wide.csv": ",", "fake.csv": None,
    "xss.csv": ",", "types.csv": ",", "canary-CANARIO-NOME-4c8e1b.csv": ",",
    "limit-10mb.csv": ",", "over-limit.csv": ",", "big-50mb.csv": ",",
}
LARGE = {"limit-10mb.csv": 10485760, "over-limit.csv": 10485761, "big-50mb.csv": 52428800}
CANDIDATES = [",", ";", "\t", "|"]

# ---- Regras ASSUMIDAS (o PRD e o test-strategy nao as definem; ver README, A1..A8)
RE_INT = re.compile(r"^[+-]?(0|[1-9][0-9]*)$")
RE_DEC = re.compile(r"^[+-]?(0|[1-9][0-9]*)\.[0-9]+$")
RE_DEC_BR = re.compile(r"^[+-]?(0|[1-9][0-9]*),[0-9]+$")   # so virgula decimal, sem milhar
RE_DATE_ISO = re.compile(r"^[0-9]{4}-[0-9]{2}-[0-9]{2}$")
RE_DATE_BR = re.compile(r"^[0-9]{2}/[0-9]{2}/[0-9]{4}$")
RE_ZEROS = re.compile(r"^[+-]?0[0-9]+$")                   # "00123" -> texto (A5)
NUMERIC = ("integer", "decimal", "decimal_br")


def is_null(v):          # A1: nulo = vazio ou so espacos/tabs
    return v.strip() == ""


def is_null_ext(v):      # A1 estendida: tambem NULL e NA (sem diferenciar maiusc./minusc.)
    return v.strip().upper() in ("", "NULL", "NA")


def valid_date(v, fmt):
    try:
        datetime.datetime.strptime(v, fmt)
        return True
    except ValueError:
        return False


def kind(v):
    if RE_INT.match(v):
        return "integer"
    if RE_DEC.match(v):
        return "decimal"
    if RE_DEC_BR.match(v):
        return "decimal_br"
    if v.lower() in ("true", "false"):
        return "boolean"
    if RE_DATE_ISO.match(v) and valid_date(v, "%Y-%m-%d"):
        return "date"
    if RE_DATE_BR.match(v) and valid_date(v, "%d/%m/%Y"):
        return "date_br"
    return "text"


def infer(values):
    ks = {kind(v) for v in values}
    if not ks:
        return "empty"
    if ks <= {"integer"}:
        return "integer"
    if ks <= {"integer", "decimal"}:
        return "decimal"
    if ks <= {"integer", "decimal_br"}:
        return "decimal_br"       # A3 (so se houver ao menos uma virgula decimal)
    if ks == {"boolean"}:
        return "boolean"
    if ks == {"date"}:
        return "date"
    if ks == {"date_br"}:
        return "date_br"
    return "text"


def to_dec(v, typ):
    return Decimal(v.replace(",", ".") if typ == "decimal_br" else v)


def decode(data):
    if data.startswith(b"\xef\xbb\xbf"):
        return data[3:].decode("utf-8"), "utf-8-sig", True
    try:
        return data.decode("utf-8"), "utf-8", False
    except UnicodeDecodeError:
        return data.decode("cp1252"), "windows-1252", False   # A7


def parse(text, d):
    # newline="" mantem \r, \r\n e \n; o modulo csv trata os tres como fim de registro.
    recs = [r for r in csv.reader(io.StringIO(text, newline=""), delimiter=d, quotechar='"') if r]  # A6: linha em branco ignorada
    return recs


def detect(text):
    best, best_key = None, (0.0, 1)
    for d in CANDIDATES:
        recs = parse(text, d)[:20]
        if not recs:
            continue
        n0 = len(recs[0])
        if n0 < 2:
            continue
        consistent = sum(1 for r in recs if len(r) == n0) / len(recs)
        key = (consistent, n0)
        if key > best_key:
            best, best_key = d, key
    return best


def stats(header, recs):
    ncols = len(header)
    cols = []
    ragged_cells = 0
    for c in range(ncols):
        raw, missing = [], 0
        for r in recs:
            if c < len(r):
                raw.append(r[c])
            else:
                raw.append("")       # A4: celula ausente (linha curta) conta como nula
                missing += 1
        ragged_cells += missing
        nn = [v for v in raw if not is_null(v)]
        typ = infer(nn)
        entry = {"name": header[c], "nulls": len(raw) - len(nn),
                 "nulls_extended": sum(1 for v in raw if is_null_ext(v)),
                 "non_null": len(nn), "distinct": len(set(nn)), "type": typ,
                 "type_rule_status": "assumed", "missing_cells": missing}
        refs = []
        if typ in ("decimal_br", "date_br"):
            refs.append("A3")
        if typ == "boolean":
            refs.append("A2")
        if any(RE_ZEROS.match(v) for v in nn):
            refs.append("A5")
        if entry["nulls"] != entry["nulls_extended"]:
            refs.append("A1")
        if missing:
            refs.append("A4")
        entry["assumption_refs"] = refs
        if not nn:
            entry["min"] = entry["max"] = None
        elif typ in NUMERIC:
            ordered = sorted(nn, key=lambda v: to_dec(v, typ))   # estavel: empate fica o primeiro
            entry["min"], entry["max"] = ordered[0], ordered[-1]
            entry["sum"] = format(sum((to_dec(v, typ) for v in nn), Decimal(0)), "f")
        elif typ == "boolean":
            entry["min"] = min(nn, key=lambda v: (v.lower(), nn.index(v)))
            entry["max"] = max(nn, key=lambda v: (v.lower(), -nn.index(v)))
        else:   # date, date_br (A8: lexicografico, nao cronologico), text (pontos de codigo Unicode)
            entry["min"], entry["max"] = min(nn), max(nn)
        cols.append(entry)
    return cols, ragged_cells


def analyse(name, data):
    out = {"file": name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}
    crlf = data.count(b"\r\n")
    out["eol_raw"] = {"crlf": crlf, "lf": data.count(b"\n") - crlf, "cr": data.count(b"\r") - crlf}
    if len(data) == 0:
        out.update(kind="empty", encoding=None, has_bom=False, delimiter=None, rows=0, columns=0,
                   header=[], first_rows=[], columns_stats=[])
        return out
    if b"\x00" in data[:8192]:
        out.update(kind="binary", encoding=None, has_bom=False, delimiter=None, rows=None,
                   columns=None, header=None, first_rows=None, columns_stats=None,
                   note="binario (NUL nos primeiros 8 KB): deve ser recusado (CSV-30)")
        return out
    text, enc, bom = decode(data)
    d = detect(text)
    declared = DECLARED.get(name, "?")
    if declared != "?" and declared != d:
        raise SystemExit("ORACULO: delimitador detectado %r != declarado %r em %s" % (d, declared, name))
    recs = parse(text, d if d else ",")
    header, body = recs[0], recs[1:]
    cols, missing = stats(header, body)
    out.update(kind="csv", encoding=enc, has_bom=bom, delimiter=d,
               delimiter_name={None: "nenhum (1 coluna)", ",": "virgula", ";": "ponto e virgula",
                               "\t": "tab", "|": "pipe"}[d],
               rows=len(body), columns=len(header), header=header, first_rows=body[:10],
               ragged_rows=sum(1 for r in body if len(r) != len(header)),
               rows_longer_than_header=sum(1 for r in body if len(r) > len(header)),
               rows_shorter_than_header=sum(1 for r in body if len(r) < len(header)),
               physical_lines=out["eol_raw"]["crlf"] + out["eol_raw"]["lf"] + out["eol_raw"]["cr"]
               + (0 if data.endswith((b"\n", b"\r")) else 1),
               columns_stats=cols)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default=os.path.dirname(os.path.abspath(__file__)))
    a = ap.parse_args()
    files = {}
    for n in sorted(DECLARED):
        p = os.path.join(a.dir, n)
        if os.path.exists(p):
            with open(p, "rb") as f:
                files[n] = analyse(n, f.read())
        elif n in LARGE:
            files[n] = {"file": n, "kind": "not_generated", "expected_bytes": LARGE[n],
                        "note": "gere com gen_csv.py --large"}
        else:
            raise SystemExit("fixture pequena ausente: " + n)
    for n, size in LARGE.items():
        if files[n]["kind"] != "not_generated" and files[n]["bytes"] != size:
            raise SystemExit("tamanho errado em %s: %d != %d" % (n, files[n]["bytes"], size))
    doc = {
        "schema": 1,
        "limit_bytes": 10485760,
        "canaries": {"content": "CANARIO-9f3a7c", "filename": "CANARIO-NOME-4c8e1b",
                     "sql": "CANARIO-SQL-51b2 (so na consulta, nao em arquivo)"},
        "assumptions": {
            "A1": "nulo = vazio ou so espacos/tabs (coluna 'nulls'); 'nulls_extended' tambem conta NULL e NA (case-insensitive). Regra de CSV-62 NAO definida.",
            "A2": "booleano = true/false sem diferenciar maiusc./minusc.; 0/1, sim/nao NAO sao booleanos.",
            "A3": "decimal_br (1234,56) e date_br (31/01/2024) sao tipos propostos do oraculo; se o Hub tratar como texto, e decisao de produto a registrar (SQL-14: datas como texto).",
            "A4": "celula ausente em linha curta (ragged) conta como nula; celula excedente e ignorada nas estatisticas.",
            "A5": "inteiro com zeros a esquerda (00123) e texto, nao inteiro (preserva codigos).",
            "A6": "linhas totalmente em branco sao ignoradas; 'rows' = registros apos o cabecalho.",
            "A7": "decodificacao: BOM -> utf-8-sig; UTF-8 valido -> utf-8; senao windows-1252 (identico a ISO-8859-1 nos caracteres das fixtures).",
            "A8": "min/max: numerico pelo valor (devolvido como texto original da celula), data ISO/BR e texto por ordem lexicografica de pontos de codigo (data BR NAO e cronologica); booleano false<true.",
            "A9": "distintos = valores nao nulos distintos comparados byte a byte, sem trim e sem diferenciar nada alem do texto exato.",
        },
        "files": [files[n] for n in sorted(files)],
    }
    with open(os.path.join(a.dir, "expected.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
        f.write("\n")
    sums = []
    for n in sorted(files):
        p = os.path.join(a.dir, n)
        if os.path.exists(p):
            with open(p, "rb") as f:
                sums.append("%s  %s\n" % (hashlib.sha256(f.read()).hexdigest(), n))
    with open(os.path.join(a.dir, "expected.json"), "rb") as f:
        sums.append("%s  expected.json\n" % hashlib.sha256(f.read()).hexdigest())
    with open(os.path.join(a.dir, "SHA256SUMS"), "w", newline="\n") as f:
        f.writelines(sums)
    print("expected.json: %d entradas; SHA256SUMS: %d linhas" % (len(files), len(sums)))


if __name__ == "__main__":
    sys.exit(main())
