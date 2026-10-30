// Cotação de frete na SuperFrete (POST /api/v0/calculator).
// Porte do superfrete_cotacao.py do app Python. Medidas em cm, peso em kg, valores em R$.

export interface EntradaSuperFrete {
  cepOrigem: string;
  cepDestino: string;
  peso: number;
  comprimento: number;
  largura: number;
  altura: number;
  valorDeclarado?: number;
}

export interface CotacaoSuperFrete {
  transportadora: string | undefined;
  servico: string | undefined;
  codigoServico: number | string | undefined;
  preco: number;
  prazoDias: number | undefined;
}

export interface OpcoesSuperFrete {
  token: string;
  // A documentação pede: "Nome da aplicação (email para contato técnico)".
  userAgent: string;
  sandbox?: boolean;
  fetchFn?: typeof fetch;
}

export class SuperFreteError extends Error {}

// 1: PAC, 2: Sedex, 17: Mini Envios, 3: Jadlog, 33: J&T, 31: Loggi
const SERVICOS = "1,2,17,3,33,31";

const BASE_PRODUCAO = "https://api.superfrete.com";
const BASE_SANDBOX = "https://sandbox.superfrete.com";

const somenteDigitos = (texto: string): string => texto.replace(/\D/g, "");

export function montarPayloadSuperFrete(entrada: EntradaSuperFrete) {
  const valor = entrada.valorDeclarado ?? 0;
  return {
    from: { postal_code: somenteDigitos(entrada.cepOrigem) },
    to: { postal_code: somenteDigitos(entrada.cepDestino) },
    services: SERVICOS,
    options: {
      own_hand: false,
      receipt: false,
      insurance_value: valor,
      use_insurance_value: valor > 0,
    },
    package: {
      height: entrada.altura,
      width: entrada.largura,
      length: entrada.comprimento,
      weight: entrada.peso,
    },
  };
}

interface ItemSuperFrete {
  id?: number | string;
  name?: string;
  price?: string | number;
  delivery_time?: number;
  has_error?: boolean;
  company?: { name?: string };
}

export async function cotarSuperFrete(
  entrada: EntradaSuperFrete,
  opcoes: OpcoesSuperFrete,
): Promise<CotacaoSuperFrete[]> {
  const base = opcoes.sandbox ? BASE_SANDBOX : BASE_PRODUCAO;
  const fetchFn = opcoes.fetchFn ?? fetch;

  let resp: Response;
  try {
    resp = await fetchFn(`${base}/api/v0/calculator`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opcoes.token}`,
        "User-Agent": opcoes.userAgent,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(montarPayloadSuperFrete(entrada)),
    });
  } catch (exc) {
    throw new SuperFreteError(`Falha de conexão com a SuperFrete: ${String(exc)}`);
  }

  if (!resp.ok) {
    const corpo = (await resp.text()).slice(0, 300);
    throw new SuperFreteError(`SuperFrete respondeu HTTP ${resp.status}: ${corpo}`);
  }

  let dados: unknown;
  try {
    dados = await resp.json();
  } catch {
    throw new SuperFreteError("Resposta da SuperFrete não é JSON válido.");
  }

  // A documentação mostra o exemplo como string JSON; trata os dois casos.
  if (typeof dados === "string") {
    dados = JSON.parse(dados);
  }

  const itens = Array.isArray(dados) ? (dados as ItemSuperFrete[]) : [];
  const cotacoes: CotacaoSuperFrete[] = [];

  for (const s of itens) {
    if (s.has_error) continue; // serviço indisponível para este envio
    const preco = Number(s.price);
    if (!Number.isFinite(preco)) continue; // dado inesperado: ignora sem quebrar a lista
    cotacoes.push({
      transportadora: s.company?.name,
      servico: s.name,
      codigoServico: s.id,
      preco: Math.round(preco * 100) / 100,
      prazoDias: s.delivery_time,
    });
  }

  return cotacoes.sort((a, b) => a.preco - b.preco);
}
