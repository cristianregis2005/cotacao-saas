// Cobrança do acesso de 30 dias. Cria o cliente no Asaas (uma vez) e a cobrança com Pix, cartão ou boleto.
import { chamarAsaas, type AmbienteAsaas } from "./api";

export const VALOR_ACESSO = 19.9; // R$ por 30 dias de acesso (pagamento avulso)

export interface ClienteParaCobranca {
  id: string;
  nome: string | null;
  documento: string;             // CPF ou CNPJ, só números (obrigatório no Asaas)
  asaas_cliente_id: string | null;
}

// Vencimento em 3 dias, contado no horário de Brasília (UTC-3, sem horário de verão).
export function vencimentoPadrao(agora: Date = new Date()): string {
  return new Date(agora.getTime() - 3 * 3600_000 + 3 * 86_400_000).toISOString().slice(0, 10);
}

// Cria o cliente no Asaas só na primeira vez. Não envia e-mail: o Asaas só precisa de nome e CPF/CNPJ.
export async function garantirClienteAsaas(
  env: AmbienteAsaas,
  db: D1Database,
  cliente: ClienteParaCobranca,
): Promise<string> {
  if (cliente.asaas_cliente_id) return cliente.asaas_cliente_id;
  const resp = await chamarAsaas(env, "POST", "/customers", {
    name: cliente.nome || "Cliente Clique Frete",
    cpfCnpj: cliente.documento,
    externalReference: cliente.id,
    notificationDisabled: true,
  });
  const id = resp.dados.id;
  if (!resp.ok || typeof id !== "string") throw new Error("Asaas recusou o cliente: HTTP " + resp.status);
  await db.prepare("UPDATE usuarios SET asaas_cliente_id = ? WHERE id = ?").bind(id, cliente.id).run();
  return id;
}

// Cancela no Asaas as cobranças anteriores do mesmo usuário que ainda estão abertas.
// Se o Asaas recusar (ex.: a cobrança já foi paga), a linha continua pendente e o webhook resolve.
export async function cancelarCobrancasAbertas(
  env: AmbienteAsaas,
  db: D1Database,
  usuarioId: string,
): Promise<void> {
  const abertas = await db
    .prepare("SELECT id, asaas_cobranca_id FROM pagamentos WHERE usuario_id = ? AND status = 'pendente' AND asaas_cobranca_id IS NOT NULL")
    .bind(usuarioId)
    .all<{ id: string; asaas_cobranca_id: string }>();
  for (const p of abertas.results ?? []) {
    try {
      const resp = await chamarAsaas(env, "DELETE", "/payments/" + p.asaas_cobranca_id);
      if (resp.ok || resp.status === 404) {
        await db
          .prepare("UPDATE pagamentos SET status = 'cancelado' WHERE id = ? AND status = 'pendente'")
          .bind(p.id)
          .run();
      }
    } catch (erro) {
      console.error("[asaas] falha ao cancelar cobrança anterior", p.id, erro instanceof Error ? erro.message : erro);
    }
  }
}

// Gera a cobrança de 30 dias. billingType UNDEFINED deixa a pessoa escolher Pix, cartão ou boleto na página do Asaas.
export async function criarCobrancaAcesso(
  env: AmbienteAsaas,
  db: D1Database,
  cliente: ClienteParaCobranca,
): Promise<{ link: string }> {
  const asaasId = await garantirClienteAsaas(env, db, cliente);
  await cancelarCobrancasAbertas(env, db, cliente.id);
  const pagamentoId = crypto.randomUUID();
  await db
    .prepare("INSERT INTO pagamentos (id, usuario_id, valor, status) VALUES (?, ?, ?, 'pendente')")
    .bind(pagamentoId, cliente.id, VALOR_ACESSO)
    .run();

  const resp = await chamarAsaas(env, "POST", "/payments", {
    customer: asaasId,
    billingType: "UNDEFINED",
    value: VALOR_ACESSO,
    dueDate: vencimentoPadrao(),
    description: "Clique Frete: acesso por 30 dias",
    externalReference: pagamentoId,
  });
  const link = resp.dados.invoiceUrl;
  const cobrancaId = resp.dados.id;
  if (!resp.ok || typeof link !== "string" || typeof cobrancaId !== "string") {
    await db.prepare("UPDATE pagamentos SET status = 'erro' WHERE id = ?").bind(pagamentoId).run();
    throw new Error("Asaas recusou a cobrança: HTTP " + resp.status);
  }
  await db
    .prepare("UPDATE pagamentos SET asaas_cobranca_id = ?, link_pagamento = ? WHERE id = ?")
    .bind(cobrancaId, link, pagamentoId)
    .run();
  return { link };
}
