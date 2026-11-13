#!/usr/bin/env python3
"""Oraculo das consultas-chave do banco "Vendas" (loja-exemplo.sql), no mesmo formato dos demais cenarios
(complementa compute_loja_expected.py, que cobre contagens/colunas/FKs e nao foi alterado).
Uso: python3 -I compute_loja_keyq_expected.py <loja-exemplo.sql>
Saida (JSON em stdout): integridade, foreign_key_check, contagens, somas e 3 consultas-chave, cada uma com o SQL, o resultado do
sqlite3 ("rows") e o mesmo resultado em Python puro ("py_rows"); sai com codigo 1 se divergirem.
Faturamento = soma de quantidade * preco_unitario dos itens de pedidos com status <> 'cancelado'."""
import json, sqlite3, sys
from collections import defaultdict
from math import floor

TABELAS = ['clientes', 'categorias', 'produtos', 'pedidos', 'itens_pedido']
SQL = {
    'faturamento_por_categoria': """SELECT c.nome, SUM(i.quantidade) AS unidades, ROUND(SUM(i.quantidade * i.preco_unitario), 2) AS faturamento
FROM itens_pedido i JOIN pedidos p ON p.id = i.pedido_id JOIN produtos pr ON pr.id = i.produto_id
JOIN categorias c ON c.id = pr.categoria_id WHERE p.status <> 'cancelado' GROUP BY c.id ORDER BY c.id""",
    'pedidos_por_status': """SELECT status, COUNT(*) AS pedidos, SUM(data_entrega IS NULL) AS sem_entrega
FROM pedidos GROUP BY status ORDER BY status""",
    'top5_clientes': """SELECT cl.id, cl.nome, COUNT(DISTINCT p.id) AS pedidos, ROUND(SUM(i.quantidade * i.preco_unitario), 2) AS gasto
FROM clientes cl JOIN pedidos p ON p.cliente_id = cl.id JOIN itens_pedido i ON i.pedido_id = p.id
WHERE p.status <> 'cancelado' GROUP BY cl.id ORDER BY gasto DESC, cl.id LIMIT 5""",
}


def rnd(x, n):
    return floor(x * 10 ** n + 0.5 + 1e-9) / 10 ** n


def py_queries(t):
    cat = {r[0]: r[1] for r in t['categorias']}
    prod_cat = {r[0]: r[2] for r in t['produtos']}
    ped = {r[0]: r for r in t['pedidos']}
    un, fat = defaultdict(int), defaultdict(float)
    gasto, peds = defaultdict(float), defaultdict(set)
    for (_, pid, prid, qt, pu) in t['itens_pedido']:
        if ped[pid][4] != 'cancelado':
            un[prod_cat[prid]] += qt; fat[prod_cat[prid]] += qt * pu
            gasto[ped[pid][1]] += qt * pu; peds[ped[pid][1]].add(pid)
    q1 = [[cat[k], un[k], rnd(fat[k], 2)] for k in sorted(cat)]
    n, sem = defaultdict(int), defaultdict(int)
    for p in t['pedidos']:
        n[p[4]] += 1; sem[p[4]] += p[3] is None
    q2 = [[s, n[s], sem[s]] for s in sorted(n)]
    nome = {r[0]: r[1] for r in t['clientes']}
    q3 = sorted(([k, nome[k], len(peds[k]), rnd(gasto[k], 2)] for k in gasto), key=lambda x: (-rnd(gasto[x[0]], 2), x[0]))[:5]
    return {'faturamento_por_categoria': q1, 'pedidos_por_status': q2, 'top5_clientes': q3}


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
    out = {'sqlite_version': sqlite3.sqlite_version, 'integrity_check': one('PRAGMA integrity_check'),
           'fk_check': c.execute('PRAGMA foreign_key_check').fetchall(), 'counts': {n: len(t[n]) for n in TABELAS},
           'sums': {'quantidade': one('SELECT SUM(quantidade) FROM itens_pedido'), 'bruto': round(one('SELECT SUM(quantidade * preco_unitario) FROM itens_pedido'), 2),
                    'estoque': one('SELECT SUM(estoque) FROM produtos')},
           'queries': {}}
    py = py_queries(t)
    ok = True
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
