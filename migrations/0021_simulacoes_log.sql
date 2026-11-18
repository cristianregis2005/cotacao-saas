CREATE TABLE IF NOT EXISTS simulacoes_publicas_log (
  id TEXT PRIMARY KEY,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  ip TEXT NOT NULL,
  cidade TEXT,
  uf TEXT,
  cep_destino TEXT,
  menor_preco REAL
);
CREATE INDEX IF NOT EXISTS idx_simulacoes_log_criado ON simulacoes_publicas_log(criado_em);
