-- Limites de uso por plano. Cada cotação feita fica registrada para contar o uso do mês.

CREATE TABLE cotacoes_realizadas (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL REFERENCES usuarios(id),
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_cotacoes_usuario_data ON cotacoes_realizadas(usuario_id, criado_em);

-- Plano inicial. Limite de 20 cotações por mês; ajuste depois com UPDATE em planos.
INSERT INTO planos (id, nome, preco_centavos, limite_cotacoes_mes) VALUES ('gratuito', 'Gratuito', 0, 20);
