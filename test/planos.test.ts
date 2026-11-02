import { describe, expect, it } from "vitest";
import { verificarLimite } from "../src/planos";

// Banco de mentira: responde o limite do plano e a contagem de cotações do mês.
function dbFalso(limite: number | null | undefined, usadas: number) {
  return {
    prepare: (sql: string) => ({
      bind: () => ({
        first: async () => {
          if (sql.includes("FROM planos")) return limite === undefined ? null : { limite_cotacoes_mes: limite };
          return { n: usadas };
        },
        run: async () => ({}),
      }),
    }),
  } as unknown as D1Database;
}

describe("verificarLimite", () => {
  it("permite enquanto estiver abaixo do limite", async () => {
    const r = await verificarLimite(dbFalso(20, 19), "u1", null);
    expect(r).toEqual({ permitido: true, usadas: 19, limite: 20 });
  });

  it("bloqueia ao atingir o limite", async () => {
    const r = await verificarLimite(dbFalso(20, 20), "u1", null);
    expect(r.permitido).toBe(false);
  });

  it("limite null significa ilimitado", async () => {
    const r = await verificarLimite(dbFalso(null, 9999), "u1", "pro");
    expect(r.permitido).toBe(true);
  });

  it("plano inexistente bloqueia, em vez de liberar sem controle", async () => {
    const r = await verificarLimite(dbFalso(undefined, 0), "u1", "fantasma");
    expect(r.permitido).toBe(false);
  });
});
