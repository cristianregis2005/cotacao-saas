import { afterEach, describe, expect, it, vi } from "vitest";
import { baseAsaas, chamarAsaas } from "../src/asaas/api";
import { criarCobrancaAcesso, vencimentoPadrao, VALOR_ACESSO } from "../src/asaas/cobranca";

afterEach(() => vi.unstubAllGlobals());

// Banco de mentira: registra os comandos SQL executados.
function dbFalso() {
  const comandos: string[] = [];
  const db = {
    prepare: (sql: string) => ({
      bind: () => ({
        run: async () => {
          comandos.push(sql);
          return {};
        },
        first: async () => null,
      }),
    }),
  } as unknown as D1Database;
  return { db, comandos };
}

describe("baseAsaas", () => {
  it("usa a sandbox por padrão e a API real só com producao", () => {
    expect(baseAsaas(undefined)).toBe("https://api-sandbox.asaas.com/v3");
    expect(baseAsaas("teste")).toBe("https://api-sandbox.asaas.com/v3");
    expect(baseAsaas("producao")).toBe("https://api.asaas.com/v3");
  });
});

describe("chamarAsaas", () => {
  it("recusa quando a chave não está configurada", async () => {
    await expect(chamarAsaas({}, "POST", "/customers", {})).rejects.toThrow("ASAAS_API_KEY");
  });

  it("envia a chave no header access_token", async () => {
    let cabecalhos: Record<string, string> | undefined;
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      cabecalhos = init.headers as Record<string, string>;
      return new Response(JSON.stringify({ id: "cus_1" }), { status: 200 });
    });
    const resposta = await chamarAsaas({ ASAAS_API_KEY: "chave-teste" }, "POST", "/customers", {});
    expect(cabecalhos?.access_token).toBe("chave-teste");
    expect(resposta.ok).toBe(true);
  });
});

describe("vencimentoPadrao", () => {
  it("vence em 3 dias, contado no horário de Brasília", () => {
    // 2026-11-11 22:00 em Brasília = 2026-11-12 01:00 UTC; vencimento = 2026-11-14
    expect(vencimentoPadrao(new Date("2026-11-12T01:00:00Z"))).toBe("2026-11-14");
  });
});

describe("criarCobrancaAcesso", () => {
  const cliente = { id: "u1", nome: "Ana", documento: "12345678909", asaas_cliente_id: null };

  it("cria o cliente e a cobrança e devolve o link de pagamento", async () => {
    const urls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      urls.push(url);
      const corpo = url.endsWith("/customers")
        ? { id: "cus_1" }
        : { id: "pay_1", invoiceUrl: "https://sandbox.asaas.com/i/1" };
      return new Response(JSON.stringify(corpo), { status: 200 });
    });
    const { db, comandos } = dbFalso();
    const resultado = await criarCobrancaAcesso({ ASAAS_API_KEY: "k" }, db, cliente);
    expect(resultado.link).toBe("https://sandbox.asaas.com/i/1");
    expect(urls).toEqual([
      "https://api-sandbox.asaas.com/v3/customers",
      "https://api-sandbox.asaas.com/v3/payments",
    ]);
    expect(comandos.some((sql) => sql.includes("asaas_cliente_id"))).toBe(true);
    expect(comandos.some((sql) => sql.includes("link_pagamento"))).toBe(true);
  });

  it("reaproveita o cliente já criado no Asaas", async () => {
    const urls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      urls.push(url);
      return new Response(JSON.stringify({ id: "pay_2", invoiceUrl: "https://sandbox.asaas.com/i/2" }), { status: 200 });
    });
    const { db } = dbFalso();
    await criarCobrancaAcesso({ ASAAS_API_KEY: "k" }, db, { ...cliente, asaas_cliente_id: "cus_9" });
    expect(urls).toEqual(["https://api-sandbox.asaas.com/v3/payments"]);
  });

  it("cobrança recusada marca o pagamento como erro e lança exceção", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      const corpo = url.endsWith("/customers") ? { id: "cus_1" } : { errors: [{ description: "valor inválido" }] };
      return new Response(JSON.stringify(corpo), { status: url.endsWith("/customers") ? 200 : 400 });
    });
    const { db, comandos } = dbFalso();
    await expect(criarCobrancaAcesso({ ASAAS_API_KEY: "k" }, db, cliente)).rejects.toThrow("HTTP 400");
    expect(comandos.some((sql) => sql.includes("status = 'erro'"))).toBe(true);
  });

  it("o valor do acesso de 30 dias é R$ 19,90", () => {
    expect(VALOR_ACESSO).toBe(19.9);
  });
});
