#!/usr/bin/env python3
"""Gerador do banco de exemplo "RH": departamentos, cargos, funcionarios, salarios, avaliacoes e ausencias FICTICIOS.

Uso: python3 -I docs/testing/fixtures/gen_rh.py [--out hub/assets/data/rh.sql]
Saida deterministica: so biblioteca padrao e gerador pseudoaleatorio proprio (LCG), sem `random` e sem relogio;
duas execucoes geram bytes identicos (mesmo sha256). Tudo e inventado; e-mails usam o dominio reservado example.com;
nomes sao combinacoes de listas genericas (qualquer coincidencia com pessoas reais e acidental).
"""
import argparse, hashlib, os
from datetime import date, timedelta

SEED = 20250404


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
DEPTOS = [('Diretoria', 'CC100'), ('Financeiro', 'CC200'), ('Comercial', 'CC300'), ('Operacoes', 'CC400'),
          ('Tecnologia', 'CC500'), ('Pessoas', 'CC600'), ('Marketing', 'CC700'), ('Suporte', 'CC800')]
# (prefixo do cargo, nivel, salario minimo, numero de passos de 50 acima do minimo)
NIVEIS = [('Assistente de', 1, 2400, 40), ('Analista de', 2, 4800, 60), ('Coordenador de', 4, 10500, 100)]
HOJE = date(2025, 11, 15)    # data de referencia fixa da empresa
N_FUNC = 200
PERIODOS = ('2024', '2025-S1')


def build():
    r = Rng(SEED)
    departamentos = [(i, n, cc) for i, (n, cc) in enumerate(DEPTOS, 1)]
    cargos = [(1, 'Diretor Geral', 1, 5)]
    faixa = {1: (30000, 1)}     # cargo_id -> (salario minimo, passos)
    for d in range(2, len(DEPTOS) + 1):
        for pref, nivel, base, passos in NIVEIS:
            cargos.append((len(cargos) + 1, '%s %s' % (pref, DEPTOS[d - 1][0]), d, nivel))
            faixa[len(cargos)] = (base, passos)
    cargo_de = {(c[2], c[3]): c[0] for c in cargos}     # (departamento, nivel) -> cargo_id

    func = []   # (id, nome, email, cargo_id, departamento_id, gestor_id, data_admissao, data_desligamento)
    gerentes = {d: [] for d in range(2, len(DEPTOS) + 1)}
    adm_de = {}
    nivel_de = {}
    func.append([1, 'Helena Valente', 'func001@example.com', 1, 1, None, date(2015, 1, 5), None])
    adm_de[1] = date(2015, 1, 5); nivel_de[1] = 5
    for i in range(2, N_FUNC + 1):
        if i <= 8:                                   # coordenadores (chefes de departamento), gestor = diretor geral
            dep, nivel, gestor = i, 4, 1
        else:
            dep = 2 + r.weighted([2, 4, 5, 6, 2, 3, 5])
            nivel = 2 if i <= 30 else (1, 2)[r.weighted([6, 4])]
            gestor = r.pick(gerentes[dep]) if i > 30 else dep      # ids 9..30 (analistas) respondem ao coordenador (id = departamento)
        nome = '%s %s' % (r.pick(PRIMEIROS), r.pick(SOBRENOMES))
        ga = adm_de[gestor]
        span = max(1, min(1500, (date(2025, 10, 31) - ga).days))
        adm = ga + timedelta(days=30 + r.below(span))
        if adm > date(2025, 10, 31):
            adm = date(2025, 10, 31)
        desl = None
        if i > 30 and r.below(100) < 18:
            lo = adm + timedelta(days=120)
            if lo < date(2025, 11, 1):
                desl = lo + timedelta(days=r.below((date(2025, 11, 1) - lo).days))
        func.append([i, nome, 'func%03d@example.com' % i, cargo_de[(dep, nivel)], dep, gestor, adm, desl])
        adm_de[i] = adm; nivel_de[i] = nivel
        if i <= 30 and i > 8:
            gerentes[dep].append(i)
        elif i <= 8:
            gerentes[dep].append(i)
    funcionarios = [(f[0], f[1], f[2], f[3], f[4], f[5], f[6].isoformat(), f[7].isoformat() if f[7] else None) for f in func]

    salarios = []   # (id, funcionario_id, data_inicio, salario, motivo)
    sal_atual = {}
    sid = 1
    for f in func:
        base, passos = faixa[f[3]]
        sal = float(base + 50 * r.below(passos + 1) if f[3] != 1 else 30000)
        salarios.append([sid, f[0], f[6].isoformat(), sal, 'admissao']); sid += 1
        for ano in (2024, 2025):
            d = date(ano, 1, 1)
            if f[6] < d and (f[7] is None or f[7] > d) and r.below(100) < 60:
                sal = round(sal * (1 + (3 + r.below(6)) / 100.0), 2)
                salarios.append([sid, f[0], d.isoformat(), sal, 'reajuste']); sid += 1
    salarios.sort(key=lambda s: (s[2], s[1]))
    salarios = [(i,) + tuple(s[1:]) for i, s in enumerate(salarios, 1)]

    avaliacoes = []
    for per, ref in (('2024', date(2024, 12, 31)), ('2025-S1', date(2025, 6, 30))):
        for f in func:
            if f[6] < ref - timedelta(days=90) and (f[7] is None or f[7] > ref) and f[5] is not None:
                nota = None if r.below(100) < 12 else 1 + r.weighted([2, 6, 20, 14, 5])
                coment = None if nota is None or r.below(100) < 55 else ('Atingiu as metas do periodo', 'Precisa de apoio em prazos', 'Boa colaboracao com a equipe')[r.below(3)]
                avaliacoes.append((f[0], f[5], per, nota, coment))
    avaliacoes = [(i,) + a for i, a in enumerate(avaliacoes, 1)]

    aus = []
    for f in func:
        fim_vinculo = f[7] or HOJE
        for _ in range(r.weighted([3, 4, 2, 1])):
            tipo = ('ferias', 'atestado', 'licenca')[r.weighted([6, 5, 1])]
            dias = (5 + r.below(26)) if tipo == 'ferias' else (1 + r.below(4) if tipo == 'atestado' else 10 + r.below(20))
            lo = f[6] + timedelta(days=60)
            hi = fim_vinculo - timedelta(days=dias + 1)
            if hi <= lo:
                continue
            ini = lo + timedelta(days=r.below((hi - lo).days))
            aus.append((f[0], tipo, ini.isoformat(), (ini + timedelta(days=dias - 1)).isoformat(), dias))
    aus.sort(key=lambda a: (a[2], a[0]))
    ausencias = [(i,) + a for i, a in enumerate(aus, 1)]
    assert all(len(t) <= 600 for t in (funcionarios, salarios, avaliacoes, ausencias)), [len(t) for t in (funcionarios, salarios, avaliacoes, ausencias)]

    out = []
    w = out.append
    w('-- Banco de exemplo do SQL playground do Hub: recursos humanos FICTICIO.')
    w('-- Gerado por docs/testing/fixtures/gen_rh.py (semente %d). Nao edite a mao.' % SEED)
    w('-- Todos os dados sao inventados (nomes, salarios e datas). Datas ISO (YYYY-MM-DD); salarios em REAL, mensais; sem atributos sensiveis.')
    w('')
    w('CREATE TABLE departamentos (')
    w('  id INTEGER PRIMARY KEY,')
    w('  nome TEXT NOT NULL UNIQUE,')
    w('  centro_custo TEXT NOT NULL')
    w(');')
    w('CREATE TABLE cargos (')
    w('  id INTEGER PRIMARY KEY,')
    w('  nome TEXT NOT NULL UNIQUE,')
    w('  departamento_id INTEGER NOT NULL REFERENCES departamentos (id),')
    w('  nivel INTEGER NOT NULL CHECK (nivel BETWEEN 1 AND 5)')
    w(');')
    w('CREATE TABLE funcionarios (')
    w('  id INTEGER PRIMARY KEY,')
    w('  nome TEXT NOT NULL,')
    w('  email TEXT NOT NULL,')
    w('  cargo_id INTEGER NOT NULL REFERENCES cargos (id),')
    w('  departamento_id INTEGER NOT NULL REFERENCES departamentos (id),')
    w('  gestor_id INTEGER REFERENCES funcionarios (id),')
    w('  data_admissao TEXT NOT NULL,')
    w('  data_desligamento TEXT')
    w(');')
    w('CREATE TABLE salarios_historico (')
    w('  id INTEGER PRIMARY KEY,')
    w('  funcionario_id INTEGER NOT NULL REFERENCES funcionarios (id),')
    w('  data_inicio TEXT NOT NULL,')
    w('  salario REAL NOT NULL,')
    w("  motivo TEXT NOT NULL CHECK (motivo IN ('admissao', 'reajuste')),")
    w('  UNIQUE (funcionario_id, data_inicio)')
    w(');')
    w('CREATE TABLE avaliacoes (')
    w('  id INTEGER PRIMARY KEY,')
    w('  funcionario_id INTEGER NOT NULL REFERENCES funcionarios (id),')
    w('  avaliador_id INTEGER NOT NULL REFERENCES funcionarios (id),')
    w('  periodo TEXT NOT NULL,')
    w('  nota INTEGER CHECK (nota BETWEEN 1 AND 5),')
    w('  comentario TEXT,')
    w('  UNIQUE (funcionario_id, periodo)')
    w(');')
    w('CREATE TABLE ausencias (')
    w('  id INTEGER PRIMARY KEY,')
    w('  funcionario_id INTEGER NOT NULL REFERENCES funcionarios (id),')
    w("  tipo TEXT NOT NULL CHECK (tipo IN ('ferias', 'atestado', 'licenca')),")
    w('  data_inicio TEXT NOT NULL,')
    w('  data_fim TEXT NOT NULL,')
    w('  dias INTEGER NOT NULL CHECK (dias > 0)')
    w(');')
    w('')

    def insert(tabela, colunas, linhas):
        w('INSERT INTO %s (%s) VALUES' % (tabela, ', '.join(colunas)))
        for n, row in enumerate(linhas):
            w('  (' + ', '.join(q(v) for v in row) + ')' + (',' if n < len(linhas) - 1 else ';'))
        w('')

    insert('departamentos', ['id', 'nome', 'centro_custo'], departamentos)
    insert('cargos', ['id', 'nome', 'departamento_id', 'nivel'], cargos)
    insert('funcionarios', ['id', 'nome', 'email', 'cargo_id', 'departamento_id', 'gestor_id', 'data_admissao', 'data_desligamento'], funcionarios)
    insert('salarios_historico', ['id', 'funcionario_id', 'data_inicio', 'salario', 'motivo'], salarios)
    insert('avaliacoes', ['id', 'funcionario_id', 'avaliador_id', 'periodo', 'nota', 'comentario'], avaliacoes)
    insert('ausencias', ['id', 'funcionario_id', 'tipo', 'data_inicio', 'data_fim', 'dias'], ausencias)
    return ('\n'.join(out)).encode('utf-8')


def main():
    ap = argparse.ArgumentParser()
    here = os.path.dirname(os.path.abspath(__file__))
    ap.add_argument('--out', default=os.path.normpath(os.path.join(here, '../../../hub/assets/data/rh.sql')))
    a = ap.parse_args()
    data = build()
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    with open(a.out, 'wb') as f:
        f.write(data)
    print('%s bytes=%d sha256=%s' % (a.out, len(data), hashlib.sha256(data).hexdigest()))


if __name__ == '__main__':
    main()
