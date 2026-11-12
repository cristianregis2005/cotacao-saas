// Pagamento do acesso de 30 dias (exige login e CPF/CNPJ salvo): /api/pagamentos/assinar
import { Hono } from "hono";
import type { Env } from "../env";
import { usuarioDaSessao } from "../auth/rotas";
import { MENSAGEM_DOCUMENTO_PENDENTE } from "../planos";
import { criarCobrancaAcesso } from "../asaas/cobranca";

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
