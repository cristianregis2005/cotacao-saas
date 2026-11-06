-- Etiquetas compradas na Envia: aceita a transportadora 'envia' e guarda a transportadora da Envia
-- (necessária para cancelar) e o link da etiqueta. SQLite não altera CHECK existente, então a tabela é recriada.

CREATE TABLE pedidos_carrinho_nova (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL REFERENCES usuarios(id),
  transportadora TEXT NOT NULL CHECK (transportadora IN ('superfrete', 'frenet', 'melhorenvio', 'envia')),
  chave_nfe TEXT NOT NULL,
  codigo_externo TEXT,
  status TEXT,
  preco REAL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  transportadora_envia TEXT,
  etiqueta_url TEXT,
  UNIQUE (usuario_id, transportadora, chave_nfe)
);

INSERT INTO pedidos_carrinho_nova (id, usuario_id, transportadora, chave_nfe, codigo_externo, status, preco, criado_em)
  SELECT id, usuario_id, transportadora, chave_nfe, codigo_externo, status, preco, criado_em FROM pedidos_carrinho;
DROP TABLE pedidos_carrinho;
ALTER TABLE pedidos_carrinho_nova RENAME TO pedidos_carrinho;
