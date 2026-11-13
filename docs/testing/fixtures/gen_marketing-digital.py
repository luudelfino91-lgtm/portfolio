#!/usr/bin/env python3
"""Gerador do banco de exemplo "Marketing digital": campanhas, canais, anuncios, metricas e leads FICTICIOS.

Uso: python3 -I docs/testing/fixtures/gen_marketing-digital.py [--out hub/assets/data/marketing-digital.sql]
Saida deterministica: so biblioteca padrao e gerador pseudoaleatorio proprio (LCG), sem `random` e sem relogio;
duas execucoes geram bytes identicos (mesmo sha256). Tudo e inventado; e-mails usam o dominio reservado example.com;
nomes sao combinacoes de listas genericas (qualquer coincidencia com pessoas reais e acidental).
"""
import argparse, hashlib, os
from datetime import date, timedelta

SEED = 20250202


class Rng:
    """LCG de 64 bits (Knuth MMIX): mesma sequencia em qualquer plataforma/versao do Python."""
    def __init__(self, seed):
        self.s = seed & 0xFFFFFFFFFFFFFFFF

    def next(self):
        self.s = (self.s * 6364136223846793005 + 1442695040888963407) & 0xFFFFFFFFFFFFFFFF
        return self.s >> 33

    def below(self, n):
        return self.next() % n

    def pick(self, seq):
        return seq[self.below(len(seq))]

    def weighted(self, weights):
        r = self.below(sum(weights))
        for i, w in enumerate(weights):
            if r < w:
                return i
            r -= w
        return len(weights) - 1


def q(v):
    if v is None:
        return 'NULL'
    if isinstance(v, float):
        return repr(round(v, 2))
    if isinstance(v, int):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


PRIMEIROS = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Fabio', 'Gisele', 'Hugo', 'Irene', 'Jorge',
             'Karen', 'Leo', 'Marta', 'Nuno', 'Olivia', 'Paulo', 'Rita', 'Sergio', 'Tania', 'Vitor']
SOBRENOMES = ['Almeida', 'Barros', 'Cardoso', 'Dias', 'Esteves', 'Farias', 'Gomes', 'Honorato', 'Lacerda',
              'Macedo', 'Nogueira', 'Oliveira', 'Pacheco', 'Queiroz', 'Ramos', 'Saldanha', 'Teixeira', 'Valente']
# (nome, tipo, custo por mil impressoes aproximado, taxa de clique aprox. em milesimos, taxa de conversao aprox. em milesimos)
CANAIS = [('Busca paga', 'pago', 120.0, 45, 60), ('Redes sociais', 'pago', 60.0, 14, 40), ('Email', 'proprio', 15.0, 28, 45),
          ('Display', 'pago', 20.0, 5, 25), ('Video', 'pago', 30.0, 9, 25), ('Afiliados', 'parceiro', 50.0, 18, 35)]
TEMAS = ['Verao', 'Volta as aulas', 'Dia das maes', 'Black week', 'Lancamento', 'Fim de ano', 'Reativacao', 'Aniversario',
         'Frete gratis', 'Liquidacao', 'Clube de beneficios', 'Novidades']
OBJETIVOS = ['conversao', 'conversao', 'trafego', 'reconhecimento', 'captacao']
FORMATOS = ['texto', 'imagem', 'carrossel', 'video curto', 'banner']
N_CAMP, N_ANUNCIOS, DIAS_POR_ANUNCIO, N_LEADS = 24, 80, 6, 300


def build():
    r = Rng(SEED)
    d0 = date(2025, 1, 6)
    canais = [(i, c[0], c[1]) for i, c in enumerate(CANAIS, 1)]

    campanhas = []   # (id, nome, objetivo, data_inicio, data_fim, orcamento)
    for i in range(1, N_CAMP + 1):
        ini = d0 + timedelta(days=r.below(260))
        dur = 45 + r.below(76)
        fim = None if i % 8 == 0 else (ini + timedelta(days=dur)).isoformat()   # campanhas 8, 16 e 24 sem data_fim (continuas)
        orc = float(15000 + 1000 * r.below(61))
        campanhas.append((i, '%s %02d' % (TEMAS[(i - 1) % len(TEMAS)], 1 + (i - 1) // len(TEMAS)), r.pick(OBJETIVOS), ini.isoformat(), fim, orc))
    janela = {}
    for c in campanhas:
        ini = date.fromisoformat(c[3])
        fim = date.fromisoformat(c[4]) if c[4] else ini + timedelta(days=90)
        janela[c[0]] = (ini, fim)

    anuncios = []    # (id, campanha_id, canal_id, nome, formato, status)
    for i in range(1, N_ANUNCIOS + 1):
        camp = 1 + (i - 1) % N_CAMP
        canal = 1 + r.weighted([4, 4, 2, 2, 2, 2])
        status = ('ativo', 'pausado', 'encerrado')[r.weighted([5, 1, 4])]
        anuncios.append((i, camp, canal, 'Anuncio %03d' % i, r.pick(FORMATOS), status))

    metricas, mid = [], 1
    for a in anuncios:
        ini, fim = janela[a[1]]
        span = (fim - ini).days + 1
        dias = set()
        while len(dias) < DIAS_POR_ANUNCIO:
            dias.add(r.below(span))
        _, _, cpm, ctr, cvr = CANAIS[a[2] - 1]
        for off in sorted(dias):
            imp = 2000 + r.below(38000)
            cli = imp * (ctr // 2 + r.below(ctr + 1)) // 1000
            conv = cli * (cvr // 2 + r.below(cvr + 1)) // 1000
            custo = round(imp / 1000.0 * cpm * (0.7 + r.below(61) / 100.0), 2)
            ticket = 40 + r.below(160)
            receita = float(conv * ticket) if conv else 0.0
            metricas.append((mid, a[0], (ini + timedelta(days=off)).isoformat(), imp, cli, custo, conv, receita))
            mid += 1

    # leads: origem = campanha (e um dos canais dos anuncios dela)
    canais_da_camp = {}
    for a in anuncios:
        canais_da_camp.setdefault(a[1], []).append(a[2])
    leads = []
    for i in range(1, N_LEADS + 1):
        camp = 1 + r.weighted([1 + (i0 % 5) for i0 in range(N_CAMP)])
        canal = r.pick(canais_da_camp[camp])
        ini, fim = janela[camp]
        criado = ini + timedelta(days=r.below((fim - ini).days + 1))
        nome = '%s %s' % (r.pick(PRIMEIROS), r.pick(SOBRENOMES))
        email = None if i % 11 == 0 else 'lead%03d@example.com' % i
        conv_em = valor = None
        if r.below(100) < 35:                                    # ~35% convertem; os demais ficam "sem conversao"
            conv_em = (criado + timedelta(days=r.below(30))).isoformat()
            valor = float(200 + 50 * r.below(60))
        leads.append((i, camp, canal, nome, email, criado.isoformat(), conv_em, valor))

    assert all(len(t) <= 600 for t in (campanhas, anuncios, metricas, leads))

    out = []
    w = out.append
    w('-- Banco de exemplo do SQL playground do Hub: marketing digital FICTICIO.')
    w('-- Gerado por docs/testing/fixtures/gen_marketing-digital.py (semente %d). Nao edite a mao.' % SEED)
    w('-- Todos os dados sao inventados. Datas ISO (YYYY-MM-DD) em 2025; valores monetarios em REAL.')
    w('')
    w('CREATE TABLE canais (')
    w('  id INTEGER PRIMARY KEY,')
    w('  nome TEXT NOT NULL UNIQUE,')
    w("  tipo TEXT NOT NULL CHECK (tipo IN ('pago', 'proprio', 'parceiro'))")
    w(');')
    w('CREATE TABLE campanhas (')
    w('  id INTEGER PRIMARY KEY,')
    w('  nome TEXT NOT NULL,')
    w('  objetivo TEXT NOT NULL,')
    w('  data_inicio TEXT NOT NULL,')
    w('  data_fim TEXT,')
    w('  orcamento REAL NOT NULL')
    w(');')
    w('CREATE TABLE anuncios (')
    w('  id INTEGER PRIMARY KEY,')
    w('  campanha_id INTEGER NOT NULL REFERENCES campanhas (id),')
    w('  canal_id INTEGER NOT NULL REFERENCES canais (id),')
    w('  nome TEXT NOT NULL,')
    w('  formato TEXT NOT NULL,')
    w("  status TEXT NOT NULL CHECK (status IN ('ativo', 'pausado', 'encerrado'))")
    w(');')
    w('CREATE TABLE metricas_diarias (')
    w('  id INTEGER PRIMARY KEY,')
    w('  anuncio_id INTEGER NOT NULL REFERENCES anuncios (id),')
    w('  data TEXT NOT NULL,')
    w('  impressoes INTEGER NOT NULL,')
    w('  cliques INTEGER NOT NULL CHECK (cliques <= impressoes),')
    w('  custo REAL NOT NULL,')
    w('  conversoes INTEGER NOT NULL CHECK (conversoes <= cliques),')
    w('  receita REAL NOT NULL,')
    w('  UNIQUE (anuncio_id, data)')
    w(');')
    w('CREATE TABLE leads (')
    w('  id INTEGER PRIMARY KEY,')
    w('  campanha_id INTEGER NOT NULL REFERENCES campanhas (id),')
    w('  canal_id INTEGER NOT NULL REFERENCES canais (id),')
    w('  nome TEXT NOT NULL,')
    w('  email TEXT,')
    w('  criado_em TEXT NOT NULL,')
    w('  convertido_em TEXT,')
    w('  valor_contrato REAL')
    w(');')
    w('')

    def insert(tabela, colunas, linhas):
        w('INSERT INTO %s (%s) VALUES' % (tabela, ', '.join(colunas)))
        for n, row in enumerate(linhas):
            w('  (' + ', '.join(q(v) for v in row) + ')' + (',' if n < len(linhas) - 1 else ';'))
        w('')

    insert('canais', ['id', 'nome', 'tipo'], canais)
    insert('campanhas', ['id', 'nome', 'objetivo', 'data_inicio', 'data_fim', 'orcamento'], campanhas)
    insert('anuncios', ['id', 'campanha_id', 'canal_id', 'nome', 'formato', 'status'], anuncios)
    insert('metricas_diarias', ['id', 'anuncio_id', 'data', 'impressoes', 'cliques', 'custo', 'conversoes', 'receita'], metricas)
    insert('leads', ['id', 'campanha_id', 'canal_id', 'nome', 'email', 'criado_em', 'convertido_em', 'valor_contrato'], leads)
    return ('\n'.join(out)).encode('utf-8')


def main():
    ap = argparse.ArgumentParser()
    here = os.path.dirname(os.path.abspath(__file__))
    ap.add_argument('--out', default=os.path.normpath(os.path.join(here, '../../../hub/assets/data/marketing-digital.sql')))
    a = ap.parse_args()
    data = build()
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    with open(a.out, 'wb') as f:
        f.write(data)
    print('%s bytes=%d sha256=%s' % (a.out, len(data), hashlib.sha256(data).hexdigest()))


if __name__ == '__main__':
    main()
