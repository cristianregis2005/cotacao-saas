// Envia o pedido ao carrinho de cada transportadora. Nada é pago aqui.
// Não repete a chamada em caso de erro de conexão: o pedido pode ter sido criado.
import { CarrinhoError } from "./montar";
import { recusaCarrinho } from "../erros";

export type TransportadoraCarrinho = "superfrete" | "frenet" | "melhorenvio";

export interface ResultadoCarrinho {
  codigo: string;
  preco?: number;
  status: string;
}

interface OpcoesEnvio {
  token: string;
  contato: string;
  partnerToken?: string; // só a Frenet exige
  fetchFn?: typeof fetch;
}

const SUPERFRETE = "https://api.superfrete.com";
const MELHOR_ENVIO = "https://melhorenvio.com.br";
const FRENET_PEDIDOS = "https://whitelabel.apifrenet.com.br/v1/orders";

async function chamar(fetchFn: typeof fetch, url: string, init: RequestInit, rotulo: string): Promise<Response> {
  try {
    return await fetchFn(url, init);
  } catch (exc) {
    console.log("[carrinho] falha de conexão com " + rotulo + ": " + String(exc));
    throw new CarrinhoError(
      "Não consegui falar com " + rotulo + " agora. Confira no painel se o pedido foi criado antes de tentar de novo.",
    );
  }
}

async function lerJson(resp: Response, rotulo: string): Promise<Record<string, unknown>> {
  if (!resp.ok) {
    const corpo = (await resp.text()).slice(0, 500);
    throw new CarrinhoError(recusaCarrinho(rotulo, resp.status, corpo));
  }
  try {
    return (await resp.json()) as Record<string, unknown>;
  } catch {
    console.log("[carrinho] " + rotulo + " respondeu sem JSON válido");
    throw new CarrinhoError("A " + rotulo + " não respondeu como esperado. Tente de novo.");
  }
}

function numeroOuUndefined(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export async function criarNoCarrinho(
  transportadora: TransportadoraCarrinho,
  payload: unknown,
  opcoes: OpcoesEnvio,
): Promise<ResultadoCarrinho> {
  const fetchFn = opcoes.fetchFn ?? fetch;

  if (transportadora === "superfrete") {
    const resp = await chamar(
      fetchFn,
      `${SUPERFRETE}/api/v0/cart`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${opcoes.token}`,
          "User-Agent": `Comparador de Fretes (${opcoes.contato})`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      },
      "SuperFrete",
    );
    const j = await lerJson(resp, "SuperFrete");
    return { codigo: String(j.id ?? ""), preco: numeroOuUndefined(j.price), status: String(j.status ?? "pending") };
  }

  if (transportadora === "melhorenvio") {
    const resp = await chamar(
      fetchFn,
      `${MELHOR_ENVIO}/api/v2/me/cart`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${opcoes.token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": `CotacaoFrete (${opcoes.contato})`,
        },
        body: JSON.stringify(payload),
      },
      "o Melhor Envio",
    );
    if (resp.status !== 200 && resp.status !== 201) {
      const corpo = (await resp.text()).slice(0, 500);
      throw new CarrinhoError(recusaCarrinho("Melhor Envio", resp.status, corpo));
    }
    const j = await lerJson(resp, "Melhor Envio");
    return {
      codigo: String(j.protocol ?? j.id ?? ""),
      preco: numeroOuUndefined(j.price),
      status: String(j.status ?? "pending"),
    };
  }

  // Frenet: o código do pedido é a própria chave da NF-e, enviada no corpo.
  if (!opcoes.partnerToken) {
    throw new CarrinhoError("Token de parceiro da Frenet não configurado no sistema.");
  }
  const chave = (payload as Array<{ Order: { Id: string } }>)[0].Order.Id;
  const resp = await chamar(
    fetchFn,
    FRENET_PEDIDOS,
    {
      method: "POST",
      headers: {
        "x-partner-token": opcoes.partnerToken,
        token: opcoes.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    "a Frenet",
  );
  if (!resp.ok) {
    const corpo = (await resp.text()).slice(0, 500);
    throw new CarrinhoError(recusaCarrinho("Frenet", resp.status, corpo));
  }
  return { codigo: chave, status: "enviado" };
}
