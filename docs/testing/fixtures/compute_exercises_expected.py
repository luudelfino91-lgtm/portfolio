#!/usr/bin/env python3
"""Oraculo independente dos 5 exercicios guiados do SQL playground (T-307).
Le o MESMO hub/assets/data/loja-exemplo.sql com o modulo sqlite3 do Python, mas calcula cada resposta em Python
puro (lacos e dicionarios sobre as linhas das tabelas), SEM reutilizar a consulta de referencia do Hub.
Nao importa nada do Hub.
Uso: python3 -I compute_exercises_expected.py <loja-exemplo.sql>
Saida (JSON em stdout): {"<id>": {"columns": [...], "ordered": bool, "rows": [[...], ...]}}
  ordered = true: a ordem das linhas faz parte da resposta (o enunciado pede ORDER BY, com desempate total).
  Valores: numero (int/float) ou texto; NULL aparece como null."""
import json, sqlite3, sys


def main():
    sql = open(sys.argv[1], encoding='utf-8').read()
    c = sqlite3.connect(':memory:')
    c.executescript(sql)
    rows = lambda t: c.execute('SELECT * FROM %s' % t).fetchall()
    clientes = {r[0]: r for r in rows('clientes')}               # id, nome, email, cidade, data_cadastro
    produtos = rows('produtos')                                   # id, nome, categoria_id, preco, estoque
    pedidos = rows('pedidos')                                     # id, cliente_id, data_pedido, data_entrega, status
    out = {}

    # ex1: estoque < 20; preco desc, nome asc (ordenado)
    r = [[p[1], p[3], p[4]] for p in produtos if p[4] < 20]
    r.sort(key=lambda x: (-x[1], x[0]))
    out['filtro'] = {'columns': ['nome', 'preco', 'estoque'], 'ordered': True, 'rows': r}

    # ex2: pedidos com status 'enviado' e o nome do cliente (conjunto)
    r = [[p[0], clientes[p[1]][1], p[2]] for p in pedidos if p[4] == 'enviado']
    out['join'] = {'columns': ['pedido_id', 'cliente', 'data_pedido'], 'ordered': False, 'rows': r}

    # ex3: clientes sem nenhum pedido (conjunto)
    com_pedido = {p[1] for p in pedidos}
    r = [[k, v[1], v[3]] for k, v in clientes.items() if k not in com_pedido]
    out['leftjoin'] = {'columns': ['id', 'nome', 'cidade'], 'ordered': False, 'rows': r}

    # ex4: clientes com >= 8 pedidos nao cancelados (conjunto)
    cont = {}
    for p in pedidos:
        if p[4] != 'cancelado':
            cont[p[1]] = cont.get(p[1], 0) + 1
    r = [[k, n] for k, n in cont.items() if n >= 8]
    out['grupo'] = {'columns': ['cliente_id', 'pedidos'], 'ordered': False, 'rows': r}

    # ex5: produtos com preco acima da media da propria categoria (conjunto)
    soma, qtd = {}, {}
    for p in produtos:
        soma[p[2]] = soma.get(p[2], 0.0) + p[3]
        qtd[p[2]] = qtd.get(p[2], 0) + 1
    r = [[p[1], p[3], p[2]] for p in produtos if p[3] > soma[p[2]] / qtd[p[2]]]
    out['sub'] = {'columns': ['nome', 'preco', 'categoria_id'], 'ordered': False, 'rows': r}

    json.dump(out, sys.stdout)


if __name__ == '__main__':
    main()
