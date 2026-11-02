// Rotas de cotação. Exigem login e usam os tokens do próprio cliente.
import { Hono } from "hono";
import type { Env } from "../env";
import { usuarioDaSessao } from "../auth/rotas";
import type { EntradaFrete } from "../carriers/tipos";
import { lerCredenciais } from "../contas/tokens";
import { registrarCotacao, verificarLimite } from "../planos";
import { cotarTodas } from "./todas";

export const cotacaoRotas = new Hono<{ Bindings: Env }>();

const numeroPositivo = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;
const cepValido = (v: unknown): v is string => typeof v === "string" && v.replace(/\D/g, "").length === 8;

// Valida o corpo da cotação. Devolve null se algo estiver faltando.
function lerEntrada(corpo: Record<string, unknown>): EntradaFrete | null {
  if (
    !cepValido(corpo.cepOrigem) ||
    !cepValido(corpo.cepDestino) ||
    !numeroPositivo(corpo.peso) ||
    !numeroPositivo(corpo.comprimento) ||
    !numeroPositivo(corpo.largura) ||
    !numeroPositivo(corpo.altura)
  ) {
    return null;
  }
  const valor = typeof corpo.valorDeclarado === "number" && corpo.valorDeclarado >= 0 ? corpo.valorDeclarado : 0;
  return {
    cepOrigem: corpo.cepOrigem,
    cepDestino: corpo.cepDestino,
    peso: corpo.peso,
    comprimento: corpo.comprimento,
    largura: corpo.largura,
    altura: corpo.altura,
    valor,
  };
}

// POST /api/cotacoes/todas
// Corpo: { cepOrigem, cepDestino, peso (kg), comprimento, largura, altura (cm), valorDeclarado? }
cotacaoRotas.post("/todas", async (c) => {
  const usuario = await usuarioDaSessao(c);
  if (!usuario) return c.json({ erro: "Faça login para cotar." }, 401);

  const corpo = (await c.req.json<Record<string, unknown>>().catch(() => null)) ?? {};
  const entrada = lerEntrada(corpo);
  if (!entrada) {
    return c.json(
      { erro: "Informe os dois CEPs e peso e as três medidas, todos preenchidos e maiores que zero." },
      400,
    );
  }

  const credenciais = await lerCredenciais(c.env.DB, c.env.CHAVE_TOKENS, usuario.id);
  for (const chave of Object.keys(credenciais)) {
    const cred = credenciais[chave as keyof typeof credenciais];
    if (cred && !cred.contato) cred.contato = usuario.email;
  }
  if (Object.keys(credenciais).length === 0) {
    return c.json({ erro: "Cadastre pelo menos um token em Minha conta para cotar." }, 400);
  }

  const situacao = await verificarLimite(c.env.DB, usuario.id, usuario.plano_id);
  if (!situacao.permitido) {
    return c.json(
      { erro: `Você já usou ${situacao.usadas} de ${situacao.limite} cotações deste mês. Troque de plano para cotar mais.` },
      403,
    );
  }

  await registrarCotacao(c.env.DB, usuario.id);
  const resultado = await cotarTodas(entrada, credenciais as Parameters<typeof cotarTodas>[1]);
  return c.json({ ...resultado, uso: { usadas: situacao.usadas + 1, limite: situacao.limite } });
});
