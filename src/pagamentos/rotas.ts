// Pagamento do acesso de 30 dias (exige login e CPF/CNPJ salvo): /api/pagamentos/assinar
import { Hono } from "hono";
import type { Env } from "../env";
import { usuarioDaSessao } from "../auth/rotas";
import { MENSAGEM_DOCUMENTO_PENDENTE } from "../planos";
import { criarCobrancaAcesso } from "../asaas/cobranca";
import { iguais } from "../auth/codigos";
import { EVENTOS_PAGO, confirmarPagamento } from "./confirmar";

export const pagamentoRotas = new Hono<{ Bindings: Env }>();

// Gera a cobrança e devolve o link do Asaas, onde a pessoa paga com Pix, cartão ou boleto.
pagamentoRotas.post("/assinar", async (c) => {
  const usuario = await usuarioDaSessao(c);
  if (!usuario) return c.json({ erro: "Faça login para continuar." }, 401);
  if (usuario.is_admin) return c.json({ erro: "Administradores não precisam pagar." }, 400);

  const conta = await c.env.DB.prepare(
    "SELECT id, nome, documento, asaas_cliente_id FROM usuarios WHERE id = ?",
  )
    .bind(usuario.id)
    .first<{ id: string; nome: string | null; documento: string | null; asaas_cliente_id: string | null }>();
  if (!conta?.documento) return c.json({ erro: MENSAGEM_DOCUMENTO_PENDENTE }, 403);

  try {
    const { link } = await criarCobrancaAcesso(c.env, c.env.DB, {
      id: conta.id,
      nome: conta.nome,
      documento: conta.documento,
      asaas_cliente_id: conta.asaas_cliente_id,
    });
    return c.json({ link });
  } catch (exc) {
    console.log("[asaas] falha ao criar cobrança: " + (exc instanceof Error ? exc.message : String(exc)));
    return c.json({ erro: "Não consegui gerar o pagamento agora. Tente de novo em instantes." }, 502);
  }
});

// Aviso do Asaas quando a cobrança é paga. Não tem sessão: o Asaas autentica pelo token no cabeçalho
// asaas-access-token, que precisa ser igual ao segredo ASAAS_WEBHOOK_TOKEN.
pagamentoRotas.post("/webhook", async (c) => {
  const esperado = c.env.ASAAS_WEBHOOK_TOKEN;
  const recebido = c.req.header("asaas-access-token") ?? "";
  if (!esperado || !iguais(recebido, esperado)) return c.json({ erro: "Não autorizado." }, 401);

  const corpo = await c.req.json<{ event?: string; payment?: { id?: string } }>().catch(() => null);
  if (!corpo || !EVENTOS_PAGO.includes(corpo.event ?? "") || typeof corpo.payment?.id !== "string") {
    return c.json({ ok: true }); // outro evento: ignora sem erro
  }

  try {
    const resultado = await confirmarPagamento(c.env.DB, corpo.payment.id);
    console.log("[asaas] webhook " + corpo.event + " cobrança " + corpo.payment.id + ": " + resultado);
    return c.json({ ok: true, resultado });
  } catch (exc) {
    console.log("[asaas] falha ao liberar acesso: " + (exc instanceof Error ? exc.message : String(exc)));
    return c.json({ erro: "Falha ao liberar o acesso." }, 500); // 500 faz o Asaas tentar de novo
  }
});
