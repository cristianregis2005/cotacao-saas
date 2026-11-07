-- Auditoria passa a aceitar ações sem cliente afetado (ex.: ligar transportadora, criar plano).
-- usuario_id vira opcional; as ligações e desligamentos já gravados ficam sem cliente.
CREATE TABLE auditoria_nova (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL REFERENCES usuarios(id),
  usuario_id TEXT REFERENCES usuarios(id),
  acao TEXT NOT NULL,
  detalhe TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO auditoria_nova (id, admin_id, usuario_id, acao, detalhe, criado_em)
  SELECT id, admin_id, usuario_id, acao, detalhe, criado_em FROM auditoria;

UPDATE auditoria_nova SET usuario_id = NULL WHERE acao LIKE 'transportadora_%';

DROP TABLE auditoria;
ALTER TABLE auditoria_nova RENAME TO auditoria;
CREATE INDEX idx_auditoria_usuario ON auditoria(usuario_id);
CREATE INDEX idx_auditoria_data ON auditoria(criado_em);
