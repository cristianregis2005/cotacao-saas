// Compra e cancelamento de etiqueta na Envia.
// A compra (POST /ship/generate/) debita o saldo da conta Envia na hora.
// O cancelamento (POST /ship/cancel/) pode devolver o saldo, se a transportadora ainda permitir.
import type { EnderecoEnvia } from "./envia";

export interface PacoteEtiqueta {
  peso: number;
  comprimento: number;
  largura: number;
  altura: number;
  valorDeclarado: number;
}

export interface EntradaEtiqueta {
  origem: EnderecoEnvia;
  destino: EnderecoEnvia;
  pacote: PacoteEtiqueta;
  carrier: string;   // código da transportadora na Envia (ex.: jadlog)
  service: string;   // código do serviço na Envia, vindo da cotação
}

export interface OpcoesEtiqueta {
  token: string;
  base: string;
  fetchFn?: typeof fetch;
}

export interface EtiquetaComprada {
  carrier: string;
  rastreio: string;
  etiquetaUrl: string | null;
  valor: number;
}

export type ResultadoEtiqueta =
  | { ok: true; etiqueta: EtiquetaComprada }
  | { ok: false; status: number; corpo: string }; // status 0 = falha de conexão

type Registro = Record<string, unknown>;

async function chamar(
  url: string,
  corpo: unknown,
  opcoes: OpcoesEtiqueta,
): Promise<{ ok: true; dados: Registro } | { ok: false; status: number; corpo: string }> {
  const fetchFn = opcoes.fetchFn ?? fetch;
  let resp: Response;
  try {
    resp = await fetchFn(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opcoes.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(corpo),
    });
  } catch (exc) {
    console.log("[envia] falha de conexão: " + String(exc));
    return { ok: false, status: 0, corpo: "" };
  }
  const bruto = await resp.text();
  let dados: Registro = {};
  try {
    dados = JSON.parse(bruto) as Registro;
  } catch {
    dados = {};
  }
  if (!resp.ok) return { ok: false, status: resp.status, corpo: bruto.slice(0, 500) };
  return { ok: true, dados };
}

export async function gerarEtiquetaEnvia(entrada: EntradaEtiqueta, opcoes: OpcoesEtiqueta): Promise<ResultadoEtiqueta> {
  const p = entrada.pacote;
  const corpo = {
    origin: { ...entrada.origem, country: "BR" },
    destination: { ...entrada.destino, country: "BR" },
    packages: [{
      type: "box",
      content: "Geral",
      amount: 1,
      declaredValue: p.valorDeclarado,
      weightUnit: "KG",
      lengthUnit: "CM",
      weight: p.peso,
      dimensions: { length: p.comprimento, width: p.largura, height: p.altura },
    }],
    shipment: { type: 1, carrier: entrada.carrier, service: entrada.service },
    settings: { printFormat: "PDF", printSize: "STOCK_4X6", currency: "BRL", comments: "" },
  };

  const r = await chamar(`${opcoes.base}/ship/generate/`, corpo, opcoes);
  if (!r.ok) return r;

  const item = (Array.isArray(r.dados.data) ? r.dados.data[0] : undefined) as Registro | undefined;
  if (!item || !item.trackingNumber) {
    return { ok: false, status: 200, corpo: JSON.stringify(r.dados).slice(0, 500) };
  }
  const valor = Math.round(Number(item.totalPrice ?? 0) * 100) / 100;
  return {
    ok: true,
    etiqueta: {
      carrier: String(item.carrier ?? entrada.carrier),
      rastreio: String(item.trackingNumber),
      etiquetaUrl: item.label ? String(item.label) : null,
      valor,
    },
  };
}

export async function cancelarEtiquetaEnvia(
  carrier: string,
  rastreio: string,
  opcoes: OpcoesEtiqueta,
): Promise<{ ok: true; saldoDevolvido: boolean } | { ok: false; status: number; corpo: string }> {
  const r = await chamar(`${opcoes.base}/ship/cancel/`, { carrier, trackingNumber: rastreio }, opcoes);
  if (!r.ok) return r;
  const dados = (r.dados.data ?? {}) as Registro;
  return { ok: true, saldoDevolvido: dados.balanceReturned === true };
}
