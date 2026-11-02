// Guarda, lê e remove os tokens de cada cliente nas transportadoras.
import { cifrar, decifrar, importarChave } from "../cripto";

export const TRANSPORTADORAS = ["superfrete", "frenet", "melhorenvio", "envia"] as const;
export type Transportadora = (typeof TRANSPORTADORAS)[number];

export const NOMES: Record<Transportadora, string> = {
  superfrete: "SuperFrete",
  frenet: "Frenet",
  melhorenvio: "Melhor Envio",
  envia: "Envia",
};

export function ehTransportadora(valor: string): valor is Transportadora {
  return (TRANSPORTADORAS as readonly string[]).includes(valor);
}

export interface TokenSalvo {
  transportadora: Transportadora;
  final_token: string;
  contato: string | null;
  atualizado_em: string;
}

export interface CredencialDescriptografada {
  token: string;
  contato: string | null;
}

export async function listarTokens(db: D1Database, usuarioId: string): Promise<TokenSalvo[]> {
  const { results } = await db
    .prepare("SELECT transportadora, final_token, contato, atualizado_em FROM tokens_transportadoras WHERE usuario_id = ?")
    .bind(usuarioId)
    .all<TokenSalvo>();
  return results;
}

export async function salvarToken(
  db: D1Database,
  chaveBase64: string,
  usuarioId: string,
  transportadora: Transportadora,
  token: string,
  contato: string | null,
): Promise<void> {
  const chave = await importarChave(chaveBase64);
  const { cifrado, iv } = await cifrar(token, chave);
  await db
    .prepare(
      "INSERT INTO tokens_transportadoras (usuario_id, transportadora, token_cifrado, iv, final_token, contato, atualizado_em) " +
        "VALUES (?, ?, ?, ?, ?, ?, datetime('now')) " +
        "ON CONFLICT(usuario_id, transportadora) DO UPDATE SET " +
        "token_cifrado = excluded.token_cifrado, iv = excluded.iv, final_token = excluded.final_token, " +
        "contato = excluded.contato, atualizado_em = excluded.atualizado_em",
    )
    .bind(usuarioId, transportadora, cifrado, iv, token.slice(-4), contato)
    .run();
}

export async function removerToken(db: D1Database, usuarioId: string, transportadora: Transportadora): Promise<void> {
  await db
    .prepare("DELETE FROM tokens_transportadoras WHERE usuario_id = ? AND transportadora = ?")
    .bind(usuarioId, transportadora)
    .run();
}

// Devolve as credenciais já descriptografadas, só para as transportadoras configuradas.
export async function lerCredenciais(
  db: D1Database,
  chaveBase64: string,
  usuarioId: string,
): Promise<Partial<Record<Transportadora, CredencialDescriptografada>>> {
  const linhas = await db
    .prepare("SELECT transportadora, token_cifrado, iv, contato FROM tokens_transportadoras WHERE usuario_id = ?")
    .bind(usuarioId)
    .all<{ transportadora: string; token_cifrado: string; iv: string; contato: string | null }>();

  const chave = await importarChave(chaveBase64);
  const credenciais: Partial<Record<Transportadora, CredencialDescriptografada>> = {};
  for (const l of linhas.results) {
    if (!ehTransportadora(l.transportadora)) continue;
    credenciais[l.transportadora] = {
      token: await decifrar(l.token_cifrado, l.iv, chave),
      contato: l.contato,
    };
  }
  return credenciais;
}
