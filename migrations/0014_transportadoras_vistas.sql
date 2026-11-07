-- Transportadoras que já apareceram nas cotações de cada plataforma.
-- A lista usada no painel do administrador é montada a partir daqui.
CREATE TABLE transportadoras_vistas (
  chave TEXT PRIMARY KEY,
  plataforma TEXT NOT NULL,
  nome TEXT NOT NULL,
  visto_em TEXT NOT NULL DEFAULT (datetime('now'))
);
