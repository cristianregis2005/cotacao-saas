// Cotação de frete na Envia (POST /ship/rate/). Porte de envia_cotacao.py. Só consulta preços: não gera etiqueta nem cobra.
// Exige endereço completo de origem e destino, por isso a cotação usa o cadastro do cliente e a nota fiscal.

export const ENVIA_BASE = "https://api.envia.com";

// "loggi" ainda não foi confirmada em produção (igual ao app Python).
export const TRANSPORTADORAS_ENVIA = ["correios", "jadlog", "jtexpress", "totalexpress", "loggi"] as const;

export interface EnderecoEnvia {
  name: string;
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
    resp = await fetchFn(`${ENVIA_BASE}/ship/rate/`, {
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
    const prazo = Number(item.deliveryEstimate);
    cotacoes.push({
      transportadora: String(item.carrierDescription ?? item.carrier ?? transportadora),
      servico: item.serviceDescription ? String(item.serviceDescription) : item.service ? String(item.service) : undefined,
      codigoTransportadora: item.carrier ? String(item.carrier) : undefined,
      codigoServico: item.service ? String(item.service) : undefined,
      preco: Math.round(preco * 100) / 100,
      prazoDias: Number.isFinite(prazo) ? prazo : undefined,
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
    if (resultado.erro) avisos.push(`Envia (${transportadora}): ${resultado.erro}`);
    else cotacoes.push(...(resultado.cotacoes ?? []));
  }
  return { cotacoes: cotacoes.sort((a, b) => a.preco - b.preco), avisos };
}
