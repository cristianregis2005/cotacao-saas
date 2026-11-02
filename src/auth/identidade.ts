// Identidades (e-mail e CPF/CNPJ) usadas para dar a franquia gratuita uma única vez.
// Guarda só o HMAC do valor, com o segredo do sistema.

export type TipoIdentidade = "email" | "documento";

export async function hashIdentidade(segredo: string, tipo: TipoIdentidade, valor: string): Promise<string> {
  const codificador = new TextEncoder();
  const chave = await crypto.subtle.importKey(
    "raw",
    codificador.encode(segredo),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const assinatura = await crypto.subtle.sign("HMAC", chave, codificador.encode(`${tipo}:${valor}`));
  return Array.from(new Uint8Array(assinatura), (b) => b.toString(16).padStart(2, "0")).join("");
}

// Registra a identidade para a conta. Se ela já pertence a outra conta (ou a uma conta excluída),
// esta conta perde a franquia gratuita, a menos que já tenha um plano escolhido.
export async function garantirFranquiaUnica(
  db: D1Database,
  segredo: string,
  usuarioId: string,
  tipo: TipoIdentidade,
  valor: string,
): Promise<void> {
  const hash = await hashIdentidade(segredo, tipo, valor);
  const inserido = await db
    .prepare("INSERT OR IGNORE INTO identidades (tipo, hash, usuario_id) VALUES (?, ?, ?)")
    .bind(tipo, hash, usuarioId)
    .run();
  if (inserido.meta.changes > 0) return;

  const dona = await db
    .prepare("SELECT usuario_id FROM identidades WHERE tipo = ? AND hash = ?")
    .bind(tipo, hash)
    .first<{ usuario_id: string | null }>();
  if (dona?.usuario_id === usuarioId) return;

  await db
    .prepare("UPDATE usuarios SET plano_id = 'sem_franquia' WHERE id = ? AND (plano_id IS NULL OR plano_id = 'gratuito')")
    .bind(usuarioId)
    .run();
}
