-- Acesso por prazo: conta gratuita tem 7 dias; plano pago tem 30 dias, sem limite de cotações.
-- Quem já tem conta recebe 7 dias (gratuito) ou 30 dias (pago) a partir da data desta migração.
-- Contas sem franquia (sem_franquia) continuam bloqueadas.

ALTER TABLE usuarios ADD COLUMN acesso_ate TEXT;

UPDATE usuarios SET acesso_ate = datetime('now', '+7 days')
  WHERE plano_id IS NULL OR plano_id = 'gratuito';

UPDATE usuarios SET acesso_ate = datetime('now', '+30 days')
  WHERE plano_id IS NOT NULL AND plano_id NOT IN ('gratuito', 'sem_franquia');

-- O limite mensal deixa de ser usado.
UPDATE planos SET limite_cotacoes_mes = NULL;
