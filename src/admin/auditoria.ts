// Registra quem (administrador) fez o quê, em qual conta. Nunca grava valor de token.
export async function registrarAuditoria(
  db: D1Database,
  adminId: string,
  usuarioId: string,
  acao: string,
  detalhe: string | null,
): Promise<void> {
  await db
    .prepare("INSERT INTO auditoria (id, admin_id, usuario_id, acao, detalhe) VALUES (?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), adminId, usuarioId, acao, detalhe)
    .run();
}
