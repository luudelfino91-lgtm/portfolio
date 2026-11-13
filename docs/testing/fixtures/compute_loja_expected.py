#!/usr/bin/env python3
"""Oraculo independente do banco de exemplo (T-307): usa so o modulo sqlite3 do Python sobre o MESMO .sql
que o Hub carrega; nao importa nada do Hub.
Uso: python3 -I compute_loja_expected.py <loja-exemplo.sql> [consultas.json]
  consultas.json: {"id": "SELECT ...", ...} (o teste extrai as consultas da pagina; o resultado e calculado aqui).
Saida (JSON em stdout): contagens por tabela, colunas (PRAGMA table_info), FKs declaradas, foreign_key_check,
  clientes sem pedidos, produtos nunca vendidos, e para cada consulta: linhas completas e numero de linhas."""
import json, sqlite3, sys

def main():
    sql = open(sys.argv[1], encoding='utf-8').read()
    qs = json.load(open(sys.argv[2], encoding='utf-8')) if len(sys.argv) > 2 else {}
    c = sqlite3.connect(':memory:')
    c.execute('PRAGMA foreign_keys = ON')
    c.executescript(sql)
    tabelas = ['clientes', 'categorias', 'produtos', 'pedidos', 'itens_pedido']
    out = {'sqlite_version': sqlite3.sqlite_version, 'counts': {}, 'columns': {}, 'fks': {}, 'nulls': {}}
    for t in tabelas:
        out['counts'][t] = c.execute('SELECT COUNT(*) FROM %s' % t).fetchone()[0]
        out['columns'][t] = [[r[1], r[2], r[5]] for r in c.execute('PRAGMA table_info(%s)' % t)]
        out['fks'][t] = sorted([r[3], r[2] + '.' + r[4]] for r in c.execute('PRAGMA foreign_key_list(%s)' % t))
    out['fk_check'] = c.execute('PRAGMA foreign_key_check').fetchall()
    out['nulls'] = {
        'clientes_sem_cidade': c.execute('SELECT COUNT(*) FROM clientes WHERE cidade IS NULL').fetchone()[0],
        'clientes_sem_email': c.execute('SELECT COUNT(*) FROM clientes WHERE email IS NULL').fetchone()[0],
        'pedidos_sem_entrega': c.execute('SELECT COUNT(*) FROM pedidos WHERE data_entrega IS NULL').fetchone()[0]}
    out['status'] = sorted(r[0] for r in c.execute('SELECT DISTINCT status FROM pedidos'))
    out['datas_fora_de_2025'] = c.execute("SELECT COUNT(*) FROM pedidos WHERE data_pedido NOT LIKE '2025-%' OR data_entrega NOT LIKE '2025-%'").fetchone()[0]
    out['clientes_sem_pedidos'] = [r[0] for r in c.execute('SELECT id FROM clientes WHERE id NOT IN (SELECT cliente_id FROM pedidos) ORDER BY id')]
    out['produtos_nunca_vendidos'] = [r[0] for r in c.execute('SELECT id FROM produtos WHERE id NOT IN (SELECT produto_id FROM itens_pedido) ORDER BY id')]
    out['queries'] = {}
    for k, q in qs.items():
        rows = [['NULL' if v is None else v for v in r] for r in c.execute(q).fetchall()]
        out['queries'][k] = {'n': len(rows), 'rows': rows}
    json.dump(out, sys.stdout)

if __name__ == '__main__':
    main()
