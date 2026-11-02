-- Pedidos criados no carrinho das transportadoras. Serve de histórico e impede criar a mesma nota duas vezes.

CREATE TABLE pedidos_carrinho (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL REFERENCES usuarios(id),
  transportadora TEXT NOT NULL CHECK (transportadora IN ('superfrete', 'frenet', 'melhorenvio')),
  chave_nfe TEXT NOT NULL,                 -- chave de 44 números da NF-e
  codigo_externo TEXT,                     -- id do pedido/protocolo na transportadora
  status TEXT,
  preco REAL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (usuario_id, transportadora, chave_nfe)
);
