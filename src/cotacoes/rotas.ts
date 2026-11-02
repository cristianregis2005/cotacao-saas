// Rotas de cotação. Todas exigem login: os tokens das transportadoras só são usados por clientes logados.
import { Hono } from "hono";
import type { Env } from "../env";
import { usuarioDaSessao } from "../auth/rotas";
import type { EntradaFrete } from "../carriers/tipos";
import { cotarSuperFrete, SuperFreteError } from "../carriers/superfrete";
import { cotarTodas } from "./todas";
import { registrarCotacao, verificarLimite } from "../planos";

export const cotacaoRotas = new Hono<{ Bindings: Env }>();

const numeroPositivo = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;
const cepValido = (v: unknown): v is string => typeof v === "string" && v.replace(/\D/g, "").length === 8;

// Valida o corpo comum às rotas de cotação. Devolve null se algo estiver faltando.
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

const mensagemFaltando = "Informe os dois CEPs e peso e as três medidas, todos preenchidos e maiores que zero.";

// POST /api/cotacoes/todas: consulta SuperFrete, Frenet e Melhor Envio juntas.
// Corpo: { cepOrigem, cepDestino, peso (kg), comprimento, largura, altura (cm), valorDeclarado? }
cotacaoRotas.post("/todas", async (c) => {
  const usuario = await usuarioDaSessao(c);
  if (!usuario) return c.json({ erro: "Faça login para cotar." }, 401);

  const corpo = (await c.req.json<Record<string, unknown>>().catch(() => null)) ?? {};
  const entrada = lerEntrada(corpo);
  if (!entrada) return c.json({ erro: mensagemFaltando }, 400);

  const situacao = await verificarLimite(c.env.DB, usuario.id, usuario.plano_id);
  if (!situacao.permitido) {
    return c.json(
      { erro: `Você já usou ${situacao.usadas} de ${situacao.limite} cotações deste mês. Troque de plano para cotar mais.` },
      403,
    );
  }

  await registrarCotacao(c.env.DB, usuario.id);
  const resultado = await cotarTodas(entrada, c.env);
  return c.json({ ...resultado, uso: { usadas: situacao.usadas + 1, limite: situacao.limite } });
});

// POST /api/cotacoes/superfrete: só SuperFrete (mantido para testes).
cotacaoRotas.post("/superfrete", async (c) => {
  const usuario = await usuarioDaSessao(c);
  if (!usuario) return c.json({ erro: "Faça login para cotar." }, 401);

  const corpo = (await c.req.json<Record<string, unknown>>().catch(() => null)) ?? {};
  const entrada = lerEntrada(corpo);
  if (!entrada) return c.json({ erro: mensagemFaltando }, 400);

  if (!c.env.SUPERFRETE_TOKEN) {
    return c.json({ erro: "SuperFrete não está configurada neste ambiente." }, 500);
  }

  try {
    const cotacoes = await cotarSuperFrete(
      {
        cepOrigem: entrada.cepOrigem,
        cepDestino: entrada.cepDestino,
        peso: entrada.peso,
        comprimento: entrada.comprimento,
        largura: entrada.largura,
        altura: entrada.altura,
        valorDeclarado: entrada.valor,
      },
      {
        token: c.env.SUPERFRETE_TOKEN,
        userAgent: c.env.SUPERFRETE_USER_AGENT ?? "cotacao-fretes/1.0 (contato@exemplo.com)",
      },
    );
    return c.json({ cotacoes });
  } catch (exc) {
    if (exc instanceof SuperFreteError) return c.json({ erro: exc.message }, 502);
    throw exc;
  }
});
