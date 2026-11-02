-- Tokens que cada cliente cadastra nas plataformas de frete.
-- O valor do token é guardado criptografado (AES-GCM). A chave fica no segredo CHAVE_TOKENS, fora do banco.

CREATE TABLE tokens_transportadoras (
  usuario_id TEXT NOT NULL REFERENCES usuarios(id),
  transportadora TEXT NOT NULL CHECK (transportadora IN ('superfrete', 'frenet', 'melhorenvio')),
  token_cifrado TEXT NOT NULL,   -- token criptografado, em base64
  iv TEXT NOT NULL,              -- vetor de inicialização da criptografia, em base64
  final_token TEXT NOT NULL,     -- últimos 4 caracteres, só para exibir na tela
  contato TEXT,                  -- e-mail de contato que algumas APIs exigem
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (usuario_id, transportadora)
);
