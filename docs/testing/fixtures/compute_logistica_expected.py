#!/usr/bin/env python3
"""Oraculo independente do banco "Logistica": sqlite3 do Python sobre o MESMO .sql que o Hub carrega.
Uso: python3 -I compute_logistica_expected.py <logistica.sql>
Saida (JSON em stdout): integridade, foreign_key_check, contagens, somas, NULLs, invariante de atraso e 3 consultas-chave.
Cada consulta traz o SQL, o resultado do sqlite3 ("rows") e o mesmo resultado em Python puro ("py_rows"); sai com codigo 1
se divergirem (tolerancia 1e-6 em numeros)."""
import json, sqlite3, sys
from collections import defaultdict
from datetime import date

TABELAS = ['centros_distribuicao', 'transportadoras', 'veiculos', 'rotas', 'entregas', 'ocorrencias']
SQL = {
    'sla_por_transportadora': """SELECT t.nome, COUNT(*) AS entregues, SUM(e.atraso_dias = 0) AS no_prazo,
  ROUND(100.0 * SUM(e.atraso_dias = 0) / COUNT(*), 2) AS sla_pct, ROUND(AVG(e.atraso_dias), 2) AS atraso_medio_dias
FROM entregas e JOIN veiculos v ON v.id = e.veiculo_id JOIN transportadoras t ON t.id = v.transportadora_id
WHERE e.status = 'entregue' GROUP BY t.id ORDER BY t.id""",
    'custo_por_km_transportadora': """SELECT t.nome, COUNT(*) AS entregas, ROUND(SUM(e.custo), 2) AS custo_total,
  ROUND(SUM(r.distancia_km), 1) AS km_total, ROUND(SUM(e.custo) / SUM(r.distancia_km), 4) AS custo_por_km
FROM entregas e JOIN veiculos v ON v.id = e.veiculo_id JOIN transportadoras t ON t.id = v.transportadora_id
JOIN rotas r ON r.id = e.rota_id WHERE e.status <> 'cancelada' GROUP BY t.id ORDER BY t.id""",
    'atraso_por_centro': """SELECT c.nome, COUNT(*) AS entregues, SUM(e.atraso_dias > 0) AS atrasadas,
  ROUND(100.0 * SUM(e.atraso_dias > 0) / COUNT(*), 2) AS atrasadas_pct
FROM entregas e JOIN rotas r ON r.id = e.rota_id JOIN centros_distribuicao c ON c.id = r.centro_id
WHERE e.status = 'entregue' GROUP BY c.id ORDER BY c.id""",
}


def py_queries(t):
    transp = {r[0]: r[1] for r in t['transportadoras']}
    centros = {r[0]: r[1] for r in t['centros_distribuicao']}
    v_t = {r[0]: r[1] for r in t['veiculos']}
    rota = {r[0]: (r[1], r[3]) for r in t['rotas']}
    ent, prazo, soma_atr = defaultdict(int), defaultdict(int), defaultdict(int)
    n, custo, km = defaultdict(int), defaultdict(float), defaultdict(float)
    c_ent, c_atr = defaultdict(int), defaultdict(int)
    for (_, rid, vid, prev, real, st, atr, peso, cst) in t['entregas']:
        tid = v_t[vid]
        if st == 'entregue':
            ent[tid] += 1; prazo[tid] += atr == 0; soma_atr[tid] += atr
            c_ent[rota[rid][0]] += 1; c_atr[rota[rid][0]] += atr > 0
        if st != 'cancelada':
            n[tid] += 1; custo[tid] += cst; km[tid] += rota[rid][1]
    q1 = [[transp[k], ent[k], prazo[k], round(100.0 * prazo[k] / ent[k], 2), round(soma_atr[k] / ent[k], 2)] for k in sorted(ent)]
    q2 = [[transp[k], n[k], round(custo[k], 2), round(km[k], 1), round(custo[k] / km[k], 4)] for k in sorted(n)]
    q3 = [[centros[k], c_ent[k], c_atr[k], round(100.0 * c_atr[k] / c_ent[k], 2)] for k in sorted(c_ent)]
    return {'sla_por_transportadora': q1, 'custo_por_km_transportadora': q2, 'atraso_por_centro': q3}


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
    # invariante: atraso_dias = max(0, realizada - prevista) nas entregues; NULL nas demais
    bad = 0
    for e in t['entregas']:
        if e[5] == 'entregue':
            esp = max(0, (date.fromisoformat(e[4]) - date.fromisoformat(e[3])).days)
            bad += e[6] != esp
        else:
            bad += e[4] is not None or e[6] is not None
    out = {'sqlite_version': sqlite3.sqlite_version, 'integrity_check': one('PRAGMA integrity_check'),
           'fk_check': c.execute('PRAGMA foreign_key_check').fetchall(),
           'counts': {n: len(t[n]) for n in TABELAS},
           'sums': {'custo': round(one('SELECT SUM(custo) FROM entregas'), 2), 'peso_kg': round(one('SELECT SUM(peso_kg) FROM entregas'), 2),
                    'atraso_dias': one('SELECT SUM(atraso_dias) FROM entregas'), 'distancia_km': round(one('SELECT SUM(distancia_km) FROM rotas'), 2),
                    'capacidade_diaria': one('SELECT SUM(capacidade_diaria) FROM centros_distribuicao')},
           'nulls': {'entregas_sem_data_realizada': one('SELECT COUNT(*) FROM entregas WHERE data_realizada IS NULL'),
                     'ocorrencias_sem_descricao': one('SELECT COUNT(*) FROM ocorrencias WHERE descricao IS NULL')},
           'status': sorted(r[0] for r in c.execute('SELECT DISTINCT status FROM entregas')),
           'atraso_invariante_violacoes': bad, 'queries': {}}
    py = py_queries(t)
    ok = bad == 0
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
