import { createRequire } from "node:module";
import type { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import app from "../src/index";
import { gerarToken, hashCodigo, hashToken } from "../src/auth/codigos";
import { garantirFranquiaUnica } from "../src/auth/identidade";

// node:sqlite é carregado pelo require do Node: o Vitest 2 não reconhece o módulo nativo ao transformar o arquivo.
const { DatabaseSync: DatabaseSyncClasse } = createRequire(import.meta.url)("node:sqlite") as {
  DatabaseSync: new (caminho: string) => DatabaseSync;
};
import { salvarToken } from "../src/contas/tokens";

// Testes HTTP reais: usam as rotas de verdade (app.request) sobre um SQLite em memória
// com todas as migrações 0001 a 0016, aplicadas na ordem. Nenhuma rota é substituída.
// Dependem de: hono, instalado com "npm ci". Chamadas às transportadoras são bloqueadas (fetch falso).

const PASTA_MIGRACOES = new URL("../migrations/", import.meta.url);
const CHAVE = Buffer.alloc(32, 7).toString("base64");
const SEGREDO = "segredo-http-teste";
const CORPO_COTACAO = JSON.stringify({
  cepOrigem: "01153-000",
  cepDestino: "20020-050",
  peso: 3,
  comprimento: 12,
  largura: 50,
  altura: 99,
});

function novoBanco(): DatabaseSync {
  const db = new DatabaseSyncClasse(":memory:");
  const arquivos = readdirSync(PASTA_MIGRACOES).filter((f) => f.endsWith(".sql")).sort();
  for (const arquivo of arquivos) {
    db.exec(readFileSync(new URL(arquivo, PASTA_MIGRACOES), "utf-8"));
  }
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
    // Como o D1: executa as consultas em sequência dentro de uma transação.
    async batch(consultas: { run(): Promise<unknown> }[]) {
      db.exec("BEGIN");
      try {
        const resultados: unknown[] = [];
        for (const consulta of consultas) resultados.push(await consulta.run());
        db.exec("COMMIT");
        return resultados;
      } catch (erro) {
        db.exec("ROLLBACK");
        throw erro;
      }
    },
  } as unknown as D1Database;
}

function ambiente(db: DatabaseSync) {
  return {
    DB: d1(db),
    CHAVE_TOKENS: CHAVE,
    SEGREDO_LOGIN: SEGREDO,
    EMAIL: { send: async () => {} },
    EMAIL_REMETENTE: "teste@exemplo.invalid",
    ENVIA_AMBIENTE: "teste",
  } as never;
}

function dataSql(db: DatabaseSync, deslocamento: string): string {
  return (db.prepare("SELECT datetime('now', ?) AS d").get(deslocamento) as { d: string }).d;
}

function criarUsuario(
  db: DatabaseSync,
  id: string,
  plano: string | null,
  acessoAte: string | null,
  email = `${id}@teste.invalid`,
): void {
  // Plano que não existe no cadastro: a chave estrangeira impediria a inserção.
  // Desligamos a checagem só para simular o caso de um plano removido, que a regra de acesso deve bloquear.
  if (plano && !db.prepare("SELECT 1 FROM planos WHERE id = ?").get(plano)) {
    db.exec("PRAGMA foreign_keys = OFF");
  }
  // CPF/CNPJ salvo: sem ele a conta fica bloqueada para cotar e enviar (regra do cadastro).
  db.prepare("INSERT INTO usuarios (id, email, plano_id, acesso_ate, documento) VALUES (?, ?, ?, ?, '12345678909')").run(
    id,
    email,
    plano,
    acessoAte,
  );
}

// Cria uma sessão real no banco e devolve o cookie no formato que a rota lê.
async function cookieDeSessao(db: DatabaseSync, usuarioId: string): Promise<string> {
  const token = gerarToken();
  db.prepare("INSERT INTO sessoes (id, usuario_id, expira_em) VALUES (?, ?, ?)").run(
    await hashToken(token),
    usuarioId,
    dataSql(db, "+1 day"),
  );
  return `sessao=${token}`;
}

function semRedeExterna(): void {
  // Qualquer chamada às transportadoras falha. A cotação continua, com aviso por transportadora.
  vi.stubGlobal("fetch", async () => new Response("{}", { status: 500 }));
}

function contagemCotacoes(db: DatabaseSync, usuarioId: string): number {
  return (db.prepare("SELECT COUNT(*) AS n FROM cotacoes_realizadas WHERE usuario_id = ?").get(usuarioId) as { n: number }).n;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /api/cotacoes/todas com a regra de acesso", () => {
  it("acesso ativo: passa da checagem, registra a cotação e responde 200 com uso ativo", async () => {
    const db = novoBanco();
    criarUsuario(db, "ativo", "gratuito", dataSql(db, "+7 days"));
    await salvarToken(d1(db), CHAVE, "ativo", "superfrete", "tokenabc1234", null);
    const cookie = await cookieDeSessao(db, "ativo");
    semRedeExterna();

    const resp = await app.request(
      "/api/cotacoes/todas",
      { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie }, body: CORPO_COTACAO },
      ambiente(db),
    );
    expect(resp.status).toBe(200);
    const dados = (await resp.json()) as { uso: { ativo: boolean; motivo: string } };
    expect(dados.uso.ativo).toBe(true);
    expect(dados.uso.motivo).toBe("ativo");
    expect(contagemCotacoes(db, "ativo")).toBe(1);
  });

  it("prazo expirado: responde 403 e não registra cotação", async () => {
    const db = novoBanco();
    criarUsuario(db, "expirado", "gratuito", dataSql(db, "-1 minute"));
    await salvarToken(d1(db), CHAVE, "expirado", "superfrete", "tokenabc1234", null);
    const cookie = await cookieDeSessao(db, "expirado");
    semRedeExterna();

    const resp = await app.request(
      "/api/cotacoes/todas",
      { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie }, body: CORPO_COTACAO },
      ambiente(db),
    );
    expect(resp.status).toBe(403);
    expect(((await resp.json()) as { erro: string }).erro).toBe("Seu período de acesso terminou. Escolha um plano para continuar cotando.");
    expect(contagemCotacoes(db, "expirado")).toBe(0);
  });

  it("franquia já usada (sem_franquia): responde 403 mesmo com data futura", async () => {
    const db = novoBanco();
    criarUsuario(db, "sem", "sem_franquia", dataSql(db, "+7 days"));
    await salvarToken(d1(db), CHAVE, "sem", "superfrete", "tokenabc1234", null);
    const cookie = await cookieDeSessao(db, "sem");
    semRedeExterna();

    const resp = await app.request(
      "/api/cotacoes/todas",
      { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie }, body: CORPO_COTACAO },
      ambiente(db),
    );
    expect(resp.status).toBe(403);
    expect(((await resp.json()) as { erro: string }).erro).toContain("já foi usado");
    expect(contagemCotacoes(db, "sem")).toBe(0);
  });

  it("plano inexistente: responde 403 com a mensagem de plano indisponível", async () => {
    const db = novoBanco();
    criarUsuario(db, "fantasma", "fantasma", dataSql(db, "+7 days"));
    await salvarToken(d1(db), CHAVE, "fantasma", "superfrete", "tokenabc1234", null);
    const cookie = await cookieDeSessao(db, "fantasma");
    semRedeExterna();

    const resp = await app.request(
      "/api/cotacoes/todas",
      { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie }, body: CORPO_COTACAO },
      ambiente(db),
    );
    expect(resp.status).toBe(403);
    expect(((await resp.json()) as { erro: string }).erro).toBe("Seu plano não está disponível. Fale com o suporte.");
    expect(contagemCotacoes(db, "fantasma")).toBe(0);
  });
});

describe("POST /api/carrinho/enviar com a regra de acesso", () => {
  const enviar = (cookie: string, db: DatabaseSync) =>
    app.request(
      "/api/carrinho/enviar",
      { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie }, body: "{}" },
      ambiente(db),
    );

  it("acesso ativo: a checagem passa (a resposta não é 403)", async () => {
    const db = novoBanco();
    criarUsuario(db, "ativo", "gratuito", dataSql(db, "+7 days"));
    const cookie = await cookieDeSessao(db, "ativo");
    semRedeExterna();
    const resp = await enviar(cookie, db);
    expect(resp.status).not.toBe(403);
  });

  it("prazo expirado: responde 403 com a mensagem de prazo", async () => {
    const db = novoBanco();
    criarUsuario(db, "expirado", "gratuito", dataSql(db, "-1 minute"));
    const cookie = await cookieDeSessao(db, "expirado");
    const resp = await enviar(cookie, db);
    expect(resp.status).toBe(403);
    expect(((await resp.json()) as { erro: string }).erro).toBe("Seu período de acesso terminou. Escolha um plano para continuar.");
  });

  it("franquia já usada: responde 403", async () => {
    const db = novoBanco();
    criarUsuario(db, "sem", "sem_franquia", dataSql(db, "+7 days"));
    const cookie = await cookieDeSessao(db, "sem");
    const resp = await enviar(cookie, db);
    expect(resp.status).toBe(403);
  });

  it("plano inexistente: responde 403 com a mensagem de plano indisponível", async () => {
    const db = novoBanco();
    criarUsuario(db, "fantasma", "fantasma", dataSql(db, "+7 days"));
    const cookie = await cookieDeSessao(db, "fantasma");
    const resp = await enviar(cookie, db);
    expect(resp.status).toBe(403);
    expect(((await resp.json()) as { erro: string }).erro).toBe("Seu plano não está disponível. Fale com o suporte.");
  });
});

describe("GET /api/auth/eu", () => {
  it("informa o formato novo de uso para conta ativa", async () => {
    const db = novoBanco();
    criarUsuario(db, "ativo", "gratuito", dataSql(db, "+7 days"));
    const cookie = await cookieDeSessao(db, "ativo");
    const resp = await app.request("/api/auth/eu", { headers: { Cookie: cookie } }, ambiente(db));
    const dados = (await resp.json()) as { uso: { ativo: boolean; motivo: string; acesso_ate: string } };
    expect(dados.uso.ativo).toBe(true);
    expect(dados.uso.motivo).toBe("ativo");
    expect(typeof dados.uso.acesso_ate).toBe("string");
  });
});

describe("fluxo real: login, exclusão e nova entrada com o mesmo e-mail e CPF/CNPJ", () => {
  const EMAIL = "real@teste.invalid";

  async function entrar(db: DatabaseSync, codigo: string, idCodigo: string): Promise<string> {
    db.prepare("INSERT INTO codigos_login (id, email, codigo_hash, expira_em) VALUES (?, ?, ?, ?)").run(
      idCodigo,
      EMAIL,
      await hashCodigo(SEGREDO, EMAIL, codigo),
      dataSql(db, "+1 day"),
    );
    const resp = await app.request(
      "/api/auth/verificar",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: EMAIL, codigo }) },
      ambiente(db),
    );
    expect(resp.status).toBe(200);
    const cookie = resp.headers.get("set-cookie") ?? "";
    const token = /sessao=([^;]+)/.exec(cookie)?.[1];
    expect(token).toBeTruthy();
    return `sessao=${token}`;
  }

  it("conta nova ganha franquia; após exclusão, e-mail e CPF/CNPJ continuam bloqueando a nova conta", async () => {
    const db = novoBanco();
    const cookie1 = await entrar(db, "123456", "codigo-1");

    const eu1 = (await (await app.request("/api/auth/eu", { headers: { Cookie: cookie1 } }, ambiente(db))).json()) as {
      uso: { motivo: string; ativo: boolean };
    };
    expect(eu1.uso.motivo).toBe("ativo");
    const primeiro = db.prepare("SELECT id FROM usuarios WHERE email = ?").get(EMAIL) as { id: string };

    // CPF/CNPJ reivindicado pela conta, pelo mesmo caminho real usado ao salvar o cadastro.
    await garantirFranquiaUnica(d1(db), SEGREDO, primeiro.id, "documento", "12345678909");

    // Exclusão real da conta pela rota.
    const exclusao = await app.request(
      "/api/conta",
      { method: "DELETE", headers: { "Content-Type": "application/json", Cookie: cookie1 }, body: JSON.stringify({ confirmar: "EXCLUIR" }) },
      ambiente(db),
    );
    expect(exclusao.status).toBe(200);

    // As identidades continuam registradas, sem dono.
    const semDono = db.prepare("SELECT tipo FROM identidades WHERE usuario_id IS NULL ORDER BY tipo").all() as { tipo: string }[];
    expect(semDono.map((r) => r.tipo)).toEqual(["documento", "email"]);

    // Nova entrada com o mesmo e-mail: nova conta, sem franquia.
    const cookie2 = await entrar(db, "654321", "codigo-2");
    const eu2 = (await (await app.request("/api/auth/eu", { headers: { Cookie: cookie2 } }, ambiente(db))).json()) as {
      uso: { motivo: string; ativo: boolean };
    };
    expect(eu2.uso.motivo).toBe("sem_franquia");
    expect(eu2.uso.ativo).toBe(false);

    // Mesmo CPF/CNPJ em outra conta nova: também sem franquia.
    db.prepare("INSERT INTO usuarios (id, email, plano_id, acesso_ate) VALUES ('outra', 'outra@teste.invalid', NULL, ?)").run(dataSql(db, "+7 days"));
    await garantirFranquiaUnica(d1(db), SEGREDO, "outra", "documento", "12345678909");
    const outra = db.prepare("SELECT plano_id FROM usuarios WHERE id = 'outra'").get() as { plano_id: string };
    expect(outra.plano_id).toBe("sem_franquia");
  });
});
