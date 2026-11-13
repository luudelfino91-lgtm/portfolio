#!/usr/bin/env python3
"""Oraculo independente do banco "RH": sqlite3 do Python sobre o MESMO .sql que o Hub carrega.
Uso: python3 -I compute_rh_expected.py <rh.sql>
Saida (JSON em stdout): integridade, foreign_key_check, contagens, somas, NULLs, invariantes (hierarquia sem ciclos, gestor
admitido antes do subordinado) e 3 consultas-chave. Cada consulta traz o SQL, o resultado do sqlite3 ("rows") e o mesmo
resultado em Python puro ("py_rows"); sai com codigo 1 se divergirem (tolerancia 1e-6 em numeros).
Headcount = funcionarios com data_desligamento IS NULL; turnover = desligados / (ativos + desligados)."""
import json, sqlite3, sys
from collections import defaultdict

TABELAS = ['departamentos', 'cargos', 'funcionarios', 'salarios_historico', 'avaliacoes', 'ausencias']
SQL = {
    'headcount_turnover_por_departamento': """SELECT d.nome, SUM(f.data_desligamento IS NULL) AS ativos,
  SUM(f.data_desligamento IS NOT NULL) AS desligados,
  ROUND(100.0 * SUM(f.data_desligamento IS NOT NULL) / COUNT(*), 2) AS turnover_pct
FROM funcionarios f JOIN departamentos d ON d.id = f.departamento_id GROUP BY d.id ORDER BY d.id""",
    'media_salarial_atual_por_cargo': """SELECT c.nome, COUNT(*) AS ativos, ROUND(AVG(s.salario), 2) AS media_salario
FROM funcionarios f JOIN cargos c ON c.id = f.cargo_id
JOIN salarios_historico s ON s.funcionario_id = f.id
 AND s.data_inicio = (SELECT MAX(data_inicio) FROM salarios_historico WHERE funcionario_id = f.id)
WHERE f.data_desligamento IS NULL GROUP BY c.id ORDER BY c.id""",
    'subordinados_diretos_por_gestor': """SELECT g.id, g.nome, COUNT(*) AS subordinados_ativos
FROM funcionarios f JOIN funcionarios g ON g.id = f.gestor_id
WHERE f.data_desligamento IS NULL GROUP BY g.id ORDER BY subordinados_ativos DESC, g.id LIMIT 10""",
}


def py_queries(t):
    dep = {r[0]: r[1] for r in t['departamentos']}
    cargo = {r[0]: r[1] for r in t['cargos']}
    a, d = defaultdict(int), defaultdict(int)
    for f in t['funcionarios']:
        (a if f[7] is None else d)[f[4]] += 1
    q1 = [[dep[k], a[k], d[k], round(100.0 * d[k] / (a[k] + d[k]), 2)] for k in sorted(dep) if a[k] + d[k]]
    ultimo = {}
    for s in sorted(t['salarios_historico'], key=lambda s: (s[1], s[2])):
        ultimo[s[1]] = s[3]
    n, soma = defaultdict(int), defaultdict(float)
    for f in t['funcionarios']:
        if f[7] is None:
            n[f[3]] += 1; soma[f[3]] += ultimo[f[0]]
    q2 = [[cargo[k], n[k], round(soma[k] / n[k], 2)] for k in sorted(n)]
    nome = {f[0]: f[1] for f in t['funcionarios']}
    sub = defaultdict(int)
    for f in t['funcionarios']:
        if f[7] is None and f[5] is not None:
            sub[f[5]] += 1
    q3 = sorted(([k, nome[k], sub[k]] for k in sub), key=lambda x: (-x[2], x[0]))[:10]
    return {'headcount_turnover_por_departamento': q1, 'media_salarial_atual_por_cargo': q2, 'subordinados_diretos_por_gestor': q3}


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
    gestor = {f[0]: f[5] for f in t['funcionarios']}
    adm = {f[0]: f[6] for f in t['funcionarios']}
    ciclos = sum(1 for k in gestor if _tem_ciclo(gestor, k))
    gestor_depois = sum(1 for k, g in gestor.items() if g is not None and adm[g] > adm[k])
    out = {'sqlite_version': sqlite3.sqlite_version, 'integrity_check': one('PRAGMA integrity_check'),
           'fk_check': c.execute('PRAGMA foreign_key_check').fetchall(),
           'counts': {n: len(t[n]) for n in TABELAS},
           'sums': {'salario_historico': round(one('SELECT SUM(salario) FROM salarios_historico'), 2),
                    'dias_ausencia': one('SELECT SUM(dias) FROM ausencias'), 'soma_notas': one('SELECT SUM(nota) FROM avaliacoes')},
           'nulls': {'funcionarios_sem_gestor': one('SELECT COUNT(*) FROM funcionarios WHERE gestor_id IS NULL'),
                     'funcionarios_desligados': one('SELECT COUNT(*) FROM funcionarios WHERE data_desligamento IS NOT NULL'),
                     'avaliacoes_sem_nota': one('SELECT COUNT(*) FROM avaliacoes WHERE nota IS NULL'),
                     'avaliacoes_sem_comentario': one('SELECT COUNT(*) FROM avaliacoes WHERE comentario IS NULL')},
           'ciclos_hierarquia': ciclos, 'gestor_admitido_depois': gestor_depois, 'queries': {}}
    py = py_queries(t)
    ok = ciclos == 0 and gestor_depois == 0
    for k, s in SQL.items():
        cur = c.execute(s)
        rows = [list(r) for r in cur.fetchall()]
        m = same(rows, py[k])
        ok = ok and m
        out['queries'][k] = {'sql': s, 'columns': [d[0] for d in cur.description], 'n': len(rows), 'rows': rows, 'py_rows': py[k], 'match': m}
    json.dump(out, sys.stdout)
    sys.exit(0 if ok else 1)


def _tem_ciclo(gestor, k):
    visto = set()
    while k is not None:
        if k in visto:
            return True
        visto.add(k)
        k = gestor[k]
    return False


if __name__ == '__main__':
    main()
