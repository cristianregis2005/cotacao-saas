-- Liga e desliga a cotação de cada transportadora pelo painel do administrador.
CREATE TABLE transportadoras_ativas (
  transportadora TEXT PRIMARY KEY CHECK (transportadora IN ('superfrete', 'frenet', 'melhorenvio', 'envia')),
  ativa INTEGER NOT NULL DEFAULT 1 CHECK (ativa IN (0, 1)),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO transportadoras_ativas (transportadora, ativa) VALUES
  ('superfrete', 1), ('frenet', 1), ('melhorenvio', 1), ('envia', 1);
