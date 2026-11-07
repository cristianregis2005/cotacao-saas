-- Agência de coleta escolhida pelo cliente em Meus dados, uma por transportadora da Envia.
CREATE TABLE agencias_envia (
  usuario_id TEXT NOT NULL REFERENCES usuarios(id),
  transportadora TEXT NOT NULL,
  branch_code TEXT NOT NULL,
  descricao TEXT,
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (usuario_id, transportadora)
);
