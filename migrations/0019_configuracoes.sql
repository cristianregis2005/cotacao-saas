-- Configurações gerais do sistema, alteradas pelo administrador (ex.: simulador ligado ou desligado).
CREATE TABLE configuracoes (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
