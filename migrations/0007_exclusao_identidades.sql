-- Franquia gratuita por identidade: cada e-mail e cada CPF/CNPJ ganha a franquia uma única vez,
-- mesmo que a conta seja excluída. Guardamos só o HMAC do valor, nunca o e-mail ou o CPF/CNPJ em texto.

CREATE TABLE identidades (
  tipo TEXT NOT NULL CHECK (tipo IN ('email', 'documento')),
  hash TEXT NOT NULL,                       -- HMAC-SHA256 do valor, com o segredo do sistema
  usuario_id TEXT REFERENCES usuarios(id), -- NULL quando a conta dona foi excluída
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (tipo, hash)
);

ALTER TABLE usuarios ADD COLUMN excluido_em TEXT;

-- Plano para quem já usou a franquia gratuita: não cota até escolher um plano.
INSERT INTO planos (id, nome, preco_centavos, limite_cotacoes_mes) VALUES ('sem_franquia', 'Sem franquia gratuita', 0, 0);
