// Tela "Minha conta": o cliente cadastra os próprios tokens das transportadoras.
// O token nunca volta inteiro para a tela: só os últimos 4 caracteres.
import { Hono, type Context } from "hono";
import type { Env } from "../env";
import { usuarioDaSessao } from "../auth/rotas";
import { ehTransportadora, listarTokens, NOMES, removerToken, salvarToken, TRANSPORTADORAS } from "./tokens";

export const contaRotas = new Hono<{ Bindings: Env }>();

// Devolve o usuário logado ou uma resposta 401 para a rota devolver.
async function exigirUsuario(c: Context<{ Bindings: Env }>) {
  const usuario = await usuarioDaSessao(c);
  return usuario ? { usuario } : { resposta: c.json({ erro: "Faça login." }, 401) };
}

contaRotas.get("/tokens", async (c) => {
  const acesso = await exigirUsuario(c);
  if (!("usuario" in acesso)) return acesso.resposta;

  const salvos = await listarTokens(c.env.DB, acesso.usuario.id);
  const porNome = new Map(salvos.map((s) => [s.transportadora, s]));
  return c.json({
    transportadoras: TRANSPORTADORAS.map((t) => {
      const s = porNome.get(t);
      return {
        transportadora: t,
        nome: NOMES[t],
        configurado: !!s,
        final_token: s?.final_token ?? null,
        contato: s?.contato ?? null,
        atualizado_em: s?.atualizado_em ?? null,
      };
    }),
  });
});

contaRotas.put("/tokens/:transportadora", async (c) => {
  const acesso = await exigirUsuario(c);
  if (!("usuario" in acesso)) return acesso.resposta;

  const transportadora = c.req.param("transportadora");
  if (!ehTransportadora(transportadora)) return c.json({ erro: "Transportadora desconhecida." }, 404);

  const corpo = (await c.req.json<{ token?: unknown; contato?: unknown }>().catch(() => null)) ?? {};
  const token = typeof corpo.token === "string" ? corpo.token.trim() : "";
  const contato = typeof corpo.contato === "string" ? corpo.contato.trim() : "";
  if (token.length < 10) return c.json({ erro: "Cole o token completo da " + NOMES[transportadora] + "." }, 400);
  if (contato && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contato)) {
    return c.json({ erro: "O e-mail de contato não parece válido." }, 400);
  }

  await salvarToken(c.env.DB, c.env.CHAVE_TOKENS, acesso.usuario.id, transportadora, token, contato || null);
  return c.json({ ok: true });
});

contaRotas.delete("/tokens/:transportadora", async (c) => {
  const acesso = await exigirUsuario(c);
  if (!("usuario" in acesso)) return acesso.resposta;

  const transportadora = c.req.param("transportadora");
  if (!ehTransportadora(transportadora)) return c.json({ erro: "Transportadora desconhecida." }, 404);
  await removerToken(c.env.DB, acesso.usuario.id, transportadora);
  return c.json({ ok: true });
});
