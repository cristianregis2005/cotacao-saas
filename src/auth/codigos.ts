// Funções de segurança do login: códigos de 6 dígitos, tokens de sessão e comparações.
// Nada disso guarda o valor original: só HMAC/SHA-256, então um vazamento do banco não entrega códigos nem sessões.

const enc = new TextEncoder();

export function gerarCodigo(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return n.toString().padStart(6, "0");
}

function paraHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashCodigo(segredo: string, email: string, codigo: string): Promise<string> {
  const chave = await crypto.subtle.importKey(
    "raw", enc.encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const assinatura = await crypto.subtle.sign("HMAC", chave, enc.encode(`login:${email}:${codigo}`));
  return paraHex(assinatura);
}

export function gerarToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function hashToken(token: string): Promise<string> {
  return paraHex(await crypto.subtle.digest("SHA-256", enc.encode(token)));
}

// Comparação que não para no primeiro caractere diferente.
export function iguais(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferenca = 0;
  for (let i = 0; i < a.length; i++) diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferenca === 0;
}
