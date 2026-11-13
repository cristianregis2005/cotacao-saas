-- Simulador público do site: leads com consentimento, cache de 24 h e limite por hora (hash do IP).

CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  cep_destino TEXT NOT NULL,
  valor_pago_hoje REAL,
  menor_preco REAL,
  consentimento_em TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE simulacoes_publicas_cache (
  chave TEXT PRIMARY KEY,
  resultado TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE simulacoes_publicas_limite (
  chave TEXT NOT NULL,
  janela TEXT NOT NULL,
  contador INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (chave, janela)
);
