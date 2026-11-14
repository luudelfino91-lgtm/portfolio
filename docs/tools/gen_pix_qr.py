#!/usr/bin/env python3
"""Gera hub/assets/img/pix-qr.svg a partir do BR Code estatico de hub/assets/data/pix.json.

Uso (na raiz do repositorio):
    python3 -I docs/tools/gen_pix_qr.py            # escreve o SVG
    python3 -I docs/tools/gen_pix_qr.py --check    # sai com 1 se o SVG no repositorio difere do gerado

Dependencia SO PARA GERAR O ARQUIVO (nao vai para o navegador): pacote PyPI `qrcode` 8.2 (BSD),
instalado fora do repositorio:
    pip install --target /tmp/pyqr qrcode==8.2
    QR_LIB=/tmp/pyqr python3 -I docs/tools/gen_pix_qr.py
(`-I` ignora PYTHONPATH; por isso a variavel QR_LIB, que aponta para o diretorio do pacote.)

Deterministico: mesma entrada, mesma versao do `qrcode`, mesmo byte de saida. Antes de gerar,
confere o CRC16-CCITT (poly 0x1021, init 0xFFFF) e o TLV do payload.
"""
import json, os, sys

if os.environ.get("QR_LIB"):
    sys.path.insert(0, os.environ["QR_LIB"])
import qrcode
import qrcode.constants as C

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DATA = os.path.join(ROOT, "hub", "assets", "data", "pix.json")
LEVELS = {"M": C.ERROR_CORRECT_M, "Q": C.ERROR_CORRECT_Q}


def crc16(text):
    crc = 0xFFFF
    for b in text.encode("ascii"):
        crc ^= b << 8
        for _ in range(8):
            crc = ((crc << 1) ^ 0x1021) & 0xFFFF if crc & 0x8000 else (crc << 1) & 0xFFFF
    return crc


def tlv(s):
    out, i = [], 0
    while i < len(s):
        tag, ln = s[i:i + 2], int(s[i + 2:i + 4])
        val = s[i + 4:i + 4 + ln]
        assert len(val) == ln, "TLV truncado no campo " + tag
        out.append((tag, val))
        i += 4 + ln
    return out


def validate(rec):
    p = rec["payload"]
    assert p[-8:-4] == "6304", "campo 63 ausente no fim"
    assert "%04X" % crc16(p[:-4]) == p[-4:], "CRC16 nao confere"
    f = dict(tlv(p))
    assert dict(tlv(f["26"]))["01"] == rec["chave_aleatoria"], "chave do campo 26 difere da chave registrada"
    assert f["59"] == rec["favorecido_campo_59"] and f["60"] == rec["cidade_campo_60"]
    assert "54" not in f, "payload nao deve ter valor (campo 54)"


def build_svg(rec):
    border = rec["qr"]["borda_modulos"]
    q = qrcode.QRCode(error_correction=LEVELS[rec["qr"]["correcao_de_erros"]], border=border, box_size=1)
    q.add_data(rec["payload"])
    q.make(fit=True)
    m = q.get_matrix()  # inclui a borda (zona de silencio)
    n = len(m)
    d = []
    for y, row in enumerate(m):
        x = 0
        while x < n:
            if row[x]:
                s = x
                while x < n and row[x]:
                    x += 1
                d.append("M%d %dh%dv1h-%dz" % (s, y, x - s, x - s))
            else:
                x += 1
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d" '
           'shape-rendering="crispEdges" role="img" aria-label="QR Code PIX">'
           '<rect width="%d" height="%d" fill="#fff"/><path fill="#000" d="%s"/></svg>\n') % (n, n, n * 4, n * 4, n, n, "".join(d))
    return svg, q.version, n - 2 * border


def main():
    rec = json.load(open(DATA, encoding="utf-8"))
    validate(rec)
    svg, ver, mods = build_svg(rec)
    out = os.path.join(ROOT, rec["qr"]["arquivo"])
    print("QR versao %d, %dx%d modulos, correcao %s, SVG %d bytes" % (ver, mods, mods, rec["qr"]["correcao_de_erros"], len(svg.encode())))
    if "--check" in sys.argv:
        same = os.path.exists(out) and open(out, encoding="utf-8").read() == svg
        print("SVG do repositorio " + ("confere" if same else "DIFERE"))
        sys.exit(0 if same else 1)
    with open(out, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(svg)
    print("escrito", rec["qr"]["arquivo"])


if __name__ == "__main__":
    main()
