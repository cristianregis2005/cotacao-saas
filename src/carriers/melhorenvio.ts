// Cotação de frete no Melhor Envio (POST /api/v2/me/shipment/calculate). Porte do melhor_envio_cotacao.py.
import type { EntradaFrete } from "./tipos";

export const ME_PRODUCAO = "https://melhorenvio.com.br";
export const ME_SANDBOX = "https://sandbox.melhorenvio.com.br";

export class MelhorEnvioError extends Error {}

export interface CotacaoMelhorEnvio {
  transportadora?: string;
  servico?: string;
  codigoServico?: number;  // id do serviço, usado depois para gerar o envio
  preco: number;
  prazoDias?: number;
}

interface ServicoMelhorEnvio {
  id?: number;
  name?: string;
  price?: number | string;
  custom_price?: number | string;
  delivery_time?: number;
  custom_delivery_time?: number;
  error?: string;
  company?: { name?: string };
  company_name?: string;
}

export async function cotarMelhorEnvio(
  entrada: EntradaFrete,
  opcoes: { token: string; contato: string; sandbox?: boolean; fetchFn?: typeof fetch },
): Promise<CotacaoMelhorEnvio[]> {
  const fetchFn = opcoes.fetchFn ?? fetch;
  const base = opcoes.sandbox ? ME_SANDBOX : ME_PRODUCAO;
  const payload = {
    from: { postal_code: entrada.cepOrigem.replace(/\D/g, "") },
    to: { postal_code: entrada.cepDestino.replace(/\D/g, "") },
    products: [{
      id: "PACOTE-1",
      width: entrada.largura,
      height: entrada.altura,
      length: entrada.comprimento,
      weight: entrada.peso,
      insurance_value: entrada.valor,
      quantity: 1,
    }],
    options: { receipt: false, own_hand: false },
  };

  let resp: Response;
  try {
    resp = await fetchFn(`${base}/api/v2/me/shipment/calculate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opcoes.token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        // Exigido pela API: nome da aplicação e contato.
        "User-Agent": `CotacaoFrete (${opcoes.contato})`,
      },
      body: JSON.stringify(payload),
    });
  } catch (exc) {
    throw new MelhorEnvioError(`Falha de conexão com o Melhor Envio: ${String(exc)}`);
  }

  if (!resp.ok) {
    throw new MelhorEnvioError(`Melhor Envio respondeu HTTP ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  }

  let dados: ServicoMelhorEnvio[] | { data?: ServicoMelhorEnvio[] };
  try {
    dados = await resp.json();
  } catch {
    throw new MelhorEnvioError("Resposta do Melhor Envio não é JSON válido.");
  }

  // A lista pode vir direta ou dentro de "data".
  const servicos = Array.isArray(dados) ? dados : (dados.data ?? []);
  const cotacoes: CotacaoMelhorEnvio[] = [];

  for (const s of servicos) {
    if (s.error) continue; // serviço indisponível para esta rota ou dimensão
    // custom_price já inclui as taxas e descontos da sua conta.
    const preco = Number(s.custom_price || s.price);
    if (!Number.isFinite(preco)) continue;
    cotacoes.push({
      transportadora: s.company?.name ?? s.company_name,
      servico: s.name,
      codigoServico: s.id,
      preco: Math.round(preco * 100) / 100,
      prazoDias: s.custom_delivery_time || s.delivery_time,
    });
  }

  return cotacoes.sort((a, b) => a.preco - b.preco);
}
