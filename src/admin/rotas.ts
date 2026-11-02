// Rotas do administrador: usuários, planos e troca de plano de cada usuário.
// Todas exigem sessão de um usuário com is_admin = 1.
import { Hono } from "hono";
import type { Env } from "../env";
import { usuarioDaSessao } from "../auth/rotas";
import { validarPlano } from "./planos";

export const adminRotas = new Hono<{ Bindings: Env }>();

adminRotas.use("*", async (c, next) => {
  const usuario = await usuarioDaSessao(c);
  if (!usuario) return c.json({ erro: "Faça login." }, 401);
  if (!usuario.is_admin) return c.json({ erro: "Acesso restrito ao administrador." }, 403);
  await next();
});

adminRotas.get("/usuarios", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, email, nome, plano_id, is_admin, criado_em FROM usuarios ORDER BY criado_em DESC LIMIT 200",
  ).all();
  return c.json({ usuarios: results });
});

adminRotas.get("/planos", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, nome, preco_centavos, limite_cotacoes_mes FROM planos ORDER BY preco_centavos, id",
  ).all();
  return c.json({ planos: results });
});

adminRotas.post("/planos", async (c) => {
  const corpo = (await c.req.json<Record<string, unknown>>().catch(() => null)) ?? {};
  const r = validarPlano(corpo, true);
  if ("erro" in r) return c.json({ erro: r.erro }, 400);

  const existe = await c.env.DB.prepare("SELECT id FROM planos WHERE id = ?").bind(r.valor.id).first();
  if (existe) return c.json({ erro: "Já existe um plano com esse código." }, 409);

  await c.env.DB.prepare(
    "INSERT INTO planos (id, nome, preco_centavos, limite_cotacoes_mes) VALUES (?, ?, ?, ?)",
  )
    .bind(r.valor.id, r.valor.nome, r.valor.preco_centavos, r.valor.limite_cotacoes_mes)
    .run();
  return c.json({ ok: true }, 201);
});

// Edita nome, preço e limite. O código do plano não muda.
adminRotas.put("/planos/:id", async (c) => {
  const id = c.req.param("id");
  const corpo = (await c.req.json<Record<string, unknown>>().catch(() => null)) ?? {};
  const r = validarPlano({ ...corpo, id }, false);
  if ("erro" in r) return c.json({ erro: r.erro }, 400);

  const existe = await c.env.DB.prepare("SELECT id FROM planos WHERE id = ?").bind(id).first();
  if (!existe) return c.json({ erro: "Plano não encontrado." }, 404);

  await c.env.DB.prepare(
    "UPDATE planos SET nome = ?, preco_centavos = ?, limite_cotacoes_mes = ? WHERE id = ?",
  )
    .bind(r.valor.nome, r.valor.preco_centavos, r.valor.limite_cotacoes_mes, id)
    .run();
  return c.json({ ok: true });
});

adminRotas.post("/usuarios/:id/plano", async (c) => {
  const corpo: { plano_id?: string } = (await c.req.json<{ plano_id?: string }>().catch(() => null)) ?? {};
  const planoId = corpo.plano_id;
  if (!planoId) return c.json({ erro: "Informe o plano." }, 400);

  const plano = await c.env.DB.prepare("SELECT id FROM planos WHERE id = ?").bind(planoId).first();
  if (!plano) return c.json({ erro: "Esse plano não existe." }, 404);

  await c.env.DB.prepare("UPDATE usuarios SET plano_id = ? WHERE id = ?")
    .bind(planoId, c.req.param("id"))
    .run();
  return c.json({ ok: true });
});
