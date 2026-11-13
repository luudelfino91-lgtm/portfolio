#!/usr/bin/env python3
"""Gerador do banco de exemplo "Atendimento": clientes, agentes, tickets, interacoes e pesquisas de satisfacao FICTICIOS.

Uso: python3 -I docs/testing/fixtures/gen_atendimento.py [--out hub/assets/data/atendimento.sql]
Saida deterministica: so biblioteca padrao e gerador pseudoaleatorio proprio (LCG), sem `random` e sem relogio;
duas execucoes geram bytes identicos (mesmo sha256). Tudo e inventado; e-mails usam o dominio reservado example.com;
nomes sao combinacoes de listas genericas (qualquer coincidencia com pessoas reais e acidental).
"""
import argparse, hashlib, os
from datetime import date, datetime, timedelta

SEED = 20250505


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
ASSUNTOS = ['Nao consigo acessar a conta', 'Cobranca duplicada', 'Duvida sobre o plano', 'Erro ao exportar relatorio',
            'Pedido de cancelamento', 'Alteracao de dados cadastrais', 'Lentidao no sistema', 'Solicitacao de nova funcionalidade',
            'Problema com fatura', 'Recuperacao de senha']
EQUIPES = ['N1', 'N1', 'N1', 'N2', 'Financeiro']
PLANOS = ['basico', 'pro', 'empresarial']
CANAIS = ['email', 'chat', 'telefone', 'formulario']
PRIORIDADES = ['baixa', 'media', 'alta', 'urgente']
REF = datetime(2025, 11, 15, 12, 0, 0)    # instante de referencia fixo
N_CLI, N_AG, N_TK = 120, 20, 320


def iso(dt):
    return dt.strftime('%Y-%m-%dT%H:%M:%S')


def build():
    r = Rng(SEED)
    clientes = []
    for i in range(1, N_CLI + 1):
        email = None if i % 9 == 0 else 'cliente%03d@example.com' % i
        clientes.append((i, '%s %s' % (r.pick(PRIMEIROS), r.pick(SOBRENOMES)), email, PLANOS[r.weighted([5, 4, 1])],
                         (date(2024, 1, 2) + timedelta(days=r.below(500))).isoformat()))
    agentes = []
    for i in range(1, N_AG + 1):
        agentes.append((i, '%s %s' % (r.pick(PRIMEIROS), r.pick(SOBRENOMES)), EQUIPES[(i - 1) % len(EQUIPES)],
                        (date(2022, 1, 3) + timedelta(days=r.below(1000))).isoformat()))
    # capacidade relativa (agentes 1 e 2 sao os mais rapidos; 5 e 6 os mais lentos)
    lento = {5: 2.2, 6: 1.8}
    rapido = {1: 0.6, 2: 0.7}

    base = datetime(2025, 1, 6, 8, 0, 0)
    abertos = sorted(base + timedelta(minutes=r.below(60 * 24 * 300)) for _ in range(N_TK))
    tickets, interacoes, pesquisas = [], [], []
    iid = pid = 1
    for i, ab in enumerate(abertos, 1):
        cli = 1 + r.weighted([1 + (k % 4) for k in range(N_CLI)])
        pri = PRIORIDADES[r.weighted([4, 8, 4, 1])]
        canal = CANAIS[r.weighted([5, 4, 2, 3])]
        idade_h = (REF - ab).total_seconds() / 3600
        recente = idade_h < 24 * 14
        fechado = None
        if recente:
            st = ('aberto', 'em_andamento', 'resolvido', 'fechado')[r.weighted([4, 4, 2, 2])]
        else:
            st = ('aberto', 'em_andamento', 'resolvido', 'fechado')[r.weighted([1, 1, 3, 30])]   # backlog antigo pequeno, mas existe
        ag = None if (st == 'aberto' and r.below(100) < 60) else 1 + r.below(N_AG)
        if st in ('resolvido', 'fechado'):
            fator = lento.get(ag, rapido.get(ag, 1.0))
            fator *= {'baixa': 1.5, 'media': 1.0, 'alta': 0.7, 'urgente': 0.5}[pri]
            minutos = int((30 + r.below(60 * 24 * 3)) * fator)
            fechado = ab + timedelta(minutes=minutos)
            if fechado > REF:
                fechado = ab + timedelta(minutes=max(10, int((REF - ab).total_seconds() / 60) - r.below(30)))
        tickets.append((i, cli, ag, ASSUNTOS[r.below(len(ASSUNTOS))], pri, canal, st, iso(ab), iso(fechado) if fechado else None))
        # interacoes: 1 = mensagem do cliente na abertura; as demais alternam agente/cliente ate o fechamento (ou 3 dias)
        n_int = 1 + r.weighted([4, 4, 2])
        limite = fechado or min(REF, ab + timedelta(days=3))
        t = ab
        for k in range(n_int):
            autor_cliente = (k % 2 == 0)
            if k > 0:
                t = t + timedelta(minutes=5 + r.below(max(6, int((limite - ab).total_seconds() / 60 / n_int))))
                if t > limite:
                    t = limite
            msg = 'Mensagem do cliente sobre: %s' % ASSUNTOS[r.below(len(ASSUNTOS))] if autor_cliente else 'Resposta padrao do atendimento'
            interacoes.append((iid, i, 'cliente' if autor_cliente else 'agente', None if autor_cliente else (ag or 1 + r.below(N_AG)), iso(t), msg))
            iid += 1
        if st in ('resolvido', 'fechado') and r.below(100) < 62:
            resp = fechado + timedelta(hours=1 + r.below(72))
            if r.below(100) < 28:
                pesquisas.append((pid, i, None, None, None))        # pesquisa enviada e sem resposta
            else:
                bias = {1: 2, 2: 2, 5: -2, 6: -2}.get(ag, 0)
                nota = max(1, min(5, 1 + r.weighted([3, 4, 10, 18, 25 + 6 * bias if 25 + 6 * bias > 0 else 1])))
                pesquisas.append((pid, i, nota, None if r.below(100) < 70 else ('Atendimento rapido', 'Demorou para resolver', 'Problema resolvido', 'Poderia ser mais claro')[r.below(4)], iso(min(resp, REF))))
            pid += 1
    assert all(len(t) <= 600 for t in (clientes, agentes, tickets, interacoes, pesquisas)), [len(t) for t in (tickets, interacoes, pesquisas)]

    out = []
    w = out.append
    w('-- Banco de exemplo do SQL playground do Hub: atendimento ao cliente (suporte) FICTICIO.')
    w('-- Gerado por docs/testing/fixtures/gen_atendimento.py (semente %d). Nao edite a mao.' % SEED)
    w('-- Todos os dados sao inventados. Datas/horas ISO (YYYY-MM-DDTHH:MM:SS), fuso ignorado; ticket aberto = fechado_em NULL; nota 1 a 5 (NULL = sem resposta).')
    w('')
    w('CREATE TABLE clientes (')
    w('  id INTEGER PRIMARY KEY,')
    w('  nome TEXT NOT NULL,')
    w('  email TEXT,')
    w("  plano TEXT NOT NULL CHECK (plano IN ('basico', 'pro', 'empresarial')),")
    w('  data_cadastro TEXT NOT NULL')
    w(');')
    w('CREATE TABLE agentes (')
    w('  id INTEGER PRIMARY KEY,')
    w('  nome TEXT NOT NULL,')
    w('  equipe TEXT NOT NULL,')
    w('  data_entrada TEXT NOT NULL')
    w(');')
    w('CREATE TABLE tickets (')
    w('  id INTEGER PRIMARY KEY,')
    w('  cliente_id INTEGER NOT NULL REFERENCES clientes (id),')
    w('  agente_id INTEGER REFERENCES agentes (id),')
    w('  assunto TEXT NOT NULL,')
    w("  prioridade TEXT NOT NULL CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),")
    w("  canal TEXT NOT NULL CHECK (canal IN ('email', 'chat', 'telefone', 'formulario')),")
    w("  status TEXT NOT NULL CHECK (status IN ('aberto', 'em_andamento', 'resolvido', 'fechado')),")
    w('  aberto_em TEXT NOT NULL,')
    w('  fechado_em TEXT')
    w(');')
    w('CREATE TABLE interacoes (')
    w('  id INTEGER PRIMARY KEY,')
    w('  ticket_id INTEGER NOT NULL REFERENCES tickets (id),')
    w("  autor_tipo TEXT NOT NULL CHECK (autor_tipo IN ('cliente', 'agente')),")
    w('  agente_id INTEGER REFERENCES agentes (id),')
    w('  data_hora TEXT NOT NULL,')
    w('  mensagem TEXT NOT NULL')
    w(');')
    w('CREATE TABLE pesquisas_satisfacao (')
    w('  id INTEGER PRIMARY KEY,')
    w('  ticket_id INTEGER NOT NULL UNIQUE REFERENCES tickets (id),')
    w('  nota INTEGER CHECK (nota BETWEEN 1 AND 5),')
    w('  comentario TEXT,')
    w('  respondida_em TEXT')
    w(');')
    w('')

    def insert(tabela, colunas, linhas):
        w('INSERT INTO %s (%s) VALUES' % (tabela, ', '.join(colunas)))
        for n, row in enumerate(linhas):
            w('  (' + ', '.join(q(v) for v in row) + ')' + (',' if n < len(linhas) - 1 else ';'))
        w('')

    insert('clientes', ['id', 'nome', 'email', 'plano', 'data_cadastro'], clientes)
    insert('agentes', ['id', 'nome', 'equipe', 'data_entrada'], agentes)
    insert('tickets', ['id', 'cliente_id', 'agente_id', 'assunto', 'prioridade', 'canal', 'status', 'aberto_em', 'fechado_em'], tickets)
    insert('interacoes', ['id', 'ticket_id', 'autor_tipo', 'agente_id', 'data_hora', 'mensagem'], interacoes)
    insert('pesquisas_satisfacao', ['id', 'ticket_id', 'nota', 'comentario', 'respondida_em'], pesquisas)
    return ('\n'.join(out)).encode('utf-8')


def main():
    ap = argparse.ArgumentParser()
    here = os.path.dirname(os.path.abspath(__file__))
    ap.add_argument('--out', default=os.path.normpath(os.path.join(here, '../../../hub/assets/data/atendimento.sql')))
    a = ap.parse_args()
    data = build()
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    with open(a.out, 'wb') as f:
        f.write(data)
    print('%s bytes=%d sha256=%s' % (a.out, len(data), hashlib.sha256(data).hexdigest()))


if __name__ == '__main__':
    main()
