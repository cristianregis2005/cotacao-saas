// Confirmação de pagamento vinda do webhook do Asaas: marca a cobrança como paga e libera 30 dias, uma única vez.
import { DIAS_PAGO } from "../planos";

// Eventos do Asaas que significam que a cobrança foi paga.
export const EVENTOS_PAGO = ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"];

export type ResultadoConfirmacao = "liberado" | "ja_pago" | "desconhecido";

// Soma 30 dias ao acesso atual (ou a partir de agora, se já expirou). Conta sem franquia passa a ser gratuita,
// para que o pagamento valha mesmo quem já usou o teste.
export async function liberarAcesso(db: D1Database, usuarioId: string): Promise<void> {
  await db
    .prepare(
      `UPDATE usuarios
          SET plano_id = CASE WHEN plano_id IS NULL OR plano_id = 'sem_franquia' THEN 'gratuito' ELSE plano_id END,
              acesso_ate = datetime(
                CASE WHEN acesso_ate IS NULL OR acesso_ate < datetime('now') THEN datetime('now') ELSE acesso_ate END,
                '+' || ? || ' days')
        WHERE id = ?`,
    )
    .bind(DIAS_PAGO, usuarioId)
    .run();
}

export async function confirmarPagamento(db: D1Database, cobrancaId: string): Promise<ResultadoConfirmacao> {
  const pagamento = await db
    .prepare("SELECT id, usuario_id FROM pagamentos WHERE asaas_cobranca_id = ?")
    .bind(cobrancaId)
    .first<{ id: string; usuario_id: string }>();
  if (!pagamento) return "desconhecido";

  // Marca como pago só se ainda não estava: evita liberar duas vezes se o Asaas repetir o aviso.
  const marcado = await db
    .prepare("UPDATE pagamentos SET status = 'pago', pago_em = datetime('now') WHERE id = ? AND status <> 'pago'")
    .bind(pagamento.id)
    .run();
  if (marcado.meta.changes === 0) return "ja_pago";

  try {
    await liberarAcesso(db, pagamento.usuario_id);
  } catch (exc) {
    // Desfaz a marcação para o Asaas reenviar o aviso depois.
    await db.prepare("UPDATE pagamentos SET status = 'pendente', pago_em = NULL WHERE id = ?").bind(pagamento.id).run();
    throw exc;
  }
  return "liberado";
}
