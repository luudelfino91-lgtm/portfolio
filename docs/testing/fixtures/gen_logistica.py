#!/usr/bin/env python3
"""Gerador do banco de exemplo "Logistica": centros, transportadoras, veiculos, rotas, entregas e ocorrencias FICTICIOS.

Uso: python3 -I docs/testing/fixtures/gen_logistica.py [--out hub/assets/data/logistica.sql]
Saida deterministica: so biblioteca padrao e gerador pseudoaleatorio proprio (LCG), sem `random` e sem relogio;
duas execucoes geram bytes identicos (mesmo sha256). Tudo e inventado; e-mails usam o dominio reservado example.com;
nomes sao combinacoes de listas genericas (qualquer coincidencia com pessoas reais e acidental).
"""
import argparse, hashlib, os
from datetime import date, timedelta

SEED = 20250303


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


CIDADES = ['Vila Azul', 'Porto Claro', 'Monte Verde', 'Campo Belo', 'Rio Manso', 'Serra Alta', 'Lagoa Nova', 'Pedra Branca',
           'Ilha Dourada', 'Vale Fundo', 'Praia Mansa', 'Bosque Alto']
CENTROS = [('CD Norte', 'Serra Alta', 1200), ('CD Sul', 'Porto Claro', 1500), ('CD Leste', 'Praia Mansa', 900),
           ('CD Oeste', 'Campo Belo', 1000), ('CD Central', 'Vila Azul', 2000), ('CD Litoral', 'Ilha Dourada', 700)]
NOMES_TRANSP = ['Rapida Norte', 'Via Expressa', 'Entrega Certa', 'Trilha Azul', 'Carga Leve', 'Rota Segura', 'Fluxo Veloz', 'Mercante Sul']
TIPOS_VEIC = [('moto', 40), ('van', 1200), ('caminhonete', 2500), ('caminhao leve', 6000)]
TIPOS_OC = ['avaria', 'destinatario ausente', 'endereco nao localizado', 'atraso por clima', 'recusa na entrega', 'extravio']
REF = date(2025, 11, 15)    # data de referencia fixa da operacao
N_ROTAS, N_VEIC, N_ENTREGAS, N_OC = 30, 40, 500, 160


def build():
    r = Rng(SEED)
    d0 = date(2025, 1, 6)
    centros = [(i,) + c for i, c in enumerate(CENTROS, 1)]
    transp = [(i, n, 'contato%02d@example.com' % i, 0 if i == 8 else 1) for i, n in enumerate(NOMES_TRANSP, 1)]   # transportadora 8 inativa
    veiculos = []
    for i in range(1, N_VEIC + 1):
        tipo, cap = TIPOS_VEIC[r.weighted([3, 4, 2, 1])]
        veiculos.append((i, 1 + (i - 1) % len(NOMES_TRANSP), 'VEI-%04d' % i, tipo, cap))
    rotas = []
    for i in range(1, N_ROTAS + 1):
        centro = 1 + (i - 1) % len(CENTROS)
        dest = r.pick([c for c in CIDADES if c != CENTROS[centro - 1][1]])
        rotas.append((i, centro, dest, float(20 + 5 * r.below(95))))
    datas = sorted(d0 + timedelta(days=r.below(300)) for _ in range(N_ENTREGAS))   # 2025-01-06 .. 2025-11-01
    entregas = []   # (id, rota_id, veiculo_id, data_prevista, data_realizada, status, atraso_dias, peso_kg, custo)
    for i, prev in enumerate(datas, 1):
        rota = 1 + r.below(N_ROTAS)
        veic = 1 + r.below(N_VEIC)
        transp_id = veiculos[veic - 1][1]
        dist = rotas[rota - 1][3]
        idade = (REF - prev).days
        if idade > 20:
            st = ('entregue', 'devolvida', 'cancelada')[r.weighted([90, 5, 5])]
        else:
            st = ('entregue', 'em_transito', 'cancelada')[r.weighted([50, 45, 5])]
        real = atraso = None
        if st == 'entregue':
            # transportadoras 3 e 6 atrasam mais; atraso 0 = no prazo (adiantadas contam como 0)
            p_atraso = 38 if transp_id in (3, 6) else 14
            desl = r.below(100) < p_atraso
            dias = (1 + r.weighted([5, 3, 2, 1])) if desl else -r.below(2)
            real_d = prev + timedelta(days=dias)
            real = real_d.isoformat()
            atraso = max(0, dias)
        peso = float(2 + r.below(480))
        custo = round(dist * (1.1 + r.below(120) / 100.0) * (0.8 + 0.1 * (transp_id % 5)) + peso * 0.05, 2)
        entregas.append((i, rota, veic, prev.isoformat(), real, st, atraso, peso, custo))
    ocorr = []
    n_ent = len(entregas)
    for i in range(1, N_OC + 1):
        e = entregas[r.weighted([4 if x[5] == 'entregue' and (x[6] or 0) > 0 else 1 for x in entregas])]
        tipo = r.pick(TIPOS_OC)
        dt = date.fromisoformat(e[3]) + timedelta(days=r.below(3))
        ocorr.append((i, e[0], tipo, dt.isoformat(), None if i % 6 == 0 else 'Registro automatico: %s' % tipo))
    ocorr.sort(key=lambda o: (o[3], o[1]))
    ocorr = [(i,) + o[1:] for i, o in enumerate(ocorr, 1)]
    assert all(len(t) <= 600 for t in (rotas, veiculos, entregas, ocorr))

    out = []
    w = out.append
    w('-- Banco de exemplo do SQL playground do Hub: logistica FICTICIA.')
    w('-- Gerado por docs/testing/fixtures/gen_logistica.py (semente %d). Nao edite a mao.' % SEED)
    w('-- Todos os dados sao inventados. Datas ISO (YYYY-MM-DD) em 2025; atraso_dias = max(0, realizada - prevista); custo em REAL.')
    w('')
    w('CREATE TABLE centros_distribuicao (')
    w('  id INTEGER PRIMARY KEY,')
    w('  nome TEXT NOT NULL UNIQUE,')
    w('  cidade TEXT NOT NULL,')
    w('  capacidade_diaria INTEGER NOT NULL')
    w(');')
    w('CREATE TABLE transportadoras (')
    w('  id INTEGER PRIMARY KEY,')
    w('  nome TEXT NOT NULL UNIQUE,')
    w('  email_contato TEXT,')
    w('  ativa INTEGER NOT NULL CHECK (ativa IN (0, 1))')
    w(');')
    w('CREATE TABLE veiculos (')
    w('  id INTEGER PRIMARY KEY,')
    w('  transportadora_id INTEGER NOT NULL REFERENCES transportadoras (id),')
    w('  codigo TEXT NOT NULL UNIQUE,')
    w('  tipo TEXT NOT NULL,')
    w('  capacidade_kg INTEGER NOT NULL')
    w(');')
    w('CREATE TABLE rotas (')
    w('  id INTEGER PRIMARY KEY,')
    w('  centro_id INTEGER NOT NULL REFERENCES centros_distribuicao (id),')
    w('  destino TEXT NOT NULL,')
    w('  distancia_km REAL NOT NULL')
    w(');')
    w('CREATE TABLE entregas (')
    w('  id INTEGER PRIMARY KEY,')
    w('  rota_id INTEGER NOT NULL REFERENCES rotas (id),')
    w('  veiculo_id INTEGER NOT NULL REFERENCES veiculos (id),')
    w('  data_prevista TEXT NOT NULL,')
    w('  data_realizada TEXT,')
    w("  status TEXT NOT NULL CHECK (status IN ('entregue', 'em_transito', 'devolvida', 'cancelada')),")
    w('  atraso_dias INTEGER,')
    w('  peso_kg REAL NOT NULL,')
    w('  custo REAL NOT NULL')
    w(');')
    w('CREATE TABLE ocorrencias (')
    w('  id INTEGER PRIMARY KEY,')
    w('  entrega_id INTEGER NOT NULL REFERENCES entregas (id),')
    w('  tipo TEXT NOT NULL,')
    w('  data_ocorrencia TEXT NOT NULL,')
    w('  descricao TEXT')
    w(');')
    w('')

    def insert(tabela, colunas, linhas):
        w('INSERT INTO %s (%s) VALUES' % (tabela, ', '.join(colunas)))
        for n, row in enumerate(linhas):
            w('  (' + ', '.join(q(v) for v in row) + ')' + (',' if n < len(linhas) - 1 else ';'))
        w('')

    insert('centros_distribuicao', ['id', 'nome', 'cidade', 'capacidade_diaria'], centros)
    insert('transportadoras', ['id', 'nome', 'email_contato', 'ativa'], transp)
    insert('veiculos', ['id', 'transportadora_id', 'codigo', 'tipo', 'capacidade_kg'], veiculos)
    insert('rotas', ['id', 'centro_id', 'destino', 'distancia_km'], rotas)
    insert('entregas', ['id', 'rota_id', 'veiculo_id', 'data_prevista', 'data_realizada', 'status', 'atraso_dias', 'peso_kg', 'custo'], entregas)
    insert('ocorrencias', ['id', 'entrega_id', 'tipo', 'data_ocorrencia', 'descricao'], ocorr)
    return ('\n'.join(out)).encode('utf-8')


def main():
    ap = argparse.ArgumentParser()
    here = os.path.dirname(os.path.abspath(__file__))
    ap.add_argument('--out', default=os.path.normpath(os.path.join(here, '../../../hub/assets/data/logistica.sql')))
    a = ap.parse_args()
    data = build()
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    with open(a.out, 'wb') as f:
        f.write(data)
    print('%s bytes=%d sha256=%s' % (a.out, len(data), hashlib.sha256(data).hexdigest()))


if __name__ == '__main__':
    main()
