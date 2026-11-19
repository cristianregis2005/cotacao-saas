// Compra de etiqueta na Pronto Envios (POST /api/v1/shipments/).
// A compra debita o saldo da conta Pronto do cliente na hora. Nada é comprado sem chamada explícita.
// Formato conforme a documentação da Pronto. Campos de resposta e o lugar do quotation_id
// ainda serão confirmados no sandbox e com o suporte da Pronto antes de produção.
import type { EnderecoEnvia } from "./envia";
import { enderecoPronto, PRONTO_BASE_PADRAO } from "./prontoenvios";

export interface ItemEtiquetaPronto {
  descricao: string;
  quantidade: number;
  valorUnitario: number;
}

export interface EntradaEtiquetaPronto {
  rateId: string;          // rate_id escolhido na cotação (Tarifa.id)
  cotacaoId: string;       // quotation_id da cotação de origem
  origem: EnderecoEnvia;
  destino: EnderecoEnvia;
  valorDeclarado: number;  // em reais, mesma unidade usada na cotação
  itens: ItemEtiquetaPronto[];
  pedidoId?: string;       // referência interna opcional (order_id)
}

export interface OpcoesEtiquetaPronto {
  credenciais: { client_id: string; client_secret: string };
  base?: string;           // use PRONTO_BASE_SANDBOX nos testes
  fetchFn?: typeof fetch;
}

export const PRONTO_BASE_SANDBOX = "https://sb-app.prontoenvios.com.br";

export interface EtiquetaPronto {
  id: string;
  rastreio: string | null;
  etiquetaUrl: string | null;
}

export type ResultadoEtiquetaPronto =
  | { ok: true; etiqueta: EtiquetaPronto; avisos: string[] }
  | { ok: false; status: number; mensagem: string };

type Registro = Record<string, unknown>;

// Produtos exigidos pela Pronto. Sem itens, usa uma linha com o valor declarado.
function produtosDoPacote(entrada: EntradaEtiquetaPronto) {
  const itens = entrada.itens.filter((i) => i.descricao.trim());
  if (!itens.length) {
    return [{ name: "Mercadoria", sku: "", quantity: 1, price: entrada.valorDeclarado }];
  }
  return itens.map((i) => ({
    name: i.descricao.trim().slice(0, 120),
    sku: "",
    quantity: Math.max(1, Math.round(i.quantidade)),
    price: i.valorUnitario,
  }));
}

function textoDe(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

export async function comprarEtiquetaPronto(
  entrada: EntradaEtiquetaPronto,
  opcoes: OpcoesEtiquetaPronto,
): Promise<ResultadoEtiquetaPronto> {
  const base = opcoes.base ?? PRONTO_BASE_PADRAO;
  const fetchFn = opcoes.fetchFn ?? fetch;

  // Token OAuth da conta do cliente (mesmo fluxo da cotação).
  let token: string;
  try {
    const tokenResp = await fetchFn(base + "/api/v1/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grant_type: "client_credentials", ...opcoes.credenciais }),
    });
    const tj = (await tokenResp.json().catch(() => ({}))) as Registro;
    if (!tokenResp.ok || !textoDe(tj.access_token)) {
      return { ok: false, status: tokenResp.status, mensagem: "Não consegui autenticar na Pronto Envios." };
    }
    token = String(tj.access_token);
  } catch {
    return { ok: false, status: 0, mensagem: "Falha de conexão com a Pronto Envios." };
  }

  const corpo = {
    shipment: {
      quotation_id: entrada.cotacaoId,
      rate_id: entrada.rateId,
      order_id: entrada.pedidoId,
      address_from: enderecoPronto(entrada.origem),
      address_to: enderecoPronto(entrada.destino),
      packages: [
        {
          package_number: 1,
          package_protected: false,
          package_type: "4G",
          products: produtosDoPacote(entrada),
        },
      ],
    },
  };

  let resp: Response;
  try {
    resp = await fetchFn(base + "/api/v1/shipments/", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify(corpo),
    });
  } catch {
    // Não repete em caso de falha de conexão: a compra pode ter sido feita.
    return { ok: false, status: 0, mensagem: "Não consegui falar com a Pronto agora. Confira no painel da Pronto se a etiqueta foi criada antes de tentar de novo." };
  }

  const dados = (await resp.json().catch(() => ({}))) as Registro;
  if (!resp.ok) {
    const mensagem = textoDe(dados.error_description) ?? textoDe(dados.message) ?? "A Pronto Envios recusou o pedido (" + resp.status + ").";
    console.log("[pronto] shipment recusado: " + JSON.stringify(dados).slice(0, 500));
    return { ok: false, status: resp.status, mensagem };
  }

  const envio = (dados.data ?? {}) as Registro;
  const id = textoDe(envio.id);
  if (!id) {
    console.log("[pronto] shipment sem id: " + JSON.stringify(dados).slice(0, 500));
    return { ok: false, status: 200, mensagem: "A Pronto não devolveu o identificador da etiqueta." };
  }
  const avisos = Array.isArray(dados.warnings)
    ? (dados.warnings as unknown[]).map((w) => String(w))
    : [];

  return {
    ok: true,
    etiqueta: {
      id,
      rastreio: textoDe(envio.tracking_code) ?? textoDe(envio.tracking_number),
      etiquetaUrl: textoDe(envio.label_url),
    },
    avisos,
  };
}
