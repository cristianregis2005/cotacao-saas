// Rotas do administrador: listar usuários e trocar o plano de cada um.
// Todas exigem sessão de um usuário com is_admin = 1.
import { Hono } from "hono";
import type { Env } from "../env";
import { usuarioDaSessao } from "../auth/rotas";

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
    "SELECT id, nome, limite_cotacoes_mes FROM planos ORDER BY id",
  ).all();
  return c.json({ planos: results });
});

adminRotas.post("/usuarios/:id/plano", async (c) => {
  const corpo = await c.req.json<{ plano_id?: string }>().catch(() => ({} as { plano_id?: string }));
  const planoId = corpo.plano_id;
  if (!planoId) return c.json({ erro: "Informe o plano." }, 400);

  const plano = await c.env.DB.prepare("SELECT id FROM planos WHERE id = ?").bind(planoId).first();
  if (!plano) return c.json({ erro: "Esse plano não existe." }, 404);

  await c.env.DB.prepare("UPDATE usuarios SET plano_id = ? WHERE id = ?")
    .bind(planoId, c.req.param("id"))
    .run();
  return c.json({ ok: true });
});
