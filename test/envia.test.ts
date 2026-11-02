import { describe, expect, it } from "vitest";
import { cotarEnvia, TRANSPORTADORAS_ENVIA, type EntradaEnvia } from "../src/carriers/envia";

const endereco = { name: "A", phone: "47999990000", street: "Rua A", number: "1", district: "C", city: "Blumenau", state: "SC", postalCode: "89010000" };
const entrada: EntradaEnvia = { origem: endereco, destino: { ...endereco, city: "Joinville", postalCode: "89200000" }, valor: 150, peso: 2, comprimento: 20, largura: 15, altura: 10 };

describe("cotarEnvia", () => {
  it("consulta cada transportadora e ordena pelo menor preço", async () => {
    const chamadas: { url: string; corpo: { shipment: { carrier: string } } }[] = [];
    const fetchFn = (async (url: string, init: RequestInit) => {
      const corpo = JSON.parse(String(init.body));
      chamadas.push({ url: String(url), corpo });
      const preco = corpo.shipment.carrier === "jadlog" ? 18.5 : 30;
      return new Response(JSON.stringify({ data: [{ carrier: corpo.shipment.carrier, carrierDescription: corpo.shipment.carrier, serviceDescription: "Serviço", totalPrice: preco, deliveryEstimate: 4 }] }), { status: 200 });
    }) as typeof fetch;

    const r = await cotarEnvia(entrada, { token: "t", fetchFn });
    expect(chamadas).toHaveLength(TRANSPORTADORAS_ENVIA.length);
    expect(chamadas[0].url).toBe("https://api.envia.com/ship/rate/");
    expect(r.cotacoes[0]).toMatchObject({ transportadora: "jadlog", preco: 18.5 });
    expect(r.avisos).toEqual([]);
  });

  it("uma transportadora com erro vira aviso e as outras continuam", async () => {
    const fetchFn = (async (_url: string, init: RequestInit) => {
      const corpo = JSON.parse(String(init.body));
      if (corpo.shipment.carrier === "loggi") return new Response("sem rota", { status: 422 });
      return new Response(JSON.stringify({ data: [{ carrier: corpo.shipment.carrier, totalPrice: 20 }] }), { status: 200 });
    }) as typeof fetch;

    const r = await cotarEnvia(entrada, { token: "t", fetchFn });
    expect(r.cotacoes).toHaveLength(TRANSPORTADORAS_ENVIA.length - 1);
    expect(r.avisos).toEqual([expect.stringContaining("Envia (loggi): HTTP 422")]);
  });
});
