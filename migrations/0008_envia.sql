-- Inclui a Envia entre as transportadoras com token por cliente.
-- SQLite não altera CHECK de tabela existente, então a tabela é recriada com os mesmos dados.

CREATE TABLE tokens_transportadoras_nova (
  usuario_id TEXT NOT NULL REFERENCES usuarios(id),
  transportadora TEXT NOT NULL CHECK (transportadora IN ('superfrete', 'frenet', 'melhorenvio', 'envia')),
  token_cifrado TEXT NOT NULL,
  iv TEXT NOT NULL,
  final_token TEXT NOT NULL,
  contato TEXT,
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (usuario_id, transportadora)
);

INSERT INTO tokens_transportadoras_nova SELECT * FROM tokens_transportadoras;
DROP TABLE tokens_transportadoras;
ALTER TABLE tokens_transportadoras_nova RENAME TO tokens_transportadoras;
