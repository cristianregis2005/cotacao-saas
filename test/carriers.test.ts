import { describe, expect, it, vi, afterEach } from "vitest";
import app from "../src/index";
import { cotarFrenet, FRENET_TAXA } from "../src/carriers/frenet";
import { cotarMelhorEnvio } from "../src/carriers/melhorenvio";
import { cotarTodas } from "../src/cotacoes/todas";

const entrada = { cepOrigem: "01153-000", cepDestino: "20020-050", peso: 3, comprimento: 12, largura: 50, altura: 99, valor: 150 };

function respostaJson(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });
}

afterEach(() => vi.unstubAllGlobals());

describe("Frenet", () => {
  it("aplica a taxa de 3%, ignora erros e ordena", async () => {
    const fn = (async () => respostaJson({
      ShippingSevicesArray: [
        { Carrier: "Jadlog", ServiceDescription: ".Package", PresentationalPrice: 100, DeliveryTime: 4 },
        { Carrier: "Correios", ServiceDescription: "PAC", PresentationalPrice: 50, DeliveryTime: 6 },
        { Carrier: "Erro", ServiceDescription: "X", Error: true, PresentationalPrice: 1, DeliveryTime: 1 },
      ],
    })) as typeof fetch;
    const lista = await cotarFrenet(entrada, { token: "t", fetchFn: fn });
    expect(lista.map((c) => c.servico)).toEqual(["PAC", ".Package"]);
    expect(lista[0].preco).toBeCloseTo(50 * (1 + FRENET_TAXA), 2);
  });
});

describe("Melhor Envio", () => {
  it("usa custom_price, ignora erros e guarda o id do serviço", async () => {
    const fn = (async () => respostaJson([
      { id: 2, name: "SEDEX", custom_price: "40.5", custom_delivery_time: 2, company: { name: "Correios" } },
      { id: 1, name: "PAC", price: "30", delivery_time: 5, company: { name: "Correios" } },
      { id: 3, name: "Fora de rota", error: "Indisponível" },
    ])) as typeof fetch;
    const lista = await cotarMelhorEnvio(entrada, { token: "t", contato: "a@b.com", fetchFn: fn });
    expect(lista.map((c) => c.servico)).toEqual(["PAC", "SEDEX"]);
    expect(lista[1].codigoServico).toBe(2);
  });
});

describe("cotarTodas", () => {
  it("sem nenhum token do cliente, devolve um aviso por transportadora", async () => {
    const r = await cotarTodas(entrada, {});
    expect(r.cotacoes).toEqual([]);
    expect(r.avisos).toHaveLength(4);
    expect(r.avisos[0]).toContain("Minha conta");
  });

  it("uma transportadora falhando não derruba as outras", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      if (String(url).includes("frenet")) {
        return respostaJson({ ShippingSevicesArray: [{ Carrier: "Jadlog", ServiceDescription: "Package", PresentationalPrice: 10, DeliveryTime: 3 }] });
      }
      return new Response("erro", { status: 500 });
    });
    const r = await cotarTodas(entrada, {
      frenet: { token: "t", contato: "a@b.com" },
      melhorenvio: { token: "t", contato: "a@b.com" },
      superfrete: { token: "t", contato: "a@b.com" },
    });
    expect(r.cotacoes.map((c) => c.origem)).toEqual(["Frenet"]);
    expect(r.avisos.length).toBe(3); // Envia sem token + Melhor Envio e SuperFrete com erro
  });
});

describe("POST /api/cotacoes/todas", () => {
  it("sem login responde 401", async () => {
    const resp = await app.request(
      "/api/cotacoes/todas",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
      { DB: {} } as never,
    );
    expect(resp.status).toBe(401);
  });
});
