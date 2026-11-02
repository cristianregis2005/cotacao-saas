import { describe, expect, it } from "vitest";
import { hashIdentidade } from "../src/auth/identidade";

describe("hashIdentidade", () => {
  it("é estável para o mesmo valor e segredo", async () => {
    const a = await hashIdentidade("segredo", "email", "ana@exemplo.com");
    const b = await hashIdentidade("segredo", "email", "ana@exemplo.com");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("muda com o tipo, o valor e o segredo, e não expõe o valor", async () => {
    const base = await hashIdentidade("segredo", "email", "ana@exemplo.com");
    expect(await hashIdentidade("segredo", "documento", "ana@exemplo.com")).not.toBe(base);
    expect(await hashIdentidade("segredo", "email", "outra@exemplo.com")).not.toBe(base);
    expect(await hashIdentidade("outro", "email", "ana@exemplo.com")).not.toBe(base);
    expect(base).not.toContain("ana");
  });
});
