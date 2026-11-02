-- Histórico das ações do administrador sobre as contas dos clientes.
-- Nunca guarda o valor de nenhum token, só o tipo de ação.

CREATE TABLE auditoria (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL REFERENCES usuarios(id),
  usuario_id TEXT NOT NULL REFERENCES usuarios(id),
  acao TEXT NOT NULL,
  detalhe TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_auditoria_usuario ON auditoria(usuario_id);
