// Cotação na Pronto Envios (POST /api/v1/quotations). Cada cliente usa o próprio client_id e client_secret.
import type { EnderecoEnvia } from "./envia";

export const PRONTO_BASE_PADRAO = "https://app.prontoenvios.com.br";
const TRANSPORTADORAS_PRONTO = ["correios", "jadlog", "loggi"];
const STATUS_COM_PRECO = new Set(["approved", "price_found_internal", "price_found_external"]);

export class ProntoError extends Error {}

export interface EntradaPronto {
  origem: EnderecoEnvia;
  destino: EnderecoEnvia;
  valor: number;
  peso: number;
  comprimento: number;
  largura: number;
  altura: number;
}

export interface OpcoesPronto {
  credenciais: { client_id: string; client_secret: string };
  base?: string;
  fetchFn?: typeof fetch;
}

export interface CotacaoPronto {
  transportadora: string;
  servico: string;
  preco: number;
  prazoDias: number;
  codigo: string; // id da tarifa (rate_id), usado depois para criar o envio
  codigoTransportadora: string;
}

interface Tarifa {
  id: string;
  success: boolean;
  status: string;
  provider_name: string;
  provider_display_name: string;
  provider_service_name: string;
  total_value_with_protection: number | string | null;
  days: number | null;
}

interface Cotacao {
  is_completed: boolean;
  rates: Tarifa[];
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

// O cliente digita o valor em reais. A unidade enviada à Pronto ainda será confirmada com a Pronto.
export function valorDeclaradoPronto(valorReais: number): number {
  return valorReais;
}

export function enderecoPronto(e: EnderecoEnvia) {
  const cep = e.postalCode.replace(/\D/g, "");
  return {
    name: e.name,
    company: e.company ?? undefined,
    street1: e.street,
    street_number: e.number,
    postal_code: cep.slice(0, 5) + "-" + cep.slice(5),
    area_level1: e.state,
    area_level2: e.city,
    area_level3: e.district,
    country_code: "BR",
    phone: e.phone,
    email: e.email ?? "",
    reference: "Clique Frete",
    tax_id_number: e.identificationNumber ?? "",
  };
}

async function lerResposta<T>(resp: Response): Promise<T> {
  const dados = (await resp.json().catch(() => ({}))) as Record<string, any>;
  if (!resp.ok) {
    throw new ProntoError(dados.error_description ?? dados.message ?? "A Pronto Envios respondeu com erro " + resp.status + ".");
  }
  return dados as T;
}

export async function obterTokenPronto(
  base: string,
  cred: OpcoesPronto["credenciais"],
  fetchFn: typeof fetch,
): Promise<string> {
  const resp = await fetchFn(base + "/api/v1/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: cred.client_id,
      client_secret: cred.client_secret,
    }),
  });
  const dados = await lerResposta<{ access_token: string }>(resp);
  return dados.access_token;
}

export async function cotarProntoEnvios(entrada: EntradaPronto, opcoes: OpcoesPronto): Promise<CotacaoPronto[]> {
  const base = opcoes.base ?? PRONTO_BASE_PADRAO;
  const fetchFn = opcoes.fetchFn ?? fetch;
  const token = await obterTokenPronto(base, opcoes.credenciais, fetchFn);
  const cabecalhos = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  const criada = await lerResposta<{ id: string }>(
    await fetchFn(base + "/api/v1/quotations", {
      method: "POST",
      headers: cabecalhos,
      body: JSON.stringify({
        quotation: {
          address_from: enderecoPronto(entrada.origem),
          address_to: enderecoPronto(entrada.destino),
          parcels: [
            {
              length: entrada.comprimento,
              width: entrada.largura,
              height: entrada.altura,
              weight: entrada.peso,
              declared_amount: valorDeclaradoPronto(entrada.valor),
            },
          ],
          requested_carriers: TRANSPORTADORAS_PRONTO,
        },
      }),
    }),
  );

  // A cotação é processada de forma assíncrona: consulta até is_completed virar true.
  let cotacao: Cotacao | null = null;
  for (let tentativa = 0; tentativa < 10; tentativa++) {
    cotacao = await lerResposta<Cotacao>(
      await fetchFn(base + "/api/v1/quotations/" + criada.id, { headers: cabecalhos }),
    );
    if (cotacao.is_completed) break;
    await esperar(1500);
  }
  if (!cotacao || !cotacao.is_completed) {
    throw new ProntoError("A Pronto Envios demorou para responder. Tente novamente.");
  }

  return cotacao.rates
    .filter((t) => t.success && STATUS_COM_PRECO.has(t.status) && t.total_value_with_protection !== null)
    .map((t) => ({
      transportadora: t.provider_display_name,
      servico: t.provider_service_name,
      preco: Number(t.total_value_with_protection),
      prazoDias: t.days ?? 0,
      codigo: t.id,
      codigoTransportadora: t.provider_name,
    }));
}
