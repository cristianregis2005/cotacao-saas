// Acesso por prazo: conta gratuita tem 7 dias; plano pago tem 30 dias. Sem limite de cotações.

export const PLANO_PADRAO = "gratuito";
export const PLANO_SEM_FRANQUIA = "sem_franquia";
export const DIAS_GRATUITO = 7;
export const DIAS_PAGO = 30;

// Quantos dias de acesso um plano dá. Null = não dá acesso (sem franquia).
export function diasDoPlano(planoId: string): number | null {
  if (planoId === PLANO_SEM_FRANQUIA) return null;
  return planoId === PLANO_PADRAO ? DIAS_GRATUITO : DIAS_PAGO;
}

export type MotivoAcesso = "ativo" | "expirado" | "sem_franquia" | "plano_inexistente" | "administrador";

export interface SituacaoAcesso {
  permitido: boolean;
  motivo: MotivoAcesso;
  acesso_ate: string | null;
}

export async function verificarAcesso(
  db: D1Database,
  usuarioId: string,
  planoId: string | null,
  administrador = false,
): Promise<SituacaoAcesso> {
  // Administrador: acesso sem prazo nem plano, sem checar pagamento.
  if (administrador) return { permitido: true, motivo: "administrador", acesso_ate: null };

  const id = planoId ?? PLANO_PADRAO;
  if (id === PLANO_SEM_FRANQUIA) return { permitido: false, motivo: "sem_franquia", acesso_ate: null };

  // Plano que não existe no banco não pode cotar: melhor bloquear que liberar sem controle.
  const plano = await db.prepare("SELECT id FROM planos WHERE id = ?").bind(id).first();
  if (!plano) return { permitido: false, motivo: "plano_inexistente", acesso_ate: null };

  const linha = await db
    .prepare("SELECT acesso_ate, acesso_ate > datetime('now') AS ativo FROM usuarios WHERE id = ?")
    .bind(usuarioId)
    .first<{ acesso_ate: string | null; ativo: number | null }>();
  const acesso_ate = linha?.acesso_ate ?? null;
  const ativo = !!linha?.ativo;
  return { permitido: ativo, motivo: ativo ? "ativo" : "expirado", acesso_ate };
}

// Aplica um plano à conta: o prazo de acesso começa agora. Sem franquia remove o acesso.
export async function aplicarPlano(db: D1Database, usuarioId: string, planoId: string): Promise<void> {
  const dias = diasDoPlano(planoId);
  if (dias === null) {
    await db.prepare("UPDATE usuarios SET plano_id = ?, acesso_ate = NULL WHERE id = ?").bind(planoId, usuarioId).run();
  } else {
    await db
      .prepare("UPDATE usuarios SET plano_id = ?, acesso_ate = datetime('now', '+' || ? || ' days') WHERE id = ?")
      .bind(planoId, dias, usuarioId)
      .run();
  }
}

export async function registrarCotacao(db: D1Database, usuarioId: string): Promise<void> {
  await db
    .prepare("INSERT INTO cotacoes_realizadas (id, usuario_id) VALUES (?, ?)")
    .bind(crypto.randomUUID(), usuarioId)
    .run();
}
