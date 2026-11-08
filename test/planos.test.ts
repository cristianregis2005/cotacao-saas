import { describe, expect, it } from "vitest";
import { diasDoPlano, verificarAcesso } from "../src/planos";

// Banco de mentira: responde se o plano existe e a situação de acesso do usuário.
function dbFalso(opcoes: { planoExiste?: boolean; acesso_ate?: string | null; ativo?: number | null }) {
  return {
    prepare: (sql: string) => ({
      bind: () => ({
        first: async () => {
          if (sql.includes("FROM planos")) return opcoes.planoExiste === false ? null : { id: "x" };
          return { acesso_ate: opcoes.acesso_ate ?? null, ativo: opcoes.ativo ?? 0 };
        },
      }),
    }),
  } as unknown as D1Database;
}

describe("diasDoPlano", () => {
  it("gratuito dá 7 dias; pago dá 30; sem franquia não dá acesso", () => {
    expect(diasDoPlano("gratuito")).toBe(7);
    expect(diasDoPlano("pro")).toBe(30);
    expect(diasDoPlano("sem_franquia")).toBe(null);
  });
});

describe("verificarAcesso", () => {
  it("permite enquanto o prazo não acabou", async () => {
    const r = await verificarAcesso(dbFalso({ acesso_ate: "2099-01-01 00:00:00", ativo: 1 }), "u1", "gratuito");
    expect(r).toEqual({ permitido: true, motivo: "ativo", acesso_ate: "2099-01-01 00:00:00" });
  });

  it("bloqueia depois do prazo", async () => {
    const r = await verificarAcesso(dbFalso({ acesso_ate: "2000-01-01 00:00:00", ativo: 0 }), "u1", "gratuito");
    expect(r.permitido).toBe(false);
    expect(r.motivo).toBe("expirado");
  });

  it("bloqueia conta sem data de acesso", async () => {
    const r = await verificarAcesso(dbFalso({ acesso_ate: null, ativo: null }), "u1", null);
    expect(r.permitido).toBe(false);
  });

  it("bloqueia a franquia já usada (sem_franquia), mesmo com data futura", async () => {
    const r = await verificarAcesso(dbFalso({ acesso_ate: "2099-01-01 00:00:00", ativo: 1 }), "u1", "sem_franquia");
    expect(r).toEqual({ permitido: false, motivo: "sem_franquia", acesso_ate: null });
  });

  it("bloqueia plano que não existe no banco", async () => {
    const r = await verificarAcesso(dbFalso({ planoExiste: false, ativo: 1 }), "u1", "fantasma");
    expect(r.motivo).toBe("plano_inexistente");
  });
});
