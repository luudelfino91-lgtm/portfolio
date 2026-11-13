#!/usr/bin/env python3
"""Gerador do banco de exemplo do SQL playground (T-307): loja online FICTICIA.

Uso: python3 -I docs/testing/fixtures/gen_loja.py [--out hub/assets/data/loja-exemplo.sql]
Saida deterministica: so usa a biblioteca padrao e um gerador pseudoaleatorio proprio (LCG),
sem `random` e sem relogio; duas execucoes geram bytes identicos (mesmo sha256).
Todos os dados sao inventados. Nomes sao combinacoes aleatorias de listas genericas; qualquer
coincidencia com pessoas reais e acidental. E-mails usam o dominio reservado example.com.
"""
import argparse, hashlib, os, sys
from datetime import date, timedelta

SEED = 20250101


class Rng:
    """LCG de 64 bits (Knuth MMIX): mesma sequencia em qualquer plataforma/versao do Python."""
    def __init__(self, seed):
        self.s = seed & 0xFFFFFFFFFFFFFFFF

    def next(self):
        self.s = (self.s * 6364136223846793005 + 1442695040888963407) & 0xFFFFFFFFFFFFFFFF
        return self.s >> 33  # 31 bits uteis

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


N_CLIENTES, N_PEDIDOS, N_ITENS = 40, 200, 500
N_SEM_PEDIDO = 2        # clientes 39 e 40 nunca compram
N_NAO_VENDIDOS = 2      # produtos 29 e 30 nunca sao vendidos

PRIMEIROS = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Fabio', 'Gisele', 'Hugo', 'Irene', 'Jorge',
             'Karen', 'Leo', 'Marta', 'Nuno', 'Olivia', 'Paulo', 'Rita', 'Sergio', 'Tania', 'Vitor']
SOBRENOMES = ['Almeida', 'Barros', 'Cardoso', 'Dias', 'Esteves', 'Farias', 'Gomes', 'Honorato', 'Lacerda',
              'Macedo', 'Nogueira', 'Oliveira', 'Pacheco', 'Queiroz', 'Ramos', 'Saldanha', 'Teixeira', 'Valente']
CIDADES = ['Vila Azul', 'Porto Claro', 'Monte Verde', 'Campo Belo', 'Rio Manso', 'Serra Alta', 'Lagoa Nova']
CATEGORIAS = ['Eletronicos', 'Livros', 'Casa e cozinha', 'Esporte', 'Papelaria', 'Brinquedos']
# (nome, categoria_id, preco, estoque); os dois ultimos nunca sao vendidos
PRODUTOS = [
    ('Fone de ouvido simples', 1, 89.90, 120), ('Carregador USB', 1, 49.90, 300), ('Teclado compacto', 1, 159.90, 80),
    ('Caixa de som portatil', 1, 249.90, 45), ('Notebook basico', 1, 2899.00, 12),
    ('Romance de aventura', 2, 39.90, 150), ('Guia de receitas', 2, 59.90, 90), ('Livro de ficcao cientifica', 2, 44.50, 110),
    ('Manual de jardinagem', 2, 69.90, 60), ('Colecao de contos', 2, 34.90, 140),
    ('Jogo de panelas', 3, 399.00, 25), ('Liquidificador', 3, 189.90, 40), ('Conjunto de facas', 3, 129.90, 55),
    ('Garrafa termica', 3, 74.90, 100), ('Tabua de corte', 3, 29.90, 200),
    ('Bola de futebol', 4, 99.90, 70), ('Corda de pular', 4, 24.90, 180), ('Tapete de yoga', 4, 119.90, 65),
    ('Halteres 5 kg (par)', 4, 149.90, 50), ('Bicicleta urbana', 4, 1499.00, 8),
    ('Caderno 200 folhas', 5, 19.90, 400), ('Caneta gel (caixa)', 5, 14.90, 500), ('Agenda 2025', 5, 54.90, 130),
    ('Mochila escolar', 5, 139.90, 75), ('Marcadores de texto', 5, 9.90, 600),
    ('Quebra-cabeca 500 pecas', 6, 64.90, 85), ('Blocos de montar', 6, 179.90, 60), ('Jogo de tabuleiro', 6, 129.90, 45),
    ('Boneco articulado', 6, 84.90, 0), ('Pista de carrinhos', 6, 219.90, 15),
]
STATUS_CHECK = ('pago', 'enviado', 'entregue', 'cancelado')


def q(v):
    """Literal SQL: NULL, numero ou texto entre aspas simples (so ASCII sem aspas nos dados; escapa por seguranca)."""
    if v is None:
        return 'NULL'
    if isinstance(v, float):
        return repr(round(v, 2))
    if isinstance(v, int):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


def build():
    r = Rng(SEED)
    d0 = date(2025, 1, 1)

    clientes = []
    for i in range(1, N_CLIENTES + 1):
        nome = '%s %s' % (r.pick(PRIMEIROS), r.pick(SOBRENOMES))
        email = None if i % 13 == 0 else 'cliente%02d@example.com' % i
        cidade = None if i % 7 == 0 else CIDADES[r.below(len(CIDADES))]   # clientes 7, 14, 21, 28, 35 sem cidade
        cad = d0 + timedelta(days=r.below(8))                     # 2025-01-01 .. 2025-01-08
        clientes.append((i, nome, email, cidade, (cad.isoformat())))
    # todos cadastrados na primeira semana de 2025; os pedidos comecam depois (2025-01-09)

    # pedidos 1..200 em ordem cronologica; clientes com pedidos: 1..38 (pesos: alguns compram bem mais)
    comprador_peso = [1 + (6 if k % 5 == 0 else 2 if k % 3 == 0 else 0) for k in range(N_CLIENTES - N_SEM_PEDIDO)]
    datas = sorted(d0 + timedelta(days=8 + r.below(346)) for _ in range(N_PEDIDOS))   # 2025-01-09 .. 2025-12-19
    pedidos = []
    for i, dp in enumerate(datas, 1):
        cli = 1 + r.weighted(comprador_peso)
        idade = (date(2025, 11, 15) - dp).days   # data de referencia fixa da 'loja'
        if idade > 30:
            st = 'cancelado' if r.below(14) == 0 else 'entregue'
        elif idade > 10:
            st = ('entregue', 'enviado', 'entregue', 'cancelado', 'enviado', 'entregue')[r.below(6)]
        else:
            st = ('pago', 'enviado', 'pago', 'cancelado', 'pago')[r.below(5)]
        entrega = None
        if st == 'entregue':
            entrega = min(dp + timedelta(days=2 + r.below(11)), date(2025, 12, 31)).isoformat()
        pedidos.append((i, cli, dp.isoformat(), entrega, st))

    # itens: exatamente N_ITENS; 1..4 itens por pedido, produtos distintos dentro do pedido
    contagem = [1 + r.below(3) for _ in range(N_PEDIDOS)]          # 1..3
    k = 0
    while sum(contagem) < N_ITENS:                                  # completa ate 500 (ate 4 por pedido)
        j = r.below(N_PEDIDOS)
        if contagem[j] < 4:
            contagem[j] += 1
    while sum(contagem) > N_ITENS:
        j = r.below(N_PEDIDOS)
        if contagem[j] > 1:
            contagem[j] -= 1
    vendaveis = len(PRODUTOS) - N_NAO_VENDIDOS
    pesos = [3 if (p % 4 == 0) else 1 for p in range(vendaveis)]   # alguns produtos vendem mais
    itens, iid = [], 1
    for ped, n in zip(pedidos, contagem):
        escolhidos = []
        while len(escolhidos) < n:
            p = 1 + r.weighted(pesos)
            if p not in escolhidos:
                escolhidos.append(p)
        for p in escolhidos:
            preco = PRODUTOS[p - 1][2]
            desc = (1.0, 1.0, 1.0, 0.9, 0.95)[r.below(5)]           # alguns itens vendidos com desconto
            itens.append((iid, ped[0], p, 1 + r.weighted([6, 3, 2, 1]), round(preco * desc, 2)))
            iid += 1
    assert len(itens) == N_ITENS

    out = []
    w = out.append
    w('-- Banco de exemplo do SQL playground do Hub: loja online FICTICIA (T-307).')
    w('-- Gerado por docs/testing/fixtures/gen_loja.py (semente %d). Nao edite a mao.' % SEED)
    w('-- Todos os dados sao inventados. Datas ISO (YYYY-MM-DD) em 2025; valores em REAL.')
    w('')
    w('CREATE TABLE clientes (')
    w('  id INTEGER PRIMARY KEY,')
    w('  nome TEXT NOT NULL,')
    w('  email TEXT,')
    w('  cidade TEXT,')
    w('  data_cadastro TEXT NOT NULL')
    w(');')
    w('CREATE TABLE categorias (')
    w('  id INTEGER PRIMARY KEY,')
    w('  nome TEXT NOT NULL UNIQUE')
    w(');')
    w('CREATE TABLE produtos (')
    w('  id INTEGER PRIMARY KEY,')
    w('  nome TEXT NOT NULL,')
    w('  categoria_id INTEGER NOT NULL REFERENCES categorias (id),')
    w('  preco REAL NOT NULL,')
    w('  estoque INTEGER NOT NULL')
    w(');')
    w('CREATE TABLE pedidos (')
    w('  id INTEGER PRIMARY KEY,')
    w('  cliente_id INTEGER NOT NULL REFERENCES clientes (id),')
    w('  data_pedido TEXT NOT NULL,')
    w('  data_entrega TEXT,')
    w("  status TEXT NOT NULL CHECK (status IN (%s))" % ', '.join(q(s) for s in STATUS_CHECK))
    w(');')
    w('CREATE TABLE itens_pedido (')
    w('  id INTEGER PRIMARY KEY,')
    w('  pedido_id INTEGER NOT NULL REFERENCES pedidos (id),')
    w('  produto_id INTEGER NOT NULL REFERENCES produtos (id),')
    w('  quantidade INTEGER NOT NULL CHECK (quantidade > 0),')
    w('  preco_unitario REAL NOT NULL,')
    w('  UNIQUE (pedido_id, produto_id)')
    w(');')
    w('')

    def insert(tabela, colunas, linhas):
        w('INSERT INTO %s (%s) VALUES' % (tabela, ', '.join(colunas)))
        for n, row in enumerate(linhas):
            w('  (' + ', '.join(q(v) for v in row) + ')' + (',' if n < len(linhas) - 1 else ';'))
        w('')

    insert('clientes', ['id', 'nome', 'email', 'cidade', 'data_cadastro'], clientes)
    insert('categorias', ['id', 'nome'], [(i, n) for i, n in enumerate(CATEGORIAS, 1)])
    insert('produtos', ['id', 'nome', 'categoria_id', 'preco', 'estoque'], [(i,) + p for i, p in enumerate(PRODUTOS, 1)])
    insert('pedidos', ['id', 'cliente_id', 'data_pedido', 'data_entrega', 'status'], pedidos)
    insert('itens_pedido', ['id', 'pedido_id', 'produto_id', 'quantidade', 'preco_unitario'], itens)
    return ('\n'.join(out)).encode('utf-8')


def main():
    ap = argparse.ArgumentParser()
    here = os.path.dirname(os.path.abspath(__file__))
    ap.add_argument('--out', default=os.path.normpath(os.path.join(here, '../../../hub/assets/data/loja-exemplo.sql')))
    a = ap.parse_args()
    data = build()
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    with open(a.out, 'wb') as f:
        f.write(data)
    print('%s bytes=%d sha256=%s' % (a.out, len(data), hashlib.sha256(data).hexdigest()))


if __name__ == '__main__':
    main()
