// Controle de uso por plano: quantas cotações o usuário já fez neste mês e se ainda pode cotar.

export const PLANO_PADRAO = "gratuito";

export interface SituacaoLimite {
  permitido: boolean;
  usadas: number;
  limite: number | null; // null = ilimitado
}

export async function verificarLimite(
  db: D1Database,
  usuarioId: string,
  planoId: string | null,
): Promise<SituacaoLimite> {
  const plano = await db
    .prepare("SELECT limite_cotacoes_mes FROM planos WHERE id = ?")
    .bind(planoId ?? PLANO_PADRAO)
    .first<{ limite_cotacoes_mes: number | null }>();

  // Plano que não existe no banco não pode cotar: melhor bloquear que liberar sem controle.
  const limite = plano ? plano.limite_cotacoes_mes : 0;

  const contagem = await db
    .prepare("SELECT COUNT(*) AS n FROM cotacoes_realizadas WHERE usuario_id = ? AND criado_em >= datetime('now', 'start of month')")
    .bind(usuarioId)
    .first<{ n: number }>();
  const usadas = contagem?.n ?? 0;

  return { permitido: limite === null || usadas < limite, usadas, limite };
}

export async function registrarCotacao(db: D1Database, usuarioId: string): Promise<void> {
  await db
    .prepare("INSERT INTO cotacoes_realizadas (id, usuario_id) VALUES (?, ?)")
    .bind(crypto.randomUUID(), usuarioId)
    .run();
}
