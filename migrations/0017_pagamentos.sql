-- Pagamento avulso do acesso de 30 dias pelo Asaas (Pix, cartão ou boleto).
-- asaas_cliente_id: id do cliente no Asaas (criado na primeira cobrança).
-- pagamentos: uma linha por cobrança gerada. O webhook do Asaas atualiza o status.

ALTER TABLE usuarios ADD COLUMN asaas_cliente_id TEXT;

CREATE TABLE pagamentos (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL REFERENCES usuarios(id),
  asaas_cobranca_id TEXT,
  valor REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',   -- pendente | pago | erro
  link_pagamento TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  pago_em TEXT
);

CREATE INDEX idx_pagamentos_usuario ON pagamentos (usuario_id);
