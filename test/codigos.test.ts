import { describe, expect, it } from "vitest";
import { gerarCodigo, gerarToken, hashCodigo, hashToken, iguais } from "../src/auth/codigos";

describe("códigos de login", () => {
  it("gera 6 dígitos", () => {
    for (let i = 0; i < 50; i++) expect(gerarCodigo()).toMatch(/^\d{6}$/);
  });

  it("o hash depende do segredo, do e-mail e do código", async () => {
    const base = await hashCodigo("segredo", "ana@exemplo.com", "123456");
    expect(await hashCodigo("segredo", "ana@exemplo.com", "123456")).toBe(base);
    expect(await hashCodigo("outro", "ana@exemplo.com", "123456")).not.toBe(base);
    expect(await hashCodigo("segredo", "outra@exemplo.com", "123456")).not.toBe(base);
    expect(await hashCodigo("segredo", "ana@exemplo.com", "654321")).not.toBe(base);
  });
});

describe("tokens de sessão", () => {
  it("o token é longo e aleatório, e o hash não é o próprio token", async () => {
    const t1 = gerarToken();
    const t2 = gerarToken();
    expect(t1.length).toBeGreaterThanOrEqual(40);
    expect(t1).not.toBe(t2);
    expect(await hashToken(t1)).not.toBe(t1);
    expect(await hashToken(t1)).toBe(await hashToken(t1));
  });
});

describe("iguais", () => {
  it("compara strings", () => {
    expect(iguais("abc", "abc")).toBe(true);
    expect(iguais("abc", "abd")).toBe(false);
    expect(iguais("abc", "ab")).toBe(false);
  });
});
