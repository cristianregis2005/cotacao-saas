// Cotação de frete na Frenet (POST /shipping/quote). Porte do frenet_cotacao.py.
import type { EntradaFrete } from "./tipos";

// Taxa de serviço cobrada pela Frenet, somada ao preço cotado (igual ao app Python).
export const FRENET_TAXA = 0.03;

const URL = "https://api.frenet.com.br/shipping/quote";

export class FrenetError extends Error {}

export interface CotacaoFrenet {
  transportadora?: string;
  servico?: string;
  preco: number;      // já com a taxa de 3%
  prazoDias: number;
  codigoServico?: string;
  codigoTransportadora?: string;
  precoBase: number;  // sem a taxa: é o valor enviado ao pedido
}

interface ServicoFrenet {
  Error?: boolean;
  PresentationalPrice?: number | string;
  ShippingPrice?: number | string;
  DeliveryTime?: number | string;
  Carrier?: string;
  ServiceDescription?: string;
  ServiceCode?: string | number;
  CarrierCode?: string | number;
}

export async function cotarFrenet(
  entrada: EntradaFrete,
  opcoes: { token: string; fetchFn?: typeof fetch },
): Promise<CotacaoFrenet[]> {
  const fetchFn = opcoes.fetchFn ?? fetch;
  const payload = {
    SellerCEP: entrada.cepOrigem.replace(/\D/g, ""),
    RecipientCEP: entrada.cepDestino.replace(/\D/g, ""),
    RecipientCountry: "BR",
    ShipmentInvoiceValue: entrada.valor,
    ShippingItemArray: [{
      SKU: "PACOTE-1",
      Quantity: 1,
      Weight: entrada.peso,
      Length: entrada.comprimento,
      Height: entrada.altura,
      Width: entrada.largura,
      Category: "Geral",
      isFragile: false,
    }],
  };

  let resp: Response;
  try {
    resp = await fetchFn(URL, {
      method: "POST",
      headers: { token: opcoes.token, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (exc) {
    throw new FrenetError(`Falha de conexão com a Frenet: ${String(exc)}`);
  }

  if (!resp.ok) {
    throw new FrenetError(`Frenet respondeu HTTP ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  }

  let dados: { ShippingSevicesArray?: ServicoFrenet[] };
  try {
    dados = await resp.json();
  } catch {
    throw new FrenetError("Resposta da Frenet não é JSON válido.");
  }

  // A API escreve "ShippingSevicesArray" com erro de digitação; o nome precisa ser esse.
  const servicos = dados.ShippingSevicesArray ?? [];
  const cotacoes: CotacaoFrenet[] = [];

  for (const s of servicos) {
    if (s.Error) continue; // serviço indisponível para este envio
    const preco = Number(s.PresentationalPrice || s.ShippingPrice);
    const prazo = Number(s.DeliveryTime);
    if (!Number.isFinite(preco) || !Number.isFinite(prazo)) continue;
    cotacoes.push({
      transportadora: s.Carrier,
      servico: s.ServiceDescription,
      preco: Math.round(preco * (1 + FRENET_TAXA) * 100) / 100,
      prazoDias: prazo,
      codigoServico: s.ServiceCode === undefined ? undefined : String(s.ServiceCode),
      codigoTransportadora: s.CarrierCode === undefined ? undefined : String(s.CarrierCode),
      precoBase: Math.round((Number(s.ShippingPrice) || preco) * 100) / 100,
    });
  }

  return cotacoes.sort((a, b) => a.preco - b.preco);
}
