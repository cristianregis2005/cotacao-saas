import { describe, expect, it } from "vitest";
import app from "../src/index";

// Banco "vazio": nenhuma sessão existe. Serve para testar as rotas sem a Cloudflare.
const dbVazio = {
  prepare: () => ({
    bind: () => ({
      first: async () => null,
      run: async () => ({}),
    }),
  }),
} as unknown as D1Database;

const corpoValido = JSON.stringify({
  cepOrigem: "01153-000",
  cepDestino: "20020-050",
  peso: 3,
  comprimento: 12,
  largura: 50,
  altura: 99,
});

describe("POST /api/cotacoes/superfrete", () => {
  it("sem login responde 401 e não consulta a transportadora", async () => {
    const resp = await app.request(
      "/api/cotacoes/superfrete",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: corpoValido },
      { DB: dbVazio } as never,
    );
    expect(resp.status).toBe(401);
  });

  it("com sessão inválida também responde 401", async () => {
    const resp = await app.request(
      "/api/cotacoes/superfrete",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: "sessao=token-invalido" },
        body: corpoValido,
      },
      { DB: dbVazio } as never,
    );
    expect(resp.status).toBe(401);
  });
});
