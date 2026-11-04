-- Histórico de cotações feitas por cada cliente (uma linha por consulta bem-sucedida).
-- Sem o XML da nota nem dados do destinatário: só o que é preciso para acompanhar o uso.
CREATE TABLE historico_cotacoes (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL REFERENCES usuarios(id),
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  cep_origem TEXT,
  cep_destino TEXT,
  peso REAL,
  comprimento REAL,
  largura REAL,
  altura REAL,
  valor_declarado REAL,
  opcoes INTEGER NOT NULL DEFAULT 0,      -- quantas opções de frete voltaram
  menor_preco REAL,                       -- menor preço entre as opções
  avisos INTEGER NOT NULL DEFAULT 0,      -- quantas transportadoras não responderam
  com_nota INTEGER NOT NULL DEFAULT 0     -- 1 se a cotação veio com a nota fiscal
);
CREATE INDEX idx_historico_usuario_data ON historico_cotacoes(usuario_id, criado_em);
