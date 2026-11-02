// Tela "Minha conta": o cliente cadastra os próprios tokens das transportadoras.
// O token nunca volta inteiro para a tela: só os últimos 4 caracteres.
import { Hono } from "hono";
import type { Env } from "../env";
import { usuarioDaSessao } from "../auth/rotas";
import { ehTransportadora, listarTokens, NOMES, removerToken, salvarToken, TRANSPORTADORAS } from "./tokens";
import { validarDados } from "./dados";
import { garantirFranquiaUnica } from "../auth/identidade";
import { deleteCookie } from "hono/cookie";

export const contaRotas = new Hono<{ Bindings: Env }>();

contaRotas.get("/tokens", async (c) => {
  const usuario = await usuarioDaSessao(c);
  if (!usuario) return c.json({ erro: "Faça login." }, 401);

  const salvos = await listarTokens(c.env.DB, usuario.id);
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
  const usuario = await usuarioDaSessao(c);
  if (!usuario) return c.json({ erro: "Faça login." }, 401);

  const transportadora = c.req.param("transportadora");
  if (!ehTransportadora(transportadora)) return c.json({ erro: "Transportadora desconhecida." }, 404);

  const corpo = (await c.req.json<{ token?: unknown; contato?: unknown }>().catch(() => null)) ?? {};
  const token = typeof corpo.token === "string" ? corpo.token.trim() : "";
  const contato = typeof corpo.contato === "string" ? corpo.contato.trim() : "";
  if (token.length < 10) return c.json({ erro: "Cole o token completo da " + NOMES[transportadora] + "." }, 400);
  if (contato && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contato)) {
    return c.json({ erro: "O e-mail de contato não parece válido." }, 400);
  }

  await salvarToken(c.env.DB, c.env.CHAVE_TOKENS, usuario.id, transportadora, token, contato || null);
  return c.json({ ok: true });
});

contaRotas.delete("/tokens/:transportadora", async (c) => {
  const usuario = await usuarioDaSessao(c);
  if (!usuario) return c.json({ erro: "Faça login." }, 401);

  const transportadora = c.req.param("transportadora");
  if (!ehTransportadora(transportadora)) return c.json({ erro: "Transportadora desconhecida." }, 404);
  await removerToken(c.env.DB, usuario.id, transportadora);
  return c.json({ ok: true });
});

// ---- Dados cadastrais do cliente ----

contaRotas.get("/dados", async (c) => {
  const usuario = await usuarioDaSessao(c);
  if (!usuario) return c.json({ erro: "Faça login." }, 401);

  const linha = await c.env.DB.prepare(
    "SELECT nome, empresa, documento, telefone, origem_cep, origem_logradouro, origem_numero, origem_complemento, origem_bairro, origem_cidade, origem_uf FROM usuarios WHERE id = ?",
  )
    .bind(usuario.id)
    .first();
  return c.json({ dados: linha ?? {} });
});

contaRotas.put("/dados", async (c) => {
  const usuario = await usuarioDaSessao(c);
  if (!usuario) return c.json({ erro: "Faça login." }, 401);

  const corpo = (await c.req.json<Record<string, unknown>>().catch(() => null)) ?? {};
  const r = validarDados(corpo);
  if ("erro" in r) return c.json({ erro: r.erro }, 400);
  const d = r.valor;

  await c.env.DB.prepare(
    "UPDATE usuarios SET nome = ?, empresa = ?, documento = ?, telefone = ?, origem_cep = ?, origem_logradouro = ?, origem_numero = ?, origem_complemento = ?, origem_bairro = ?, origem_cidade = ?, origem_uf = ? WHERE id = ?",
  )
    .bind(
      d.nome, d.empresa, d.documento, d.telefone, d.origem_cep, d.origem_logradouro,
      d.origem_numero, d.origem_complemento, d.origem_bairro, d.origem_cidade, d.origem_uf, usuario.id,
    )
    .run();
  await garantirFranquiaUnica(c.env.DB, c.env.SEGREDO_LOGIN, usuario.id, "documento", d.documento);
  return c.json({ ok: true });
});

// Exclui a conta: apaga dados pessoais, tokens, sessões, cotações e pedidos.
// Guarda só o HMAC do e-mail e do CPF/CNPJ, para impedir nova franquia gratuita.
// Corpo: { confirmar: "EXCLUIR" }
contaRotas.delete("/", async (c) => {
  const usuario = await usuarioDaSessao(c);
  if (!usuario) return c.json({ erro: "Faça login." }, 401);
  if (usuario.is_admin) return c.json({ erro: "Administradores não podem excluir a conta por esta tela." }, 400);

  const corpo = await c.req.json<Record<string, unknown>>().catch(() => null);
  if (!corpo || corpo.confirmar !== "EXCLUIR") {
    return c.json({ erro: "Para confirmar, digite EXCLUIR." }, 400);
  }

  const id = usuario.id;
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM tokens_transportadoras WHERE usuario_id = ?").bind(id),
    c.env.DB.prepare("DELETE FROM sessoes WHERE usuario_id = ?").bind(id),
    c.env.DB.prepare("DELETE FROM codigos_login WHERE email = ?").bind(usuario.email),
    c.env.DB.prepare("DELETE FROM cotacoes_realizadas WHERE usuario_id = ?").bind(id),
    c.env.DB.prepare("DELETE FROM pedidos_carrinho WHERE usuario_id = ?").bind(id),
    c.env.DB.prepare("DELETE FROM assinaturas WHERE usuario_id = ?").bind(id),
    c.env.DB.prepare("UPDATE identidades SET usuario_id = NULL WHERE usuario_id = ?").bind(id),
    c.env.DB.prepare(
      `UPDATE usuarios SET email = ?, nome = NULL, empresa = NULL, documento = NULL, telefone = NULL,
         origem_cep = NULL, origem_logradouro = NULL, origem_numero = NULL, origem_complemento = NULL,
         origem_bairro = NULL, origem_cidade = NULL, origem_uf = NULL, plano_id = 'sem_franquia',
         excluido_em = datetime('now') WHERE id = ?`,
    ).bind(`excluida-${id}@removido.invalid`, id),
  ]);

  deleteCookie(c, "sessao", { path: "/" });
  return c.json({ ok: true });
});
