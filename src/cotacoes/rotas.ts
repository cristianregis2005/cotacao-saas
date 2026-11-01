// Rotas de cotação. Todas exigem login: os tokens das transportadoras só são usados por clientes logados.
import { Hono } from "hono";
import type { Env } from "../env";
import { usuarioDaSessao } from "../auth/rotas";
import { cotarSuperFrete, SuperFreteError, type EntradaSuperFrete } from "../carriers/superfrete";

export const cotacaoRotas = new Hono<{ Bindings: Env }>();

const numeroPositivo = (v: unknown): boolean => typeof v === "number" && Number.isFinite(v) && v > 0;
const cepValido = (v: unknown): boolean => typeof v === "string" && v.replace(/\D/g, "").length === 8;

// POST /api/cotacoes/superfrete
// Corpo: { cepOrigem, cepDestino, peso (kg), comprimento, largura, altura (cm), valorDeclarado? }
cotacaoRotas.post("/superfrete", async (c) => {
  const usuario = await usuarioDaSessao(c);
  if (!usuario) return c.json({ erro: "Faça login para cotar." }, 401);

  const corpo = (await c.req.json<Record<string, unknown>>().catch(() => null)) ?? {};
  if (
    !cepValido(corpo.cepOrigem) ||
    !cepValido(corpo.cepDestino) ||
    !numeroPositivo(corpo.peso) ||
    !numeroPositivo(corpo.comprimento) ||
    !numeroPositivo(corpo.largura) ||
    !numeroPositivo(corpo.altura)
  ) {
    return c.json(
      { erro: "Informe os dois CEPs e peso e as três medidas, todos preenchidos e maiores que zero." },
      400,
    );
  }

  if (!c.env.SUPERFRETE_TOKEN) {
    return c.json({ erro: "SuperFrete não está configurada neste ambiente." }, 500);
  }

  const entrada: EntradaSuperFrete = {
    cepOrigem: String(corpo.cepOrigem),
    cepDestino: String(corpo.cepDestino),
    peso: Number(corpo.peso),
    comprimento: Number(corpo.comprimento),
    largura: Number(corpo.largura),
    altura: Number(corpo.altura),
    valorDeclarado: typeof corpo.valorDeclarado === "number" && corpo.valorDeclarado >= 0 ? corpo.valorDeclarado : 0,
  };

  try {
    const cotacoes = await cotarSuperFrete(entrada, {
      token: c.env.SUPERFRETE_TOKEN,
      userAgent: c.env.SUPERFRETE_USER_AGENT ?? "cotacao-fretes/1.0 (contato@exemplo.com)",
    });
    return c.json({ cotacoes });
  } catch (exc) {
    if (exc instanceof SuperFreteError) return c.json({ erro: exc.message }, 502);
    throw exc;
  }
});
