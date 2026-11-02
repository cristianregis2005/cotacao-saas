import { describe, expect, it } from "vitest";
import app from "../src/index";

const dbUsuarioComum = {
  prepare: () => ({
    bind: () => ({
      first: async () => ({ id: "u1", email: "ana@exemplo.com", nome: null, is_admin: 0, plano_id: null }),
      all: async () => ({ results: [] }),
      run: async () => ({}),
    }),
  }),
} as unknown as D1Database;

describe("tokens de um cliente, pelo administrador", () => {
  it("usuário comum não consegue listar os tokens de outro cliente", async () => {
    const resp = await app.request(
      "/api/admin/usuarios/outro-id/tokens",
      { headers: { Cookie: "sessao=qualquer" } },
      { DB: dbUsuarioComum } as never,
    );
    expect(resp.status).toBe(403);
  });

  it("usuário comum não consegue alterar tokens de outro cliente", async () => {
    const resp = await app.request(
      "/api/admin/usuarios/outro-id/tokens/frenet",
      { method: "PUT", headers: { "Content-Type": "application/json", Cookie: "sessao=qualquer" }, body: "{}" },
      { DB: dbUsuarioComum } as never,
    );
    expect(resp.status).toBe(403);
  });
});
