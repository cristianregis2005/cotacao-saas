import { describe, expect, it } from "vitest";
import { cifrar, decifrar, importarChave } from "../src/cripto";

function chaveBase64() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let texto = "";
  for (const b of bytes) texto += String.fromCharCode(b);
  return btoa(texto);
}

describe("criptografia dos tokens", () => {
  it("cifra e decifra de volta para o texto original", async () => {
    const chave = await importarChave(chaveBase64());
    const { cifrado, iv } = await cifrar("token-secreto-123456", chave);
    expect(await decifrar(cifrado, iv, chave)).toBe("token-secreto-123456");
  });

  it("não guarda o token em texto claro e muda a cada cifragem", async () => {
    const chave = await importarChave(chaveBase64());
    const a = await cifrar("token-secreto-123456", chave);
    const b = await cifrar("token-secreto-123456", chave);
    expect(a.cifrado).not.toContain("token-secreto");
    expect(a.cifrado).not.toBe(b.cifrado);
  });

  it("com outra chave, não consegue decifrar", async () => {
    const chave1 = await importarChave(chaveBase64());
    const chave2 = await importarChave(chaveBase64());
    const { cifrado, iv } = await cifrar("token-secreto-123456", chave1);
    await expect(decifrar(cifrado, iv, chave2)).rejects.toThrow();
  });

  it("recusa chave com tamanho errado", async () => {
    await expect(importarChave(btoa("curta"))).rejects.toThrow(/32 bytes/);
  });
});
