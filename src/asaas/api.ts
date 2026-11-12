// Cliente mínimo da API do Asaas. Sandbox por padrão; ASAAS_AMBIENTE = "producao" usa a API real.
// A chave (ASAAS_API_KEY) nunca é gravada nem enviada em log.

export interface AmbienteAsaas {
  ASAAS_API_KEY?: string;   // chave de API do Asaas (segredo)
  ASAAS_AMBIENTE?: string;  // "producao" = API real; qualquer outro valor = sandbox
}

export interface RespostaAsaas {
  ok: boolean;
  status: number;
  dados: Record<string, unknown>;
}

export function baseAsaas(ambiente?: string): string {
  return ambiente === "producao" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";
}

export async function chamarAsaas(
  env: AmbienteAsaas,
  metodo: "GET" | "POST",
  caminho: string,
  corpo?: Record<string, unknown>,
): Promise<RespostaAsaas> {
  if (!env.ASAAS_API_KEY) throw new Error("Asaas não configurado: falta ASAAS_API_KEY.");
  const resp = await fetch(baseAsaas(env.ASAAS_AMBIENTE) + caminho, {
    method: metodo,
    headers: { "Content-Type": "application/json", "User-Agent": "CliqueFrete/1.0", access_token: env.ASAAS_API_KEY },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const dados = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: resp.ok, status: resp.status, dados };
}
