// Cotação de frete na Envia (POST /ship/rate/). Porte de envia_cotacao.py. Só consulta preços: não gera etiqueta nem cobra.
import { motivoAmigavel } from "../erros";
// Exige endereço completo de origem e destino, por isso a cotação usa o cadastro do cliente e a nota fiscal.

export const ENVIA_BASE = "https://api.envia.com";
export const ENVIA_BASE_TESTE = "https://api-test.envia.com";

// Token de sandbox só funciona na sandbox, e token de produção só na API real (senão a Envia responde 401).
export function baseEnvia(ambiente?: string): string {
  return ambiente === "teste" ? ENVIA_BASE_TESTE : ENVIA_BASE;
}

// "loggi" ainda não foi confirmada em produção (igual ao app Python).
export const TRANSPORTADORAS_ENVIA = ["correios", "jadlog", "jtexpress", "totalexpress", "loggi"] as const;

export interface EnderecoEnvia {
  name: string;
  email?: string; // obrigatório na compra de etiqueta para entrega em ponto de coleta
  identificationNumber?: string; // CPF ou CNPJ, só números (campo "identificationNumber" da Envia)
  phone: string;
  street: string;
  number: string;
  district: string;
  city: string;
  state: string;
  postalCode: string;
}

export interface CotacaoEnvia {
  transportadora?: string;
  servico?: string;
  codigoTransportadora?: string;
  codigoServico?: string;
  preco: number;
  prazoDias?: number;
  prazoTexto?: string; // prazo como a Envia informou, quando não dá para converter em dias
}

// Converte o prazo da Envia em dias. Aceita número, texto com número ("5 días") ou data AAAA-MM-DD.
export function prazoEmDias(valor: unknown): number | undefined {
  if (typeof valor === "number" && Number.isFinite(valor)) return valor;
  if (typeof valor !== "string") return undefined;
  const data = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor.trim());
  if (data) {
    const alvo = Date.UTC(Number(data[1]), Number(data[2]) - 1, Number(data[3]));
    const hoje = new Date();
    const inicioHoje = Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate());
    return Math.max(0, Math.round((alvo - inicioHoje) / 86_400_000));
  }
  const numero = /\d+/.exec(valor);
  return numero ? Number(numero[0]) : undefined;
}

export interface EntradaEnvia {
  origem: EnderecoEnvia;
  destino: EnderecoEnvia;
  valor: number;
  peso: number;
  comprimento: number;
  largura: number;
  altura: number;
}

export interface OpcoesEnvia {
  token: string;
  base?: string; // endereço da API (produção ou sandbox)
  fetchFn?: typeof fetch;
}

type Registro = Record<string, unknown>;

async function consultar(
  transportadora: string,
  entrada: EntradaEnvia,
  opcoes: OpcoesEnvia,
): Promise<{ cotacoes?: CotacaoEnvia[]; erro?: string }> {
  const fetchFn = opcoes.fetchFn ?? fetch;
  const corpo = {
    origin: { ...entrada.origem, country: "BR" },
    destination: { ...entrada.destino, country: "BR" },
    packages: [{
      type: "box",
      content: "Geral",
      amount: 1,
      declaredValue: entrada.valor,
      weightUnit: "KG",
      lengthUnit: "CM",
      weight: entrada.peso,
      dimensions: { length: entrada.comprimento, width: entrada.largura, height: entrada.altura },
    }],
    shipment: { type: 1, carrier: transportadora },
  };

  let resp: Response;
  try {
    resp = await fetchFn(`${opcoes.base ?? ENVIA_BASE}/ship/rate/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opcoes.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(corpo),
    });
  } catch (exc) {
    return { erro: `Falha de conexão: ${String(exc)}` };
  }

  if (!resp.ok) {
    return { erro: `HTTP ${resp.status}: ${(await resp.text()).slice(0, 200)}` };
  }

  const bruto = await resp.text();
  let dados: { data?: Registro[]; error?: { message?: string } };
  try {
    dados = JSON.parse(bruto) as { data?: Registro[]; error?: { message?: string } };
  } catch {
    return { erro: `Resposta não é JSON válido: ${bruto.slice(0, 200)}` };
  }
  if (dados.error?.message) return { erro: `a Envia recusou os dados: ${dados.error.message}` };

  const cotacoes: CotacaoEnvia[] = [];
  for (const item of dados.data ?? []) {
    // totalPrice já inclui impostos e taxas.
    const preco = Number(item.totalPrice);
    if (!Number.isFinite(preco)) continue;
    const prazo = prazoEmDias(item.deliveryEstimate);
    const prazoTexto = item.deliveryEstimate != null ? String(item.deliveryEstimate) : undefined;
    cotacoes.push({
      transportadora: String(item.carrierDescription ?? item.carrier ?? transportadora),
      servico: item.serviceDescription ? String(item.serviceDescription) : item.service ? String(item.service) : undefined,
      codigoTransportadora: item.carrier ? String(item.carrier) : undefined,
      codigoServico: item.service ? String(item.service) : undefined,
      preco: Math.round(preco * 100) / 100,
      prazoDias: prazo,
      prazoTexto: prazo === undefined ? prazoTexto : undefined,
    });
  }

  if (!cotacoes.length) {
    // Mostra a resposta da Envia para diagnosticar (endereço, telefone ou rota não atendida).
    return { erro: `respondeu sem cotação para esta rota e estes dados de endereço. Resposta: ${bruto.slice(0, 300)}` };
  }
  return { cotacoes };
}

// Consulta todas as transportadoras da Envia em paralelo. Uma falha não interrompe as outras.
export async function cotarEnvia(
  entrada: EntradaEnvia,
  opcoes: OpcoesEnvia,
): Promise<{ cotacoes: CotacaoEnvia[]; avisos: string[] }> {
  const resultados = await Promise.all(
    TRANSPORTADORAS_ENVIA.map(async (t) => ({ transportadora: t, resultado: await consultar(t, entrada, opcoes) })),
  );

  const cotacoes: CotacaoEnvia[] = [];
  const avisos: string[] = [];
  for (const { transportadora, resultado } of resultados) {
    if (resultado.erro) {
      console.log(`[cotacao] Envia (${transportadora}): ${resultado.erro}`);
      avisos.push(`Envia (${transportadora}): ${motivoAmigavel("Envia", resultado.erro)}`);
    }
    else cotacoes.push(...(resultado.cotacoes ?? []));
  }
  return { cotacoes: cotacoes.sort((a, b) => a.preco - b.preco), avisos };
}
