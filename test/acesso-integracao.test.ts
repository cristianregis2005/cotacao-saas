import { createRequire } from "node:module";
import type { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { aplicarPlano, verificarAcesso } from "../src/planos";
import { garantirFranquiaUnica } from "../src/auth/identidade";

// node:sqlite é carregado pelo require do Node: o Vitest 2 não reconhece o módulo nativo ao transformar o arquivo.
const { DatabaseSync: DatabaseSyncClasse } = createRequire(import.meta.url)("node:sqlite") as {
  DatabaseSync: new (caminho: string) => DatabaseSync;
};

// Banco de verdade (SQLite em memória), com as mesmas consultas do D1.
// Aplica as migrações até a 0007; a 0016 entra junto, a menos que o teste peça o banco antigo.
function novoBanco(comMigracao0016 = true) {
  const db = new DatabaseSyncClasse(":memory:");
  const sqlDe = (n: string) => readFileSync(new URL(`../migrations/${n}`, import.meta.url), "utf-8");
  db.exec(sqlDe("0001_inicial.sql"));
  db.exec(sqlDe("0002_limites.sql"));
  db.exec(sqlDe("0007_exclusao_identidades.sql"));
  if (comMigracao0016) db.exec(sqlDe("0016_acesso_por_prazo.sql"));
  return db;
}

function d1(db: DatabaseSync): D1Database {
  return {
    prepare(sql: string) {
      const st = db.prepare(sql);
      let valores: unknown[] = [];
      const consulta = {
        bind(...v: unknown[]) {
          valores = v;
          return consulta;
        },
        async first() {
          return (st.get(...(valores as never[])) as unknown) ?? null;
        },
        async all() {
          return { results: st.all(...(valores as never[])) };
        },
        async run() {
          const r = st.run(...(valores as never[]));
          return { meta: { changes: Number(r.changes) } };
        },
      };
      return consulta;
    },
  } as unknown as D1Database;
}

function horasAteAcesso(db: DatabaseSync, id: string): number | null {
  const r = db.prepare("SELECT (julianday(acesso_ate) - julianday('now')) * 24 AS h FROM usuarios WHERE id = ?").get(id) as
    | { h: number | null }
    | undefined;
  return r?.h ?? null;
}

describe("migração 0016", () => {
  it("dá 7 dias a gratuitos, 30 a pagos, nenhum a sem franquia, e tira o limite mensal", () => {
    const db = novoBanco(false);
    db.exec("INSERT INTO planos (id, nome, preco_centavos, limite_cotacoes_mes) VALUES ('pro', 'Pro', 4990, 200)");
    db.exec(
      "INSERT INTO usuarios (id, email, plano_id) VALUES ('g', 'g@x', 'gratuito'), ('n', 'n@x', NULL), ('p', 'p@x', 'pro'), ('s', 's@x', 'sem_franquia')",
    );
    db.exec(readFileSync(new URL("../migrations/0016_acesso_por_prazo.sql", import.meta.url), "utf-8"));

    expect(Math.round(horasAteAcesso(db, "g")!)).toBe(7 * 24);
    expect(Math.round(horasAteAcesso(db, "n")!)).toBe(7 * 24);
    expect(Math.round(horasAteAcesso(db, "p")!)).toBe(30 * 24);
    expect(horasAteAcesso(db, "s")).toBe(null);
    const limites = db.prepare("SELECT DISTINCT limite_cotacoes_mes AS l FROM planos").all().map((r) => r.l);
    expect(limites).toEqual([null]);
  });
});

describe("verificarAcesso com banco real", () => {
  it("libera enquanto o prazo não acabou e bloqueia depois", async () => {
    const db = novoBanco();
    db.exec("INSERT INTO usuarios (id, email, plano_id, acesso_ate) VALUES ('a', 'a@x', 'gratuito', datetime('now', '+1 day'))");
    db.exec("INSERT INTO usuarios (id, email, plano_id, acesso_ate) VALUES ('b', 'b@x', 'gratuito', datetime('now', '-1 minute'))");
    db.exec("INSERT INTO usuarios (id, email, plano_id, acesso_ate) VALUES ('c', 'c@x', 'gratuito', NULL)");
    expect((await verificarAcesso(d1(db), "a", "gratuito")).permitido).toBe(true);
    expect((await verificarAcesso(d1(db), "b", "gratuito")).motivo).toBe("expirado");
    expect((await verificarAcesso(d1(db), "c", "gratuito")).permitido).toBe(false);
  });

  it("bloqueia sem franquia e plano inexistente", async () => {
    const db = novoBanco();
    db.exec("INSERT INTO usuarios (id, email, plano_id, acesso_ate) VALUES ('s', 's@x', 'sem_franquia', datetime('now', '+1 day'))");
    expect((await verificarAcesso(d1(db), "s", "sem_franquia")).motivo).toBe("sem_franquia");
    expect((await verificarAcesso(d1(db), "s", "fantasma")).motivo).toBe("plano_inexistente");
  });
});

describe("troca de plano e renovação", () => {
  it("gratuito dá 7 dias, pago 30, sem franquia tira o acesso, e nova troca renova o prazo", async () => {
    const db = novoBanco();
    db.exec("INSERT INTO planos (id, nome, preco_centavos, limite_cotacoes_mes) VALUES ('pro', 'Pro', 4990, NULL)");
    db.exec("INSERT INTO usuarios (id, email) VALUES ('u', 'u@x')");
    const banco = d1(db);

    await aplicarPlano(banco, "u", "gratuito");
    expect(Math.round(horasAteAcesso(db, "u")!)).toBe(7 * 24);

    await aplicarPlano(banco, "u", "pro");
    expect(Math.round(horasAteAcesso(db, "u")!)).toBe(30 * 24);

    await aplicarPlano(banco, "u", "sem_franquia");
    expect(horasAteAcesso(db, "u")).toBe(null);
  });
});

describe("franquia única por e-mail e CPF/CNPJ", () => {
  it("o mesmo CPF/CNPJ não dá 7 dias a outra conta, nem depois da exclusão da primeira", async () => {
    const db = novoBanco();
    db.exec("INSERT INTO usuarios (id, email, plano_id, acesso_ate) VALUES ('a', 'a@x', 'gratuito', datetime('now', '+7 days'))");
    db.exec("INSERT INTO usuarios (id, email, plano_id, acesso_ate) VALUES ('b', 'b@x', NULL, datetime('now', '+7 days'))");
    db.exec("INSERT INTO usuarios (id, email, plano_id, acesso_ate) VALUES ('c', 'c@x', NULL, datetime('now', '+7 days'))");
    const banco = d1(db);
    const segredo = "segredo-de-teste";

    await garantirFranquiaUnica(banco, segredo, "a", "documento", "12345678909");
    await garantirFranquiaUnica(banco, segredo, "b", "documento", "12345678909");
    expect((db.prepare("SELECT plano_id FROM usuarios WHERE id = 'a'").get() as { plano_id: string }).plano_id).toBe("gratuito");
    expect((db.prepare("SELECT plano_id FROM usuarios WHERE id = 'b'").get() as { plano_id: string }).plano_id).toBe("sem_franquia");

    // Exclusão da conta "a": a identidade continua registrada, sem dono.
    db.exec("UPDATE identidades SET usuario_id = NULL WHERE usuario_id = 'a'");
    await garantirFranquiaUnica(banco, segredo, "c", "documento", "12345678909");
    expect((db.prepare("SELECT plano_id FROM usuarios WHERE id = 'c'").get() as { plano_id: string }).plano_id).toBe("sem_franquia");
  });

  it("o mesmo e-mail não ganha 7 dias de novo depois da exclusão da conta", async () => {
    const db = novoBanco();
    db.exec("INSERT INTO usuarios (id, email, plano_id, acesso_ate) VALUES ('a', 'a@x', 'gratuito', datetime('now', '+7 days'))");
    const banco = d1(db);
    const segredo = "segredo-de-teste";

    await garantirFranquiaUnica(banco, segredo, "a", "email", "a@x");

    // Mesmo efeito da exclusão em src/contas/rotas.ts: e-mail trocado, identidade sem dono, plano sem_franquia.
    db.exec("UPDATE identidades SET usuario_id = NULL WHERE usuario_id = 'a'");
    db.exec(
      "UPDATE usuarios SET email = 'excluida-a@removido.invalid', plano_id = 'sem_franquia', excluido_em = datetime('now') WHERE id = 'a'",
    );

    db.exec("INSERT INTO usuarios (id, email, plano_id, acesso_ate) VALUES ('b', 'a@x', NULL, datetime('now', '+7 days'))");
    await garantirFranquiaUnica(banco, segredo, "b", "email", "a@x");
    expect((db.prepare("SELECT plano_id FROM usuarios WHERE id = 'b'").get() as { plano_id: string }).plano_id).toBe("sem_franquia");
  });
});
