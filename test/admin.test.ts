import { describe, expect, it } from "vitest";
import app from "../src/index";

const dbSemSessao = {
  prepare: () => ({ bind: () => ({ first: async () => null, all: async () => ({ results: [] }), run: async () => ({}) }) }),
} as unknown as D1Database;

const dbUsuarioComum = {
  prepare: () => ({
    bind: () => ({
      first: async () => ({ id: "u1", email: "ana@exemplo.com", nome: null, is_admin: 0, plano_id: null }),
      all: async () => ({ results: [] }),
      run: async () => ({}),
    }),
  }),
} as unknown as D1Database;

describe("área do administrador", () => {
  it("sem login responde 401", async () => {
    const resp = await app.request("/api/admin/usuarios", {}, { DB: dbSemSessao } as never);
    expect(resp.status).toBe(401);
  });

  it("usuário comum responde 403", async () => {
    const resp = await app.request(
      "/api/admin/usuarios",
      { headers: { Cookie: "sessao=qualquer" } },
      { DB: dbUsuarioComum } as never,
    );
    expect(resp.status).toBe(403);
  });

  it("a página do administrador existe", async () => {
    const resp = await app.request("/admin", {}, {} as never);
    expect(resp.status).toBe(200);
    expect(await resp.text()).toContain("Administração");
  });
});
