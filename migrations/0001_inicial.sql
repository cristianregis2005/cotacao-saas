-- Esquema inicial do SaaS (Cloudflare D1).
-- Datas em texto ISO 8601 (UTC). Códigos de login são guardados só como hash.

CREATE TABLE planos (
  id TEXT PRIMARY KEY,                 -- ex.: "basico", "pro"
  nome TEXT NOT NULL,
  preco_centavos INTEGER NOT NULL,     -- preço mensal em centavos de R$
  limite_cotacoes_mes INTEGER          -- NULL = sem limite
);

CREATE TABLE usuarios (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,          -- entra por código enviado a este e-mail
  nome TEXT,
  plano_id TEXT REFERENCES planos(id),
  is_admin INTEGER NOT NULL DEFAULT 0,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Código de uso único enviado por e-mail para entrar.
CREATE TABLE codigos_login (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  codigo_hash TEXT NOT NULL,
  tentativas INTEGER NOT NULL DEFAULT 0,
  expira_em TEXT NOT NULL,
  usado INTEGER NOT NULL DEFAULT 0,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_codigos_login_email ON codigos_login(email);

-- Sessão do navegador. O cookie guarda só o id; o id é aleatório e longo.
CREATE TABLE sessoes (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL REFERENCES usuarios(id),
  expira_em TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Assinatura cobrada pelo Asaas. Status vem do webhook do Asaas.
CREATE TABLE assinaturas (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL REFERENCES usuarios(id),
  plano_id TEXT NOT NULL REFERENCES planos(id),
  asaas_assinatura_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pendente',  -- pendente, ativa, atrasada, cancelada
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_assinaturas_usuario ON assinaturas(usuario_id);
