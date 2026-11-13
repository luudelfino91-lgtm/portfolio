#!/usr/bin/env python3
"""Oraculo independente do banco "Atendimento": sqlite3 do Python sobre o MESMO .sql que o Hub carrega.
Uso: python3 -I compute_atendimento_expected.py <atendimento.sql>
Saida (JSON em stdout): integridade, foreign_key_check, contagens, somas, NULLs, invariantes (fechado_em >= aberto_em; ticket
sem fechamento <=> status aberto/em_andamento) e 3 consultas-chave. Cada consulta traz o SQL, o resultado do sqlite3 ("rows")
e o mesmo resultado em Python puro ("py_rows"); sai com codigo 1 se divergirem (tolerancia 1e-6 em numeros).
TMA = tempo medio de atendimento em minutos (fechado_em - aberto_em) dos tickets fechados; backlog = fechado_em IS NULL."""
import json, sqlite3, sys
from collections import defaultdict
from datetime import datetime
from math import floor

TABELAS = ['clientes', 'agentes', 'tickets', 'interacoes', 'pesquisas_satisfacao']
SQL = {
    'tma_por_agente': """SELECT a.id, a.nome, COUNT(*) AS tickets_fechados,
  ROUND(AVG(strftime('%s', t.fechado_em) - strftime('%s', t.aberto_em)) / 60.0, 1) AS tma_minutos
FROM tickets t JOIN agentes a ON a.id = t.agente_id WHERE t.fechado_em IS NOT NULL
GROUP BY a.id ORDER BY a.id""",
    'backlog_por_prioridade': """SELECT prioridade, COUNT(*) AS em_aberto, SUM(agente_id IS NULL) AS sem_agente,
  MIN(aberto_em) AS mais_antigo
FROM tickets WHERE fechado_em IS NULL GROUP BY prioridade
ORDER BY CASE prioridade WHEN 'urgente' THEN 1 WHEN 'alta' THEN 2 WHEN 'media' THEN 3 ELSE 4 END""",
    'csat_por_agente': """SELECT a.id, a.nome, COUNT(s.nota) AS respostas, ROUND(AVG(s.nota), 2) AS nota_media,
  ROUND(100.0 * SUM(s.nota >= 4) / COUNT(s.nota), 1) AS csat_pct
FROM pesquisas_satisfacao s JOIN tickets t ON t.id = s.ticket_id JOIN agentes a ON a.id = t.agente_id
WHERE s.nota IS NOT NULL GROUP BY a.id ORDER BY a.id""",
}
ORDEM_PRI = {'urgente': 1, 'alta': 2, 'media': 3, 'baixa': 4}


def rnd(x, n):
    """Arredonda meio para cima (como o ROUND do SQLite), nao para o par mais proximo como o round() do Python."""
    return floor(x * 10 ** n + 0.5 + 1e-9) / 10 ** n


def dt(s):
    return datetime.strptime(s, '%Y-%m-%dT%H:%M:%S')


def py_queries(t):
    nome = {a[0]: a[1] for a in t['agentes']}
    secs, n = defaultdict(int), defaultdict(int)
    bl, bl_sem, bl_min = defaultdict(int), defaultdict(int), {}
    for (_, cli, ag, assunto, pri, canal, st, ab, fe) in t['tickets']:
        if fe is not None:
            n[ag] += 1; secs[ag] += int((dt(fe) - dt(ab)).total_seconds())
        else:
            bl[pri] += 1; bl_sem[pri] += ag is None
            bl_min[pri] = min(bl_min.get(pri, ab), ab)
    q1 = [[k, nome[k], n[k], rnd(secs[k] / n[k] / 60.0, 1)] for k in sorted(n)]
    q2 = [[p, bl[p], bl_sem[p], bl_min[p]] for p in sorted(bl, key=lambda p: ORDEM_PRI[p])]
    ag_t = {x[0]: x[2] for x in t['tickets']}
    cnt, soma, bons = defaultdict(int), defaultdict(int), defaultdict(int)
    for (_, tid, nota, com, resp) in t['pesquisas_satisfacao']:
        if nota is not None:
            a = ag_t[tid]
            cnt[a] += 1; soma[a] += nota; bons[a] += nota >= 4
    q3 = [[k, nome[k], cnt[k], rnd(soma[k] / cnt[k], 2), rnd(100.0 * bons[k] / cnt[k], 1)] for k in sorted(cnt)]
    return {'tma_por_agente': q1, 'backlog_por_prioridade': q2, 'csat_por_agente': q3}


def same(a, b):
    if len(a) != len(b):
        return False
    for x, y in zip(a, b):
        if len(x) != len(y):
            return False
        for u, v in zip(x, y):
            if isinstance(u, (int, float)) and isinstance(v, (int, float)):
                if abs(u - v) > 1e-6 * max(1, abs(u)):
                    return False
            elif u != v:
                return False
    return True


def main():
    c = sqlite3.connect(':memory:')
    c.execute('PRAGMA foreign_keys = ON')
    c.executescript(open(sys.argv[1], encoding='utf-8').read())
    one = lambda s: c.execute(s).fetchone()[0]
    t = {n: c.execute('SELECT * FROM %s ORDER BY id' % n).fetchall() for n in TABELAS}
    viol = 0
    for tk in t['tickets']:
        fe = tk[8]
        viol += (fe is not None and dt(fe) < dt(tk[7])) or ((fe is None) != (tk[6] in ('aberto', 'em_andamento')))
    out = {'sqlite_version': sqlite3.sqlite_version, 'integrity_check': one('PRAGMA integrity_check'),
           'fk_check': c.execute('PRAGMA foreign_key_check').fetchall(),
           'counts': {n: len(t[n]) for n in TABELAS},
           'sums': {'soma_notas': one('SELECT SUM(nota) FROM pesquisas_satisfacao'),
                    'minutos_fechados': one("SELECT SUM(strftime('%s', fechado_em) - strftime('%s', aberto_em)) / 60 FROM tickets WHERE fechado_em IS NOT NULL")},
           'nulls': {'clientes_sem_email': one('SELECT COUNT(*) FROM clientes WHERE email IS NULL'),
                     'tickets_sem_agente': one('SELECT COUNT(*) FROM tickets WHERE agente_id IS NULL'),
                     'tickets_sem_fechamento': one('SELECT COUNT(*) FROM tickets WHERE fechado_em IS NULL'),
                     'pesquisas_sem_nota': one('SELECT COUNT(*) FROM pesquisas_satisfacao WHERE nota IS NULL')},
           'invariante_violacoes': viol, 'queries': {}}
    py = py_queries(t)
    ok = viol == 0
    for k, s in SQL.items():
        cur = c.execute(s)
        rows = [list(r) for r in cur.fetchall()]
        m = same(rows, py[k])
        ok = ok and m
        out['queries'][k] = {'sql': s, 'columns': [d[0] for d in cur.description], 'n': len(rows), 'rows': rows, 'py_rows': py[k], 'match': m}
    json.dump(out, sys.stdout)
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
