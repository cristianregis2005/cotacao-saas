import { describe, expect, it } from "vitest";
import app from "../src/index";
import { ehTransportadora } from "../src/contas/tokens";

const dbVazio = {
  prepare: () => ({ bind: () => ({ first: async () => null, all: async () => ({ results: [] }), run: async () => ({}) }) }),
} as unknown as D1Database;

describe("tokens do cliente", () => {
  it("reconhece só as transportadoras suportadas", () => {
    expect(ehTransportadora("superfrete")).toBe(true);
    expect(ehTransportadora("frenet")).toBe(true);
    expect(ehTransportadora("melhorenvio")).toBe(true);
    expect(ehTransportadora("loggi")).toBe(false);
  });

  it("sem login, a lista de tokens responde 401", async () => {
    const resp = await app.request("/api/conta/tokens", {}, { DB: dbVazio } as never);
    expect(resp.status).toBe(401);
  });

  it("a página Minha conta existe", async () => {
    const resp = await app.request("/conta", {}, {} as never);
    expect(resp.status).toBe(200);
    expect(await resp.text()).toContain("Minha conta");
  });
});
