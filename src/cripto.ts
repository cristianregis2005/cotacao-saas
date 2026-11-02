// Criptografia dos tokens dos clientes (AES-GCM, via Web Crypto).
// A chave vem do segredo CHAVE_TOKENS: 32 bytes em base64. Sem ela, os tokens guardados não podem ser lidos.

const enc = new TextEncoder();
const dec = new TextDecoder();

function paraBase64(bytes: Uint8Array): string {
  let texto = "";
  for (const b of bytes) texto += String.fromCharCode(b);
  return btoa(texto);
}

function deBase64(texto: string) {
  const bruto = atob(texto);
  // Array sobre ArrayBuffer comum: é o tipo que a Web Crypto aceita sem reclamar.
  const bytes = new Uint8Array(new ArrayBuffer(bruto.length));
  for (let i = 0; i < bruto.length; i++) bytes[i] = bruto.charCodeAt(i);
  return bytes;
}

export async function importarChave(chaveBase64: string): Promise<CryptoKey> {
  const bytes = deBase64(chaveBase64);
  if (bytes.length !== 32) {
    throw new Error("CHAVE_TOKENS precisa ser 32 bytes em base64 (gere com: openssl rand -base64 32).");
  }
  return crypto.subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function cifrar(texto: string, chave: CryptoKey): Promise<{ cifrado: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const bytes = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, chave, enc.encode(texto));
  return { cifrado: paraBase64(new Uint8Array(bytes)), iv: paraBase64(iv) };
}

export async function decifrar(cifrado: string, iv: string, chave: CryptoKey): Promise<string> {
  const bytes = await crypto.subtle.decrypt({ name: "AES-GCM", iv: deBase64(iv) }, chave, deBase64(cifrado));
  return dec.decode(bytes);
}
