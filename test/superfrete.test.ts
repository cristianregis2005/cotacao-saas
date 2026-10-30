import { describe, expect, it } from "vitest";
import { cotarSuperFrete, montarPayloadSuperFrete, SuperFreteError } from "../src/carriers/superfrete";

const entrada = {
  cepOrigem: "01153-000",
  cepDestino: "20020-050",
  peso: 3,
  comprimento: 12,
  largura: 50,
  altura: 99,
  valorDeclarado: 150,
};

const opcoes = { token: "token-de-teste", userAgent: "cotacao-fretes/1.0 (teste@exemplo.com)" };

function fetchFalso(status: number, corpo: unknown) {
  const chamadas: { url: string; init: RequestInit }[] = [];
  const fn = (async (url: string, init: RequestInit) => {
    chamadas.push({ url, init });
    const texto = typeof corpo === "string" ? corpo : JSON.stringify(corpo);
    return new Response(texto, { status, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  return { fn, chamadas };
}

describe("montarPayloadSuperFrete", () => {
  it("remove a formatação do CEP e monta o pacote", () => {
    const p = montarPayloadSuperFrete(entrada);
    expect(p.from.postal_code).toBe("01153000");
    expect(p.to.postal_code).toBe("20020050");
    expect(p.package).toEqual({ height: 99, width: 50, length: 12, weight: 3 });
    expect(p.options.use_insurance_value).toBe(true);
  });

  it("sem valor declarado, não usa seguro", () => {
    const p = montarPayloadSuperFrete({ ...entrada, valorDeclarado: undefined });
    expect(p.options.use_insurance_value).toBe(false);
  });
});

describe("cotarSuperFrete", () => {
  it("ignora serviços com erro, ordena pelo menor preço e envia o token", async () => {
    const { fn, chamadas } = fetchFalso(200, [
      { id: 2, name: "Sedex", price: "45.90", delivery_time: 3, company: { name: "Correios" } },
      { id: 1, name: "PAC", price: "28.10", delivery_time: 7, company: { name: "Correios" } },
      { id: 3, name: "Jadlog", has_error: true, price: "10.00" },
      { id: 17, name: "Mini", price: "not-a-number" },
    ]);

    const cotacoes = await cotarSuperFrete(entrada, { ...opcoes, fetchFn: fn });

    expect(cotacoes.map((c) => c.servico)).toEqual(["PAC", "Sedex"]);
    expect(cotacoes[0].preco).toBe(28.1);
    expect(chamadas[0].url).toBe("https://api.superfrete.com/api/v0/calculator");
    expect((chamadas[0].init.headers as Record<string, string>).Authorization).toBe("Bearer token-de-teste");
  });

  it("aceita a resposta quando vem como string JSON", async () => {
    const { fn } = fetchFalso(200, JSON.stringify([{ id: 1, name: "PAC", price: "20", company: { name: "Correios" } }]));
    const cotacoes = await cotarSuperFrete(entrada, { ...opcoes, fetchFn: fn });
    expect(cotacoes).toHaveLength(1);
  });

  it("usa o sandbox quando pedido", async () => {
    const { fn, chamadas } = fetchFalso(200, []);
    await cotarSuperFrete(entrada, { ...opcoes, sandbox: true, fetchFn: fn });
    expect(chamadas[0].url).toBe("https://sandbox.superfrete.com/api/v0/calculator");
  });

  it("erro HTTP vira SuperFreteError com o corpo da resposta", async () => {
    const { fn } = fetchFalso(401, { error: "Token inválida!" });
    await expect(cotarSuperFrete(entrada, { ...opcoes, fetchFn: fn })).rejects.toThrow(SuperFreteError);
    await expect(cotarSuperFrete(entrada, { ...opcoes, fetchFn: fn })).rejects.toThrow(/HTTP 401/);
  });
});
